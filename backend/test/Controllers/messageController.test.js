import { jest } from '@jest/globals';

// Set the environment to 'test' to prevent accidental use of production services.
process.env.NODE_ENV = 'test';

// Mock helper to mimic Express's response object for isolated controller tests.
const createMockRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

// Mock the Mongoose library to stub methods like isValidObjectId.
const mongooseMock = {
  isValidObjectId: jest.fn(),
};
jest.unstable_mockModule('mongoose', () => ({
  __esModule: true,
  default: mongooseMock,
}));

// Mock the appointment model to control its behavior during tests.
const appointmentModelMock = {
  findById: jest.fn(),
};
jest.unstable_mockModule('../../models/appointmentModel.js', () => ({
  __esModule: true,
  default: appointmentModelMock,
}));

// Mock the message model, which is central to this controller's logic.
const messageModelMock = {
  findById: jest.fn(),
  find: jest.fn(),
  countDocuments: jest.fn(),
  updateMany: jest.fn(),
};
jest.unstable_mockModule('../../models/messageModel.js', () => ({
  __esModule: true,
  default: messageModelMock,
}));

// Import the controller after all mocks are set up.
const { getMessages } = await import('../../controllers/messageController.js');

// Mock for socket.io
const emitMock = jest.fn();
const ioMock = {
  to: jest.fn().mockReturnValue({ emit: emitMock }),
};
global.io = ioMock;

describe('messageController: getMessages', () => {
  beforeEach(() => {
    // Reset mocks and global state before each test to ensure isolation.
    jest.clearAllMocks();
    // Ensure socket.io mock is available for each test
    global.io = ioMock;
  });

  afterEach(() => {
    // Clean up global mocks.
    delete global.io;
  });

  it('should return messages for an authorized user', async () => {
    // Arrange: Set up mocks for a successful, authorized request.
    const req = { params: { appointmentId: 'appt1' }, userId: 'user1', query: {} };
    const res = createMockRes();
    const messages = [{ _id: 'msg1', message: 'Hello' }];

    // The user is a valid participant in this appointment.
    appointmentModelMock.findById.mockReturnValue({ lean: () => ({ _id: 'appt1', userId: 'user1' }) });
    // The database returns one message.
    messageModelMock.find.mockReturnValue({
      sort: () => ({ limit: () => ({ lean: () => messages }) }),
    });
    // No older messages exist for pagination.
    messageModelMock.countDocuments.mockResolvedValue(0);
    // No messages were marked as read.
    messageModelMock.updateMany.mockResolvedValue({ modifiedCount: 0 });

    // Act: Call the controller function.
    await getMessages(req, res);

    // Assert: The response should be successful and contain the messages.
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      success: true,
      messages,
      hasMore: false, // Correctly indicates no more messages to load.
    }));
  });

  it('should return unauthorized if user is not part of the appointment', async () => {
    // Arrange: The user 'user2' is not a participant in the appointment owned by 'user1'.
    const req = { params: { appointmentId: 'appt1' }, userId: 'user2', query: {} };
    const res = createMockRes();
    appointmentModelMock.findById.mockReturnValue({ lean: () => ({ _id: 'appt1', userId: 'user1', docId: 'doc1' }) });

    // Act: Call the controller.
    await getMessages(req, res);

    // Assert: The controller should block the request.
    expect(res.json).toHaveBeenCalledWith({ success: false, message: 'Unauthorized' });
  });

  it('should handle pagination using the "before" query parameter as an ISO date', async () => {
    // Arrange: The request asks for messages created before a specific timestamp.
    const req = { params: { appointmentId: 'appt1' }, userId: 'user1', query: { before: new Date().toISOString() } };
    const res = createMockRes();
    appointmentModelMock.findById.mockReturnValue({ lean: () => ({ _id: 'appt1', userId: 'user1' }) });
    messageModelMock.find.mockReturnValue({ sort: () => ({ limit: () => ({ lean: () => [] }) }) });

    // Act: Call the controller.
    await getMessages(req, res);

    // Assert: The `find` query should include a timestamp filter.
    expect(messageModelMock.find).toHaveBeenCalledWith(expect.objectContaining({
      timestamp: { $lt: expect.any(Date) },
    }));
  });

  it('should handle pagination using the "before" query parameter as a message ID', async () => {
    // Arrange: The request asks for messages older than a specific message ID.
    const req = { params: { appointmentId: 'appt1' }, userId: 'user1', query: { before: 'msg1_id' } };
    const res = createMockRes();
    const anchorTimestamp = new Date();

    appointmentModelMock.findById.mockReturnValue({ lean: () => ({ _id: 'appt1', userId: 'user1' }) });
    // The 'before' ID is a valid ObjectId.
    mongooseMock.isValidObjectId.mockReturnValue(true);
    // The database returns the timestamp for that message ID.
    messageModelMock.findById.mockReturnValue({ select: () => ({ lean: () => ({ timestamp: anchorTimestamp }) }) });
    messageModelMock.find.mockReturnValue({ sort: () => ({ limit: () => ({ lean: () => [] }) }) });

    // Act: Call the controller.
    await getMessages(req, res);

    // Assert: The query should be filtered by the timestamp of the 'before' message.
    expect(messageModelMock.find).toHaveBeenCalledWith({
      appointmentId: 'appt1',
      timestamp: { $lt: anchorTimestamp },
    });
  });

  it('should mark opponent messages as read and emit a socket event', async () => {
    // Arrange: A doctor is fetching messages.
    const req = { params: { appointmentId: 'appt1' }, docId: 'doc1', query: {} };
    const res = createMockRes();
    appointmentModelMock.findById.mockReturnValue({ lean: () => ({ _id: 'appt1', docId: 'doc1' }) });
    messageModelMock.find.mockReturnValue({ sort: () => ({ limit: () => ({ lean: () => [] }) }) });
    // Simulate that 2 messages from the user were marked as read.
    messageModelMock.updateMany.mockResolvedValue({ modifiedCount: 2 });

    // Act: Call the controller.
    await getMessages(req, res);

    // Assert: The database should be updated to mark user's messages as read.
    expect(messageModelMock.updateMany).toHaveBeenCalledWith(
      { appointmentId: 'appt1', senderType: 'user', isRead: false },
      { $set: { isRead: true, readAt: expect.any(Date) } }
    );
    // Assert: A socket event should be emitted to notify the room.
    expect(ioMock.to).toHaveBeenCalledWith('appointment-appt1');
    expect(emitMock).toHaveBeenCalledWith('messages-read', expect.any(Object));
  });

  it('should return hasMore: true when older messages exist', async () => {
    // Arrange: The database contains messages older than the current batch.
    const req = { params: { appointmentId: 'appt1' }, userId: 'user1', query: {} };
    const res = createMockRes();
    const messages = [{ _id: 'msg1', timestamp: new Date() }];
    appointmentModelMock.findById.mockReturnValue({ lean: () => ({ _id: 'appt1', userId: 'user1' }) });
    messageModelMock.find.mockReturnValue({ sort: () => ({ limit: () => ({ lean: () => messages }) }) });
    // The database has 10 older messages.
    messageModelMock.countDocuments.mockResolvedValue(10);
    messageModelMock.updateMany.mockResolvedValue({ modifiedCount: 0 });

    // Act: Call the controller.
    await getMessages(req, res);

    // Assert: The response should indicate that more messages are available.
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      hasMore: true,
    }));
  });
});
