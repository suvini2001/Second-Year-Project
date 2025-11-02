import express from 'express'
import { doctorList,loginDoctor,appointmentsDoctor,appointmentCancel,appointmentComplete,doctorDashboard,doctorProfile,updateDoctorProfile} from '../controllers/doctorController.js'
import authDoctor from '../middleware/authDoctor.js'

 const doctorRouter =express.Router()


doctorRouter.get('/list',doctorList)
doctorRouter.post('/login',loginDoctor)
doctorRouter.get('/appointments', authDoctor, appointmentsDoctor)
doctorRouter.post('/complete-appointment', authDoctor, appointmentComplete)
doctorRouter.post('/cancel-appointment', authDoctor, appointmentCancel)
doctorRouter.get('/dashboard', authDoctor,doctorDashboard)
doctorRouter.get('/profile', authDoctor, async (req, res) => {
  try {
    const doctor = await (await import('../models/doctorModel.js')).default.findById(req.docId).select('-password');
    if (!doctor) {
      return res.status(404).json({ success: false, message: 'Doctor not found' });
    }
    res.json({ success: true, profile: doctor });
  } catch (error) {
    console.log(error);
    res.status(500).json({ success: false, message: error.message });
  }
});

doctorRouter.get('/profile', authDoctor,doctorProfile)
doctorRouter.post('/update-profile', authDoctor,updateDoctorProfile)

 export default doctorRouter