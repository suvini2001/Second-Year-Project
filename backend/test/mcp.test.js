import { jest } from '@jest/globals';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'testsecret';
process.env.DOCOP_MCP_KEY = 'test-mcp-key';
process.env.DOCOP_INTERNAL_KEY = 'test-internal-key';

jest.unstable_mockModule('../config/mongodb.js', () => ({ default: jest.fn(async () => undefined) }));
jest.unstable_mockModule('../config/cloudnary.js', () => ({ default: jest.fn(() => undefined) }));

const { default: request } = await import('supertest');
const { app } = await import('../server.js');
const { default: doctorModel } = await import('../models/doctorModel.js');
const { default: appointmentModel } = await import('../models/appointmentModel.js');
const { dayKey, toMinutes, firstName } = await import('../services/dayTools.js');

const MCP = { 'x-mcp-key': 'test-mcp-key' };
const INTERNAL = { 'x-internal-key': 'test-internal-key' };

// a date 3 days ahead, in both formats
const ahead = new Date(Date.now() + 3 * 864e5);
const iso = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Colombo' }).format(ahead);
const slot = dayKey(iso).slotDate;

let mongo, perera, silva, off;

const appt = (doc, time, extra = {}) => ({
    userId: new mongoose.Types.ObjectId().toString(), docId: String(doc._id), slotDate: slot, slotTime: time,
    userData: { name: 'Nimal Fernando', email: 'nimal@test.lk', phone: '0771234567' },
    docData: { name: doc.name, email: doc.email }, amount: 2000, date: Date.now(), ...extra,
});

beforeAll(async () => {
    mongo = await MongoMemoryServer.create();
    await mongoose.connect(mongo.getUri());
    const base = { password: 'x', image: 'x', degree: 'MBBS', experience: 5, phone: '0112345678', about: 'x', address: { line1: 'x' }, date: Date.now() };
    [perera, silva, off] = await doctorModel.create([
        { ...base, name: 'Dr. Anjali Perera', email: 'perera@test.lk', specialization: 'Cardiologist', fees: 3000, availability: true, slots_booked: { [slot]: ['10:00 AM'] } },
        { ...base, name: 'Dr. Kamal Silva', email: 'silva@test.lk', specialization: 'Dermatologist', fees: 2500, availability: true, slots_booked: {} },
        { ...base, name: 'Dr. Off Duty', email: 'off@test.lk', specialization: 'Cardiologist', fees: 2000, availability: false, slots_booked: {} },
    ]);
    await appointmentModel.create([
        appt(perera, '02:30 PM', { payment: true }),
        appt(perera, '10:00 AM'),
        appt(perera, '11:00 AM', { cancelled: true }),
        appt(silva, '10:30 AM', { isCompleted: true }),
    ]);
}, 60000);

afterAll(async () => {
    await mongoose.disconnect();
    await mongo?.stop();
});

describe('day helpers', () => {
    test('dayKey converts ISO, allows past, rejects bad dates', () => {
        expect(dayKey('2026-10-09')).toEqual({ iso: '2026-10-09', slotDate: '9_10_2026' });
        expect(dayKey('2020-01-01').slotDate).toBe('1_1_2020');
        expect(dayKey('2026-02-30').error).toMatch(/not a real date/);
        expect(dayKey('9_10_2026').error).toMatch(/YYYY-MM-DD/);
        expect(dayKey().slotDate).toMatch(/^\d{1,2}_\d{1,2}_\d{4}$/);
    });
    test('toMinutes sorts 12-hour times', () => {
        expect(toMinutes('10:00 AM')).toBe(600);
        expect(toMinutes('12:30 PM')).toBe(750);
        expect(toMinutes('08:30 PM')).toBe(1230);
    });
    test('firstName keeps only the first name', () => {
        expect(firstName('Nimal Fernando')).toBe('Nimal');
        expect(firstName('')).toBe('Patient');
    });
});

describe('/api/mcp security', () => {
    test.each(['/doctors', '/availability', '/stats', '/schedule'])('%s refuses a missing or wrong key', async (path) => {
        expect((await request(app).get(`/api/mcp${path}`)).status).toBe(401);
        expect((await request(app).get(`/api/mcp${path}`).set('x-mcp-key', 'wrong')).status).toBe(401);
    });
    test('the internal key does not open MCP routes, and the MCP key does not open internal routes', async () => {
        expect((await request(app).get('/api/mcp/doctors').set(INTERNAL)).status).toBe(401);
        expect((await request(app).get('/api/internal/stats/weekly').set(MCP)).status).toBe(401);
        expect((await request(app).get('/api/internal/doctors/day-summary?doctorName=Perera').set(MCP)).status).toBe(401);
    });
});

describe('list_doctors', () => {
    test('returns minimum fields, no email or password', async () => {
        const res = await request(app).get('/api/mcp/doctors?specialty=cardio').set(MCP);
        expect(res.status).toBe(200);
        expect(res.body.count).toBe(2);
        expect(JSON.stringify(res.body)).not.toMatch(/@test\.lk|password/);
        expect(Object.keys(res.body.doctors[0]).sort()).toEqual(['available', 'doctorId', 'experience', 'fee', 'name', 'specialty']);
    });
    test('onlyAvailable hides unavailable doctors', async () => {
        const res = await request(app).get('/api/mcp/doctors?specialty=cardio&onlyAvailable=true').set(MCP);
        expect(res.body.doctors.map((d) => d.name)).toEqual(['Dr. Anjali Perera']);
    });
    test('regex input is escaped', async () => {
        const res = await request(app).get('/api/mcp/doctors?specialty=.*').set(MCP);
        expect(res.body.count).toBe(0);
    });
});

describe('get_availability', () => {
    test('booked slots are removed', async () => {
        const res = await request(app).get(`/api/mcp/availability?doctorId=${perera._id}&date=${iso}`).set(MCP);
        expect(res.status).toBe(200);
        expect(res.body.freeSlots).not.toContain('10:00 AM');
        expect(res.body.freeCount).toBe(21);
    });
    test('readable errors for bad doctor or date', async () => {
        const bad = await request(app).get(`/api/mcp/availability?doctorId=nope&date=${iso}`).set(MCP);
        expect(bad.status).toBe(400);
        expect(bad.body.error).toMatch(/list_doctors/);
        const past = await request(app).get(`/api/mcp/availability?doctorId=${perera._id}&date=2020-01-01`).set(MCP);
        expect(past.status).toBe(400);
    });
    test('unavailable doctor has no slots', async () => {
        const res = await request(app).get(`/api/mcp/availability?doctorId=${off._id}&date=${iso}`).set(MCP);
        expect(res.body).toMatchObject({ available: false, freeSlots: [] });
    });
});

describe('get_appointment_stats', () => {
    test('counts per doctor for a day', async () => {
        const res = await request(app).get(`/api/mcp/stats?date=${iso}`).set(MCP);
        expect(res.status).toBe(200);
        expect(res.body.totals).toEqual({ total: 4, active: 3, cancelled: 1, completed: 1, paid: 1 });
        const p = res.body.byDoctor.find((r) => r.doctor === 'Dr. Anjali Perera');
        expect(p).toMatchObject({ total: 3, active: 2, cancelled: 1, paid: 1 });
    });
    test('filters by doctor', async () => {
        const res = await request(app).get(`/api/mcp/stats?date=${iso}&doctorId=${silva._id}`).set(MCP);
        expect(res.body.totals.total).toBe(1);
    });
    test('last N days by booking time', async () => {
        const res = await request(app).get('/api/mcp/stats?days=7').set(MCP);
        expect(res.body.period).toMatch(/last 7 days/);
        expect(res.body.totals.total).toBe(4);
    });
    test('bad date is explained', async () => {
        const res = await request(app).get('/api/mcp/stats?date=tomorrow').set(MCP);
        expect(res.status).toBe(400);
        expect(res.body.error).toMatch(/YYYY-MM-DD/);
    });
});

describe('get_todays_schedule', () => {
    test('sorted by time, first names only, cancelled shown but not counted', async () => {
        const res = await request(app).get(`/api/mcp/schedule?date=${iso}&doctorId=${perera._id}`).set(MCP);
        expect(res.status).toBe(200);
        expect(res.body.count).toBe(2);
        expect(res.body.appointments.map((a) => a.time)).toEqual(['10:00 AM', '11:00 AM', '02:30 PM']);
        expect(res.body.appointments[0].patient).toBe('Nimal');
        expect(JSON.stringify(res.body)).not.toMatch(/Fernando|@|077/);
    });
    test('defaults to today', async () => {
        const res = await request(app).get('/api/mcp/schedule').set(MCP);
        expect(res.status).toBe(200);
        expect(res.body.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });
});

describe('n8n doctor day summary', () => {
    test('finds the doctor by name (with or without "Dr.") and includes the email for n8n', async () => {
        const res = await request(app).get(`/api/internal/doctors/day-summary?doctorName=Dr. Perera&date=${iso}`).set(INTERNAL);
        expect(res.status).toBe(200);
        expect(res.body).toMatchObject({ doctorName: 'Dr. Anjali Perera', doctorEmail: 'perera@test.lk', count: 2 });
        expect(res.body.appointments.map((a) => a.time)).toEqual(['10:00 AM', '02:30 PM']);
    });
    test('ambiguous name asks which one', async () => {
        const res = await request(app).get(`/api/internal/doctors/day-summary?doctorName=a&date=${iso}`).set(INTERNAL);
        expect(res.status).toBe(409);
        expect(res.body.matches.length).toBeGreaterThan(1);
    });
    test('unknown doctor and missing name', async () => {
        expect((await request(app).get(`/api/internal/doctors/day-summary?doctorName=Nobody&date=${iso}`).set(INTERNAL)).status).toBe(404);
        expect((await request(app).get(`/api/internal/doctors/day-summary?date=${iso}`).set(INTERNAL)).status).toBe(400);
    });
});