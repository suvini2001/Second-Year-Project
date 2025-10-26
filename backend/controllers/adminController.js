import validator from 'validator';
import bcrypt from 'bcrypt';
import {v2 as cloudinary} from 'cloudinary';
import Doctor from '../models/doctorModel.js';
import jwt from 'jsonwebtoken';
import appointmentModel from '../models/apointmentModel.js';


// API for adding a doctor

const addDoctor = async (req, res) => {
    try {
        const doctorData = req.body;
        const imageFile = req.file;

        console.log(doctorData, imageFile);

        // Normalize common typos / alternate field names from clients
        if (!doctorData.experience && doctorData.experiance) doctorData.experience = doctorData.experiance;
        if (!doctorData.fees && doctorData.fee) doctorData.fees = doctorData.fee;
        if (!doctorData.specialization && doctorData.speciality) doctorData.specialization = doctorData.speciality;

        // Validate required fields early to avoid calling .replace on undefined
        if (!doctorData.name || !doctorData.specialization || !doctorData.email || !doctorData.phone || !imageFile || !doctorData.password) {
            return res.json({ success: false, message: "All fields are required" });
        }

        // Sanitize and validate data safely
        const expRaw = (doctorData.experience || '').toString();
        doctorData.experience = expRaw ? parseInt(expRaw.replace(/\D/g, ''), 10) : 0;

        doctorData.fees = doctorData.fees ? parseFloat(doctorData.fees) : 0;
        doctorData.availability = String(doctorData.availability) === 'true';

        // Convert date to a valid Date object only if provided
        if (doctorData.date) {
            const parsedDate = new Date(doctorData.date.toString().replace(/\./g, '-'));
            if (isNaN(parsedDate.getTime())) {
                return res.json({ success: false, message: "Invalid date format" });
            }
            doctorData.date = parsedDate;
        }

        doctorData.slots_booked = { time: doctorData.slots_booked || [] };

        // Use address from request if provided, else fallback to default
        if (!doctorData.address) {
            doctorData.address = {
                line1: '17th Cross, Richmond',
                line2: 'Circle, Ring Road, London'
            };
        }
        if (typeof doctorData.address === 'object') {
            doctorData.address = JSON.stringify(doctorData.address);
        }

        // Validate required fields
        if (!doctorData.name || !doctorData.specialization || !doctorData.email || !doctorData.phone || !imageFile || !doctorData.password) {
            return res.json({ success: false, message: "All fields are required" });
        }

        if (!validator.isEmail(doctorData.email)) {
            return res.json({ success: false, message: "Invalid email format" });
        }

        if (doctorData.password.length < 8) {
            return res.json({ success: false, message: "Password must be at least 8 characters long" });
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(doctorData.password, salt);
        doctorData.password = hashedPassword;

        const imageUpdate = await cloudinary.uploader.upload(imageFile.path, {
            folder: "doctors",
            resource_type: "image"
        });

        doctorData.image = imageUpdate.secure_url;

        const newDoctor = new Doctor(doctorData);
        await newDoctor.save();

        res.status(201).json({ success: true, message: "Doctor added successfully", data: newDoctor });
    } catch (error) {
        console.error("Error adding doctor:", error);
        res.status(500).json({ success: false, message: "Internal server error" });
    }
};


//API for the admin login 

const loginAdmin = async (req, res) => {
    try {
        const { email, password } = req.body;

        if (email === process.env.ADMIN_EMAIL && password === process.env.ADMIN_PASSWORD) {
            // Use an object payload and set token expiration
            const token = jwt.sign(
                { email },
                process.env.JWT_SECRET,
                { expiresIn: "1h" }
            );
            res.json({ success: true, token, message: "Login successful" });
        } else {
            res.status(401).json({ success: false, message: "Invalid email or password" });
        }

    } catch (error) {
        console.error("Error logging in admin:", error);
        res.status(500).json({ success: false, message: "Internal server error" });
    }
};



//API to get all doctors list for admin panel

const allDoctors =async(req,res)=>{
    try{
        const doctors = await Doctor.find({}).select('-password');
        res.json({ success: true, data: doctors });
    }
    catch(error){
        console.log(error)
        res.json({ success: false, message: error.message });
    }

}


// API to get all appointments list
const appointmentsAdmin = async (req,res) =>{
    try {
        const appointments = await appointmentModel.find({})
        res.json({success:true,appointments})
    } catch (error) {
        console.log(error)
        res.json({success:false, message:error.message})
    }
}


// API to cancel appointments - copied by user-cancel
const appointmentCancel = async (req, res) => {
    try {
        const { appointmentId } = req.body;
        
        //find Appointment 
        const appointmentData = await appointmentModel.findById(appointmentId);

        // appointmentData null check
        if (!appointmentData) {
            return res.status(404).json({ success: false, message: "Appointment not found" });
        }

        // Convert mongoose doc to plain object to avoid unexpected getters
        const appt = appointmentData && appointmentData.toObject ? appointmentData.toObject() : appointmentData;

        // cancel the appointment (mark cancelled)
        await appointmentModel.findByIdAndUpdate(appointmentId, { cancelled: true });

        // free the doctor slot if present
        const docId = appt.docId || appt.doc?._id || appt.docId;
        const slotDate = appt.slotDate;
        const slotTime = appt.slotTime;

        if (docId) {
            const doctorData = await Doctor.findById(docId);
            const slots_booked = (doctorData && doctorData.slots_booked) ? { ...doctorData.slots_booked } : null;

            if (slots_booked && slotDate && Array.isArray(slots_booked[slotDate])) {
                slots_booked[slotDate] = slots_booked[slotDate].filter(e => e !== slotTime);
                await Doctor.findByIdAndUpdate(docId, { slots_booked });
            }
        }

        return res.json({ success: true, message: "Appointment Cancelled" });

    } catch (error) {
        console.log(error);
        res.status(500).json({ success: false, message: error.message });
    }
}

export { addDoctor, loginAdmin ,allDoctors,appointmentsAdmin,appointmentCancel};