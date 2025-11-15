import express from 'express'
import { registerUser,loginUser, getProfile,updateProfile,bookAppointment,listAppointment,cancelAppointment,generateMockPayment,verifyMockPayment,getUnreadMessagesCount, getUserInbox} from '../controllers/userController.js'
import authUser from '../middleware/authUser.js';
import upload from '../middleware/multer.js';
import { getMessages } from '../controllers/messageController.js'; 
import { uploadChatFile } from '../controllers/uploadController.js';

const userRouter =express.Router();


userRouter.post('/register',registerUser)
userRouter.post('/login',loginUser)
userRouter.get('/get-profile',authUser,getProfile)
userRouter.post('/update-profile', upload.single('image'), authUser, updateProfile)
// user appointment booking
userRouter.post('/book-appointment',authUser,bookAppointment)
userRouter.get('/appointments',authUser,listAppointment)
userRouter.post('/cancel-appointment',authUser,cancelAppointment)
userRouter.post('/generate-payment', authUser, generateMockPayment)
userRouter.post('/verify-payment', verifyMockPayment)
userRouter.get('/messages/:appointmentId', authUser, getMessages);  
userRouter.get('/unread-messages',authUser,getUnreadMessagesCount)
userRouter.get('/inbox',authUser,getUserInbox);
userRouter.post('/upload/chat-file', authUser, upload.single('file'), uploadChatFile);
  

export default userRouter