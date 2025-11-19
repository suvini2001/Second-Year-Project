import request from 'supertest';
import express from 'express';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { jest } from '@jest/globals';

let mockDocId = '60d0fe4f5311236168a109ca';

jest.unstable_mockModule('../../middleware/authDoctor.js', () => ({
    default: (req, res, next) => {
        req.docId = mockDocId; // Use the dynamic mock doctor ID
        req.userType = 'doctor';
        next();
    },
}));

const { default: doctorRoute } = await import('../../routes/doctorRoute.js');
const { default: User } = await import('../../models/userModel.js');
const { default: Doctor } = await import('../../models/doctorModel.js');
const { default: Appointment } = await import('../../models/appointmentModel.js');
const { default: Message } = await import('../../models/messageModel.js');

const app = express();
app.use(express.json());

let mongoServer;
let user;
let doctor;
let appointment;

describe('Message Pagination Integration Test', () => {
    beforeAll(async () => {
        mongoServer = await MongoMemoryServer.create();
        const mongoUri = mongoServer.getUri();
        await mongoose.connect(mongoUri);

        // Create mock data
        user = await User.create({
            name: 'Test User',
            email: 'testuser@example.com',
            password: 'password123',
        });

        doctor = await Doctor.create({
            name: 'Test Doctor',
            specialization: 'Cardiology',
            experience: 5,
            email: 'testdoctor@example.com',
            phone: '1234567890',
            address: { line1: '123 Test St', city: 'Testville' },
            password: 'password123',
            image: 'http://example.com/image.jpg',
            degree: 'MBBS',
            about: 'Experienced cardiologist.',
            fees: 100,
            date: new Date()
        });
        
        // Mount the route after setting the mock doctor id
        mockDocId = doctor._id.toString();
        app.use('/api/doctor', doctorRoute);


        appointment = await Appointment.create({
            userId: user._id.toString(),
            docId: doctor._id.toString(),
            slotDate: new Date().toISOString().slice(0, 10),
            slotTime: '10:00',
            userData: { _id: user._id.toString(), name: user.name, email: user.email },
            docData: { _id: doctor._id.toString(), name: doctor.name, specialization: doctor.specialization },
            amount: 100,
            date: Date.now(),
        });

        // Create a batch of messages
        const messages = [];
        for (let i = 0; i < 100; i++) {
            messages.push({
                appointmentId: appointment._id,
                senderId: i % 2 === 0 ? user._id : doctor._id,
                senderType: i % 2 === 0 ? 'user' : 'doctor',
                message: `Message ${i}`,
                timestamp: new Date(Date.now() - (100 - i) * 1000), // Messages spread out in time
            });
        }
        await Message.insertMany(messages);
    });

    afterAll(async () => {
        await mongoose.disconnect();
        await mongoServer.stop();
    });

    test('should fetch the first page of messages with default limit', async () => {
        const res = await request(app).get(`/api/doctor/messages/${appointment._id}`);

        expect(res.statusCode).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.messages.length).toBe(50);
        expect(res.body.hasMore).toBe(true);
        expect(res.body.limit).toBe(50);
        expect(res.body.cursor).toBeDefined();
    });

    test('should fetch messages with a custom limit', async () => {
        const res = await request(app).get(`/api/doctor/messages/${appointment._id}?limit=20`);

        expect(res.statusCode).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.messages.length).toBe(20);
        expect(res.body.hasMore).toBe(true);
        expect(res.body.limit).toBe(20);
    });

    test('should fetch the next page of messages using the cursor', async () => {
        // First request to get the cursor
        const firstRes = await request(app).get(`/api/doctor/messages/${appointment._id}?limit=30`);
        const { cursor } = firstRes.body;

        // Second request using the cursor's timestamp
        const secondRes = await request(app).get(`/api/doctor/messages/${appointment._id}?limit=30&before=${cursor.before}`);

        expect(secondRes.statusCode).toBe(200);
        expect(secondRes.body.success).toBe(true);
        expect(secondRes.body.messages.length).toBe(30);
        expect(secondRes.body.hasMore).toBe(true);

        // Ensure the messages are older than the first batch
        const firstBatchLastMessage = firstRes.body.messages[firstRes.body.messages.length - 1];
        const secondBatchFirstMessage = secondRes.body.messages[0];
        expect(new Date(secondBatchFirstMessage.timestamp).getTime()).toBeLessThan(new Date(firstBatchLastMessage.timestamp).getTime());
    });
    
    test('should indicate no more messages when the last page is reached', async () => {
        // Fetch all messages in one go to find the last page
        const res = await request(app).get(`/api/doctor/messages/${appointment._id}?limit=100`);
        expect(res.body.messages.length).toBe(100);
        expect(res.body.hasMore).toBe(false);
    });

    test('should return unauthorized when appointment not found', async () => {
        const fakeAppointmentId = new mongoose.Types.ObjectId();
        const res = await request(app).get(`/api/doctor/messages/${fakeAppointmentId}`);
        expect(res.statusCode).toBe(200);
        expect(res.body.success).toBe(false);
    });
});
