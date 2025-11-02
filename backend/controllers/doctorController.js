import doctorModel from "../models/doctorModel.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import appointmentModel from "../models/apointmentModel.js";

const changeAvailability = async (req, res) => {
  try {
    const { docId } = req.body;
    const docData = await doctorModel.findById(docId);

    // Toggle the correct `availability` field
    const updatedAvailability = !docData.availability;
    await doctorModel.findByIdAndUpdate(docId, {
      availability: updatedAvailability,
    });

    res.json({
      success: true,
      message: "Availability Changed",
      availability: updatedAvailability,
    });
  } catch (error) {
    console.log(error);
    res.json({ success: false, message: error.message });
  }
};

const doctorList = async (req, res) => {
  try {
    const doctors = await doctorModel.find({}).select(["-password", "-email"]);
    const formattedDoctors = doctors.map((doc) => ({
      ...doc.toObject(),
      speciality: doc.specialization, // Map specialization to speciality
      availability: doc.availability, // Ensure availability is included
    }));
    res.json({ success: true, doctors: formattedDoctors });
  } catch (error) {
    console.log(error);
    res.json({ success: false, message: error.message });
  }
};

// API for doctor Login
const loginDoctor = async (req, res) => {
  try {
    const { email, password } = req.body;
    const doctor = await doctorModel.findOne({ email });

    if (!doctor) {
      return res.json({ success: false, message: "Invalid credentials" });
    }

    const isMatch = await bcrypt.compare(password, doctor.password);

    if (isMatch) {
      const token = jwt.sign({ id: doctor._id }, process.env.JWT_SECRET);
      return res.json({ success: true, token });
    } else {
      return res.json({ success: false, message: "Invalid credentials" });
    }
  } catch (error) {
    console.log(error);
    res.json({ success: false, message: error.message });
  }
};

// Get all appointments for logged-in doctor
const appointmentsDoctor = async (req, res) => {
  try {
    const docId = req.docId || req.body.docId || req.query.docId; // Corrected typo from req.docd to req.docId
    if (!docId) {
      return res.json({ success: false, message: "Doctor not authorized" });
    }
    const appointments = await appointmentModel
      .find({ docId })
      .sort({ date: -1 });
    return res.json({ success: true, appointments });
  } catch (error) {
    console.log(error);
    res.json({ success: false, message: error.message });
  }
};

// API to mark an appointment completed for the doctor panel
const appointmentComplete = async (req, res) => {
  try {
    const { appointmentId } = req.body;
    console.log("appointmentComplete called with:", {
      appointmentId,
      docId: req.docId,
    });

    const appointmentData = await appointmentModel.findById(appointmentId);
    if (!appointmentData) {
      return res
        .status(404)
        .json({ success: false, message: "Appointment not found" });
    }

    if (appointmentData.docId.toString() !== req.docId) {
      return res
        .status(403)
        .json({
          success: false,
          message: "Unauthorized to complete this appointment",
        });
    }

    await appointmentModel.findByIdAndUpdate(appointmentId, {
      isCompleted: true,
    });
    return res.json({
      success: true,
      message: "Appointment marked as completed",
    });
  } catch (error) {
    console.log("Error in appointmentComplete:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// API to cancel appointment for doctor panel
const appointmentCancel = async (req, res) => {
  try {
    const { appointmentId } = req.body;
    console.log("appointmentCancel called with:", {
      appointmentId,
      docId: req.docId,
    });

    const appointmentData = await appointmentModel.findById(appointmentId);
    if (!appointmentData) {
      return res
        .status(404)
        .json({ success: false, message: "Appointment not found" });
    }

    if (appointmentData.docId.toString() !== req.docId) {
      return res
        .status(403)
        .json({
          success: false,
          message: "Unauthorized to cancel this appointment",
        });
    }

    await appointmentModel.findByIdAndUpdate(appointmentId, {
      cancelled: true,
    });
    return res.json({
      success: true,
      message: "Appointment cancelled successfully",
    });
  } catch (error) {
    console.log("Error in appointmentCancel:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// API to get dashboard data to doctor panel

const doctorDashboard = async (req, res) => {
  try {
    const docId = req.docId;
    const appointments = await appointmentModel.find({ docId });

    let earnings = 0;
    appointments.map((item) => {
      if (item.isCompleted || item.payment) {
        earnings += item.amount;
      }
    });

    let patients = [];
    appointments.map((item) => {
      if (!patients.includes(item.userId)) {
        patients.push(item.userId);
      }
    });

    const dashData = {
      earnings,
      appointments: appointments.length,
      patients: patients.length,
      // Return up to the latest 10 appointments instead of 5
      latestAppointments: appointments.reverse().slice(0, 5),
    };

    res.json({ success: true, dashData });
  } catch (error) {
    console.log(error);
    res.json({ success: false, message: error.message });
  }
};

export {
  changeAvailability,
  doctorList,
  loginDoctor,
  appointmentsDoctor,
  appointmentComplete,
  appointmentCancel,
  doctorDashboard,
};
