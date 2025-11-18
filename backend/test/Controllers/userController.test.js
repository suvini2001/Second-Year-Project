import { jest } from '@jest/globals';

// Set test environment
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'user-controller-secret';

// Mock Express response object
const createMockRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

// Mock all dependencies to ensure isolated unit tests
jest.unstable_mockModule('validator', () => ({ default: { isEmail: jest.fn() } }));
jest.unstable_mockModule('bcrypt', () => ({ default: { genSalt: jest.fn(), hash: jest.fn(), compare: jest.fn() } }));
jest.unstable_mockModule('jsonwebtoken', () => ({ default: { sign: jest.fn() } }));
jest.unstable_mockModule('cloudinary', () => ({ v2: { uploader: { upload: jest.fn() } } }));
jest.unstable_mockModule('../../services/emailService.js', () => ({ sendEmail: jest.fn() }));

// Mock Mongoose Models
const userModelMock = {
  findOne: jest.fn(),
  findById: jest.fn(),
  findByIdAndUpdate: jest.fn(),
  save: jest.fn(),
};
// The constructor needs to be a mock function to track instantiations
const userModelConstructorMock = jest.fn(() => userModelMock);
userModelConstructorMock.findOne = userModelMock.findOne;
userModelConstructorMock.findById = userModelMock.findById;
userModelConstructorMock.findByIdAndUpdate = userModelMock.findByIdAndUpdate;
jest.unstable_mockModule('../../models/userModel.js', () => ({ default: userModelConstructorMock }));

const doctorModelMock = { findById: jest.fn(), findByIdAndUpdate: jest.fn() };
jest.unstable_mockModule('../../models/doctorModel.js', () => ({ default: doctorModelMock }));

const appointmentModelMock = {
  find: jest.fn(),
  findById: jest.fn(),
  findByIdAndUpdate: jest.fn(),
  save: jest.fn(),
};
const appointmentModelConstructorMock = jest.fn(() => appointmentModelMock);
appointmentModelConstructorMock.find = appointmentModelMock.find;
appointmentModelConstructorMock.findById = appointmentModelMock.findById;
appointmentModelConstructorMock.findByIdAndUpdate = appointmentModelMock.findByIdAndUpdate;
jest.unstable_mockModule('../../models/appointmentModel.js', () => ({ default: appointmentModelConstructorMock }));

const messageModelMock = { countDocuments: jest.fn(), findOne: jest.fn() };
jest.unstable_mockModule('../../models/messageModel.js', () => ({ default: messageModelMock }));

// Import controller after mocks
const userController = await import('../../controllers/userController.js');
const validator = (await import('validator')).default;
const bcrypt = (await import('bcrypt')).default;
const jwt = (await import('jsonwebtoken')).default;
const { v2: cloudinary } = await import('cloudinary');
const { sendEmail } = await import('../../services/emailService.js');

describe('userController', () => {
  beforeEach(() => {
    // Reset all mocks before each test
    jest.clearAllMocks();
  });

  // Test suite for the registerUser function
  describe('registerUser', () => {
    it('should register a user and return a token on success', async () => {
      // Arrange: Mock dependencies for a successful registration
      validator.isEmail.mockReturnValue(true);
      bcrypt.genSalt.mockResolvedValue('salt');
      bcrypt.hash.mockResolvedValue('hashedPassword');
      userModelMock.save.mockResolvedValue({ _id: 'userId' });
      jwt.sign.mockReturnValue('token');
      const req = { body: { name: 'Test', email: 'test@example.com', password: 'password123' } };
      const res = createMockRes();

      // Act: Call the controller function
      await userController.registerUser(req, res);

      // Assert: Check for correct response and function calls
      expect(res.json).toHaveBeenCalledWith({ success: true, token: 'token' });
      expect(userModelConstructorMock).toHaveBeenCalled();
      expect(userModelMock.save).toHaveBeenCalled();
    });

    it('should return error for missing details', async () => {
      const req = { body: { name: 'Test' } };
      const res = createMockRes();
      await userController.registerUser(req, res);
      expect(res.json).toHaveBeenCalledWith({ success: false, message: 'Missing Details' });
    });
  });

  // Test suite for the loginUser function
  describe('loginUser', () => {
    it('should login a user and return a token', async () => {
      userModelMock.findOne.mockResolvedValue({ _id: 'userId', password: 'hashedPassword' });
      bcrypt.compare.mockResolvedValue(true);
      jwt.sign.mockReturnValue('token');
      const req = { body: { email: 'test@example.com', password: 'password' } };
      const res = createMockRes();

      await userController.loginUser(req, res);

      expect(res.json).toHaveBeenCalledWith({ success: true, token: 'token' });
    });

    it("should return error if user doesn't exist", async () => {
      userModelMock.findOne.mockResolvedValue(null);
      const req = { body: { email: 'test@example.com', password: 'password' } };
      const res = createMockRes();
      await userController.loginUser(req, res);
      expect(res.json).toHaveBeenCalledWith({ success: false, message: "User doesn't exist" });
    });
  });

  // Test suite for getProfile function
  describe('getProfile', () => {
    it('should return user profile data', async () => {
      const userData = { name: 'Test' };
      userModelMock.findById.mockReturnValue({ select: jest.fn().mockResolvedValue(userData) });
      const req = { userId: 'userId' };
      const res = createMockRes();

      await userController.getProfile(req, res);

      expect(res.json).toHaveBeenCalledWith({ success: true, userData });
    });
  });

  // Test suite for updateProfile function
  describe('updateProfile', () => {
    it('should update profile and image if file is provided', async () => {
      cloudinary.uploader.upload.mockResolvedValue({ secure_url: 'imageUrl' });
      const req = {
        body: { userId: 'userId', name: 'Test', phone: '123', address: '{}', dob: '2000-01-01', gender: 'male' },
        file: { path: 'filePath' },
      };
      const res = createMockRes();

      await userController.updateProfile(req, res);

      expect(userModelMock.findByIdAndUpdate).toHaveBeenCalledTimes(2);
      expect(cloudinary.uploader.upload).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith({ success: true, message: 'Profile Update' });
    });
  });

  // Test suite for bookAppointment function
  describe('bookAppointment', () => {
    it('should book an appointment successfully', async () => {
      const docData = { _id: 'docId', availability: true, slots_booked: {}, fees: 100, toObject: () => ({}) };
      doctorModelMock.findById.mockReturnValue({ select: jest.fn().mockResolvedValue(docData) });
      userModelMock.findById.mockReturnValue({ select: jest.fn().mockResolvedValue({}) });
      appointmentModelMock.save.mockResolvedValue({});
      const req = { userId: 'userId', body: { docId: 'docId', slotDate: '2025-12-25', slotTime: '10:00' } };
      const res = createMockRes();

      await userController.bookAppointment(req, res);

      expect(res.json).toHaveBeenCalledWith({ success: true, message: 'Appointment Booked' });
    });

    it('should return error if doctor is not available', async () => {
      const docData = { availability: false };
      doctorModelMock.findById.mockReturnValue({ select: jest.fn().mockResolvedValue(docData) });
      const req = { userId: 'userId', body: { docId: 'docId' } };
      const res = createMockRes();
      await userController.bookAppointment(req, res);
      expect(res.json).toHaveBeenCalledWith({ success: false, message: 'Doctor not available' });
    });
  });

  // Test suite for listAppointment function
  describe('listAppointment', () => {
    it('should return a list of appointments with unread counts', async () => {
      appointmentModelMock.find.mockReturnValue({ lean: () => [{ _id: 'apptId' }] });
      messageModelMock.countDocuments.mockResolvedValue(2);
      const req = { userId: 'userId' };
      const res = createMockRes();

      await userController.listAppointment(req, res);

      expect(res.json).toHaveBeenCalledWith({
        success: true,
        appointments: [expect.objectContaining({ unreadCount: 2 })],
      });
    });
  });

  // Test suite for cancelAppointment function
  describe('cancelAppointment', () => {
    it('should cancel an appointment and release the slot', async () => {
      const appointmentData = { userId: 'userId', docId: 'docId', slotDate: '2025-12-25', slotTime: '10:00' };
      appointmentModelMock.findById.mockResolvedValue(appointmentData);
      doctorModelMock.findById.mockResolvedValue({ slots_booked: { '2025-12-25': ['10:00'] } });
      const req = { userId: 'userId', body: { appointmentId: 'apptId' } };
      const res = createMockRes();

      await userController.cancelAppointment(req, res);

      expect(res.json).toHaveBeenCalledWith({ success: true, message: 'Appointment Cancelled' });
    });
  });

  // Test suite for payment functions
  describe('Payment', () => {
    it('generateMockPayment should create a mock session', () => {
      const req = { body: { appointmentId: 'apptId' } };
      const res = createMockRes();
      userController.generateMockPayment(req, res);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    });

    it('verifyMockPayment should update appointment and doctor earnings', async () => {
      const appointment = { docId: 'docId', amount: 100 };
      appointmentModelMock.findById.mockResolvedValue(appointment);
      doctorModelMock.findById.mockResolvedValue({ earnings: 50 });
      sendEmail.mockResolvedValue({});
      const req = { body: { appointmentId: 'apptId' } };
      const res = createMockRes();

      await userController.verifyMockPayment(req, res);

      expect(doctorModelMock.findByIdAndUpdate).toHaveBeenCalledWith('docId', { earnings: 150 });
      expect(res.json).toHaveBeenCalledWith({ success: true, message: 'Payment successful and appointment updated' });
    });
  });

  // Test suite for message count and inbox
  describe('Messaging', () => {
    it('getUnreadMessagesCount should return total unread count', async () => {
      appointmentModelMock.find.mockResolvedValue([{ _id: 'apptId' }]);
      messageModelMock.countDocuments.mockResolvedValue(5);
      const req = { userId: 'userId' };
      const res = createMockRes();

      await userController.getUnreadMessagesCount(req, res);

      expect(res.json).toHaveBeenCalledWith({ success: true, unreadCount: 5 });
    });

    it('getUserInbox should return sorted inbox', async () => {
      const appointments = [{ _id: 'apptId', docData: {}, date: new Date() }];
      appointmentModelMock.find.mockReturnValue({ select: () => ({ lean: () => appointments }) });
      messageModelMock.findOne.mockReturnValue({ sort: () => ({ lean: () => null }) });
      messageModelMock.countDocuments.mockResolvedValue(0);
      const req = { userId: 'userId' };
      const res = createMockRes();

      await userController.getUserInbox(req, res);

      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    });
  });

  // Test suite for email sending
  describe('sendTestEmail', () => {
    it('should send an email successfully', async () => {
      sendEmail.mockResolvedValue({});
      const req = { body: { to: 'test@example.com' } };
      const res = createMockRes();

      await userController.sendTestEmail(req, res);

      expect(res.json).toHaveBeenCalledWith({ success: true, message: 'Email sent' });
    });
  });
});
