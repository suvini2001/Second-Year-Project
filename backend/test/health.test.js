// The test loads your real Express app from`server.js`, with the database and Cloudinary 
// connections replaced by harmless fakes, so nothing real is contacted and the process doesn't crash. It then fakes MongoDB as connected and as disconnected and checks that `/api/health` returns 200 "ok" and 503 "degraded" respectively.


// Health endpoint tests
//
// Docker and Kubernetes call /api/health to decide whether the container
// is alive and ready for traffic, so it must report the database state honestly.
import { jest } from '@jest/globals';

// 1. Test settings
process.env.NODE_ENV = 'test';       // server.js skips server.listen() in test mode
process.env.JWT_SECRET = 'testsecret';

// 2. Stop server.js from connecting to real services when it's imported
jest.unstable_mockModule('../config/mongodb.js', () => ({ default: jest.fn(async () => undefined) }));
jest.unstable_mockModule('../config/cloudnary.js', () => ({ default: jest.fn(() => undefined) }));

// 3. Import AFTER the mocks are registered (ESM rule)
const request = (await import('supertest')).default;
const mongoose = (await import('mongoose')).default;
const { app, server } = await import('../server.js');   // the REAL app

describe('GET /api/health', () => {
    afterAll((done) => { server.listening ? server.close(done) : done(); });

    // reset after each test so one test can't affect another
    afterEach(() => { mongoose.connection.readyState = 0; });

    it('returns 200 when MongoDB is connected', async () => {
        mongoose.connection.readyState = 1; // 1 = connected
        const res = await request(app).get('/api/health');
        expect(res.status).toBe(200);
        expect(res.body).toMatchObject({ status: 'ok', db: 'connected' });
    });

    it('returns 503 when MongoDB is not connected', async () => {
        mongoose.connection.readyState = 0; // 0 = disconnected
        const res = await request(app).get('/api/health');
        expect(res.status).toBe(503);
        expect(res.body).toMatchObject({ status: 'degraded', db: 'disconnected' });
    });
});