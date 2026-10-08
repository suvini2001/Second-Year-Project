import { jest } from '@jest/globals';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';

// ---------------------------------------------------------------------------
// Phase 3 - DocOp AI assistant
// Covers: slot/date helpers, the 4 internal tool routes, and the patient routes
// (chat proxy, confirm, cancel). The database and the booking service are mocked,
// so these tests check our own logic and guardrails, not MongoDB or the AI.
// ---------------------------------------------------------------------------

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'testsecret';
process.env.DOCOP_INTERNAL_KEY = 'test-internal-key';
process.env.DOCOP_WEBHOOK_SECRET = 'test-webhook-secret';
process.env.N8N_ASSISTANT_URL = 'http://n8n.test/webhook/docop-assistant';

// ---- infrastructure mocks (same pattern as internal.test.js) --------------
jest.unstable_mockModule('../config/mongodb.js', () => ({ default: jest.fn(async () => undefined) }));
jest.unstable_mockModule('../config/cloudnary.js', () => ({ default: jest.fn(() => undefined) }));

const chain = (value) => ({
    select: () => ({ lean: async () => value }),
    lean: async () => value,
});

jest.unstable_mockModule('../models/doctorModel.js', () => {
    const mock = jest.fn();
    mock.find = jest.fn();
    mock.findById = jest.fn();
    return { default: mock };
});

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
    mock.createIndexes = jest.fn();
    return { default: mock };
});

jest.unstable_mockModule('../models/pendingBookingModel.js', () => {
    const mock = jest.fn();
    mock.create = jest.fn();
    mock.updateMany = jest.fn();
    mock.updateOne = jest.fn();
    mock.findOne = jest.fn();
    mock.findOneAndUpdate = jest.fn();
    mock.createIndexes = jest.fn();
    return { default: mock };
});

jest.unstable_mockModule('../services/bookingService.js', () => ({
    createBooking: jest.fn(),
}));

const request = (await import('supertest')).default;
const { app, server } = await import('../server.js');
const doctorModel = (await import('../models/doctorModel.js')).default;
const pendingBookingModel = (await import('../models/pendingBookingModel.js')).default;
const { createBooking } = await import('../services/bookingService.js');
const { allSlotsFor, toSlotDate } = await import('../services/slotTimes.js');

// ---- test data ------------------------------------------------------------
const KEY = { 'x-internal-key': 'test-internal-key' };
const USER_ID = '64aaaaaaaaaaaaaaaaaaaaaa';
const OTHER_USER_ID = '64bbbbbbbbbbbbbbbbbbbbbb';
const DOCTOR_ID = '64cccccccccccccccccccccc';
const PENDING_ID = '64dddddddddddddddddddddd';

const tokenFor = (id) => jwt.sign({ id, type: 'user' }, 'testsecret');

// tomorrow in Sri Lanka time, as YYYY-MM-DD and as DocOp's D_M_YYYY
const colomboToday = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Colombo' });
const tomorrowDate = new Date(`${colomboToday}T00:00:00Z`);
tomorrowDate.setUTCDate(tomorrowDate.getUTCDate() + 1);
const TOMORROW_ISO = tomorrowDate.toISOString().slice(0, 10);
const [ty, tm, td] = TOMORROW_ISO.split('-').map(Number);
const TOMORROW_SLOT = `${td}_${tm}_${ty}`;

const doctor = (booked = []) => ({
    _id: DOCTOR_ID,
    name: 'Dr. Test',
    fees: 50,
    availability: true,
    slots_booked: { [TOMORROW_SLOT]: booked },
});

afterAll((done) => { server.listening ? server.close(done) : done(); });
beforeEach(() => { jest.clearAllMocks(); });

// ===========================================================================
describe('slotTimes helpers', () => {
    it('allSlotsFor returns 22 half-hour slots, 10:00 AM to 08:30 PM, for a future day', () => {
        const slots = allSlotsFor(TOMORROW_SLOT);
        expect(slots).toHaveLength(22);
        expect(slots[0]).toBe('10:00 AM');
        expect(slots[1]).toBe('10:30 AM');
        expect(slots.at(-1)).toBe('08:30 PM');
    });

    it('toSlotDate converts YYYY-MM-DD to D_M_YYYY (no leading zeros)', () => {
        expect(toSlotDate(TOMORROW_ISO)).toEqual({ slotDate: TOMORROW_SLOT });
    });

    it('toSlotDate still accepts the old D_M_YYYY format', () => {
        expect(toSlotDate(TOMORROW_SLOT)).toEqual({ slotDate: TOMORROW_SLOT });
    });

    it.each([
        ['2020-01-01', /past/i],
        ['2030-02-30', /exist/i],
        ['tomorrow', /YYYY-MM-DD/],
        ['', /YYYY-MM-DD/],
        [undefined, /YYYY-MM-DD/],
    ])('toSlotDate rejects %p with a readable error', (input, message) => {
        const result = toSlotDate(input);
        expect(result.slotDate).toBeUndefined();
        expect(result.error).toMatch(message);
    });
});

// ===========================================================================
describe('Internal assistant tools (/api/internal/assistant)', () => {
    it.each([
        ['get', '/api/internal/assistant/doctors'],
        ['get', `/api/internal/assistant/availability?doctorId=${DOCTOR_ID}&date=${TOMORROW_ISO}`],
        ['get', `/api/internal/assistant/users/${USER_ID}/appointments`],
        ['post', '/api/internal/assistant/bookings/request'],
    ])('%s %s requires the internal key (401)', async (method, url) => {
        const res = await request(app)[method](url);
        expect(res.status).toBe(401);
    });

    it('a wrong internal key is refused (401)', async () => {
        const res = await request(app).get('/api/internal/assistant/doctors').set('x-internal-key', 'wrong');
        expect(res.status).toBe(401);
    });

    describe('search_doctors', () => {
        it('returns only the minimum doctor fields', async () => {
            doctorModel.find.mockReturnValue({
                select: () => ({
                    limit: () => ({
                        lean: async () => [
                            { _id: DOCTOR_ID, name: 'Dr. Test', specialization: 'Dermatologist', experience: 3, fees: 50 },
                        ]
                    })
                }),
            });
            const res = await request(app).get('/api/internal/assistant/doctors?specialty=derm').set(KEY);
            expect(res.status).toBe(200);
            expect(res.body.doctors).toEqual([
                { doctorId: DOCTOR_ID, name: 'Dr. Test', specialty: 'Dermatologist', experienceYears: 3, fee: 50 },
            ]);
        });

        it('escapes regex characters in the specialty and only searches available doctors', async () => {
            doctorModel.find.mockReturnValue({ select: () => ({ limit: () => ({ lean: async () => [] }) }) });
            await request(app).get('/api/internal/assistant/doctors?specialty=' + encodeURIComponent('.*(a+)+$')).set(KEY);
            const filter = doctorModel.find.mock.calls[0][0];
            expect(filter.availability).toBe(true);
            expect(filter.specialization.source).toBe('\\.\\*\\(a\\+\\)\\+\\$');
        });
    });

    describe('check_availability', () => {
        it('returns free slots and leaves out booked ones', async () => {
            doctorModel.findById.mockReturnValue(chain(doctor(['10:00 AM', '10:30 AM'])));
            const res = await request(app)
                .get(`/api/internal/assistant/availability?doctorId=${DOCTOR_ID}&date=${TOMORROW_ISO}`)
                .set(KEY);
            expect(res.status).toBe(200);
            expect(res.body.freeSlots).toHaveLength(20);
            expect(res.body.freeSlots).not.toContain('10:00 AM');
            expect(res.body.freeSlots[0]).toBe('11:00 AM');
        });

        it('answers a bad date with a readable error instead of an empty list', async () => {
            const res = await request(app)
                .get(`/api/internal/assistant/availability?doctorId=${DOCTOR_ID}&date=2020-01-01`)
                .set(KEY);
            expect(res.body.error).toMatch(/past/i);
            expect(doctorModel.findById).not.toHaveBeenCalled();
        });

        it('answers an unknown doctorId with a readable error', async () => {
            const res = await request(app)
                .get(`/api/internal/assistant/availability?doctorId=Dr.Test&date=${TOMORROW_ISO}`)
                .set(KEY);
            expect(res.body.error).toMatch(/doctorId/);
        });

        it('returns no slots for an unavailable doctor', async () => {
            doctorModel.findById.mockReturnValue(chain({ ...doctor(), availability: false }));
            const res = await request(app)
                .get(`/api/internal/assistant/availability?doctorId=${DOCTOR_ID}&date=${TOMORROW_ISO}`)
                .set(KEY);
            expect(res.body).toEqual({ available: false, freeSlots: [] });
        });
    });

    describe('request_booking', () => {
        const send = (body) => request(app).post('/api/internal/assistant/bookings/request').set(KEY).send(body);
        const valid = { userId: USER_ID, doctorId: DOCTOR_ID, date: TOMORROW_ISO, time: '11:00 AM' };

        it('creates a PENDING booking only, stored in the website date format', async () => {
            doctorModel.findById.mockReturnValue(chain(doctor()));
            pendingBookingModel.create.mockResolvedValue({ _id: PENDING_ID });

            const res = await send(valid);

            expect(res.body.ok).toBe(true);
            expect(res.body.pendingId).toBe(PENDING_ID);
            expect(res.body.note).toMatch(/NOT booked/);
            const saved = pendingBookingModel.create.mock.calls[0][0];
            expect(saved).toMatchObject({ userId: USER_ID, docId: DOCTOR_ID, slotDate: TOMORROW_SLOT, slotTime: '11:00 AM' });
            expect(saved.expiresAt.getTime() - Date.now()).toBeGreaterThan(9 * 60 * 1000);
            expect(createBooking).not.toHaveBeenCalled(); // the AI never books
        });

        it('cancels the previous pending booking first (one at a time)', async () => {
            doctorModel.findById.mockReturnValue(chain(doctor()));
            pendingBookingModel.create.mockResolvedValue({ _id: PENDING_ID });
            await send(valid);
            expect(pendingBookingModel.updateMany).toHaveBeenCalledWith(
                { userId: USER_ID, status: 'pending' }, { status: 'cancelled' });
        });

        it('refuses a slot that is already taken', async () => {
            doctorModel.findById.mockReturnValue(chain(doctor(['11:00 AM'])));
            const res = await send(valid);
            expect(res.body.ok).toBe(false);
            expect(pendingBookingModel.create).not.toHaveBeenCalled();
        });

        it('refuses a time that is not a real slot', async () => {
            doctorModel.findById.mockReturnValue(chain(doctor()));
            const res = await send({ ...valid, time: '03:00 AM' });
            expect(res.body.ok).toBe(false);
            expect(pendingBookingModel.create).not.toHaveBeenCalled();
        });

        it('explains a bad doctorId or date so the AI can correct itself', async () => {
            const badDoctor = await send({ ...valid, doctorId: 'Dr. Test' });
            expect(badDoctor.body).toMatchObject({ ok: false });
            expect(badDoctor.body.reason).toMatch(/doctorId/);

            const badDate = await send({ ...valid, date: '2020-01-01' });
            expect(badDate.body).toMatchObject({ ok: false });
            expect(badDate.body.reason).toMatch(/past/i);
        });

        it('rejects an invalid userId with 400 (that would be a workflow bug)', async () => {
            const res = await send({ ...valid, userId: 'someone' });
            expect(res.status).toBe(400);
        });
    });
});

// ===========================================================================
describe('Patient assistant routes (/api/user/assistant)', () => {
    const asUser = (id = USER_ID) => ({ token: tokenFor(id) });

    describe('chat proxy', () => {
        const realFetch = global.fetch;
        afterEach(() => { global.fetch = realFetch; });

        it('requires login (401 without token)', async () => {
            const res = await request(app).post('/api/user/assistant/chat').send({ message: 'hi' });
            expect(res.status).toBe(401);
        });

        it('signs the request and takes userId from the token, never from the body', async () => {
            global.fetch = jest.fn(async () => ({ ok: true, json: async () => ({ reply: 'Hello!' }) }));
            pendingBookingModel.findOne.mockReturnValue(chain(null));

            const res = await request(app)
                .post('/api/user/assistant/chat')
                .set(asUser())
                .send({ message: 'Find a doctor', sessionId: 's1', userId: OTHER_USER_ID });

            expect(res.body).toMatchObject({ success: true, reply: 'Hello!' });
            const [url, options] = global.fetch.mock.calls[0];
            expect(url).toBe(process.env.N8N_ASSISTANT_URL);

            const sent = JSON.parse(options.body);
            expect(sent.userId).toBe(USER_ID);
            expect(sent.sessionId).toBe(`${USER_ID}:s1`);

            const ts = options.headers['x-docop-timestamp'];
            const expected = crypto.createHmac('sha256', 'test-webhook-secret').update(`${ts}.${options.body}`).digest('hex');
            expect(options.headers['x-docop-signature']).toBe(expected);
        });

        it('returns the pending booking so the widget can show the Confirm card', async () => {
            global.fetch = jest.fn(async () => ({ ok: true, json: async () => ({ reply: 'Press Confirm' }) }));
            pendingBookingModel.findOne.mockReturnValue(chain({
                _id: PENDING_ID, doctorName: 'Dr. Test', slotDate: TOMORROW_SLOT, slotTime: '11:00 AM', fee: 50,
            }));
            const res = await request(app).post('/api/user/assistant/chat').set(asUser()).send({ message: 'book', sessionId: 's1' });
            expect(res.body.pendingBooking).toEqual({
                id: PENDING_ID, doctorName: 'Dr. Test', date: TOMORROW_SLOT, time: '11:00 AM', fee: 50,
            });
        });

        it('fails gracefully when n8n is down', async () => {
            global.fetch = jest.fn(async () => { throw new Error('connect ECONNREFUSED'); });
            const res = await request(app).post('/api/user/assistant/chat').set(asUser()).send({ message: 'hi', sessionId: 's1' });
            expect(res.body.success).toBe(false);
            expect(res.body.message).toMatch(/assistant/i);
        });

        it('ignores empty messages without calling n8n', async () => {
            global.fetch = jest.fn();
            const res = await request(app).post('/api/user/assistant/chat').set(asUser()).send({ message: '   ' });
            expect(res.body.success).toBe(false);
            expect(global.fetch).not.toHaveBeenCalled();
        });

        it('rate-limits to 20 messages per minute per patient', async () => {
            global.fetch = jest.fn(async () => ({ ok: true, json: async () => ({ reply: 'ok' }) }));
            pendingBookingModel.findOne.mockReturnValue(chain(null));
            const rateUser = asUser('64eeeeeeeeeeeeeeeeeeeeee');
            for (let i = 0; i < 20; i++) {
                await request(app).post('/api/user/assistant/chat').set(rateUser).send({ message: `m${i}`, sessionId: 'r' });
            }
            const res = await request(app).post('/api/user/assistant/chat').set(rateUser).send({ message: 'one more', sessionId: 'r' });
            expect(res.body.success).toBe(false);
            expect(res.body.message).toMatch(/too many/i);
            expect(global.fetch).toHaveBeenCalledTimes(20);
        });
    });

    describe('confirm', () => {
        const confirm = (id = PENDING_ID, user = USER_ID) =>
            request(app).post(`/api/user/assistant/bookings/${id}/confirm`).set(asUser(user));

        it('requires login (401 without token)', async () => {
            const res = await request(app).post(`/api/user/assistant/bookings/${PENDING_ID}/confirm`);
            expect(res.status).toBe(401);
        });

        it('books through the shared booking service, as the logged-in patient', async () => {
            pendingBookingModel.findOneAndUpdate.mockResolvedValue({
                _id: PENDING_ID, docId: DOCTOR_ID, slotDate: TOMORROW_SLOT, slotTime: '11:00 AM',
            });
            createBooking.mockResolvedValue({ success: true, message: 'Appointment Booked' });

            const res = await confirm();

            expect(res.body.success).toBe(true);
            const [filter, update] = pendingBookingModel.findOneAndUpdate.mock.calls[0];
            expect(filter).toMatchObject({ _id: PENDING_ID, userId: USER_ID, status: 'pending' });
            expect(filter.expiresAt.$gt).toBeInstanceOf(Date);
            expect(update).toEqual({ status: 'confirmed' });
            expect(createBooking).toHaveBeenCalledWith({
                userId: USER_ID, docId: DOCTOR_ID, slotDate: TOMORROW_SLOT, slotTime: '11:00 AM',
            });
        });

        it("can't confirm someone else's, an expired, or an already-confirmed booking", async () => {
            pendingBookingModel.findOneAndUpdate.mockResolvedValue(null); // no match for this user / still pending / not expired
            const res = await confirm(PENDING_ID, OTHER_USER_ID);
            expect(res.body.success).toBe(false);
            expect(createBooking).not.toHaveBeenCalled();
            expect(pendingBookingModel.findOneAndUpdate.mock.calls[0][0].userId).toBe(OTHER_USER_ID);
        });

        it('confirming twice books only once', async () => {
            pendingBookingModel.findOneAndUpdate
                .mockResolvedValueOnce({ _id: PENDING_ID, docId: DOCTOR_ID, slotDate: TOMORROW_SLOT, slotTime: '11:00 AM' })
                .mockResolvedValueOnce(null);
            createBooking.mockResolvedValue({ success: true });

            await confirm();
            const second = await confirm();

            expect(second.body.success).toBe(false);
            expect(createBooking).toHaveBeenCalledTimes(1);
        });

        it('marks the pending booking cancelled if the slot was taken meanwhile', async () => {
            pendingBookingModel.findOneAndUpdate.mockResolvedValue({
                _id: PENDING_ID, docId: DOCTOR_ID, slotDate: TOMORROW_SLOT, slotTime: '11:00 AM',
            });
            createBooking.mockResolvedValue({ success: false, message: 'Slot not available' });

            const res = await confirm();

            expect(res.body.success).toBe(false);
            expect(pendingBookingModel.updateOne).toHaveBeenCalledWith({ _id: PENDING_ID }, { status: 'cancelled' });
        });

        it('refuses an invalid id', async () => {
            const res = await confirm('not-an-id');
            expect(res.body.success).toBe(false);
            expect(pendingBookingModel.findOneAndUpdate).not.toHaveBeenCalled();
        });
    });

    describe('cancel', () => {
        it("only cancels the patient's own pending booking", async () => {
            const res = await request(app).post(`/api/user/assistant/bookings/${PENDING_ID}/cancel`).set(asUser());
            expect(res.body.success).toBe(true);
            expect(pendingBookingModel.updateOne).toHaveBeenCalledWith(
                { _id: PENDING_ID, userId: USER_ID, status: 'pending' }, { status: 'cancelled' });
        });

        it('refuses an invalid id', async () => {
            const res = await request(app).post('/api/user/assistant/bookings/not-an-id/cancel').set(asUser());
            expect(res.body.success).toBe(false);
            expect(pendingBookingModel.updateOne).not.toHaveBeenCalled();
        });
    });
});