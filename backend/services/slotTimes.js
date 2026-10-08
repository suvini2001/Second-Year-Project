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