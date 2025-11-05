import doctorModel from "../models/doctorModel.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import appointmentModel from "../models/apointmentModel.js";
import messageModel from "../models/messageModel.js";

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
      const token = jwt.sign({ id: doctor._id, type: 'doctor' }, process.env.JWT_SECRET);
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
    const docId = req.docId;
    if (!docId) {
      return res.json({ success: false, message: "Doctor not authorized" });
    }
    const appointments = await appointmentModel
      .find({ docId })
      .sort({ date: -1 })
      .lean();

    const appointmentsWithUnreadCount = await Promise.all(
      appointments.map(async (appointment) => {
        const unreadCount = await messageModel.countDocuments({
          appointmentId: appointment._id,
          senderType: 'user', // Messages from user are for the doctor
          isRead: false,
        });
        return {
          ...appointment,
          unreadCount,
        };
      })
    );

    return res.json({ success: true, appointments: appointmentsWithUnreadCount });
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
      return res.status(403).json({
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
      return res.status(403).json({
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

// API to get doctor profile for Doctor Panel
const doctorProfile = async (req, res) => {
  try {
    const docId = req.docId; // <-- Get the ID from the auth middleware
    const profileData = await doctorModel.findById(docId).select("-password");
    res.json({ success: true, profileData });
  } catch (error) {
    console.log(error);
    res.json({ success: false, message: error.message });
  }
};

// API to update doctor profile data from Doctor Panel
const updateDoctorProfile = async (req, res) => {
  try {
    // 1. Get the docId from the auth middleware (NOT req.body)
    const docId = req.docId;

    // 2. Get all the fields you sent from the frontend
    // Accept any fields for partial update
    let update = { ...req.body };
    // Parse address if sent as JSON string
    if (typeof update.address === "string") {
      try {
        update.address = JSON.parse(update.address);
      } catch {
        /* keep as is */
      }
    }
    // Convert available to boolean if string
    if (typeof update.available === "string") {
      update.available = update.available === "true";
    }
    // Remove undefined fields (only update provided fields)
    Object.keys(update).forEach(key => {
      if (update[key] === undefined) delete update[key];
    });

    // Optional image upload
    const imageFile = req.file;
    if (imageFile) {
      const uploadRes = await cloudinary.uploader.upload(imageFile.path, {
        resource_type: "image",
      });
      update.image = uploadRes.secure_url;
    }

    await doctorModel.findByIdAndUpdate(docId, update);
    res.json({ success: true, message: "Profile Updated" });
  } catch (error) {
    console.log(error);
    res.json({ success: false, message: error.message });
  }
};

// API to get unread messages count for a doctor
const getUnreadMessagesCount = async (req, res) => {
  try {
    const docId = req.docId;
    // Find all appointments for the doctor
    const doctorAppointments = await appointmentModel.find({ docId: docId });
    const appointmentIds = doctorAppointments.map(app => app._id);

    // Count unread messages from users
    const unreadCount = await messageModel.countDocuments({
      appointmentId: { $in: appointmentIds },
      senderType: 'user',
      isRead: false
    });

    res.json({ success: true, unreadCount });
  } catch (error) {
    console.log(error);
    res.json({ success: false, message: "Failed to get unread messages count" });
  }
};

// API to get doctor inbox (one conversation per appointment) with last message and unread count
const getDoctorInbox = async (req, res) => {
  try {
    const doctorId = req.docId;  // authDoctor middleware attaches req.docId after verifying the doctor's token


    // Queries the database for all appointments belonging to the doctor. 
    const appointments = await appointmentModel
      .find({ docId: doctorId }) // filters appointments where the docId field matches the current doctor
      .select('_id userData date cancelled isCompleted payment')
      .lean();   //tells Mongoose to return plain JavaScript objects

    // For each appointment, compute lastMessage and unreadCount
    // .map() goes through each appointment in the array.
    //For every appointment, you’ll gather two things:
    // The last message sent in that conversation.
    // The count of unread messages from the doctor.
    //Promise.all() runs all these lookups in parallel, improving performance instead of doing them one by one

    const inbox = await Promise.all(
      appointments.map(async (app) => {


        const [lastMessage, unreadCount] = await Promise.all([
          //Here we make two database calls simultaneously for each appointment:
          //a)lastMessage
          messageModel
            .findOne({ appointmentId: app._id }) //finds any message that belongs to this appointment.returns only the most recent message.
            .sort({ timestamp: -1 }) //sorts messages in descending order of timestamp (newest first).
            .lean(),//again returns a plain object.
            //b) unreadCount
          messageModel.countDocuments({  // counts how many messages match:
            appointmentId: app._id,
            senderType: 'user',
            isRead: false,
          }),
        ]);

        // build a summary object for this appointment
        return {
          appointmentId: app._id,
          user: {
            id: app.userData?._id || app.userData?.id || undefined,  //handle inconsistent data (some DBs might store doctor ID under _id, others under id)
            name: app.userData?.name,
            image: app.userData?.image,
            
          },
          lastMessage: lastMessage  //last message details
            ? {
                message: lastMessage.message,
                timestamp: lastMessage.timestamp,
                senderType: lastMessage.senderType,
              }
            : null,
          unreadCount,  //unread messages
          meta: {
            date: app.date,
            cancelled: app.cancelled,
            isCompleted: app.isCompleted,
            payment: app.payment,
          },
        };
      })
    );

    // Sort by latest activity (lastMessage timestamp or appointment date)
    inbox.sort((a, b) => {
      const at = a.lastMessage?.timestamp || a.meta.date || 0;
      const bt = b.lastMessage?.timestamp || b.meta.date || 0;
      return bt - at;
    });

    res.json({ success: true, inbox });   // Sends a JSON response back to the client.
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
  doctorProfile,
  updateDoctorProfile,
  getUnreadMessagesCount,
  getDoctorInbox,
  
};
