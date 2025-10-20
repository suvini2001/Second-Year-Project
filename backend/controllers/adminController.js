import validator from 'validator';
import bycrypt from 'bcrypt';
import {v2 as cloudinary} from 'cloudinary';
import Doctor from '../models/doctorModel.js';

// API for adding a doctor

const addDoctor = async (req, res) => {
    try {
        const doctorData = req.body;
        const imageFile = req.file;

        console.log(doctorData, imageFile);

        // Sanitize and validate data
        doctorData.experience = parseInt(doctorData.experience.replace(/\D/g, ''), 10);
        doctorData.fees = parseFloat(doctorData.fees);
        doctorData.availability = doctorData.availability === 'true';

        // Convert date to a valid Date object
        const parsedDate = new Date(doctorData.date.replace(/\./g, '-'));
        if (isNaN(parsedDate.getTime())) {
            return res.json({ success: false, message: "Invalid date format" });
        }
        doctorData.date = parsedDate;

        doctorData.slots_booked = { time: doctorData.slots_booked };

        doctorData.address = {
            line1: '17th Cross, Richmond',
            line2: 'Circle, Ring Road, London'
        };

        // Use address as string if provided, else fallback to object
        if (typeof doctorData.address === 'string') {
            // Accept the string as-is
        } else if (typeof doctorData.address === 'object') {
            doctorData.address = JSON.stringify(doctorData.address);
        }

        // Validate required fields
        if (!doctorData.name || !doctorData.specialization || !doctorData.email || !doctorData.phone || !imageFile) {
            return res.json({ success: false, message: "All fields are required" });
        }

        if (!validator.isEmail(doctorData.email)) {
            return res.json({ success: false, message: "Invalid email format" });
        }

        if (doctorData.password.length < 8) {
            return res.json({ success: false, message: "Password must be at least 8 characters long" });
        }

        const salt = await bycrypt.genSalt(10);
        const hashedPassword = await bycrypt.hash(doctorData.password, salt);
        doctorData.password = hashedPassword;

        const imageUpdate = await cloudinary.uploader.upload(imageFile.path, {
            folder: "doctors",
            resource_type: "image"
        });

        doctorData.image = imageUpdate.secure_url;

        const newDoctor = new Doctor(doctorData);
        await newDoctor.save();

        res.status(201).json({ message: "Doctor added successfully", data: newDoctor });
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
            return res.status(200).json({ success: true, message: "Login successful" });
        }

        res.status(401).json({ success: false, message: "Invalid email or password" });
    } catch (error) {
        console.error("Error logging in admin:", error);
        res.status(500).json({ success: false, message: "Internal server error" });
    }
};

export { addDoctor };