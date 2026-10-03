import { jest } from '@jest/globals';

process.env.NODE_ENV = 'test';
process.env.DOCOP_INTERNAL_KEY = 'test-internal-key';

// Core infra mocks
jest.unstable_mockModule('../config/mongodb.js', () => ({
  default: jest.fn(async () => undefined),
}));
jest.unstable_mockModule('../config/cloudnary.js', () => ({
  default: jest.fn(() => undefined),
}));

// Mock appointment model to prevent any issues when server.js loads internalRoute
jest.unstable_mockModule('../models/appointmentModel.js', () => {
  const mock = jest.fn();
  mock.find = jest.fn();
  mock.findOneAndUpdate = jest.fn();
  mock.countDocuments = jest.fn();
  return { default: mock };
});

jest.unstable_mockModule('../models/messageModel.js', () => {
  const mock = jest.fn();
  mock.createIndexes = jest.fn();
  return { default: mock };
});

jest.unstable_mockModule('../models/processedEventModel.js', () => {
  const mock = jest.fn();
  mock.create = jest.fn();
  mock.findOneAndUpdate = jest.fn();
  mock.updateOne = jest.fn();
  mock.createIndexes = jest.fn();
  return { default: mock };
});

const request = (await import('supertest')).default;
const { app, server } = await import('../server.js');
const processedEventModel = (await import('../models/processedEventModel.js')).default;

describe('Internal Routes', () => {
    afterAll((done) => { server.listening ? server.close(done) : done(); });

    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('Auth Middleware', () => {
        it('returns 401 with no key', async () => {
            const res = await request(app).post('/api/internal/events/123/claim').send({ eventType: 'test' });
            expect(res.status).toBe(401);
            expect(res.body.success).toBe(false);
        });

        it('returns 401 with wrong key', async () => {
            const res = await request(app)
                .post('/api/internal/events/123/claim')
                .set('x-internal-key', 'wrong-key')
                .send({ eventType: 'test' });
            expect(res.status).toBe(401);
            expect(res.body.success).toBe(false);
        });
    });

    describe('POST /events/:eventId/claim', () => {
        it('returns 200 and firstTime=true for a new event (right key)', async () => {
            processedEventModel.create.mockResolvedValueOnce({});
            
            const res = await request(app)
                .post('/api/internal/events/123/claim')
                .set('x-internal-key', 'test-internal-key')
                .send({ eventType: 'test' });
                
            expect(res.status).toBe(200);
            expect(res.body).toEqual({ success: true, firstTime: true });
            expect(processedEventModel.create).toHaveBeenCalledWith({ eventId: '123', eventType: 'test' });
        });

        it('returns 200 and firstTime=false when claiming twice (duplicate key)', async () => {
            const error = new Error('Duplicate');
            error.code = 11000;
            processedEventModel.create.mockRejectedValueOnce(error);
            processedEventModel.findOneAndUpdate.mockResolvedValueOnce(null); // No retry document found
            
            const res = await request(app)
                .post('/api/internal/events/123/claim')
                .set('x-internal-key', 'test-internal-key')
                .send({ eventType: 'test' });
                
            expect(res.status).toBe(200);
            expect(res.body).toEqual({ success: true, firstTime: false });
        });
        
        it('returns 200 and firstTime=true when claiming a failed event (retry)', async () => {
            const error = new Error('Duplicate');
            error.code = 11000;
            processedEventModel.create.mockRejectedValueOnce(error);
            processedEventModel.findOneAndUpdate.mockResolvedValueOnce({ eventId: '123', status: 'processing' });
            
            const res = await request(app)
                .post('/api/internal/events/123/claim')
                .set('x-internal-key', 'test-internal-key')
                .send({ eventType: 'test' });
                
            expect(res.status).toBe(200);
            expect(res.body).toEqual({ success: true, firstTime: true });
        });
    });

    describe('POST /events/:eventId/result', () => {
        it('returns 200 on success', async () => {
            processedEventModel.updateOne.mockResolvedValueOnce({});
            
            const res = await request(app)
                .post('/api/internal/events/123/result')
                .set('x-internal-key', 'test-internal-key')
                .send({ status: 'completed' });
                
            expect(res.status).toBe(200);
            expect(res.body).toEqual({ success: true });
        });

        it('returns 400 with a bad status', async () => {
            const res = await request(app)
                .post('/api/internal/events/123/result')
                .set('x-internal-key', 'test-internal-key')
                .send({ status: 'unknown_status' });
                
            expect(res.status).toBe(400);
            expect(res.body).toEqual({ success: false, message: 'Bad status' });
            expect(processedEventModel.updateOne).not.toHaveBeenCalled();
        });
    });
});
