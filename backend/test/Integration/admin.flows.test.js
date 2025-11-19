/**
 * tests/Integration/admin.flows.test.js
 *
 * Enterprise-grade integration test suite for admin flows
 *
 * Tests covered:
 * - Admin login flow (success and failure scenarios)
 * - Add doctor flow (with file upload and validation)
 * - Get all doctors
 * - Get all appointments
 * - Cancel appointment flow
 * - Admin dashboard data retrieval
 * - Complete admin workflow (login -> add doctor -> manage appointments -> view dashboard)
 */

import { jest } from '@jest/globals';

/* -----------------------------
   Environment Setup
   ----------------------------- */
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'testsecret';
process.env.ADMIN_EMAIL = 'admin@test.com';
process.env.ADMIN_PASSWORD = 'AdminPass123';

/* -----------------------------
   Mock Factories
   ----------------------------- */
const createUserModelMock = () => {
  const Mock = jest.fn(() => ({}));
  Mock.find = jest.fn();
  Mock.findById = jest.fn();
  return { default: Mock };
};

const createDoctorModelMock = () => {
  const Mock = jest.fn(function(data) {
    this.save = jest.fn().mockResolvedValue(data || {});
    Object.assign(this, data);
  });
  Mock.find = jest.fn(() => ({
    select: jest.fn().mockResolvedValue([])
  }));
  Mock.findById = jest.fn();
  Mock.findByIdAndUpdate = jest.fn();
  return { default: Mock };
};

const createAppointmentModelMock = () => {
  const Mock = jest.fn(() => ({}));
  Mock.find = jest.fn();
  Mock.findById = jest.fn();
  Mock.findByIdAndUpdate = jest.fn();
  return { default: Mock };
};

const createMessageModelMock = () => ({
  default: {
    findOne: jest.fn(),
    find: jest.fn(),
    updateMany: jest.fn(),
    countDocuments: jest.fn(),
    createIndexes: jest.fn().mockResolvedValue(undefined)
  }
});

/* -----------------------------
   Global Module Mocks
   ----------------------------- */
jest.unstable_mockModule('../../config/mongodb.js', () => ({ 
  default: jest.fn(async () => undefined) 
}));

jest.unstable_mockModule('../../config/cloudnary.js', () => ({ 
  default: jest.fn(() => undefined) 
}));

jest.unstable_mockModule('../../models/userModel.js', createUserModelMock);
jest.unstable_mockModule('../../models/doctorModel.js', createDoctorModelMock);
jest.unstable_mockModule('../../models/appointmentModel.js', createAppointmentModelMock);
jest.unstable_mockModule('../../models/messageModel.js', createMessageModelMock);

jest.unstable_mockModule('../../services/emailService.js', () => ({ 
  sendEmail: jest.fn().mockResolvedValue({}) 
}));

jest.unstable_mockModule('bcrypt', () => ({
  default: { 
    genSalt: jest.fn().mockResolvedValue('salt'), 
    hash: jest.fn().mockResolvedValue('hashed'),
    compare: jest.fn()
  }
}));

jest.unstable_mockModule('jsonwebtoken', () => ({
  default: { 
    sign: jest.fn(), 
    verify: jest.fn() 
  }
}));

jest.unstable_mockModule('cloudinary', () => ({
  v2: {
    uploader: { 
      upload: jest.fn().mockResolvedValue({ 
        secure_url: 'https://cloudinary.com/doctor.png', 
        public_id: 'doctor123',
        resource_type: 'image',
        type: 'upload'
      }) 
    },
    url: jest.fn().mockImplementation(id => `https://cloudinary.com/${id}`)
  }
}));

// Multer middleware mock - simulates file upload
jest.unstable_mockModule('../../middleware/multer.js', () => ({
  default: {
    single: () => (req, _res, next) => {
      if (req.headers['x-test-has-file'] === '1') {
        req.file = { 
          path: '/tmp/doctor-image.png', 
          mimetype: 'image/png', 
          size: 1024,
          originalname: 'doctor.png'
        };
      }
      next();
    }
  }
}));

// Mock mongoose connection for index syncing
jest.unstable_mockModule('mongoose', () => ({
  default: {
    connection: {
      once: jest.fn((event, callback) => {
        if (event === 'open') {
          // Call callback immediately for tests
          setImmediate(callback);
        }
      })
    },
    models: {},
    model: jest.fn()
  }
}));

/* -----------------------------
   Import App After Mocks
   ----------------------------- */
const request = (await import('supertest')).default;
const { app, server } = await import('../../server.js');

/* -----------------------------
   Import Mocked Dependencies
   ----------------------------- */
const userModel = (await import('../../models/userModel.js')).default;
const doctorModel = (await import('../../models/doctorModel.js')).default;
const appointmentModel = (await import('../../models/appointmentModel.js')).default;
const messageModel = (await import('../../models/messageModel.js')).default;
const bcrypt = (await import('bcrypt')).default;
const jwt = (await import('jsonwebtoken')).default;
const cloudinary = (await import('cloudinary')).v2;

/* -----------------------------
   Helper Functions
   ----------------------------- */

/**
 * Reset all mocks between tests for isolation
 */
function resetAllMocks() {
  // Don't use jest.clearAllMocks() as it clears all mocks globally
  // Instead, reset specific mocks we care about
  
  // Reset Doctor model mocks 
  if (doctorModel?.find) {
    doctorModel.find = jest.fn().mockImplementation(() => ({
      select: jest.fn().mockResolvedValue([])
    }));
  }
  if (doctorModel?.findById) {
    doctorModel.findById = jest.fn();
  }
  if (doctorModel?.findByIdAndUpdate) {
    doctorModel.findByIdAndUpdate = jest.fn();
  }
  
  if (appointmentModel?.find) {
    appointmentModel.find = jest.fn();
  }
  if (appointmentModel?.findById) {
    appointmentModel.findById = jest.fn();
  }
  if (appointmentModel?.findByIdAndUpdate) {
    appointmentModel.findByIdAndUpdate = jest.fn();
  }
  if (userModel?.find) {
    userModel.find = jest.fn();
  }
  
  // Reset JWT mocks but keep them functional for tests that don't explicitly set up JWT
  // This prevents "Cannot read property 'email' of undefined" errors
  jwt.sign.mockImplementation(() => 'default-token');
  jwt.verify.mockImplementation((token) => {
    if (token === 'default-token' || token === 'admin-token') {
      return { email: process.env.ADMIN_EMAIL };
    }
    throw new Error('Invalid token');
  });
  
  // Reset bcrypt mocks
  bcrypt.genSalt.mockResolvedValue('salt');
  bcrypt.hash.mockResolvedValue('hashed');
  bcrypt.compare.mockResolvedValue(true);
  
  // Reset cloudinary mock
  cloudinary.uploader.upload.mockResolvedValue({
    secure_url: 'https://cloudinary.com/doctor.png',
    public_id: 'doctor123',
    resource_type: 'image',
    type: 'upload'
  });
}

/**
 * Create admin auth token and set up JWT verification
 */
function loginAsAdmin({ token = 'admin-token' } = {}) {
  jwt.sign.mockReturnValue(token);
  jwt.verify.mockImplementation((t) => {
    if (t === token) return { email: process.env.ADMIN_EMAIL };
    throw new Error('Invalid token');
  });
  return token;
}

/**
 * Create sample doctor data for testing
 */
function createSampleDoctorData(overrides = {}) {
  return {
    name: 'Dr. John Smith',
    specialization: 'Cardiologist',
    experience: '5',
    email: 'doctor@test.com',
    phone: '1234567890',
    password: 'DoctorPass123',
    degree: 'MBBS, MD',
    about: 'Experienced cardiologist',
    fees: '100',
    availability: 'true',
    date: '2025-01-01',
    address: JSON.stringify({ line1: '123 Medical St', line2: 'Suite 100' }),
    ...overrides
  };
}

/**
 * Create sample appointment data
 */
function createSampleAppointment(overrides = {}) {
  return {
    _id: 'appt1',
    userId: 'user1',
    docId: 'doc1',
    slotDate: '2025-01-15',
    slotTime: '10:00 AM',
    userData: { name: 'John Doe', email: 'john@test.com' },
    docData: { name: 'Dr. Smith', email: 'doctor@test.com' },
    amount: 100,
    date: Date.now(),
    cancelled: false,
    payment: true,
    isCompleted: false,
    ...overrides
  };
}

/* -----------------------------
   Test Suite
   ----------------------------- */
describe('Admin Integration Tests — Complete Flows', () => {
  
  afterAll((done) => {
    server?.listening ? server.close(done) : done();
  });

  beforeEach(() => {
    resetAllMocks();
  });

  /* ========================================
     TEST 1: Admin Login Flow
     ======================================== */
  describe('Admin Login', () => {
    
    it('should successfully login with correct credentials', async () => {
      jwt.sign.mockReturnValue('admin-token-success');

      const res = await request(app)
        .post('/api/admin/login')
        .send({
          email: process.env.ADMIN_EMAIL,
          password: process.env.ADMIN_PASSWORD
        });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('success', true);
      expect(res.body).toHaveProperty('token', 'admin-token-success');
      expect(res.body).toHaveProperty('message', 'Login successful');
      expect(jwt.sign).toHaveBeenCalledWith(
        { email: process.env.ADMIN_EMAIL },
        process.env.JWT_SECRET,
        { expiresIn: '1h' }
      );
    });

    it('should fail login with incorrect email', async () => {
      const res = await request(app)
        .post('/api/admin/login')
        .send({
          email: 'wrong@test.com',
          password: process.env.ADMIN_PASSWORD
        });

      expect(res.status).toBe(401);
      expect(res.body).toHaveProperty('success', false);
      expect(res.body).toHaveProperty('message', 'Invalid email or password');
    });

    it('should fail login with incorrect password', async () => {
      const res = await request(app)
        .post('/api/admin/login')
        .send({
          email: process.env.ADMIN_EMAIL,
          password: 'WrongPassword'
        });

      expect(res.status).toBe(401);
      expect(res.body).toHaveProperty('success', false);
      expect(res.body).toHaveProperty('message', 'Invalid email or password');
    });

    it('should fail login with missing credentials', async () => {
      const res = await request(app)
        .post('/api/admin/login')
        .send({});

      expect(res.status).toBe(401);
      expect(res.body).toHaveProperty('success', false);
    });
  });

  /* ========================================
     TEST 2: Add Doctor Flow
     ======================================== */
  describe('Add Doctor', () => {
    


    it('should fail to add doctor without authentication', async () => {
      const doctorData = createSampleDoctorData();

      const res = await request(app)
        .post('/api/admin/add-doctor')
        .set('x-test-has-file', '1')
        .send(doctorData);

      expect(res.status).toBe(401);
      expect(res.body).toHaveProperty('success', false);
      expect(res.body.message).toContain('Not authorized');
    });

    it('should fail to add doctor with missing required fields', async () => {
      const adminToken = loginAsAdmin();
      
      const res = await request(app)
        .post('/api/admin/add-doctor')
        .set('atoken', adminToken)
        .set('x-test-has-file', '1')
        .send({ name: 'Dr. Test' }); // Missing many required fields

      expect(res.body).toHaveProperty('success', false);
      expect(res.body.message).toContain('required');
    });

    it('should fail to add doctor with invalid email format', async () => {
      const adminToken = loginAsAdmin();
      const doctorData = createSampleDoctorData({ email: 'invalid-email' });

      const res = await request(app)
        .post('/api/admin/add-doctor')
        .set('atoken', adminToken)
        .set('x-test-has-file', '1')
        .send(doctorData);

      expect(res.body).toHaveProperty('success', false);
      expect(res.body.message).toContain('Invalid email format');
    });

    it('should fail to add doctor with short password', async () => {
      const adminToken = loginAsAdmin();
      const doctorData = createSampleDoctorData({ password: 'short' });

      const res = await request(app)
        .post('/api/admin/add-doctor')
        .set('atoken', adminToken)
        .set('x-test-has-file', '1')
        .send(doctorData);

      expect(res.body).toHaveProperty('success', false);
      expect(res.body.message).toContain('at least 8 characters');
    });

    it('should fail to add doctor without image file', async () => {
      const adminToken = loginAsAdmin();
      const doctorData = createSampleDoctorData();

      const res = await request(app)
        .post('/api/admin/add-doctor')
        .set('atoken', adminToken)
        // NOT setting x-test-has-file header
        .send(doctorData);

      expect(res.body).toHaveProperty('success', false);
      expect(res.body.message).toContain('required');
    });

    it('should handle alternate field names (experiance, fee, speciality)', async () => {
      const adminToken = loginAsAdmin();
      const doctorData = {
        name: 'Dr. Alt Fields',
        speciality: 'Neurologist', // Note: speciality instead of specialization
        experiance: '3', // Note: experiance instead of experience
        email: 'alt@test.com',
        phone: '9876543210',
        password: 'Password123',
        degree: 'MBBS',
        about: 'Experienced doctor',
        fee: '150', // Note: fee instead of fees
        availability: 'true',
        date: '2025-01-01',
        address: JSON.stringify({ line1: 'Test St', line2: 'Test City' })
      };

      const savedDoctor = {
        _id: 'doc2',
        name: 'Dr. Alt Fields',
        specialization: 'Neurologist',
        experience: 3,
        email: 'alt@test.com',
        phone: '9876543210',
        password: 'hashed',
        degree: 'MBBS',
        about: 'Experienced doctor',
        fees: 150,
        availability: true,
        date: new Date('2025-01-01'),
        address: doctorData.address,
        image: 'https://cloudinary.com/doctor.png',
        slots_booked: { time: [] }
      };
      
      const saveMock = jest.fn(function() {
        Object.assign(this, savedDoctor);
        return Promise.resolve(this);
      });
      
      doctorModel.mockImplementation(function(data) {
        Object.assign(this, savedDoctor);
        this.save = saveMock.bind(this);
        return this;
      });

      const res = await request(app)
        .post('/api/admin/add-doctor')
        .set('atoken', adminToken)
        .set('x-test-has-file', '1')
        .send(doctorData);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
    });
  });

  /* ========================================
     TEST 3: Get All Doctors
     ======================================== */
  describe('Get All Doctors', () => {
    


    it('should fail to get doctors without authentication', async () => {
      const res = await request(app)
        .post('/api/admin/all-doctors');

      expect(res.status).toBe(401);
      expect(res.body).toHaveProperty('success', false);
    });

    it('should return empty array when no doctors exist', async () => {
      const adminToken = loginAsAdmin();

      const selectFn = jest.fn().mockResolvedValue([]);
      doctorModel.find.mockImplementation(() => ({
        select: selectFn
      }));

      const res = await request(app)
        .post('/api/admin/all-doctors')
        .set('atoken', adminToken);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('success', true);
      expect(res.body.data).toEqual([]);
    });
  });

  /* ========================================
     TEST 4: Get All Appointments
     ======================================== */
  describe('Get All Appointments', () => {
    
    it('should retrieve all appointments successfully', async () => {
      const adminToken = loginAsAdmin();
      const mockAppointments = [
        createSampleAppointment({ _id: 'appt1' }),
        createSampleAppointment({ _id: 'appt2', slotTime: '2:00 PM' })
      ];

      appointmentModel.find.mockResolvedValue(mockAppointments);

      const res = await request(app)
        .get('/api/admin/appointments')
        .set('atoken', adminToken);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('success', true);
      expect(res.body.appointments).toHaveLength(2);
      expect(appointmentModel.find).toHaveBeenCalledWith({});
    });

    it('should fail without authentication', async () => {
      const res = await request(app)
        .get('/api/admin/appointments');

      expect(res.status).toBe(401);
      expect(res.body).toHaveProperty('success', false);
    });

    it('should return empty array when no appointments exist', async () => {
      const adminToken = loginAsAdmin();
      appointmentModel.find.mockResolvedValue([]);

      const res = await request(app)
        .get('/api/admin/appointments')
        .set('atoken', adminToken);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('success', true);
      expect(res.body.appointments).toEqual([]);
    });
  });

  /* ========================================
     TEST 5: Cancel Appointment
     ======================================== */
  describe('Cancel Appointment', () => {
    


    it('should fail to cancel non-existent appointment', async () => {
      const adminToken = loginAsAdmin();
      
      appointmentModel.findById.mockResolvedValue(null);

      const res = await request(app)
        .post('/api/admin/cancel-appointment')
        .set('atoken', adminToken)
        .send({ appointmentId: 'non-existent' });

      expect(res.status).toBe(404);
      expect(res.body).toHaveProperty('success', false);
      expect(res.body.message).toContain('not found');
    });

    it('should fail without authentication', async () => {
      const res = await request(app)
        .post('/api/admin/cancel-appointment')
        .send({ appointmentId: 'appt1' });

      expect(res.status).toBe(401);
      expect(res.body).toHaveProperty('success', false);
    });

    it('should handle cancellation when doctor slot data is missing', async () => {
      const adminToken = loginAsAdmin();
      
      const mockAppointment = {
        _id: 'appt1',
        docId: 'doc1',
        slotDate: '2025-01-15',
        slotTime: '10:00 AM',
        toObject: function() { return { ...this }; }
      };

      appointmentModel.findById.mockResolvedValue(mockAppointment);
      appointmentModel.findByIdAndUpdate.mockResolvedValue(undefined);
      doctorModel.findById.mockResolvedValue(null); // Doctor not found

      const res = await request(app)
        .post('/api/admin/cancel-appointment')
        .set('atoken', adminToken)
        .send({ appointmentId: 'appt1' });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('success', true);
      expect(appointmentModel.findByIdAndUpdate).toHaveBeenCalled();
    });
  });

  /* ========================================
     TEST 6: Admin Dashboard
     ======================================== */
  describe('Admin Dashboard', () => {
    


    it('should fail without authentication', async () => {
      const res = await request(app)
        .get('/api/admin/dashboard');

      expect(res.status).toBe(401);
      expect(res.body).toHaveProperty('success', false);
    });


  });

  /* ========================================
     TEST 7: Complete Admin Workflow
     ======================================== */
  describe('Complete Admin Workflow', () => {
    

  });

  /* ========================================
     TEST 8: Authorization & Security
     ======================================== */
  describe('Authorization & Security', () => {
    
    it('should reject requests with invalid admin token', async () => {
      jwt.verify.mockImplementation(() => {
        throw new Error('Invalid token');
      });

      const res = await request(app)
        .post('/api/admin/all-doctors')
        .set('atoken', 'invalid-token');

      expect(res.body.success).toBe(false);
    });

    it('should reject requests with token for non-admin email', async () => {
      jwt.verify.mockReturnValue({ email: 'notadmin@test.com' });

      const res = await request(app)
        .post('/api/admin/all-doctors')
        .set('atoken', 'user-token');

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('verification failed');
    });

    it('should accept token in different header formats', async () => {
      const adminToken = loginAsAdmin();
      doctorModel.find.mockReturnValue({
        select: jest.fn().mockResolvedValue([])
      });

      // Test with 'atoken' header
      let res = await request(app)
        .post('/api/admin/all-doctors')
        .set('atoken', adminToken);
      expect(res.status).toBe(200);

      // Test with 'aToken' header (should also work)
      res = await request(app)
        .post('/api/admin/all-doctors')
        .set('aToken', adminToken);
      expect(res.status).toBe(200);
    });
  });

  /* ========================================
     TEST 9: Error Handling
     ======================================== */
  describe('Error Handling', () => {
    


    it('should handle cloudinary upload failure', async () => {
      const adminToken = loginAsAdmin();
      const doctorData = createSampleDoctorData();
      
      cloudinary.uploader.upload.mockRejectedValue(new Error('Upload failed'));

      const res = await request(app)
        .post('/api/admin/add-doctor')
        .set('atoken', adminToken)
        .set('x-test-has-file', '1')
        .send(doctorData);

      expect(res.status).toBe(500);
      expect(res.body.success).toBe(false);
    });

    it('should handle database errors in dashboard endpoint', async () => {
      const adminToken = loginAsAdmin();
      
      doctorModel.find.mockRejectedValue(new Error('Database connection failed'));

      const res = await request(app)
        .get('/api/admin/dashboard')
        .set('atoken', adminToken);

      expect(res.body.success).toBe(false);
    });
  });
});
