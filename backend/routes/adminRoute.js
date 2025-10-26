import express from 'express';
import { addDoctor,allDoctors,loginAdmin,appointmentsAdmin,appointmentCancel } from '../controllers/adminController.js';
import upload from '../middleware/multer.js';
import authAdmin from '../middleware/authAdmin.js';
import { changeAvailability } from '../controllers/doctorController.js';

const adminRouter = express.Router();  // Create a router for admin-related routes

adminRouter.post('/add-doctor', authAdmin, upload.single('image'), addDoctor);
adminRouter.post('/login', loginAdmin);
adminRouter.post('/all-doctors',authAdmin,allDoctors);
adminRouter.post('/change-availability',authAdmin,changeAvailability)
adminRouter.get('/appointments',authAdmin,appointmentsAdmin)
adminRouter.post('/cancel-appointment',authAdmin,appointmentCancel)



export default adminRouter;


//.post() means it’s handling POST requests (usually used for adding or uploading data)
//The URL endpoint is /add-doctor.

/*  So when someone (like your frontend) sends a request to:http://localhost:8000/admin/add-doctor
this line of code will be triggered.
*/

//What Happens When It’s Triggered
//1. upload.single('image'): This middleware handles the file upload. It expects a single file with the field name image. It processes the uploaded file and makes it available in the request object (req.file).
//2. addDoctor: This is the controller function that will be called after the file has been uploaded. It contains the logic to add a new doctor to the system, using the data from the request (including the uploaded image).