const TZ = "Asia/Colombo";
//formatting the time zone like 10.20 AM
const fmt = (d) => d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", timeZone: TZ });

// slotDate is D_M_YYYY, e.g. 5_10_2026
//
export function allSlotsFor(slotDate) {
    const [d, m, y] = slotDate.split("_").map(Number);
    const slots = [];
    for (let mins = 10 * 60; mins < 21 * 60; mins += 30) {
        // build the time in Sri Lanka time (UTC+5:30)
        const t = new Date(Date.UTC(y, m - 1, d, 0, mins) - 330 * 60 * 1000);
        if (t.getTime() > Date.now()) slots.push(fmt(t));
    }
    return slots;
}

// Accepts "2026-10-09" (preferred) or "9_10_2026" and returns DocOp's "9_10_2026" format.
// Returns { error } if the date is invalid or in the past, so the AI can correct itself.
export function toSlotDate(input) {
  const str = String(input || "").trim();
  
  // Support both YYYY-MM-DD and D_M_YYYY
  let y, mo, d;
  const isoMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(str);
  const dmyMatch = /^(\d{1,2})_(\d{1,2})_(\d{4})$/.exec(str);
  
  if (isoMatch) {
    [y, mo, d] = [Number(isoMatch[1]), Number(isoMatch[2]), Number(isoMatch[3])];
  } else if (dmyMatch) {
    [d, mo, y] = [Number(dmyMatch[1]), Number(dmyMatch[2]), Number(dmyMatch[3])];
  } else {
    return { error: "Use the date format YYYY-MM-DD, e.g. 2026-10-09." };
  }

  const check = new Date(Date.UTC(y, mo - 1, d));
  if (check.getUTCMonth() !== mo - 1 || check.getUTCDate() !== d) return { error: "That date doesn't exist." };
  const todayColombo = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Colombo" }); // "YYYY-MM-DD"
  const inputIso = `${y}-${String(mo).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  
  if (inputIso < todayColombo) return { error: "That date is in the past." };
  return { slotDate: `${d}_${mo}_${y}` };
}