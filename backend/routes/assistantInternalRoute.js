import express from 'express';
import mongoose from 'mongoose';
import doctorModel from '../models/doctorModel.js';
import appointmentModel from '../models/appointmentModel.js';
import pendingBookingModel from '../models/pendingBookingModel.js';
import { isValidSlotTime } from '../services/slotService.js';
import { allSlotsFor, toSlotDate } from '../services/slotTimes.js';
import authInternal from "../middleware/authInternal.js";

const router = express.Router();
router.use(authInternal);

// If somebody deliberately sends a strange pattern, it could create an unintended or expensive regex search.
// This turns  special regex characters into ordinary characters.
const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");


// Tool 1: search_doctors
router.get("/doctors", async (req, res) => {
    const specialty = String(req.query.specialty || "").slice(0, 50);
    // limit the input to 50 characters so somebody can't send an extreamly long search string.

    const filter = { availability: true }; // start --> available docs only
    if (specialty) filter.specialization = new RegExp(escapeRegex(specialty), "i"); //"i" means case-insensitive. 
    const docs = await doctorModel.find(filter).select("name specialization experience fees").limit(10).lean();// Return at most 10 doctors This prevents the AI from receiving a huge list.
    //.lean() --> Returns normal JavaScript objects instead of full Mongoose documents.

    // format the result for AI
    res.json({
        doctors: docs.map((d) => ({
            doctorId: d._id, name: d.name,
            specialty: d.specialization, experienceYears: d.experience, fee: d.fees
        }))
    });
});

// Tool 2: check_availability
// Given a doctor and date, tell the AI which appointment times are free.
router.get("/availability", async (req, res) => {
    const { doctorId } = req.query;

    if (!mongoose.isValidObjectId(doctorId)) return res.json({ error: "Unknown doctorId. Use one from search_doctors." });
    
    const { slotDate, error } = toSlotDate(req.query.date);
    if (error) return res.json({ error });

    //get doc information -- only selecting what is necessary
    const doc = await doctorModel.findById(doctorId).select("name availability slots_booked").lean();
    if (!doc || !doc.availability) return res.json({ available: false, freeSlots: [] });
    const booked = doc.slots_booked?.[slotDate] || [];
    res.json({ doctorName: doc.name, date: req.query.date, freeSlots: allSlotsFor(slotDate).filter((t) => !booked.includes(t)) });
});  // Remove already-booked slots

// Tool 3: get_my_appointments (userId comes from n8n's signed request, not the model)

// this is useful when the patient ask "What apointments do i have "
router.get("/users/:userId/appointments", async (req, res) => {
    //validate the user ID
    if (!mongoose.isValidObjectId(req.params.userId)) return res.status(400).json({ error: "bad user" });
    const rows = await appointmentModel.find({ userId: req.params.userId, cancelled: false, isCompleted: false })
        .select("docData.name docData.specialization slotDate slotTime payment").lean();
    // format the response 
    res.json({
        appointments: rows.map((a) => ({
            doctorName: a.docData?.name,
            specialty: a.docData?.specialization, date: a.slotDate, time: a.slotTime, paid: a.payment
        }))
    });
});

// Tool 4: request_booking -> creates a PENDING booking only
router.post("/bookings/request", async (req, res) => {
    const { userId, doctorId, time } = req.body;

    // userId comes from n8n's signed request: if it's wrong, that's our bug, not the AI's
    if (!mongoose.isValidObjectId(userId)) return res.status(400).json({ error: "invalid user" });

    // these come from the AI: answer with a readable reason so it can correct itself
    if (!mongoose.isValidObjectId(doctorId))
        return res.json({ ok: false, reason: "Unknown doctorId. Use one returned by search_doctors." });
    const { slotDate, error } = toSlotDate(req.body.date);
    if (error) return res.json({ ok: false, reason: error });
    if (!isValidSlotTime(time))
        return res.json({ ok: false, reason: "Use a time exactly as returned by check_availability, e.g. 10:00 AM." });

    const doc = await doctorModel.findById(doctorId).select("name fees availability slots_booked").lean();
    const free = doc?.availability && allSlotsFor(slotDate).includes(time) &&
        !(doc.slots_booked?.[slotDate] || []).includes(time);
    if (!free) return res.json({ ok: false, reason: "That slot isn't available. Check availability again." });

    await pendingBookingModel.updateMany({ userId, status: "pending" }, { status: "cancelled" });
    const p = await pendingBookingModel.create({
        userId, docId: doctorId, doctorName: doc.name,
        slotDate, slotTime: time, fee: doc.fees,          // stored as 9_10_2026, like the website
        expiresAt: new Date(Date.now() + 10 * 60 * 1000),
    });

    res.json({
        ok: true, pendingId: p._id, doctorName: doc.name, date: req.body.date, time, fee: doc.fees,
        note: "NOT booked yet. The patient must press Confirm in the chat within 10 minutes.",
    });
});

export default router;