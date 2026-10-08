import express from 'express';
import mongoose from 'mongoose';
import doctorModel from '../models/doctorModel.js';
import appointmentModel from '../models/appointmentModel.js';
import pendingBookingModel from '../models/pendingBookingModel.js';
import { isValidSlotDate, isValidSlotTime } from '../services/slotService.js';
import { allSlotsFor } from '../services/slotTimes.js';
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
    const { doctorId, date } = req.query;

    // validate the inputs docID and the date so the bad input is rejected before quering the database
    if (!mongoose.isValidObjectId(doctorId) || !isValidSlotDate(date))
        return res.status(400).json({ error: "doctorId or date (D_M_YYYY) invalid" });

    //get doc information -- only selecting what is necessary
    const doc = await doctorModel.findById(doctorId).select("name availability slots_booked").lean();
    if (!doc || !doc.availability) return res.json({ available: false, freeSlots: [] });
    const booked = doc.slots_booked?.[date] || [];
    res.json({ doctorName: doc.name, date, freeSlots: allSlotsFor(date).filter((t) => !booked.includes(t)) });
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
    const { userId, doctorId, date, time } = req.body;
    // validate everything
    if (!mongoose.isValidObjectId(userId) || !mongoose.isValidObjectId(doctorId) ||
        !isValidSlotDate(date) || !isValidSlotTime(time))
        return res.status(400).json({ error: "invalid input" });

    // get the doctor
    const doc = await doctorModel.findById(doctorId).select("name fees availability slots_booked").lean();

    // check whether the requested slot is free
    const free = doc?.availability && allSlotsFor(date).includes(time) &&
        !(doc.slots_booked?.[date] || []).includes(time);

    // if the slot is not free This is useful because another patient might have booked the slot after the AI originally checked it.
    if (!free) return res.json({ ok: false, reason: "That slot isn't available. Check availability again." });

    // cancle any previous pending booking -- only one pending booking at a time 
    await pendingBookingModel.updateMany({ userId, status: "pending" }, { status: "cancelled" }); // one at a time

    //Create the temporary booking
    const p = await pendingBookingModel.create({
        userId, docId: doctorId, doctorName: doc.name,
        slotDate: date, slotTime: time, fee: doc.fees, expiresAt: new Date(Date.now() + 10 * 60 * 1000)
    });

    // return the pending booking information 
    res.json({
        ok: true, pendingId: p._id, doctorName: doc.name, date, time, fee: doc.fees,
        note: "NOT booked yet. The patient must press Confirm in the chat within 10 minutes."
    });
});

export default router;