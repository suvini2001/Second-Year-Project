import { jest } from '@jest/globals';

process.env.NODE_ENV = 'test';

jest.unstable_mockModule('../config/mongodb.js', () => ({
  default: jest.fn(async () => undefined),
}));
jest.unstable_mockModule('../config/cloudnary.js', () => ({
  default: jest.fn(() => undefined),
}));

jest.unstable_mockModule('../models/doctorModel.js', () => {
  const doctorSelectMock = jest.fn().mockResolvedValue([]);
  const DoctorMock = jest.fn(function MockDoctor(doc) {
    this.doc = doc;
  });
  DoctorMock.prototype.save = jest.fn();
  DoctorMock.find = jest.fn(() => ({ select: doctorSelectMock }));
  DoctorMock.findById = jest.fn();
  DoctorMock.findByIdAndUpdate = jest.fn();
  return { default: DoctorMock, doctorSelectMock };
});
jest.unstable_mockModule('../models/appointmentModel.js', () => ({
  default: {
    find: jest.fn(),
    findById: jest.fn(),
    findByIdAndUpdate: jest.fn(),
  }
}));
jest.unstable_mockModule('../models/userModel.js', () => ({
  default: { find: jest.fn() }
}));
jest.unstable_mockModule('bcrypt', () => ({
  default: { genSalt: jest.fn(), hash: jest.fn() }
}));
jest.unstable_mockModule('jsonwebtoken', () => ({
  default: { sign: jest.fn(), verify: jest.fn() }
}));
jest.unstable_mockModule('cloudinary', () => ({
  v2: { uploader: { upload: jest.fn().mockResolvedValue({ secure_url: 'https://cloud/doc.png' }) }, url: jest.fn() }
}));
jest.unstable_mockModule('../middleware/multer.js', () => ({
  default: { single: () => (req, _res, next) => { if (req.headers['x-test-has-file'] === '1') req.file = { path: '/tmp/doc.png', mimetype: 'image/png', size: 123, originalname: 'doc.png' }; next(); } }
}));

const request = (await import('supertest')).default;
const { app, server } = await import('../server.js');
const jwt = (await import('jsonwebtoken')).default;
const doctorModule = await import('../models/doctorModel.js');
const Doctor = doctorModule.default;
const { doctorSelectMock } = doctorModule;
const appointmentModel = (await import('../models/appointmentModel.js')).default;
const User = (await import('../models/userModel.js')).default;
const bcrypt = (await import('bcrypt')).default;

describe('Admin API', () => {
  afterAll((done) => {
    if (server.listening) {
      server.close(done);
    } else {
      done();
    }
  });

  describe('POST /api/admin/login', () => {
    // Test case: correct admin credentials should yield a signed JWT token.
    it('should login an admin and return a token', async () => {
      // Happy path: provide correct credentials so the controller must craft a token.
      process.env.ADMIN_EMAIL = 'admin@example.com';
      process.env.ADMIN_PASSWORD = 'adminpassword';
      jwt.sign.mockReturnValue('someToken');

      const response = await request(app)
        .post('/api/admin/login')
        .send({
          email: 'admin@example.com',
          password: 'adminpassword',
        });

      expect(response.status).toBe(200); // The route must respond with HTTP 200 on success.
      expect(response.body).toEqual({ success: true, token: 'someToken', message: 'Login successful' }); // Body contains the signed token.
    });

    // Test case: token signing failures must trigger the internal server error handler.
    it('should return 500 if token signing fails', async () => {
      process.env.ADMIN_EMAIL = 'admin@example.com';
      process.env.ADMIN_PASSWORD = 'adminpassword';
      jwt.sign.mockImplementation(() => {
        throw new Error('jwt broke');
      });

      const response = await request(app)
        .post('/api/admin/login')
        .send({
          email: 'admin@example.com',
          password: 'adminpassword',
        });

      expect(response.status).toBe(500);
      expect(response.body).toEqual({ success: false, message: 'Internal server error' });
    });

    // Test case: wrong email should immediately return invalid credentials.
    it('should return an error for invalid email', async () => {
      // Negative path: wrong email should short-circuit before password comparison.
      process.env.ADMIN_EMAIL = 'admin@example.com';
      process.env.ADMIN_PASSWORD = 'adminpassword';

      const response = await request(app)
        .post('/api/admin/login')
        .send({
          email: 'wrong@example.com',
          password: 'adminpassword',
        });

      expect(response.status).toBe(401); // Unauthorized because the email does not match env vars.
      expect(response.body).toEqual({ success: false, message: 'Invalid email or password' }); // Generic message keeps attackers guessing.
    });

    // Test case: correct email but wrong password must also yield Unauthorized.
    it('should return an error for invalid password', async () => {
      // Negative path: correct email but wrong password should still deny access.
      process.env.ADMIN_EMAIL = 'admin@example.com';
      process.env.ADMIN_PASSWORD = 'adminpassword';

      const response = await request(app)
        .post('/api/admin/login')
        .send({
          email: 'admin@example.com',
          password: 'wrongpassword',
        });

      expect(response.status).toBe(401); // HTTP 401 ensures clients re-prompt for credentials.
      expect(response.body).toEqual({ success: false, message: 'Invalid email or password' }); // Same message blocks timing attacks.
    });
  });

  describe('Admin protected endpoints', () => {
    beforeEach(() => {
      jest.clearAllMocks();
      process.env.ADMIN_EMAIL = 'admin@example.com';
      process.env.ADMIN_PASSWORD = 'adminpassword';
      process.env.JWT_SECRET = 'testsecret';
      jwt.verify.mockReturnValue({ email: process.env.ADMIN_EMAIL });
      Doctor.findById.mockResolvedValue({ _id: 'd1', availability: false });
      Doctor.findByIdAndUpdate.mockResolvedValue(undefined);
    });

    it('POST /api/admin/add-doctor adds a doctor with image upload', async () => {
      bcrypt.genSalt.mockResolvedValue('salt');
      bcrypt.hash.mockResolvedValue('hashed');
      Doctor.prototype.save.mockResolvedValue({ _id: 'd1' });
      const res = await request(app)
        .post('/api/admin/add-doctor')
        .set('atoken', 'adminToken')
        .set('a-token', 'adminToken')
        .set('x-test-has-file', '1')
        .send({
          name: 'Doc', specialization: 'Cardio', email: 'd@e.com', phone: '077', password: 'password123',
          experience: '5', fees: '100', degree: 'MBBS', about: 'About', address: { line1: 'x', line2: 'y' },
          date: '2025-01-01', availability: 'true'
        });
      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
    });

    it('POST /api/admin/change-availability toggles availability', async () => {
      const res = await request(app).post('/api/admin/change-availability').set('atoken', 'adminToken').set('a-token','adminToken').send({ docId: 'd1' });
      expect(res.body.success).toBe(true);
      expect(res.body.availability).toBe(true);
    });

    it('GET /api/admin/appointments returns appointments', async () => {
      appointmentModel.find.mockResolvedValue([{ _id: 'a1' }]);
      const res = await request(app).get('/api/admin/appointments').set('atoken', 'adminToken').set('a-token','adminToken');
      expect(res.body.success).toBe(true);
      expect(res.body.appointments.length).toBe(1);
    });

    it('POST /api/admin/cancel-appointment cancels and releases slot', async () => {
      appointmentModel.findById.mockResolvedValue({ toObject: () => ({ _id: 'a1', docId: 'd1', slotDate: '2025-01-01', slotTime: '09:00' }) });
      Doctor.findById.mockResolvedValue({ slots_booked: { '2025-01-01': ['09:00'] } });
      Doctor.findByIdAndUpdate.mockResolvedValue(undefined);
      appointmentModel.findByIdAndUpdate.mockResolvedValue(undefined);
      const res = await request(app).post('/api/admin/cancel-appointment').set('atoken', 'adminToken').set('a-token','adminToken').send({ appointmentId: 'a1' });
      expect(res.body.success).toBe(true);
    });

    it('POST /api/admin/cancel-appointment returns 404 when not found', async () => {
      appointmentModel.findById.mockResolvedValue(null);
      const res = await request(app).post('/api/admin/cancel-appointment').set('atoken', 'adminToken').set('a-token','adminToken').send({ appointmentId: 'x' });
      expect(res.status).toBe(404);
    });

    // dashboard testing removed per request
  });
});
