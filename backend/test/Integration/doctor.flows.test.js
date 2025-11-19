// Doctor API integration tests
// Focus: auth, appointments list with unread counts, complete/cancel, inbox, profile update, file upload
import { jest } from '@jest/globals';

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'testsecret';

// Infra
jest.unstable_mockModule('../../config/mongodb.js', () => ({ default: jest.fn(async () => undefined) }));
jest.unstable_mockModule('../../config/cloudnary.js', () => ({ default: jest.fn(() => undefined) }));

// Models
jest.unstable_mockModule('../../models/doctorModel.js', () => {
  const mock = { findOne: jest.fn(), findById: jest.fn(), findByIdAndUpdate: jest.fn(), find: jest.fn() };
  return { default: mock };
});
jest.unstable_mockModule('../../models/appointmentModel.js', () => {
  const mock = { find: jest.fn(), findById: jest.fn(), findByIdAndUpdate: jest.fn() };
  return { default: mock };
});
jest.unstable_mockModule('../../models/messageModel.js', () => ({
  default: {
    countDocuments: jest.fn(),
    findOne: jest.fn(),
  }
}));

// Third-party
jest.unstable_mockModule('bcrypt', () => ({ default: { compare: jest.fn() } }));
jest.unstable_mockModule('jsonwebtoken', () => ({ default: { sign: jest.fn(), verify: jest.fn() } }));
jest.unstable_mockModule('cloudinary', () => ({
  v2: { uploader: { upload: jest.fn().mockResolvedValue({ secure_url: 'https://c/i.png' }) }, url: jest.fn().mockReturnValue('https://c/thumb.png') }
}));
jest.unstable_mockModule('../../middleware/multer.js', () => ({
  default: { single: () => (req, _res, next) => { if (req.headers['x-test-has-file'] === '1') req.file = { path: '/tmp/x', mimetype: 'image/png', size: 1000, originalname: 'x.png' }; next(); } }
}));

const request = (await import('supertest')).default;
const { app, server } = await import('../../server.js');

const doctorModel = (await import('../../models/doctorModel.js')).default;
const appointmentModel = (await import('../../models/appointmentModel.js')).default;
const messageModel = (await import('../../models/messageModel.js')).default;
const bcrypt = (await import('bcrypt')).default;
const jwt = (await import('jsonwebtoken')).default;

describe('Doctor flows', () => {
  afterAll((done) => { server.listening ? server.close(done) : done(); });
  beforeEach(() => { jest.clearAllMocks(); });

  it('logs in and lists appointments with unread count', async () => {
    // Arrange
    doctorModel.findOne.mockResolvedValue({ _id: 'd1', password: 'hpw' });
    bcrypt.compare.mockResolvedValue(true);
    jwt.sign.mockReturnValue('tok-doc');
    jwt.verify.mockReturnValue({ id: 'd1', type: 'doctor' });
    appointmentModel.find.mockReturnValue({ sort: () => ({ lean: jest.fn().mockResolvedValue([
      { _id: 'a1', userId: 'u1', amount: 100 },
      { _id: 'a2', userId: 'u2', amount: 120 },
    ]) }) });
    messageModel.countDocuments.mockResolvedValueOnce(2).mockResolvedValueOnce(0);

    // Act
    let res = await request(app).post('/api/doctor/login').send({ email: 'd@e.com', password: 'x' });
    expect(res.body.success).toBe(true);
    const token = res.body.token;

    res = await request(app).get('/api/doctor/appointments').set('dtoken', token);
    // Assert
    expect(res.body.success).toBe(true);
    expect(res.body.appointments).toHaveLength(2);
    expect(res.body.appointments[0]).toHaveProperty('unreadCount');
  });

  it('completes and cancels an appointment with auth', async () => {
    // Arrange
    jwt.verify.mockReturnValue({ id: 'd1', type: 'doctor' });
    appointmentModel.findById.mockResolvedValue({ _id: 'a1', docId: 'd1' });
    appointmentModel.findByIdAndUpdate.mockResolvedValue(undefined);

    // Act
    let res = await request(app).post('/api/doctor/complete-appointment').set('dtoken', 'tok').send({ appointmentId: 'a1' });
    expect(res.body.success).toBe(true);

    res = await request(app).post('/api/doctor/cancel-appointment').set('dtoken', 'tok').send({ appointmentId: 'a1' });
    expect(res.body.success).toBe(true);
  });

  it('reads dashboard and profile, updates profile without file', async () => {
    jwt.verify.mockReturnValue({ id: 'd1', type: 'doctor' });
    appointmentModel.find.mockResolvedValue([
      { amount: 100, isCompleted: true, payment: false, userId: 'u1' },
      { amount: 120, isCompleted: false, payment: true, userId: 'u2' },
    ]);
    doctorModel.findById.mockReturnValue({ select: jest.fn().mockResolvedValue({ _id: 'd1', name: 'Doc' }) });
    doctorModel.findByIdAndUpdate.mockResolvedValue(undefined);

    let res = await request(app).get('/api/doctor/dashboard').set('dtoken', 'tok');
    expect(res.body.success).toBe(true);
    expect(res.body.dashData).toHaveProperty('earnings');

    res = await request(app).get('/api/doctor/profile').set('dtoken', 'tok');
    expect(res.body.success).toBe(true);
    expect(res.body.profileData).toHaveProperty('name', 'Doc');

    res = await request(app).post('/api/doctor/update-profile').set('dtoken', 'tok').send({ about: 'New about' });
    expect(res.body.success).toBe(true);
  });

  it('loads inbox and supports chat file upload', async () => {
    jwt.verify.mockReturnValue({ id: 'd1', type: 'doctor' });
    appointmentModel.find.mockReturnValue({ select: () => ({ lean: jest.fn().mockResolvedValue([
      { _id: 'a1', userData: { name: 'U' }, date: 1 }
    ]) }) });
    messageModel.findOne.mockReturnValue({ sort: () => ({ lean: jest.fn().mockResolvedValue({ message: 'Hi', timestamp: new Date(), senderType: 'user' }) }) });
    messageModel.countDocuments.mockResolvedValue(1);

    let res = await request(app).get('/api/doctor/inbox').set('dtoken', 'tok');
    expect(res.body.success).toBe(true);
    expect(res.body.inbox.length).toBe(1);

    // upload chat file (image)
    res = await request(app)
      .post('/api/doctor/upload/chat-file')
      .set('dtoken', 'tok')
      .set('x-test-has-file', '1')
      .attach('file', Buffer.from('fake'), 'fake.png');
    expect(res.body.success).toBe(true);
    expect(res.body.file).toHaveProperty('url');
  });
});
