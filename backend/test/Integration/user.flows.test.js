/**
 * tests/Integration/user.flows.enterprise.test.js
 *
 * Option C — Enterprise Grade test suite (clean, scalable, deterministic)
 *
 * Notes:
 * - Uses jest.unstable_mockModule to mock modules before importing the app.
 * - Top-level await is used to import the server after mocks are registered.
 * - Provides mock factories and helper functions to keep tests DRY and collision-free.
 *
 * Paste into your test folder and run with your normal jest command.
 */

import { jest } from '@jest/globals';

/* -----------------------------
   Environment
   ----------------------------- */
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'testsecret';

/* -----------------------------
   Mock factories (reusable)
   ----------------------------- */
const createUserModelMock = () => {
  const Mock = jest.fn(() => ({}));
  Mock.findOne = jest.fn();
  Mock.findById = jest.fn();
  Mock.findByIdAndUpdate = jest.fn();
  return { default: Mock };
};

const createDoctorModelMock = () => {
  return { default: { findById: jest.fn(), find: jest.fn(), findByIdAndUpdate: jest.fn() } };
};

const createAppointmentModelMock = () => {
  const Mock = jest.fn(() => ({}));
  Mock.find = jest.fn();
  Mock.findById = jest.fn();
  Mock.findByIdAndUpdate = jest.fn();
  Mock.prototype.save = jest.fn();
  return { default: Mock };
};

const createMessageModelMock = () => ({
  default: {
    findOne: jest.fn(),
    find: jest.fn(),
    updateMany: jest.fn(),
    countDocuments: jest.fn()
  }
});

/* -----------------------------
   Global module mocks (register before importing app)
   ----------------------------- */
jest.unstable_mockModule('../../config/mongodb.js', () => ({ default: jest.fn(async () => undefined) }));
jest.unstable_mockModule('../../config/cloudnary.js', () => ({ default: jest.fn(() => undefined) }));

jest.unstable_mockModule('../../models/userModel.js', createUserModelMock);
jest.unstable_mockModule('../../models/doctorModel.js', createDoctorModelMock);
jest.unstable_mockModule('../../models/appointmentModel.js', createAppointmentModelMock);
jest.unstable_mockModule('../../models/messageModel.js', createMessageModelMock);

jest.unstable_mockModule('../../services/emailService.js', () => ({ sendEmail: jest.fn().mockResolvedValue({}) }));

jest.unstable_mockModule('bcrypt', () => ({
  default: { genSalt: jest.fn(), hash: jest.fn(), compare: jest.fn() }
}));

jest.unstable_mockModule('jsonwebtoken', () => ({
  default: { sign: jest.fn(), verify: jest.fn() }
}));

jest.unstable_mockModule('cloudinary', () => ({
  v2: {
    uploader: { upload: jest.fn().mockResolvedValue({ secure_url: 'https://cloud/f.png', public_id: 'pub123', resource_type: 'image', type: 'upload' }) },
    url: jest.fn().mockImplementation(id => `https://cloud/${id}`)
  }
}));

// Multer middleware stub: only attach file when a test header is present
jest.unstable_mockModule('../../middleware/multer.js', () => ({
  default: {
    single: () => (req, _res, next) => {
      if (req.headers['x-test-has-file'] === '1') {
        req.file = { path: '/tmp/fake.dat', mimetype: 'image/png', size: 1024, originalname: 'fake.png' };
      }
      next();
    }
  }
}));

/* -----------------------------
   Import app AFTER mocks are registered
   ----------------------------- */
const request = (await import('supertest')).default;
const { app, server } = await import('../../server.js');

/* -----------------------------
   Resolved mocks (shorthand handles)
   ----------------------------- */
const userModel = (await import('../../models/userModel.js')).default;
const doctorModel = (await import('../../models/doctorModel.js')).default;
const appointmentModel = (await import('../../models/appointmentModel.js')).default;
const messageModel = (await import('../../models/messageModel.js')).default;
const bcrypt = (await import('bcrypt')).default;
const jwt = (await import('jsonwebtoken')).default;

/* -----------------------------
   Helper utilities for tests
   ----------------------------- */

/**
 * Reset all commonly-used mocks - call inside beforeEach or between test parts.
 * Using both jest.clearAllMocks and explicit reset of chained-return mocks to be safe.
 */
function resetAllMocksDeep() {
  jest.clearAllMocks();

  // For models that return function chains (e.g., find().sort().limit().lean())
  // ensure .mockReset is called if functions exist
  if (messageModel?.find?.mockReset) messageModel.find.mockReset();
  if (messageModel?.findOne?.mockReset) messageModel.findOne.mockReset();
  if (messageModel?.countDocuments?.mockReset) messageModel.countDocuments.mockReset();
  if (appointmentModel?.find?.mockReset) appointmentModel.find.mockReset();
  if (appointmentModel?.findById?.mockReset) appointmentModel.findById.mockReset();
  if (doctorModel?.findById?.mockReset) doctorModel.findById.mockReset();
  if (userModel?.findById?.mockReset) userModel.findById.mockReset();
}

/**
 * Create a deterministic JWT token for a "user" and set verify mock to accept it.
 * Returns token string to place in headers for requests that expect it.
 */
function loginAsUser({ id = 'u1', type = 'user', token = 'tok-user' } = {}) {
  jwt.sign.mockReturnValue(token); // what registration/login uses
  jwt.verify.mockImplementation((t) => {
    if (t === token) return { id, type };
    throw new Error('invalid token');
  });
  return token;
}

/**
 * Create appointment save mock: returns a save function and also sets up
 * appointmentModel.findById sequences if provided.
 */
function createAppointmentSaveMock(savedId = 'a1') {
  const apptSave = jest.fn().mockResolvedValue({ _id: savedId });
  // If appointmentModel is a constructor mock, set it up to return object with save
  appointmentModel.mockImplementation(() => ({ save: apptSave }));
  return apptSave;
}

/**
 * Build chained-return mock for messageModel.find(...) -> sort(...) -> limit(...) -> lean()
 * messages: array to be resolved by .lean()
 */
function mockMessageFindChain(messages = []) {
  messageModel.find.mockReturnValue({
    sort: () => ({
      limit: () => ({
        lean: jest.fn().mockResolvedValue(messages)
      })
    })
  });
}

/**
 * Build chained-return mock for appointmentModel.find(...) -> select(...) -> lean()
 */
function mockAppointmentFindChain(results = []) {
  appointmentModel.find.mockReturnValue({
    select: () => ({
      lean: jest.fn().mockResolvedValue(results)
    })
  });
}

/* -----------------------------
   Test suite
   ----------------------------- */
describe('User end-to-end flow — Enterprise tests', () => {
  // Ensure server closed after test run
  afterAll((done) => {
    server?.listening ? server.close(done) : done();
  });

  // Reset mocks between tests for absolute isolation
  beforeEach(() => {
    resetAllMocksDeep();
  });

  /* ---------------------------------------------------------------------
     Test 1: Full user flow — register, login, book, generate payment,
             verify payment, cancel (uses sequence mocks)
     --------------------------------------------------------------------- */
  it('registers, logs in, books, verifies payment, and cancels', async () => {
    // ---------- Arrange: registration/login basics ----------
    const save = jest.fn().mockResolvedValue({ _id: 'u1' });
    userModel.mockImplementation(() => ({ save }));

    // bcrypt & jwt behaviors for register + login
    bcrypt.genSalt.mockResolvedValue('salt');
    bcrypt.hash.mockResolvedValue('hashed');
    jwt.sign.mockReturnValue('tok-user');

    // Login: found user and password compare ok
    userModel.findOne.mockResolvedValue({ _id: 'u1', password: 'hashed' });
    bcrypt.compare.mockResolvedValue(true);

    // loginAsUser sets jwt.verify for subsequent authenticated endpoints
    const token = loginAsUser({ id: 'u1', type: 'user', token: 'tok-user' });

    // ---------- Arrange: doctor & appointment sequences ----------
    const docToBook = {
      _id: 'd1',
      fees: 100,
      availability: true,
      slots_booked: {},
      address: { line1: 'x' },
      toObject: () => ({ _id: 'd1', fees: 100, availability: true, address: { line1: 'x' } })
    };

    // doctorModel.findById will be called multiple times in sequence by the flow.
    // Use mockImplementationOnce to be explicit and deterministic.
    doctorModel.findById
      .mockImplementationOnce(() => ({ select: () => Promise.resolve(docToBook) })) // booking
      .mockImplementationOnce(() => Promise.resolve({ earnings: 50, email: 'd@e.com' })) // verify-payment
      .mockImplementationOnce(() => Promise.resolve({ slots_booked: { '2025-01-01': ['09:00'] } })); // cancel

    // userModel.findById -> used for embedding user details when booking
    userModel.findById.mockImplementation(() => ({ select: () => Promise.resolve({ _id: 'u1', name: 'User' }) }));

    // appointmentModel save mock
    const apptSave = createAppointmentSaveMock('a1');

    // appointmentModel.findById sequence used by verify-payment and cancel
    appointmentModel.findById
      .mockResolvedValueOnce({
        _id: 'a1',
        amount: 100,
        docId: 'd1',
        userData: { email: 'u@e.com' },
        docData: { email: 'd@e.com', name: 'Doc' },
        slotDate: '2025-01-01',
        slotTime: '09:00'
      })
      .mockResolvedValueOnce({
        _id: 'a1',
        userId: 'u1',
        docId: 'd1',
        slotDate: '2025-01-01',
        slotTime: '09:00'
      });

    appointmentModel.findByIdAndUpdate.mockResolvedValue(undefined);
    doctorModel.findByIdAndUpdate.mockResolvedValue(undefined);

    // ---------- Act & Assert: Register ----------
    let res = await request(app)
      .post('/api/user/register')
      .send({ name: 'U', email: 'u@example.com', password: 'StrongPass123' });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('success', true);
    expect(res.body).toHaveProperty('token', 'tok-user');
    expect(save).toHaveBeenCalled();

    // ---------- Act & Assert: Login ----------
    res = await request(app)
      .post('/api/user/login')
      .send({ email: 'u@example.com', password: 'StrongPass123' });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('success', true);
    const authToken = res.body.token;
    expect(authToken).toBeDefined();

    // ---------- Act & Assert: Book appointment ----------
    res = await request(app)
      .post('/api/user/book-appointment')
      .set('token', authToken)
      .send({ docId: 'd1', slotDate: '2025-01-01', slotTime: '09:00' });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('success', true);
    expect(apptSave).toHaveBeenCalled();

    // ---------- Act & Assert: Generate payment ----------
    res = await request(app)
      .post('/api/user/generate-payment')
      .set('token', authToken)
      .send({ appointmentId: 'a1' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.payment).toBeDefined();
    expect(res.body.payment).toHaveProperty('sessionId');

    // ---------- Act & Assert: Verify payment ----------
    res = await request(app)
      .post('/api/user/verify-payment')
      .send({ appointmentId: 'a1' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    // ---------- Act & Assert: Cancel appointment ----------
    res = await request(app)
      .post('/api/user/cancel-appointment')
      .set('token', authToken)
      .send({ appointmentId: 'a1' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  /* ---------------------------------------------------------------------
     Test 2: Inbox + messages + unread counts (mocks isolated and reset)
     --------------------------------------------------------------------- */
  it('loads inbox and messages with unread counts', async () => {
    // Create a token + verify
    const token = loginAsUser({ id: 'u1', type: 'user', token: 'tok-user' });

    // ------------------ INBOX mocks ------------------
    mockAppointmentFindChain([
      { _id: 'a1', docData: { name: 'D' }, date: 1, cancelled: false, isCompleted: false, payment: true }
    ]);

    messageModel.findOne.mockReturnValue({
      sort: () => ({
        lean: jest.fn().mockResolvedValue({ message: 'hi', timestamp: new Date(), senderType: 'doctor' })
      })
    });

    messageModel.countDocuments.mockResolvedValue(2);

    mockMessageFindChain([
      { _id: 'm2', message: 'b', timestamp: new Date(), senderType: 'doctor' },
      { _id: 'm1', message: 'a', timestamp: new Date(), senderType: 'user' }
    ]);

    messageModel.updateMany.mockResolvedValue({ modifiedCount: 1 });

    // socket.io mock (controller expects global.io)
    global.io = { to: () => ({ emit: jest.fn() }) };

    // Act: fetch inbox
    const inboxRes = await request(app).get('/api/user/inbox').set('token', token);
    expect(inboxRes.status).toBe(200);
    expect(inboxRes.body.success).toBe(true);
    expect(Array.isArray(inboxRes.body.inbox)).toBe(true);
    expect(inboxRes.body.inbox.length).toBeGreaterThan(0);

    // ------------------ Reset mocks to avoid collision ------------------
    // Only clear the message-specific mocks we used above; keep jwt.verify intact
    messageModel.find.mockReset();
    messageModel.findOne.mockReset();
    messageModel.countDocuments.mockReset();
    messageModel.updateMany.mockReset();

    // ------------------ MESSAGES endpoint mocks ------------------
    appointmentModel.findById.mockReturnValue({
      lean: jest.fn().mockResolvedValue({ _id: 'a1', userId: 'u1', docId: 'd1' })
    });

    mockMessageFindChain([
      { _id: 'm1', message: 'Hello', timestamp: new Date(), senderType: 'doctor' },
      { _id: 'm2', message: 'Hi', timestamp: new Date(), senderType: 'user' }
    ]);

    // Mock updateMany and countDocuments for getMessages controller
    messageModel.updateMany.mockResolvedValue({ modifiedCount: 1 });
    messageModel.countDocuments.mockResolvedValue(0); // No older messages

    // Act: fetch messages
    const msgRes = await request(app).get('/api/user/messages/a1').set('token', token);
    expect(msgRes.status).toBe(200);
    expect(msgRes.body.success).toBe(true);
    expect(Array.isArray(msgRes.body.messages)).toBe(true);
    expect(msgRes.body.messages.length).toBe(2);

    // ------------------ Unread messages endpoint ------------------
    // Reset appointmentModel.find for this endpoint
    appointmentModel.find.mockReset();
    appointmentModel.find.mockResolvedValue([{ _id: 'a1' }, { _id: 'a2' }]);
    messageModel.countDocuments.mockResolvedValue(2);
    const unreadRes = await request(app).get('/api/user/unread-messages').set('token', token);
    expect(unreadRes.status).toBe(200);
    expect(unreadRes.body.success).toBe(true);
    expect(unreadRes.body.unreadCount).toBe(2);
  });

  /* ---------------------------------------------------------------------
     Optional: additional tests can be added here to keep pattern consistent
     - use helper functions to create consistent mocks and sequences
     - always reset messageModel.find before chaining a new find mock
     --------------------------------------------------------------------- */
});
