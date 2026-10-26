//The `dayTools.js` file contains reusable helper functions for DocOp's admin and MCP read-only routes.
// It validates dates while allowing past dates, defaults to today's date in Sri Lanka, converts dates into the
// format used by appointment slots, and converts appointment times into minutes for chronological sorting. 
// It also extracts patients' first names to minimize personal data, escapes special characters for safe regex searches,
// and formats appointment records into a clean list containing the doctor, patient, time, status, and payment indicator.


// Helpers for admin/MCP read routes. Unlike toSlotDate(), these allow past dates,
// because an admin may ask about yesterday's appointments.
const TZ = "Asia/Colombo";

// "2026-10-09" -> { iso: "2026-10-09", slotDate: "9_10_2026" }. No input = today in Sri Lanka.
export function dayKey(input) {
    let iso = String(input || "").trim(); // if a date is provided convert to string otherwise empty string

    // if no date was provided use today
    if (!iso) iso = new Intl.DateTimeFormat("en-CA", { timeZone: TZ }).format(new Date()); // en-CA prints YYYY-MM-DD

    //This checks whether the input follows YYYY-MM-DD.
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
    if (!m) return { error: "Use the date format YYYY-MM-DD, for example 2026-10-09." };

    //check whether the date actually exists -->This catches impossible calendar dates, such as February 30.
    const [y, mo, d] = m.slice(1).map(Number);
    const dt = new Date(Date.UTC(y, mo - 1, d));
    if (dt.getUTCMonth() !== mo - 1 || dt.getUTCDate() !== d) return { error: `${iso} is not a real date.` };

    //return both data formats iso and slotdate
    return { iso, slotDate: `${d}_${mo}_${y}` };
}

// "02:30 PM" -> 870, so a day's appointments can be sorted by time
//Computers can sort appointment times more reliably if they are converted into numbers.
export function toMinutes(time) {
    const m = /^(\d{1,2}):(\d{2})\s*(AM|PM)$/i.exec(String(time || ""));
    if (!m) return 24 * 60;
    let h = Number(m[1]) % 12;
    if (m[3].toUpperCase() === "PM") h += 12;
    return h * 60 + Number(m[2]);
}

// Minimum data: only the patient's first name ever leaves the backend for an AI--This is data minimization
export const firstName = (name) => String(name || "Patient").trim().split(/\s+/)[0];

//This helper adds a backslash before special regex characters.-->That makes it safer to use user-provided text as a literal search pattern.
export const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// One day's appointments for one doctor (or all doctors), sorted by time
//It takes an array of appointment records and produces a cleaner list.
export function toScheduleRows(appointments) {
    return appointments
        .slice()  //Copy the array
        //It compares appointment times after converting them to minutes.
        .sort((a, b) => toMinutes(a.slotTime) - toMinutes(b.slotTime))
        .map((a) => ({  //Select only the required fields
            time: a.slotTime,
            doctor: a.docData?.name,
            doctorId: a.docId,
            patient: firstName(a.userData?.name),
            status: a.cancelled ? "cancelled" : a.isCompleted ? "completed" : "booked",
            paid: Boolean(a.payment),
        }));
}
