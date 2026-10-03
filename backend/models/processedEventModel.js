import mongoose from "mongoose";

const processedEventSchema = new mongoose.Schema({
    eventId: { type: String, required: true, unique: true }, // the UUID from emitEvent
    eventType: { type: String, required: true },               // e.g. appointment.booked
    status: { type: String, enum: ["processing", "completed", "failed"], default: "processing" },
    attempts: { type: Number, default: 1 },
    lastError: { type: String, default: null },
    createdAt: { type: Date, default: Date.now, expires: 60 * 60 * 24 * 30 }, // auto-delete after 30 days
    processedAt: { type: Date, default: null },
});

export default mongoose.models.processed_event ||
    mongoose.model("processed_event", processedEventSchema, "processed_events");