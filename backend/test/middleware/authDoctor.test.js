// authDoctor middleware unit tests
//
// Tests cover missing token, invalid decoded payload, verify error,
// and the success path. jsonwebtoken.verify is mocked to isolate
// middleware behavior from library internals.
import { jest } from '@jest/globals';

// Stable environment and secret for predictable behavior
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'testsecret';

// Mock jwt.verify to simulate token outcomes
jest.unstable_mockModule('jsonwebtoken', () => ({
  default: { verify: jest.fn() }
}));

const jwt = (await import('jsonwebtoken')).default;
const authDoctor = (await import('../../middleware/authDoctor.js')).default;

// Minimal Express response mock
const mockRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

describe('authDoctor middleware', () => {
  beforeEach(() => {
    // Ensure clean state for spies between tests
    jest.clearAllMocks();
  });

  it('returns 401 when dtoken is missing', () => {
    // Arrange: no doctor token
    const req = { headers: {} };
    const res = mockRes();
    const next = jest.fn();
    // Act
    authDoctor(req, res, next);
    // Assert
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ success: false, message: 'Not authorized, login again' });
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 401 when token has no id', () => {
    // Arrange: decoded token lacks id
    const req = { headers: { dtoken: 't' } };
    const res = mockRes();
    const next = jest.fn();
    jwt.verify.mockReturnValue({ type: 'doctor' });
    // Act
    authDoctor(req, res, next);
    // Assert
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ success: false, message: 'Invalid token, login again' });
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 401 when verify throws', () => {
    // Arrange: verification throws (expired/malformed)
    const req = { headers: { dtoken: 't' } };
    const res = mockRes();
    const next = jest.fn();
    jwt.verify.mockImplementation(() => { throw new Error('boom'); });
    // Act
    authDoctor(req, res, next);
    // Assert
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ success: false, message: 'Token verification failed, login again' });
    expect(next).not.toHaveBeenCalled();
  });

  it('sets req.docId and calls next for valid token', () => {
    // Arrange: valid doctor token
    const req = { headers: { dtoken: 't' } };
    const res = mockRes();
    const next = jest.fn();
    jwt.verify.mockReturnValue({ id: 'd1', type: 'doctor' });
    // Act
    authDoctor(req, res, next);
    // Assert
    expect(req.docId).toBe('d1');
    expect(req.userType).toBe('doctor');
    expect(next).toHaveBeenCalled();
  });
});
