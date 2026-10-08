import mongoose from "mongoose";

// A schema defines what info each pending booking appointment should contain
const pendingBookingSchema = new mongoose.Schema({
    userId: { type: String, required: true, index: true },
    docId: { type: String, required: true },
    doctorName: String,
    slotDate: { type: String, required: true },
    slotTime: { type: String, required: true },
    fee: Number,
    status: { type: String, enum: ["pending", "confirmed", "cancelled"], default: "pending" },
    expiresAt: { type: Date, required: true, index: { expires: 0 } }, // auto-delete when expired
});

export default mongoose.models.pending_booking ||
    mongoose.model("pending_booking", pendingBookingSchema, "pending_bookings");