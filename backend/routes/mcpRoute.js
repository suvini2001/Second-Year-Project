import express from "express";  //creates API routes
import mongoose from "mongoose"; //validates MongoDB IDs and supports database queries.
import authMcp from "../middleware/authMcp.js";  //checks whether the request contains the correct MCP secret key
//access doctor and appointment records.
import doctorModel from "../models/doctorModel.js";
import appointmentModel from "../models/appointmentModel.js";

//handle available appointment slots and booking-date validation.
import { allSlotsFor, toSlotDate } from "../services/slotTimes.js";

//validate report dates, safely prepare search patterns, and format appointment data.
import { dayKey, escapeRegex, toScheduleRows } from "../services/dayTools.js";

// Read-only data for the DocOp MCP server. Every route only reads (find / aggregate).
// Errors are short sentences, so the AI can read them and correct itself.
const router = express.Router();

//Every route in this router must pass the MCP authentication middleware before its handler runs.Requests with a missing or incorrect key are rejected.
router.use(authMcp); //

const badDoctor = (res) => res.status(400).json({ error: "Unknown doctorId. Use a doctorId from list_doctors." });

// list_doctors: ?specialty=cardio&onlyAvailable=true
//What happens:
//Reads the requested specialty.
//Escapes special regex characters before searching.
//Filters for available doctors if onlyAvailable=true.
//Retrieves selected doctor fields from MongoDB.
//Limits the results to 25 doctors.
//Returns each doctor's ID, name, specialty, experience, fee, and availability.
//This route helps the AI discover valid doctor IDs before calling other tools.

router.get("/doctors", async (req, res) => {
    const filter = {};
    const specialty = String(req.query.specialty || "").trim().slice(0, 50);
    if (specialty) filter.specialization = new RegExp(escapeRegex(specialty), "i");
    if (req.query.onlyAvailable === "true") filter.availability = true;

    const docs = await doctorModel.find(filter)
        .select("name specialization experience fees availability").limit(25).lean();
    res.json({
        count: docs.length,
        doctors: docs.map((d) => ({
            doctorId: String(d._id), name: d.name, specialty: d.specialization,
            experience: d.experience, fee: d.fees, available: Boolean(d.availability),
        })),
    });
});

// get_availability: ?doctorId=...&date=2026-10-09 (future dates only, like the website)

//What happens:
//Checks whether the doctor ID has a valid MongoDB ObjectId format.
//Validates the date using toSlotDate().
//Finds the doctor in MongoDB.
//Checks whether the doctor is available.
//Retrieves already-booked slots for that date.
//Uses allSlotsFor() to generate the day's possible slots.
//Removes booked slots and returns the remaining free slots.
//If the doctor is unavailable, the route returns available: false and an empty list of free slots


router.get("/availability", async (req, res) => {
    if (!mongoose.isValidObjectId(req.query.doctorId)) return badDoctor(res);
    const { slotDate, error } = toSlotDate(req.query.date);
    if (error) return res.status(400).json({ error });

    const doc = await doctorModel.findById(req.query.doctorId).select("name availability slots_booked").lean();
    if (!doc) return badDoctor(res);
    if (!doc.availability) return res.json({ doctor: doc.name, date: req.query.date, available: false, freeSlots: [] });

    const booked = doc.slots_booked?.[slotDate] || [];
    const freeSlots = allSlotsFor(slotDate).filter((t) => !booked.includes(t));
    res.json({ doctor: doc.name, date: req.query.date, available: true, freeCount: freeSlots.length, freeSlots });
});

// get_appointment_stats: ?date=2026-10-09 (appointments ON that day)
//                     or ?days=7 (bookings MADE in the last N days). Optional &doctorId=


//What happens:

//Builds a MongoDB filter for the requested period.
//Optionally validates and applies the doctor ID.
//Uses MongoDB's aggregation pipeline to group appointments by doctor.
//Calculates totals, cancelled appointments, completed appointments, and paid appointments.
//Combines the per-doctor numbers into overall totals.
//Returns the statistics in JSON.

router.get("/stats", async (req, res) => {
    const match = {};
    let period;
    if (req.query.date) {
        const day = dayKey(req.query.date);
        if (day.error) return res.status(400).json({ error: day.error });
        match.slotDate = day.slotDate;
        period = `appointments on ${day.iso}`;
    } else {
        const days = Math.min(Math.max(parseInt(req.query.days, 10) || 7, 1), 90);
        match.date = { $gte: Date.now() - days * 24 * 60 * 60 * 1000 };
        period = `bookings made in the last ${days} days`;
    }
    if (req.query.doctorId) {
        if (!mongoose.isValidObjectId(req.query.doctorId)) return badDoctor(res);
        match.docId = String(req.query.doctorId);
    }

    const rows = await appointmentModel.aggregate([
        { $match: match },
        {
            $group: {
                //$group calculates statistics for multiple doctors in one aggregation query instead of making separate count queries for every doctor.
                _id: "$docId",
                doctor: { $first: "$docData.name" },
                total: { $sum: 1 },
                cancelled: { $sum: { $cond: ["$cancelled", 1, 0] } },
                completed: { $sum: { $cond: ["$isCompleted", 1, 0] } },
                paid: { $sum: { $cond: [{ $and: ["$payment", { $not: ["$cancelled"] }] }, 1, 0] } },
            },
        },
        { $sort: { total: -1 } },
    ]);

    const byDoctor = rows.map((r) => ({
        doctorId: r._id, doctor: r.doctor, total: r.total, active: r.total - r.cancelled,
        cancelled: r.cancelled, completed: r.completed, paid: r.paid,
    }));
    const sum = (key) => byDoctor.reduce((n, r) => n + r[key], 0);
    res.json({
        period,
        totals: { total: sum("total"), active: sum("active"), cancelled: sum("cancelled"), completed: sum("completed"), paid: sum("paid") },
        byDoctor,
    });
});

// get_todays_schedule: ?date=2026-10-09 (default: today in Sri Lanka) &doctorId=
//Purpose: Retrieve a day's appointments, optionally for one doctor.
//What happens:
//Validates the date with dayKey(), defaulting to today in Sri Lanka if omitted.
//Builds a query for appointments scheduled on that date.
//Optionally filters by doctor ID.
//Retrieves only the fields needed for the response.
//Calls toScheduleRows() to sort appointments by time and format their data.
//Returns the date, appointment count, and formatted appointment list.
//The count excludes cancelled appointments, although the returned list still includes them with their status marked as "cancelled"

router.get("/schedule", async (req, res) => {
    const day = dayKey(req.query.date);
    if (day.error) return res.status(400).json({ error: day.error });
    const filter = { slotDate: day.slotDate };
    if (req.query.doctorId) {
        if (!mongoose.isValidObjectId(req.query.doctorId)) return badDoctor(res);
        filter.docId = String(req.query.doctorId);
    }

    const rows = await appointmentModel.find(filter)
        .select("slotTime docId docData.name userData.name cancelled isCompleted payment").lean();
    const appointments = toScheduleRows(rows);
    res.json({
        date: day.iso,
        count: appointments.filter((a) => a.status !== "cancelled").length,
        appointments,
    });
});

export default router;