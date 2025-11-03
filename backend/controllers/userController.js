import validator from "validator";
import bcrypt from "bcrypt";
import userModel from "../models/userModel.js";
import jwt from "jsonwebtoken";
import { v2 as cloudinary } from "cloudinary";
import doctorModel from "../models/doctorModel.js";
import appointmentModel from "../models/appointmentModel.js";
import crypto from "crypto";

//API to register a user

const registerUser = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !password || !email) {
      return res.json({ success: false, message: "Missing Details" });
    }

    //validating email format
    if (!validator.isEmail(email)) {
      return res.json({ success: false, message: "Enter a valid email" });
    }

    //validating a strong password
    if (password.length < 8) {
      return res.json({ success: false, message: "Enter a strong password" });
    }

    //hashing user password

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const userData = {
      name,
      email,
      password: hashedPassword,
    };

    //save the data in db
    const newUser = new userModel(userData);
    const user = await newUser.save();

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET);

    res.json({ success: true, token });
  } catch (error) {
    console.log(error);
    res.json({ success: false, message: error.message });
  }
};

//API for user logging

const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await userModel.findOne({ email });

    if (!user) {
      return res.json({ success: false, message: "User doesn't exist" });
    }

    const isMatch = await bcrypt.compare(password, user.password);

    if (isMatch) {
      const token = jwt.sign({ id: user._id, type: 'user' }, process.env.JWT_SECRET);
      res.json({ success: true, token });
    } else {
      res.json({ success: false, message: "Invalid credentials" });
    }
  } catch (error) {
    console.log(error);
    res.json({ success: false, message: error.message });
  }
};

// API to get user profile data

const getProfile = async (req, res) => {
  try {
    const userId = req.userId; // Use req.userId set by authUser middleware
    const userData = await userModel.findById(userId).select("-password");
    res.json({ success: true, userData });
  } catch (error) {
    console.log(error);
    res.json({ success: false, message: error.message });
  }
};

// API to update user profile
const updateProfile = async (req, res) => {
  try {
    const { userId, name, phone, address, dob, gender } = req.body;
    const imageFile = req.file;

    if (!name || !phone || !dob || !gender) {
      return res.json({ success: false, message: "Data Missing" });
    }

    await userModel.findByIdAndUpdate(userId, {
      name,
      phone,
      address: JSON.parse(address),
      dob,
      gender,
    });

    if (imageFile) {
      // upload image to cloudinary
      const imageUpload = await cloudinary.uploader.upload(imageFile.path, {
        resource_type: "image",
      });
      const imageURL = imageUpload.secure_url;

      await userModel.findByIdAndUpdate(userId, { image: imageURL });
    }
    res.json({ success: true, message: "Profile Update" });
  } catch (error) {
    console.log(error);
    res.json({ success: false, message: error.message });
  }
};

// API for book an appointment
const bookAppointment = async (req, res) => {
  try {
    const userId = req.userId; // Use req.userId set by authUser middleware
    const { docId, slotDate, slotTime } = req.body;
    const docData = await doctorModel.findById(docId).select("-password");

    if (!docData) {
      return res.json({ success: false, message: "Doctor not found" });
    }

    if (!docData.availability) {
      return res.json({ success: false, message: "Doctor not available" });
    }

    const slots_booked = docData.slots_booked || {};

    if (slots_booked[slotDate]) {
      if (slots_booked[slotDate].includes(slotTime)) {
        return res.json({ success: false, message: "Slot not available" });
      }
      slots_booked[slotDate].push(slotTime);
    } else {
      slots_booked[slotDate] = [slotTime];
    }

    const userData = await userModel.findById(userId).select("-password");

    await doctorModel.findByIdAndUpdate(docId, { slots_booked });

    const cleanDocData = docData.toObject();
    delete cleanDocData.slots_booked; // exclude booked slots when embedding doctor data in appointment record

    // Ensure address is included in the cleanDocData
    const appointmentData = {
      userId,
      docId,
      userData,
      docData: {
        ...cleanDocData,
        address: docData.address, // Include address explicitly
      },
      amount: docData.fees,
      slotTime,
      slotDate,
      date: Date.now(),
    };

    const newAppointment = new appointmentModel(appointmentData);
    await newAppointment.save();
    res.json({ success: true, message: "Appointment Booked" });
  } catch (error) {
    console.log(error);
    res.json({ success: false, message: error.message });
  }
};


// API for get user appointments for frontend my-appointments page
const listAppointment = async (req, res) => {
  try {
    const userId = req.userId;
    const appointments = await appointmentModel.find({ userId });
    res.json({ success: true, appointments });
  } catch (error) {
    console.log(error);
    res.json({ success: false, message: error.message });
  }
};


// API to cancel appoinments
const cancelAppointment = async (req,res)=>{
  try {
    const { appointmentId } = req.body;
    const userId = req.userId;
    const appointmentData = await appointmentModel.findById(appointmentId);

    // verify appointment user
    if (!appointmentData || String(appointmentData.userId) !== String(userId)) {
      return res.json({ success: false, message: "Unauthorized action" });
    }
    await appointmentModel.findByIdAndUpdate(appointmentId, { cancelled: true });

    // releasing doctor slot
    const { docId, slotDate, slotTime } = appointmentData;
    const doctorData = await doctorModel.findById(docId);
    let slots_booked = doctorData.slots_booked;
    if (slots_booked[slotDate]) {
      slots_booked[slotDate] = slots_booked[slotDate].filter(e => e !== slotTime);
    }
    await doctorModel.findByIdAndUpdate(docId, { slots_booked });
    res.json({ success: true, message: "Appointment Cancelled" });
  } catch (error) {
    console.log(error);
    res.json({ success: false, message: error.message });
  }
}


// API to generate a mock payment session
const generateMockPayment = (req, res) => {
    try {
        const { appointmentId } = req.body;
        if (!appointmentId) {
            return res.json({ success: false, message: "Appointment ID is required" });
        }
        // Simulate a payment session creation
        const paymentSession = {
            sessionId: `mock_session_${appointmentId}_${Date.now()}`,
            appointmentId,
            redirectUrl: `${process.env.FRONTEND_URL}/mock-payment/${appointmentId}`
        };
        res.json({ success: true, payment: paymentSession });
    } catch (error) {
        console.log(error);
        res.json({ success: false, message: "Failed to generate mock payment session" });
    }
}

// API to verify mock payment and update database
const verifyMockPayment = async (req, res) => {
    try {
        const { appointmentId } = req.body;
        if (!appointmentId) {
            return res.json({ success: false, message: "Appointment ID is required" });
        }
        const appointment = await appointmentModel.findById(appointmentId);
        if (appointment) {
            await appointmentModel.findByIdAndUpdate(appointmentId, { payment: true });
            const doctor = await doctorModel.findById(appointment.docId);
            if (doctor) {
                const newEarnings = (doctor.earnings || 0) + appointment.amount;
                await doctorModel.findByIdAndUpdate(appointment.docId, { earnings: newEarnings });
            }
        }
        res.json({ success: true, message: "Payment successful and appointment updated" });
    } catch (error) {
        console.log(error);
        res.json({ success: false, message: "Payment verification failed" });
    }
}

export { registerUser, loginUser, getProfile, updateProfile, bookAppointment,listAppointment,cancelAppointment,generateMockPayment,verifyMockPayment };
