import express from 'express'
import { registerUser, loginUser, getProfile, updateProfile, bookAppointment, listAppointment, cancelAppointment, generateMockPayment, verifyMockPayment, getUnreadMessagesCount, getUserInbox, sendTestEmail } from '../controllers/userController.js'
import authUser from '../middleware/authUser.js';
import upload from '../middleware/multer.js';
import { getMessages } from '../controllers/messageController.js';
import { uploadChatFile } from '../controllers/uploadController.js';
import { chat, confirmBooking, cancelPending } from '../controllers/assistantController.js';

const userRouter = express.Router();


userRouter.post('/register', registerUser)
userRouter.post('/login', loginUser)
userRouter.get('/get-profile', authUser, getProfile)

// Authenticate the user before processing the uploaded image.
// Prevents unauthenticated users from uploading files to the server.
// Middleware runs from left to right: authentication → file upload → controller.
// Ensures only authenticated patients can update a profile.

userRouter.post('/update-profile', authUser, upload.single('image'), updateProfile)
// user appointment booking
userRouter.post('/book-appointment', authUser, bookAppointment)
userRouter.get('/appointments', authUser, listAppointment)
userRouter.post('/cancel-appointment', authUser, cancelAppointment)
userRouter.post('/generate-payment', authUser, generateMockPayment)
userRouter.post('/verify-payment', authUser, verifyMockPayment)
userRouter.get('/messages/:appointmentId', authUser, getMessages);
userRouter.get('/unread-messages', authUser, getUnreadMessagesCount)
userRouter.get('/inbox', authUser, getUserInbox);
userRouter.post('/upload/chat-file', authUser, upload.single('file'), uploadChatFile);
// Email test endpoint (secured)
userRouter.post('/test-email', authUser, sendTestEmail);

userRouter.post("/assistant/chat", authUser, chat);
userRouter.post("/assistant/bookings/:id/confirm", authUser, confirmBooking);
userRouter.post("/assistant/bookings/:id/cancel", authUser, cancelPending);

export default userRouter