import doctorModel from "../models/doctorModel.js";

// Slot date must be D_M_YYYY (the format the frontend already sends, e.g. 28_9_2026).
// slotDate is used as a MongoDB field path key (slots_booked.<slotDate>), so we must
// reject anything that contains '.' or starts with '$' to prevent NoSQL path injection.
const SLOT_DATE_RE = /^\d{1,2}_\d{1,2}_\d{4}$/;
export const isValidSlotDate = (d) => typeof d === "string" && SLOT_DATE_RE.test(d);

// slotTime is only ever stored as an array value, never used as a key, so we keep the
// check loose to accommodate locale-specific toLocaleTimeString() output from the browser.
export const isValidSlotTime = (t) =>
  typeof t === "string" && t.trim().length > 0 && t.length <= 20;

/**
 * Atomically reserve a slot on a doctor document.
 *
 * The filter { _id, availability: true, [field]: { $ne: slotTime } } and the
 * $push are sent to MongoDB as a single findOneAndUpdate command. MongoDB
 * guarantees that a single-document update is atomic, so exactly one concurrent
 * request can match and the rest receive null — eliminating the read-check-write
 * race condition that existed in the old bookAppointment code.
 *
 * Returns the updated doctor document, or null if:
 *   - the doctor does not exist
 *   - the doctor is not available
 *   - the slot is already booked
 */
export const reserveSlot = (docId, slotDate, slotTime) => {
  const field = `slots_booked.${slotDate}`;
  return doctorModel
    .findOneAndUpdate(
      { _id: docId, availability: true, [field]: { $ne: slotTime } }, // only if NOT already booked
      { $push: { [field]: slotTime } },                               // ...then book it
      { new: true }
    )
    .select("-password");
};

/**
 * Release a previously reserved slot.
 * Used as a rollback if the appointment document save fails after reserveSlot.
 * Silently skips invalid inputs so the caller never has to guard against it.
 */
export const releaseSlot = async (docId, slotDate, slotTime) => {
  if (!docId || !isValidSlotDate(slotDate)) return;
  await doctorModel.updateOne(
    { _id: docId },
    { $pull: { [`slots_booked.${slotDate}`]: slotTime } }
  );
};
