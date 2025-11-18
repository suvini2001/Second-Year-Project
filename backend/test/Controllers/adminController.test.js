import { jest } from '@jest/globals';

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'unit-test-secret'; // controllers rely on this secret while signing tokens

const createMockRes = () => {
  // Mimic Express' res object so each handler can drive status/json chains.
  const res = {};
  res.status = jest.fn().mockImplementation((code) => {
    res.statusCode = code;
    return res;
  });
  res.json = jest.fn().mockImplementation((payload) => {
    res.body = payload;
    return res;
  });
  return res;
};

// Mock every dependency the controller touches so the tests stay hermetic.
jest.unstable_mockModule('validator', () => ({
  __esModule: true,
  default: { isEmail: jest.fn() },
}));
jest.unstable_mockModule('bcrypt', () => ({
  __esModule: true,
  default: { genSalt: jest.fn(), hash: jest.fn() },
}));
jest.unstable_mockModule('cloudinary', () => ({
  __esModule: true,
  v2: { uploader: { upload: jest.fn() } },
}));

const doctorConstructorMock = jest.fn();
doctorConstructorMock.find = jest.fn();
doctorConstructorMock.findById = jest.fn();
doctorConstructorMock.findByIdAndUpdate = jest.fn();
jest.unstable_mockModule('../../models/doctorModel.js', () => ({
  __esModule: true,
  default: doctorConstructorMock,
}));

jest.unstable_mockModule('../../models/appointmentModel.js', () => ({
  __esModule: true,
  default: {
    find: jest.fn(),
    findById: jest.fn(),
    findByIdAndUpdate: jest.fn(),
  },
}));

jest.unstable_mockModule('../../models/userModel.js', () => ({
  __esModule: true,
  default: {
    find: jest.fn(),
  },
}));

jest.unstable_mockModule('jsonwebtoken', () => ({
  __esModule: true,
  default: { sign: jest.fn() },
}));

const validator = (await import('validator')).default; // shared mock instance
const bcrypt = (await import('bcrypt')).default;
const cloudinary = (await import('cloudinary')).v2;
const Doctor = (await import('../../models/doctorModel.js')).default;
const appointmentModel = (await import('../../models/appointmentModel.js')).default;
const User = (await import('../../models/userModel.js')).default;
const jwt = (await import('jsonwebtoken')).default;
const {
  addDoctor,
  loginAdmin,
  allDoctors,
  appointmentsAdmin,
  appointmentCancel,
  adminDashboard,
} = await import('../../controllers/adminController.js');

const baseDoctorPayload = {
  // Mirrors the shape the frontend sends when adding a doctor; tweaked per test case.
  name: 'Dr. Nova',
  specialization: 'Cardiology',
  email: 'nova@example.com',
  phone: '0771234567',
  password: 'StrongPass123',
  availability: 'true',
  experience: '12 years',
  fees: '120.50',
  date: '2025-01-01',
};

const fileStub = { path: '/tmp/image.png' };

const dummyAppointment = {
  // Minimal appointment snapshot that still exercises slot-release logic.
  _id: 'appt1',
  docId: 'doc1',
  slotDate: '2025-02-02',
  slotTime: '10:00',
  toObject() {
    return { _id: this._id, docId: this.docId, slotDate: this.slotDate, slotTime: this.slotTime };
  },
};

describe('adminController unit tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.ADMIN_EMAIL = 'admin@example.com';
    process.env.ADMIN_PASSWORD = 'top-secret';
  });

  describe('addDoctor', () => {
    // "Happy path" ensures every branch (validation, hashing, upload, save) is wired correctly.
    it('persists a fully populated doctor profile when validation passes', async () => {
      // Arrange: wire every dependency to resolve happily.
      validator.isEmail.mockReturnValue(true);
      bcrypt.genSalt.mockResolvedValue('salt');
      bcrypt.hash.mockResolvedValue('hashed-pass');
      cloudinary.uploader.upload.mockResolvedValue({ secure_url: 'https://cloud/doc.png' });
      Doctor.mockImplementation((payload) => ({
        payload,
        save: jest.fn().mockResolvedValue({ _id: 'doc123' }),
      }));

      const res = createMockRes();
      // Act: invoke the controller with a valid payload and fake image file.
      await addDoctor({ body: { ...baseDoctorPayload }, file: { ...fileStub } }, res);

      // Assert: status 201 and the sanitized payload persisted.
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.body.success).toBe(true);
      expect(Doctor).toHaveBeenCalledWith(expect.objectContaining({ password: 'hashed-pass', image: 'https://cloud/doc.png' }));
    });

    it('rejects payloads missing any required field', async () => {
      // Missing name should short-circuit before touching expensive dependencies.
      const res = createMockRes();
      await addDoctor({ body: { ...baseDoctorPayload, name: '' }, file: { ...fileStub } }, res);
      expect(res.body).toEqual({ success: false, message: 'All fields are required' });
    });

    it('rejects malformed dates before hitting downstream logic', async () => {
      validator.isEmail.mockReturnValue(true);
      const res = createMockRes();
      await addDoctor({ body: { ...baseDoctorPayload, date: 'not-a-date' }, file: { ...fileStub } }, res);
      expect(res.body).toEqual({ success: false, message: 'Invalid date format' });
    });

    it('validates email structure via validator.isEmail', async () => {
      validator.isEmail.mockReturnValue(false);
      const res = createMockRes();
      await addDoctor({ body: { ...baseDoctorPayload }, file: { ...fileStub } }, res);
      expect(res.body).toEqual({ success: false, message: 'Invalid email format' });
      expect(validator.isEmail).toHaveBeenCalledWith('nova@example.com');
    });
  });

  describe('loginAdmin', () => {
    it('returns a signed JWT when credentials match .env values', async () => {
      jwt.sign.mockReturnValue('token-123');
      const res = createMockRes();
      // Happy path: env credentials supplied.
      await loginAdmin({ body: { email: 'admin@example.com', password: 'top-secret' } }, res);
      expect(res.body).toEqual({ success: true, token: 'token-123', message: 'Login successful' });
    });

    it('responds 401 for mismatched credentials', async () => {
      // Negative path ensures we return Unauthorized instead of leaking context.
      const res = createMockRes();
      await loginAdmin({ body: { email: 'wrong@example.com', password: 'nope' } }, res);
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.body).toEqual({ success: false, message: 'Invalid email or password' });
    });
  });

  describe('allDoctors', () => {
    it('returns the doctor list with passwords stripped', async () => {
      // Chainable select mock to mimic Mongoose queries.
      const select = jest.fn().mockResolvedValue([{ _id: 'doc1', name: 'Doc' }]);
      Doctor.find.mockReturnValue({ select });
      const res = createMockRes();
      await allDoctors({}, res);
      expect(select).toHaveBeenCalledWith('-password');
      expect(res.body).toEqual({ success: true, data: [{ _id: 'doc1', name: 'Doc' }] });
    });

    it('bubbles database errors', async () => {
      // If the query rejects, controller should surface message instead of throwing.
      const select = jest.fn().mockRejectedValue(new Error('db down'));
      Doctor.find.mockReturnValue({ select });
      const res = createMockRes();
      await allDoctors({}, res);
      expect(res.body).toEqual({ success: false, message: 'db down' });
    });
  });

  describe('appointmentsAdmin', () => {
    it('returns every appointment', async () => {
      appointmentModel.find.mockResolvedValue([{ _id: 'appt1' }]);
      const res = createMockRes();
      await appointmentsAdmin({}, res);
      expect(res.body).toEqual({ success: true, appointments: [{ _id: 'appt1' }] });
    });

    it('returns the thrown message when the query fails', async () => {
      appointmentModel.find.mockRejectedValue(new Error('boom'));
      const res = createMockRes();
      await appointmentsAdmin({}, res);
      expect(res.body).toEqual({ success: false, message: 'boom' });
    });
  });

  describe('appointmentCancel', () => {
    it('marks the appointment cancelled and frees the slot', async () => {
      appointmentModel.findById.mockResolvedValue(dummyAppointment);
      appointmentModel.findByIdAndUpdate.mockResolvedValue();
      Doctor.findById.mockResolvedValue({ slots_booked: { '2025-02-02': ['10:00', '11:00'] } });
      Doctor.findByIdAndUpdate.mockResolvedValue();

      const res = createMockRes();
      // Act: admin cancels an appointment so slot must be reopened.
      await appointmentCancel({ body: { appointmentId: 'appt1' } }, res);

      // Expect write operations on both appointment + doctor collections.
      expect(appointmentModel.findByIdAndUpdate).toHaveBeenCalledWith('appt1', { cancelled: true });
      expect(Doctor.findByIdAndUpdate).toHaveBeenCalledWith('doc1', { slots_booked: { '2025-02-02': ['11:00'] } });
      expect(res.body).toEqual({ success: true, message: 'Appointment Cancelled' });
    });

    it('returns 404 when the appointment is missing', async () => {
      appointmentModel.findById.mockResolvedValue(null);
      const res = createMockRes();
      await appointmentCancel({ body: { appointmentId: 'missing' } }, res);
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.body).toEqual({ success: false, message: 'Appointment not found' });
    });
  });

  describe('adminDashboard', () => {
    it('aggregates counts and slices the latest 5 appointments', async () => {
      Doctor.find.mockResolvedValueOnce([{ _id: 'd1' }, { _id: 'd2' }]);
      User.find.mockResolvedValueOnce([{ _id: 'u1' }]);
      appointmentModel.find.mockResolvedValue([
        { _id: 'a1' },
        { _id: 'a2' },
        { _id: 'a3' },
      ]);

      const res = createMockRes();
      await adminDashboard({}, res);

      // Dashboard must expose aggregate counts plus only the latest handful of appointments.
      expect(res.body.success).toBe(true);
      expect(res.body.dashData).toMatchObject({ doctors: 2, patients: 1, appointments: 3 });
      expect(res.body.dashData.latestAppointments.length).toBeLessThanOrEqual(5);
    });
  });
});
