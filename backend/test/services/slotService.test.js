// Unit tests for backend/services/slotService.js
//
// These tests are purely unit-level: the doctorModel is fully mocked so no real
// database is touched. Each test follows Arrange → Act → Assert.
import { jest } from '@jest/globals';

process.env.NODE_ENV = 'test';

// Mock doctorModel before importing the module under test
jest.unstable_mockModule('../../models/doctorModel.js', () => {
  const mock = {
    findOneAndUpdate: jest.fn(),
    updateOne: jest.fn(),
    findById: jest.fn(),
  };
  return { default: mock };
});

const doctorModel = (await import('../../models/doctorModel.js')).default;
const {
  isValidSlotDate,
  isValidSlotTime,
  reserveSlot,
  releaseSlot,
} = await import('../../services/slotService.js');

// ─── Validators ──────────────────────────────────────────────────────────────

describe('isValidSlotDate', () => {
  it('accepts valid D_M_YYYY formats', () => {
    expect(isValidSlotDate('28_9_2026')).toBe(true);
    expect(isValidSlotDate('1_1_2025')).toBe(true);
    expect(isValidSlotDate('31_12_2099')).toBe(true);
  });

  it('rejects ISO date format 2025-01-01 (old format, never sent by frontend)', () => {
    expect(isValidSlotDate('2025-01-01')).toBe(false);
  });

  it('rejects values containing "." to prevent NoSQL field path injection', () => {
    expect(isValidSlotDate('28.9.2026')).toBe(false);
    expect(isValidSlotDate('a.b')).toBe(false);
  });

  it('rejects values starting with "$" to prevent NoSQL operator injection', () => {
    expect(isValidSlotDate('$where')).toBe(false);
  });

  it('rejects empty string, non-string, and undefined', () => {
    expect(isValidSlotDate('')).toBe(false);
    expect(isValidSlotDate(null)).toBe(false);
    expect(isValidSlotDate(undefined)).toBe(false);
    expect(isValidSlotDate(20260928)).toBe(false);
  });
});

describe('isValidSlotTime', () => {
  it('accepts typical locale time strings', () => {
    expect(isValidSlotTime('10:00 AM')).toBe(true);
    expect(isValidSlotTime('09:30')).toBe(true);
  });

  it('rejects empty and whitespace-only strings', () => {
    expect(isValidSlotTime('')).toBe(false);
    expect(isValidSlotTime('   ')).toBe(false);
  });

  it('rejects strings longer than 20 chars', () => {
    expect(isValidSlotTime('a'.repeat(21))).toBe(false);
  });

  it('rejects non-strings', () => {
    expect(isValidSlotTime(null)).toBe(false);
    expect(isValidSlotTime(undefined)).toBe(false);
  });
});

// ─── reserveSlot ─────────────────────────────────────────────────────────────

describe('reserveSlot', () => {
  beforeEach(() => jest.clearAllMocks());

  it('issues one atomic findOneAndUpdate with the correct filter, update, and options', async () => {
    // Arrange
    const fakeDoc = { _id: 'd1', availability: true };
    doctorModel.findOneAndUpdate.mockReturnValue({ select: jest.fn().mockResolvedValue(fakeDoc) });

    // Act
    const result = await reserveSlot('d1', '28_9_2026', '10:00 AM');

    // Assert — this is the core atomicity contract
    expect(doctorModel.findOneAndUpdate).toHaveBeenCalledWith(
      { _id: 'd1', availability: true, 'slots_booked.28_9_2026': { $ne: '10:00 AM' } },
      { $push: { 'slots_booked.28_9_2026': '10:00 AM' } },
      { new: true }
    );
    expect(result).toBe(fakeDoc);
  });

  it('returns null when the slot is already taken (doctor doc does not match)', async () => {
    // Arrange: MongoDB returns null when filter does not match
    doctorModel.findOneAndUpdate.mockReturnValue({ select: jest.fn().mockResolvedValue(null) });

    // Act
    const result = await reserveSlot('d1', '28_9_2026', '10:00 AM');

    // Assert
    expect(result).toBeNull();
  });

  it('returns null when the doctor is not available', async () => {
    // Same null outcome — the filter includes availability: true
    doctorModel.findOneAndUpdate.mockReturnValue({ select: jest.fn().mockResolvedValue(null) });
    const result = await reserveSlot('d1', '28_9_2026', '10:00 AM');
    expect(result).toBeNull();
  });
});

// ─── releaseSlot ─────────────────────────────────────────────────────────────

describe('releaseSlot', () => {
  beforeEach(() => jest.clearAllMocks());

  it('calls updateOne with $pull on a valid slot', async () => {
    doctorModel.updateOne.mockResolvedValue({ modifiedCount: 1 });

    await releaseSlot('d1', '28_9_2026', '10:00 AM');

    expect(doctorModel.updateOne).toHaveBeenCalledWith(
      { _id: 'd1' },
      { $pull: { 'slots_booked.28_9_2026': '10:00 AM' } }
    );
  });

  it('skips the DB call when slotDate is invalid (guards rollback path)', async () => {
    await releaseSlot('d1', '2025-01-01', '10:00 AM'); // old ISO format
    expect(doctorModel.updateOne).not.toHaveBeenCalled();
  });

  it('skips the DB call when docId is falsy', async () => {
    await releaseSlot(null, '28_9_2026', '10:00 AM');
    expect(doctorModel.updateOne).not.toHaveBeenCalled();
  });
});
