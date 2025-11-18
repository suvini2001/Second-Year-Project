// authUser middleware unit tests
//
// These tests isolate the Express middleware in `middleware/authUser.js`.
// We mock `jsonwebtoken.verify` so we can simulate different token
// conditions deterministically. Each case uses Arrange → Act → Assert
// to make the intention obvious at a glance.
import { jest } from '@jest/globals';

// Force a test environment and a stable secret for verification
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'testsecret';

// Mock jsonwebtoken verify
jest.unstable_mockModule('jsonwebtoken', () => ({
  default: { verify: jest.fn() }
}));

const jwt = (await import('jsonwebtoken')).default;
const authUser = (await import('../../middleware/authUser.js')).default;

// Minimal Express response stub with chainable status/json
const mockRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

describe('authUser middleware', () => {
  beforeEach(() => {
    // Reset mocked calls and implementations between tests
    jest.clearAllMocks();
  });

  it('returns 401 when token is missing', () => {
    // Arrange: no token header present
    const req = { headers: {} };
    const res = mockRes();
    const next = jest.fn();
    // Act
    authUser(req, res, next);
    // Assert
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ success: false, message: 'Not authorized login again' });
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 401 when token type is not user', () => {
    // Arrange: verified token decodes to non-user type
    const req = { headers: { token: 't' } };
    const res = mockRes();
    const next = jest.fn();
    jwt.verify.mockReturnValue({ id: 'u1', type: 'doctor' });
    // Act
    authUser(req, res, next);
    // Assert
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ success: false, message: 'Invalid token for user' });
    expect(next).not.toHaveBeenCalled();
  });

  it('sets req.userId and calls next for valid user token', () => {
    // Arrange: valid user token
    const req = { headers: { token: 't' } };
    const res = mockRes();
    const next = jest.fn();
    jwt.verify.mockReturnValue({ id: 'u1', type: 'user' });
    // Act
    authUser(req, res, next);
    // Assert
    expect(req.userId).toBe('u1');
    expect(req.userType).toBe('user');
    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  it('handles verify errors by returning error json', () => {
    // Arrange: jwt.verify throws (e.g., expired/malformed)
    const req = { headers: { token: 't' } };
    const res = mockRes();
    const next = jest.fn();
    jwt.verify.mockImplementation(() => { throw new Error('bad token'); });
    // Act
    authUser(req, res, next);
    // Assert
    expect(res.json).toHaveBeenCalledWith({ success: false, message: 'bad token' });
    expect(next).not.toHaveBeenCalled();
  });
});
