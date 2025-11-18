import { jest } from '@jest/globals';

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'controller-secret'; // all token assertions share this secret to keep tests deterministic

// Helper: mimic Express response so controllers can drive status/json fluently.
const createMockRes = () => {
	// Minimal mock of Express' response object (only status/json are needed here).
	const res = {};
	res.status = jest.fn().mockReturnValue(res);
	res.json = jest.fn().mockReturnValue(res);
	return res;
};

// Build shared mocks for every dependency doctorController touches.
const doctorModelMock = {
	findById: jest.fn(),
	findByIdAndUpdate: jest.fn(),
	findOne: jest.fn(),
	find: jest.fn(),
};

const appointmentModelMock = {
	find: jest.fn(),
	findById: jest.fn(),
	findByIdAndUpdate: jest.fn(),
};

const messageModelMock = {
	countDocuments: jest.fn(),
	findOne: jest.fn(),
};

jest.unstable_mockModule('../../models/doctorModel.js', () => ({
	__esModule: true,
	default: doctorModelMock,
}));
jest.unstable_mockModule('../../models/appointmentModel.js', () => ({
	__esModule: true,
	default: appointmentModelMock,
}));
jest.unstable_mockModule('../../models/messageModel.js', () => ({
	__esModule: true,
	default: messageModelMock,
}));
jest.unstable_mockModule('bcrypt', () => ({
	__esModule: true,
	default: { compare: jest.fn() },
}));
jest.unstable_mockModule('jsonwebtoken', () => ({
	__esModule: true,
	default: { sign: jest.fn() },
}));

const bcrypt = (await import('bcrypt')).default;
const jwt = (await import('jsonwebtoken')).default;
const doctorController = await import('../../controllers/doctorController.js');

// Provide a global cloudinary stub because the controller references it without importing.
global.cloudinary = {
	uploader: {
		upload: jest.fn(),
	},
};

describe('doctorController unit coverage', () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	describe('changeAvailability', () => {
		it('toggles availability flag and echoes the new state', async () => {
			doctorModelMock.findById.mockResolvedValue({ availability: false });
			doctorModelMock.findByIdAndUpdate.mockResolvedValue();
			const res = createMockRes();

			// Execute controller: it should flip availability -> true and persist.
			await doctorController.changeAvailability({ body: { docId: 'doc1' } }, res);

			expect(doctorModelMock.findByIdAndUpdate).toHaveBeenCalledWith('doc1', { availability: true });
			expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ availability: true, success: true }));
		});

		it('surfaces database errors', async () => {
			doctorModelMock.findById.mockRejectedValue(new Error('db down'));
			const res = createMockRes();

			await doctorController.changeAvailability({ body: { docId: 'doc1' } }, res);

			expect(res.json).toHaveBeenCalledWith({ success: false, message: 'db down' });
		});
	});

	describe('doctorList', () => {
		it('maps specialization into speciality while hiding password/email', async () => {
			const select = jest.fn().mockResolvedValue([
				{
					toObject: () => ({ _id: 'doc1', specialization: 'Cardio', availability: false }),
					specialization: 'Cardio',
					availability: false,
				},
			]);
			doctorModelMock.find.mockReturnValue({ select });
			const res = createMockRes();

			// Should call select with projection array and map specialization -> speciality.
			await doctorController.doctorList({}, res);

			expect(select).toHaveBeenCalledWith(['-password', '-email']);
			expect(res.json).toHaveBeenCalledWith({ success: true, doctors: [expect.objectContaining({ speciality: 'Cardio' })] });
		});
	});

	describe('loginDoctor', () => {
		it('returns a signed token when credentials are valid', async () => {
			doctorModelMock.findOne.mockResolvedValue({ _id: 'doc1', password: 'hash' });
			bcrypt.compare.mockResolvedValue(true);
			jwt.sign.mockReturnValue('signed');
			const res = createMockRes();

			// Provide credentials and expect a signed token back.
			await doctorController.loginDoctor({ body: { email: 'doc@example.com', password: 'pw' } }, res);

			expect(jwt.sign).toHaveBeenCalledWith({ id: 'doc1', type: 'doctor' }, process.env.JWT_SECRET);
			expect(res.json).toHaveBeenCalledWith({ success: true, token: 'signed' });
		});

		it('rejects unknown doctors', async () => {
			doctorModelMock.findOne.mockResolvedValue(null);
			const res = createMockRes();

			await doctorController.loginDoctor({ body: { email: 'none', password: 'pw' } }, res);

			expect(res.json).toHaveBeenCalledWith({ success: false, message: 'Invalid credentials' });
		});
	});

	describe('appointmentsDoctor', () => {
		it('requires docId from auth middleware', async () => {
			const res = createMockRes();

			// Without docId the route should bail out early.
			await doctorController.appointmentsDoctor({}, res);

			expect(res.json).toHaveBeenCalledWith({ success: false, message: 'Doctor not authorized' });
		});

		it('returns appointments annotated with unread counts', async () => {
			const lean = jest.fn().mockResolvedValue([{ _id: 'a1' }]);
			const sort = jest.fn().mockReturnValue({ lean });
			appointmentModelMock.find.mockReturnValue({ sort });
			messageModelMock.countDocuments.mockResolvedValue(3);
			const res = createMockRes();

			// docId is present so controller should query appointments and annotate unreadCount.
			await doctorController.appointmentsDoctor({ docId: 'doc1' }, res);

			expect(appointmentModelMock.find).toHaveBeenCalledWith({ docId: 'doc1' });
			expect(res.json).toHaveBeenCalledWith({ success: true, appointments: [expect.objectContaining({ unreadCount: 3 })] });
		});
	});

	describe('appointmentComplete', () => {
		it('returns 404 when appointment is missing', async () => {
			appointmentModelMock.findById.mockResolvedValue(null);
			const res = createMockRes();

			// Unknown appointment -> 404.
			await doctorController.appointmentComplete({ body: { appointmentId: 'a1' }, docId: 'doc1' }, res);

			expect(res.status).toHaveBeenCalledWith(404);
		});

		it('rejects appointments owned by another doctor', async () => {
			appointmentModelMock.findById.mockResolvedValue({ docId: 'someone-else' });
			const res = createMockRes();

			// docId mismatch should yield 403.
			await doctorController.appointmentComplete({ body: { appointmentId: 'a1' }, docId: 'doc1' }, res);

			expect(res.status).toHaveBeenCalledWith(403);
		});

		it('marks appointment completed when ownership matches', async () => {
			appointmentModelMock.findById.mockResolvedValue({ docId: 'doc1' });
			appointmentModelMock.findByIdAndUpdate.mockResolvedValue();
			const res = createMockRes();

			// Authorized doctor should be able to mark completion.
			await doctorController.appointmentComplete({ body: { appointmentId: 'a1' }, docId: 'doc1' }, res);

			expect(appointmentModelMock.findByIdAndUpdate).toHaveBeenCalledWith('a1', { isCompleted: true });
			expect(res.json).toHaveBeenCalledWith({ success: true, message: 'Appointment marked as completed' });
		});
	});

	describe('appointmentCancel', () => {
		it('mirrors authorization logic used in completion handler', async () => {
			appointmentModelMock.findById.mockResolvedValue({ docId: 'doc1' });
			const res = createMockRes();

			// Cancel path should call findByIdAndUpdate with cancelled true.
			await doctorController.appointmentCancel({ body: { appointmentId: 'a1' }, docId: 'doc1' }, res);

			expect(appointmentModelMock.findByIdAndUpdate).toHaveBeenCalledWith('a1', { cancelled: true });
			expect(res.json).toHaveBeenCalledWith({ success: true, message: 'Appointment cancelled successfully' });
		});
	});

	describe('doctorDashboard', () => {
		it('aggregates earnings/patients/appointments correctly', async () => {
			appointmentModelMock.find.mockResolvedValue([
				{ amount: 50, isCompleted: true, userId: 'u1' },
				{ amount: 20, payment: true, userId: 'u2' },
				{ amount: 30, userId: 'u1' },
			]);
			const res = createMockRes();

			// Earnings should count completed or paid appointments, patients should be unique userIds.
			await doctorController.doctorDashboard({ docId: 'doc1' }, res);

			expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
				success: true,
				dashData: expect.objectContaining({ earnings: 70, appointments: 3, patients: 2 }),
			}));
		});
	});

	describe('doctorProfile', () => {
		it('fetches profile data using docId from auth middleware', async () => {
			const select = jest.fn().mockResolvedValue({ _id: 'doc1', name: 'Doc' });
			doctorModelMock.findById = jest.fn().mockReturnValue({ select });
			const res = createMockRes();

			// Should load profile by docId and strip password field.
			await doctorController.doctorProfile({ docId: 'doc1' }, res);

			expect(doctorModelMock.findById).toHaveBeenCalledWith('doc1');
			expect(select).toHaveBeenCalledWith('-password');
		});
	});

	describe('updateDoctorProfile', () => {
		it('parses address json, strips undefined keys, and uploads optional image', async () => {
			doctorModelMock.findByIdAndUpdate.mockResolvedValue();
			global.cloudinary.uploader.upload.mockResolvedValue({ secure_url: 'https://img' });
			const req = {
				docId: 'doc1',
				body: { address: '{"city":"NY"}', about: 'Bio', optional: undefined },
				file: { path: '/tmp/img.png' },
			};
			const res = createMockRes();

			// This ensures both JSON parsing and optional image upload behavior.
			await doctorController.updateDoctorProfile(req, res);

			expect(global.cloudinary.uploader.upload).toHaveBeenCalledWith('/tmp/img.png', { resource_type: 'image' });
			expect(doctorModelMock.findByIdAndUpdate).toHaveBeenCalledWith('doc1', expect.objectContaining({
				address: { city: 'NY' },
				about: 'Bio',
				image: 'https://img',
			}));
			expect(res.json).toHaveBeenCalledWith({ success: true, message: 'Profile Updated' });
		});
	});

	describe('getUnreadMessagesCount', () => {
		it('counts unread user messages across doctor appointments', async () => {
			appointmentModelMock.find.mockResolvedValue([{ _id: 'a1' }, { _id: 'a2' }]);
			messageModelMock.countDocuments.mockResolvedValue(4);
			const res = createMockRes();

			// Should build $in array from appointment ids and return total unread count.
			await doctorController.getUnreadMessagesCount({ docId: 'doc1' }, res);

			expect(messageModelMock.countDocuments).toHaveBeenCalledWith({
				appointmentId: { $in: ['a1', 'a2'] },
				senderType: 'user',
				isRead: false,
			});
			expect(res.json).toHaveBeenCalledWith({ success: true, unreadCount: 4 });
		});
	});

	describe('getDoctorInbox', () => {
		it('returns inbox entries sorted by latest activity', async () => {
			const leanAppointments = jest.fn().mockResolvedValue([
				{ _id: 'a1', userData: { name: 'Alice' }, date: 1, cancelled: false, isCompleted: false, payment: false },
			]);
			const select = jest.fn().mockReturnValue({ lean: leanAppointments });
			appointmentModelMock.find.mockReturnValue({ select });

			messageModelMock.findOne = jest.fn().mockReturnValue({
				sort: () => ({ lean: jest.fn().mockResolvedValue({ message: 'hi', timestamp: 5, senderType: 'user' }) }),
			});
			messageModelMock.countDocuments.mockResolvedValue(2);
			const res = createMockRes();

			// Each appointment should fan out: fetch last message + unread count, then sort.
			await doctorController.getDoctorInbox({ docId: 'doc1' }, res);

			expect(res.json).toHaveBeenCalledWith({
				success: true,
				inbox: [expect.objectContaining({
					appointmentId: 'a1',
					lastMessage: expect.objectContaining({ message: 'hi' }),
					unreadCount: 2,
				})],
			});
		});
	});
});
