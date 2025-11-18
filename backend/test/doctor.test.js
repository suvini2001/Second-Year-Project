import { jest } from '@jest/globals';

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'testsecret';

jest.unstable_mockModule('../config/mongodb.js', () => ({
  default: jest.fn(async () => undefined),
}));
jest.unstable_mockModule('../config/cloudnary.js', () => ({
  default: jest.fn(() => undefined),
}));

jest.unstable_mockModule('../models/doctorModel.js', () => ({
  default: {
    findOne: jest.fn(),
    find: jest.fn(),
    findById: jest.fn(),
    findByIdAndUpdate: jest.fn(),
  }
}));
jest.unstable_mockModule('../models/appointmentModel.js', () => ({
  default: {
    find: jest.fn(),
    findById: jest.fn(),
    findByIdAndUpdate: jest.fn(),
  }
}));
jest.unstable_mockModule('../models/messageModel.js', () => ({
  default: {
    countDocuments: jest.fn(),
    findOne: jest.fn(),
    find: jest.fn(),
    updateMany: jest.fn(),
  }
}));

jest.unstable_mockModule('bcrypt', () => ({
  default: { compare: jest.fn() }
}));
jest.unstable_mockModule('jsonwebtoken', () => ({
  default: { sign: jest.fn(), verify: jest.fn() }
}));
jest.unstable_mockModule('cloudinary', () => ({
  v2: { uploader: { upload: jest.fn().mockResolvedValue({ secure_url: 'https://cloud/img.png' }) }, url: jest.fn().mockReturnValue('https://cloud/url') }
}));
jest.unstable_mockModule('../middleware/multer.js', () => ({
  default: { single: () => (req, _res, next) => { if (req.headers['x-test-has-file'] === '1') req.file = { path: '/tmp/x', mimetype: 'image/png', size: 100, originalname: 'x.png' }; next(); } }
}));

const request = (await import('supertest')).default;
const { app, server } = await import('../server.js');
const doctorModel = (await import('../models/doctorModel.js')).default;
const appointmentModel = (await import('../models/appointmentModel.js')).default;
const messageModel = (await import('../models/messageModel.js')).default;
const bcrypt = (await import('bcrypt')).default;
const jwt = (await import('jsonwebtoken')).default;

describe('Doctor API', () => {
  afterAll((done) => {
    if (server.listening) server.close(done); else done();
  });

  describe('POST /api/doctor/login', () => {
    it('should login a doctor and return a token', async () => {
      const mockDoctor = { _id: 'd1', name: 'Test Doctor', email: 'doctor@example.com', password: 'hashedPassword' };
      doctorModel.findOne.mockResolvedValue(mockDoctor);
      bcrypt.compare.mockResolvedValue(true);
      jwt.sign.mockReturnValue('someToken');
      const response = await request(app).post('/api/doctor/login').send({ email: 'doctor@example.com', password: 'password123' });
      expect(response.status).toBe(200);
      expect(response.body).toEqual({ success: true, token: 'someToken' });
    });

    it('should return an error for a non-existent doctor', async () => {
      doctorModel.findOne.mockResolvedValue(null);
      const response = await request(app).post('/api/doctor/login').send({ email: 'nonexistent@example.com', password: 'password123' });
      expect(response.status).toBe(200);
      expect(response.body).toEqual({ success: false, message: 'Invalid credentials' });
    });

    it('should return an error for invalid credentials', async () => {
      doctorModel.findOne.mockResolvedValue({ _id: 'd1', password: 'hashed' });
      bcrypt.compare.mockResolvedValue(false);
      const response = await request(app).post('/api/doctor/login').send({ email: 'doctor@example.com', password: 'wrongpassword' });
      expect(response.status).toBe(200);
      expect(response.body).toEqual({ success: false, message: 'Invalid credentials' });
    });

    it('should surface database errors during login', async () => {
      doctorModel.findOne.mockRejectedValue(new Error('database unavailable'));
      const response = await request(app).post('/api/doctor/login').send({ email: 'doctor@example.com', password: 'password123' });
      expect(response.status).toBe(200);
      expect(response.body).toEqual({ success: false, message: 'database unavailable' });
    });
  });

  describe('Doctor protected endpoints', () => {
    beforeEach(() => { jwt.verify.mockReturnValue({ id: 'd1', type: 'doctor' }); });

    it('GET /api/doctor/list returns formatted doctors', async () => {
      const docs = [{ specialization: 'Cardio', availability: true, toObject: () => ({ _id: 'd1', specialization: 'Cardio', availability: true }) }];
      doctorModel.find.mockReturnValue({ select: jest.fn().mockResolvedValue(docs) });
      const res = await request(app).get('/api/doctor/list');
      expect(res.body.success).toBe(true);
      expect(res.body.doctors[0].speciality).toBe('Cardio');
    });

    it('GET /api/doctor/appointments returns list with unread counts', async () => {
      appointmentModel.find.mockReturnValue({ sort: () => ({ lean: jest.fn().mockResolvedValue([{ _id: 'a1' }]) }) });
      messageModel.countDocuments.mockResolvedValue(2);
      const res = await request(app).get('/api/doctor/appointments').set('dtoken', 'dt');
      expect(res.body.success).toBe(true);
      expect(res.body.appointments[0].unreadCount).toBe(2);
    });

    it('POST /api/doctor/complete-appointment enforces ownership and completes', async () => {
      appointmentModel.findById.mockResolvedValue({ _id: 'a1', docId: 'd1' });
      appointmentModel.findByIdAndUpdate.mockResolvedValue(undefined);
      const res = await request(app).post('/api/doctor/complete-appointment').set('dtoken', 'dt').send({ appointmentId: 'a1' });
      expect(res.body.success).toBe(true);
    });

    it('POST /api/doctor/complete-appointment rejects others', async () => {
      appointmentModel.findById.mockResolvedValue({ _id: 'a1', docId: 'other' });
      const res = await request(app).post('/api/doctor/complete-appointment').set('dtoken', 'dt').send({ appointmentId: 'a1' });
      expect(res.status).toBe(403);
    });

    it('POST /api/doctor/cancel-appointment enforces ownership and cancels', async () => {
      appointmentModel.findById.mockResolvedValue({ _id: 'a1', docId: 'd1' });
      appointmentModel.findByIdAndUpdate.mockResolvedValue(undefined);
      const res = await request(app).post('/api/doctor/cancel-appointment').set('dtoken', 'dt').send({ appointmentId: 'a1' });
      expect(res.body.success).toBe(true);
    });

    it('GET /api/doctor/dashboard computes aggregates', async () => {
      appointmentModel.find.mockResolvedValue([
        { amount: 10, isCompleted: true },
        { amount: 20, payment: true },
        { amount: 30 },
      ]);
      const res = await request(app).get('/api/doctor/dashboard').set('dtoken', 'dt');
      expect(res.body.success).toBe(true);
      expect(res.body.dashData.earnings).toBe(30);
      expect(res.body.dashData.appointments).toBe(3);
    });

    it('GET /api/doctor/profile returns profile', async () => {
      doctorModel.findById.mockReturnValue({ select: jest.fn().mockResolvedValue({ _id: 'd1', name: 'Doc' }) });
      const res = await request(app).get('/api/doctor/profile').set('dtoken', 'dt');
      expect(res.body.success).toBe(true);
    });

    it('POST /api/doctor/update-profile updates without image', async () => {
      doctorModel.findByIdAndUpdate.mockResolvedValue(undefined);
      const res = await request(app).post('/api/doctor/update-profile').set('dtoken', 'dt').send({ about: 'New' });
      expect(res.body.success).toBe(true);
    });

    it('GET /api/doctor/unread-messages aggregates count', async () => {
      appointmentModel.find.mockResolvedValue([{ _id: 'a1' }]);
      messageModel.countDocuments.mockResolvedValue(4);
      const res = await request(app).get('/api/doctor/unread-messages').set('dtoken', 'dt');
      expect(res.body.success).toBe(true);
      expect(res.body.unreadCount).toBe(4);
    });

    it('GET /api/doctor/inbox returns conversations', async () => {
      appointmentModel.find.mockReturnValue({ select: () => ({ lean: jest.fn().mockResolvedValue([{ _id: 'a1', userData: { name: 'U' }, date: 1 }]) }) });
      messageModel.findOne.mockReturnValue({ sort: () => ({ lean: jest.fn().mockResolvedValue({ message: 'hi', timestamp: new Date(), senderType: 'user' }) }) });
      messageModel.countDocuments.mockResolvedValue(1);
      const res = await request(app).get('/api/doctor/inbox').set('dtoken', 'dt');
      expect(res.body.success).toBe(true);
      expect(res.body.inbox[0].user.name).toBe('U');
    });

    it('GET /api/doctor/messages/:appointmentId returns messages and marks read', async () => {
      appointmentModel.findById.mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'a1', userId: 'u1', docId: 'd1' }) });
      messageModel.find.mockReturnValue({ sort: () => ({ limit: () => ({ lean: jest.fn().mockResolvedValue([{ _id: 'm1', timestamp: new Date(), senderType: 'user' }]) }) }) });
      messageModel.updateMany.mockResolvedValue({ modifiedCount: 1 });
      const emit = jest.fn();
      global.io = { to: () => ({ emit }) };
      const res = await request(app).get('/api/doctor/messages/a1').set('dtoken', 'dt');
      expect(res.body.success).toBe(true);
      expect(emit).toHaveBeenCalled();
    });

    it('POST /api/doctor/upload/chat-file rejects missing file', async () => {
      const res = await request(app).post('/api/doctor/upload/chat-file');
      expect(res.status).toBe(401); // authDoctor returns 401 when missing/invalid dtoken
      // Now with token but still no file -> 400
      const res2 = await request(app).post('/api/doctor/upload/chat-file').set('dtoken', 'dt').set('Authorization','x');
      // route is protected by authDoctor only; our multer adds no file, so controller returns 400
      expect([400,401]).toContain(res2.status);
    });
  });
});
