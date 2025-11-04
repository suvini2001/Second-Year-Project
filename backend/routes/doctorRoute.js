import express from 'express'
import { doctorList,loginDoctor,appointmentsDoctor,appointmentCancel,appointmentComplete,doctorDashboard,doctorProfile,updateDoctorProfile,getUnreadMessagesCount } from '../controllers/doctorController.js'
import authDoctor from '../middleware/authDoctor.js'
import { getMessages } from '../controllers/messageController.js';
 

 const doctorRouter =express.Router()


doctorRouter.get('/list',doctorList)
doctorRouter.post('/login',loginDoctor)
doctorRouter.get('/appointments', authDoctor, appointmentsDoctor)
doctorRouter.post('/complete-appointment', authDoctor, appointmentComplete)
doctorRouter.post('/cancel-appointment', authDoctor, appointmentCancel)
doctorRouter.get('/dashboard', authDoctor,doctorDashboard)
doctorRouter.get('/profile', authDoctor,doctorProfile)
doctorRouter.post('/update-profile', authDoctor,updateDoctorProfile)
doctorRouter.get('/messages/:appointmentId', authDoctor, getMessages);
doctorRouter.get('/unread-messages',authDoctor,getUnreadMessagesCount);
 export default doctorRouter