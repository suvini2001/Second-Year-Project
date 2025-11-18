// authAdmin middleware unit tests
//
// Validates admin token header handling, decoded email checks,
// and the success path. jwt.verify is mocked to keep tests focused
// on our middleware’s branching and header parsing.
import { jest } from '@jest/globals';

// Stable environment and known admin email for assertions
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'testsecret';
process.env.ADMIN_EMAIL = 'admin@example.com';

// Mock jwt.verify to control decoded payloads
jest.unstable_mockModule('jsonwebtoken', () => ({
  default: { verify: jest.fn() }
}));

const jwt = (await import('jsonwebtoken')).default;
const authAdmin = (await import('../../middleware/authAdmin.js')).default;

// Minimal Express response stub
const mockRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

describe('authAdmin middleware', () => {
  beforeEach(() => {
    // Clear spies for isolation
    jest.clearAllMocks();
  });

  it('returns 401 when admin token header missing', () => {
    // Arrange: no a-token/atoken header provided
    const req = { headers: {} };
    const res = mockRes();
    const next = jest.fn();
    // Act
    authAdmin(req, res, next);
    // Assert
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ success: false, message: 'Not authorized - login again' });
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 401 when decoded email mismatches', () => {
    // Arrange: token decodes to a different email
    const req = { headers: { atoken: 't' } };
    const res = mockRes();
    const next = jest.fn();
    jwt.verify.mockReturnValue({ email: 'wrong@example.com' });
    // Act
    authAdmin(req, res, next);
    // Assert
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ success: false, message: 'Token verification failed, login again' });
    expect(next).not.toHaveBeenCalled();
  });

  it('accepts multiple header variants and calls next for valid token', () => {
    // Arrange: use a-token variant and valid decoded email
    const req = { headers: { 'a-token': 't' } };
    const res = mockRes();
    const next = jest.fn();
    jwt.verify.mockReturnValue({ email: 'admin@example.com' });
    // Act
    authAdmin(req, res, next);
    // Assert
    expect(req.admin).toEqual({ email: 'admin@example.com' });
    expect(next).toHaveBeenCalled();
  });
});
