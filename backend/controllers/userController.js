import validator from "validator";
import bcrypt from "bcrypt";
import userModel from "../models/userModel.js";
import jwt from "jsonwebtoken";
import { v2 as cloudinary } from "cloudinary";
import doctorModel from "../models/doctorModel.js";
import appointmentModel from "../models/appointmentModel.js";
import messageModel from "../models/messageModel.js";
import crypto from "crypto";
import { sendEmail } from "../services/emailService.js";


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

    const token = jwt.sign({ id: user._id, type: 'user' }, process.env.JWT_SECRET);

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
    const appointments = await appointmentModel.find({ userId }).lean(); // Use .lean() for plain JS objects

    const appointmentsWithUnreadCount = await Promise.all(
      appointments.map(async (appointment) => {
        const unreadCount = await messageModel.countDocuments({
          appointmentId: appointment._id,
          senderType: 'doctor', // Messages from doctor are for the user
          isRead: false,
        });
        return {
          ...appointment,
          unreadCount,
        };
      })
    );

    res.json({ success: true, appointments: appointmentsWithUnreadCount });
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
            // Send payment confirmation emails (fire-and-forget)
            try {
                const userEmail = appointment?.userData?.email; // embedded snapshot
                const doctorEmail = appointment?.docData?.email || doctor?.email;
                const apptDate = appointment.slotDate;
                const apptTime = appointment.slotTime;
                const amount = appointment.amount;

                // Create email subject
                const subject = `Payment Confirmed - ${apptDate} ${apptTime}`;

                 // HTML template for user confirmation email
                const userHtml = `<!DOCTYPE html><html><body style="font-family:Arial;line-height:1.5;color:#222">
                  <h2 style="color:#0a7cff;margin:0 0 12px">Payment Successful</h2>
                  <p>Your appointment is confirmed.</p>
                  <p><strong>Appointment Date and Time:</strong> ${apptDate} ${apptTime}<br/>
                  <strong>Amount Paid:</strong> $${amount}</p>
                  <p>Doctor: ${appointment?.docData?.name || 'Doctor'}</p>
                  <p style="margin-top:20px">Thank you,<br/>DocOp Team</p>
                </body></html>`;

                 // HTML template for doctor notification email
                const doctorHtml = `<!DOCTYPE html><html><body style="font-family:Arial;line-height:1.5;color:#222">
                  <h2 style="color:#0a7cff;margin:0 0 12px">New Paid Appointment</h2>
                  <p>An appointment has been paid and confirmed.</p>
                  <p><strong>Appointment Date and Time:</strong> ${apptDate} ${apptTime}<br/>
                  <strong>Patient:</strong> ${appointment?.userData?.name || 'Patient'}<br/>
                  <strong>Amount:</strong> $${amount}</p>
                  <p style="margin-top:20px">DocOp Notification</p>
                </body></html>`;

                // Array to collect email promises
                const sends = [];

                 // Add user email to send queue if email exists
                if (userEmail) {
                  sends.push(sendEmail({ to: userEmail, subject, html: userHtml }));
                }

                  // Add doctor email to send queue if email exists
                if (doctorEmail) {
                  sends.push(sendEmail({ to: doctorEmail, subject: `Patient Paid - ${apptDate} ${apptTime}`, html: doctorHtml }));
                }
                
                // Run concurrently without blocking response; ignore individual failures
                Promise.allSettled(sends).then(r => {
                  const failed = r.filter(x => x.status === 'rejected');
                  if (failed.length) {
                    console.error('Email send failures (payment confirmation):', failed.map(f=>f.reason?.message||f.reason));
                  }
                });
            } catch (emailErr) {
                console.error('Payment confirmation email error:', emailErr?.message || emailErr);
            }
        }
        res.json({ success: true, message: "Payment successful and appointment updated" });
    } catch (error) {
        console.log(error);
        res.json({ success: false, message: "Payment verification failed" });
    }
}

// API to get unread messages count
const getUnreadMessagesCount = async (req, res) => {
    try {
        const userId = req.userId;
        // Find all appointments for the user
        const userAppointments = await appointmentModel.find({ userId: userId });
        const appointmentIds = userAppointments.map(app => app._id);

        // Count unread messages from doctors
        const unreadCount = await messageModel.countDocuments({
            appointmentId: { $in: appointmentIds },
            senderType: 'doctor',
            isRead: false
        });

        res.json({ success: true, unreadCount });
    } catch (error) {
        console.log(error);
        res.json({ success: false, message: "Failed to get unread messages count" });
    }
};

// API to get user inbox (one conversation per appointment) with last message and unread count
const getUserInbox = async (req, res) => {
  try {
    const userId = req.userId;  // authUser middleware attaches req.userId after verifying the user's token. This ensures the API returns inbox data only for the authenicated user.


    //Queries the database for all appointments belonging to the user. 
    const appointments = await appointmentModel
      .find({ userId }) //filters appointments where the userId field matches the current user.
      .select('_id docData date cancelled isCompleted payment')
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
          messageModel.countDocuments({  //counts how many messages match:
            appointmentId: app._id,
            senderType: 'doctor',
            isRead: false,
          }),
        ]);

        // build a summary object for this appointment
        return {
          appointmentId: app._id,
          doctor: {
            id: app.docData?._id || app.docData?.id || undefined,  //handle inconsistent data (some DBs might store doctor ID under _id, others under id)
            name: app.docData?.name,
            image: app.docData?.image,
            specialization: app.docData?.specialization || app.docData?.speciality,
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

    res.json({ success: true, inbox });   //Sends a JSON response back to the client.
  } catch (error) {
    console.log(error);
    res.json({ success: false, message: error.message });
  }
};

export { registerUser, loginUser, getProfile, updateProfile, bookAppointment, listAppointment, cancelAppointment, generateMockPayment, verifyMockPayment, getUnreadMessagesCount, getUserInbox };

// Send a test email (for setup verification)
export const sendTestEmail = async (req, res) => {
  try {
    const { to, subject, text, html } = req.body || {};
    if (!to) return res.status(400).json({ success: false, message: "'to' is required" });

    await sendEmail({ to, subject: subject || "DocOp Test Email", text, html: html || "Hello from DocOp via Brevo!" });
    return res.json({ success: true, message: "Email sent" });
  } catch (err) {
    console.error("sendTestEmail error:", err);
    return res.status(500).json({ success: false, message: err?.message || "Failed to send email" });
  }
};


//The meta object is a container for appointment metadata — meaning, it stores extra contextual information about each appointment that isn’t directly part of the messaging data but is still relevant when displaying or managing the inbox.


//🧠 Why include meta in the inbox?

// There are 4 main reasons:

// 1️⃣ Preserve extra context for the UI

// The inbox isn’t just about messages. It’s a summary view of the relationship between user and doctor.
// In your app, each conversation is actually an appointment — so you may want to show details like:

// When the appointment was scheduled (date)

// Whether it’s cancelled (cancelled)

// Whether it’s completed (isCompleted)

// Whether the payment was made (payment)

// These details help the frontend display different visuals or statuses, for example:

// A dimmed or grey row for cancelled appointments.

// A “✔ Completed” badge for finished appointments.

// A “💰 Payment Pending” label if unpaid.

// Without meta, you’d have to make another API call just to get these details when rendering your inbox.

// 2️⃣ Helps with sorting fallback

// In your sort logic:

// inbox.sort((a, b) => {
//   const at = a.lastMessage?.timestamp || a.meta.date || 0;
//   const bt = b.lastMessage?.timestamp || b.meta.date || 0;
//   return bt - at;
// });


// If a conversation has no messages yet (like a newly booked appointment), it won’t have a lastMessage.timestamp.

// ➡️ In that case, the code falls back to a.meta.date, meaning:

// “If there’s no chat yet, sort by appointment date instead.”

// That’s why storing the appointment date inside meta is very convenient — you can easily access it when sorting or filtering without fetching appointments again.

// 3️⃣ Keeps structure clean and organized

// You could technically put date, cancelled, isCompleted, and payment directly in the top-level object:

// return {
//   appointmentId: ...,
//   doctor: {...},
//   lastMessage: {...},
//   unreadCount,
//   date: app.date,
//   cancelled: app.cancelled,
//   ...
// };


// But that clutters the response.

// Grouping these under meta keeps your JSON structured and readable:

// Top-level: conversation-level data (doctor, messages, unread count)

// Inside meta: appointment-related data (status and scheduling)

// Think of it like having sections:

// conversation info
// ├── doctor
// ├── lastMessage
// ├── unreadCount
// └── meta → all appointment-level details


// This also makes your API extensible — you can later add more appointment-related info (like location, fee, or notes) without polluting the main object.

// 4️⃣ Future flexibility (filters and analytics)

// By including metadata in the inbox:

// You can later filter inbox items client-side:

// Show only “Upcoming” appointments (future date)

// Hide “Cancelled” ones

// Show only “Paid” or “Completed” chats

// You can even compute quick analytics like:

// “How many completed appointments had unread messages?”

// “Which doctors are most active recently?”

// That’s all possible because the inbox items already carry meta context — no extra queries needed.