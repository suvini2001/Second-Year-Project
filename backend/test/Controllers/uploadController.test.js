import { jest } from '@jest/globals';

// Set a test environment to prevent side effects.
process.env.NODE_ENV = 'test';

// Mock Express response object for isolated testing.
const createMockRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

// Mock the Cloudinary library, which is a key dependency for file uploads.
const cloudinaryMock = {
  uploader: {
    upload: jest.fn(),
  },
  url: jest.fn(),
};
jest.unstable_mockModule('cloudinary', () => ({
  __esModule: true,
  v2: cloudinaryMock,
}));

// Import the controller after setting up all necessary mocks.
const { uploadChatFile } = await import('../../controllers/uploadController.js');

describe('uploadController: uploadChatFile', () => {
  beforeEach(() => {
    // Clear all mocks before each test to ensure a clean state.
    jest.clearAllMocks();
  });

  it('should return 400 if no file is provided in the request', async () => {
    // Arrange: The request has no file attached.
    const req = { file: null };
    const res = createMockRes();

    // Act: Call the controller.
    await uploadChatFile(req, res);

    // Assert: The controller should respond with a 400 Bad Request status.
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ success: false, message: 'No file uploaded' });
  });

  it('should return 400 for unsupported file types', async () => {
    // Arrange: The file has a MIME type that is not in the allowed lists.
    const req = {
      file: {
        mimetype: 'application/octet-stream', // An unsupported type.
        size: 1024,
        originalname: 'data.bin',
        path: '/tmp/data.bin',
      },
    };
    const res = createMockRes();

    // Act: Call the controller.
    await uploadChatFile(req, res);

    // Assert: The controller should reject the file.
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ success: false, message: 'Unsupported file type' });
  });

  it('should return 400 if an image exceeds the size limit', async () => {
    // Arrange: The image file is larger than the 5MB limit.
    const req = {
      file: {
        mimetype: 'image/jpeg',
        size: 6 * 1024 * 1024, // 6MB, which is over the limit.
        originalname: 'large.jpg',
        path: '/tmp/large.jpg',
      },
    };
    const res = createMockRes();

    // Act: Call the controller.
    await uploadChatFile(req, res);

    // Assert: The controller should reject the file due to its size.
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ success: false, message: 'File too large (max 5MB)' });
  });

  it('should return 400 if a document exceeds the size limit', async () => {
    // Arrange: The PDF file is larger than the 20MB limit.
    const req = {
      file: {
        mimetype: 'application/pdf',
        size: 21 * 1024 * 1024, // 21MB.
        originalname: 'large.pdf',
        path: '/tmp/large.pdf',
      },
    };
    const res = createMockRes();

    // Act: Call the controller.
    await uploadChatFile(req, res);

    // Assert: The controller should reject the file.
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ success: false, message: 'File too large (max 20MB)' });
  });

  it('should upload an image successfully and return image-specific URLs', async () => {
    // Arrange: A valid image file is provided.
    const req = {
      file: {
        mimetype: 'image/png',
        size: 1024 * 1024,
        originalname: 'test.png',
        path: '/tmp/test.png',
      },
    };
    const res = createMockRes();
    // Mock the Cloudinary upload and URL generation to return predictable values.
    cloudinaryMock.uploader.upload.mockResolvedValue({
      public_id: 'test_id',
      resource_type: 'image',
      secure_url: 'https://cloudinary/original.png',
    });
    cloudinaryMock.url
      .mockReturnValueOnce('https://cloudinary/thumbnail.png') // First call for thumbnail.
      .mockReturnValueOnce('https://cloudinary/delivery.png'); // Second call for main URL.

    // Act: Call the controller.
    await uploadChatFile(req, res);

    // Assert: The response should be successful and contain the correct file metadata.
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      file: {
        type: 'image',
        url: 'https://cloudinary/delivery.png',
        mimeType: 'image/png',
        size: 1024 * 1024,
        filename: 'test.png',
        thumbnailUrl: 'https://cloudinary/thumbnail.png',
      },
    });
  });

  it('should upload a document successfully and return a download-forced URL', async () => {
    // Arrange: A valid PDF document is provided.
    const req = {
      file: {
        mimetype: 'application/pdf',
        size: 1024 * 1024,
        originalname: 'report.pdf',
        path: '/tmp/report.pdf',
      },
    };
    const res = createMockRes();
    // Mock Cloudinary to simulate a successful document upload.
    cloudinaryMock.uploader.upload.mockResolvedValue({
      public_id: 'report_id',
      resource_type: 'raw', // Documents are often treated as 'raw' resources.
      secure_url: 'https://cloudinary/original.pdf',
    });
    // The URL for documents should force a download.
    cloudinaryMock.url.mockReturnValue('https://cloudinary/download.pdf');

    // Act: Call the controller.
    await uploadChatFile(req, res);

    // Assert: The response should contain the correct metadata for a document.
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      file: {
        type: 'file',
        url: 'https://cloudinary/download.pdf',
        mimeType: 'application/pdf',
        size: 1024 * 1024,
        filename: 'report.pdf',
        thumbnailUrl: null, // Documents do not have thumbnails in this logic.
      },
    });
  });

  it('should return 500 if Cloudinary upload fails', async () => {
    // Arrange: The Cloudinary upload process is mocked to throw an error.
    const req = {
      file: {
        mimetype: 'image/jpeg',
        size: 1024,
        originalname: 'fail.jpg',
        path: '/tmp/fail.jpg',
      },
    };
    const res = createMockRes();
    cloudinaryMock.uploader.upload.mockRejectedValue(new Error('Cloudinary is down'));

    // Act: Call the controller.
    await uploadChatFile(req, res);

    // Assert: The controller should catch the error and respond with a 500 Internal Server Error.
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ success: false, message: 'Upload failed' });
  });
});
