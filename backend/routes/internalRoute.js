import express from "express"; // so can create API routes
import mongoose from "mongoose";
import authInternal from "../middleware/authInternal.js";
import appointmentModel from "../models/appointmentModel.js";
// use it to find appointments ,Update appointments and count appointments
import { isValidSlotDate } from "../services/slotService.js";
import processedEventModel from "../models/processedEventModel.js";

const router = express.Router();  //Create a new empty group where I can define some API routes. 
router.use(authInternal);  // every router that is inside this file must pass authInternal first 

// Appointments on a date that still need a reminder. ?date=1_10_2026
router.get("/appointments/due-reminders", async (req, res) => {
    const { date } = req.query;
    if (!isValidSlotDate(date)) return res.status(400).json({ success: false, message: "Bad date" });

    //Find the appointments
    // database query 
    const rows = await appointmentModel
        .find({ slotDate: date, cancelled: false, isCompleted: false, reminderSentAt: null })
        .lean();   // Just give me the plain data. I don't need full Mongoose documents.
    res.json({
        success: true, appointments: rows.map((a) => ({
            id: a._id, slotDate: a.slotDate, slotTime: a.slotTime,
            patientName: a.userData?.name, patientEmail: a.userData?.email,
            doctorName: a.docData?.name,
        }))
    });
});
// Mark a reminder as sent. Only succeeds once per appointment.
router.post("/appointments/:id/reminder-sent", async (req, res) => {
    if (!mongoose.isValidObjectId(req.params.id)) {
        return res.status(400).json({ success: false, message: "Bad id" });
    }
    const updated = await appointmentModel.findOneAndUpdate(
        { _id: req.params.id, reminderSentAt: null },
        { $set: { reminderSentAt: new Date() } }
    );
    res.json({ success: true, firstTime: Boolean(updated) });
});

// Numbers for the weekly admin report.

// creates this API endpoint GET /api/internal/stats/weekly
router.get("/stats/weekly", async (req, res) => {
    const since = Date.now() - 7 * 24 * 60 * 60 * 1000;
    // give me the timestamp from 7 days ago

    const recent = { date: { $gte: since } };  //appointment.date >= 7 days ago
    const [booked, cancelled, completed, paid] = await Promise.all([
        // with promise.all database queries can run concurrently wihtout have to 
        appointmentModel.countDocuments(recent),
        appointmentModel.countDocuments({ ...recent, cancelled: true }),
        appointmentModel.countDocuments({ ...recent, isCompleted: true }),
        appointmentModel.countDocuments({ ...recent, payment: true }),
    ]);
    res.json({ success: true, booked, cancelled, completed, paid });
    // send the numbers back to n8n
});

// Claim an event. firstTime=true only for the first caller,
// or when a previous attempt failed (allowing a retry).
router.post("/events/:eventId/claim", async (req, res) => {
  const { eventId } = req.params;
  const { eventType } = req.body;
  try {
    await processedEventModel.create({ eventId, eventType });
    return res.json({ success: true, firstTime: true });
  } catch (err) {
    if (err.code !== 11000) throw err;   // 11000 = duplicate key: we've seen it
    const retry = await processedEventModel.findOneAndUpdate(
      { eventId, status: "failed" },
      { $set: { status: "processing", lastError: null }, $inc: { attempts: 1 } }
    );
    return res.json({ success: true, firstTime: Boolean(retry) });
  }
});

// Mark the result: { status: "completed" } or { status: "failed", error: "..." }
router.post("/events/:eventId/result", async (req, res) => {
  const { status, error } = req.body;
  if (!["completed", "failed"].includes(status)) {
    return res.status(400).json({ success: false, message: "Bad status" });
  }
  await processedEventModel.updateOne(
    { eventId: req.params.eventId },
    { $set: { status, lastError: error || null, processedAt: new Date() } }
  );
  res.json({ success: true });
});

export default router;  //Make this router available to other files.
