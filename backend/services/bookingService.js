import doctorModel from "../models/doctorModel.js";
import userModel from "../models/userModel.js";
import appointmentModel from "../models/appointmentModel.js";
import { reserveSlot, releaseSlot, isValidSlotDate, isValidSlotTime } from "./slotService.js";
import { emitEvent } from "./eventService.js";

export async function createBooking({ userId, docId, slotDate, slotTime }) {
  if (!isValidSlotDate(slotDate)) return { success: false, message: "Invalid slot date format" };
  if (!isValidSlotTime(slotTime)) return { success: false, message: "Invalid slot time" };

  const docData = await reserveSlot(docId, slotDate, slotTime);
  if (!docData) {
    // check if the doctor exists
    const doc = await doctorModel.findById(docId).select("availability"); 
    // if someone sends an invalid docID --> error
    if (!doc) return { success: false, message: "Doctor not found" };
    // check the availability of the doctor
    if (!doc.availability) return { success: false, message: "Doctor not available" };
    return { success: false, message: "Slot not available" };
  }
  
  const userData = await userModel.findById(userId).select("-password");

  const cleanDocData = docData.toObject();
  delete cleanDocData.slots_booked; // exclude booked slots when embedding doctor data in appointment record

  const appointmentData = {
    userId,
    docId,
    userData,
    docData: {
      ...cleanDocData,
      address: docData.address,
    },
    amount: docData.fees,
    slotTime,
    slotDate,
    date: Date.now(),
  };

  const newAppointment = new appointmentModel(appointmentData);
  try {
    await newAppointment.save();
  } catch (saveErr) {
    // Roll back the slot so it doesn't stay blocked with no appointment attached
    await releaseSlot(docId, slotDate, slotTime);
    throw saveErr;
  }

  emitEvent("appointment.booked", {
    appointmentId: newAppointment._id,
    patientName: userData.name,
    patientEmail: userData.email,
    doctorName: docData.name,
    doctorEmail: docData.email,
    slotDate,
    slotTime,
  });

  return { success: true, message: "Appointment Booked", appointmentId: newAppointment._id };
}
