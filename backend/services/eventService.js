import crypto from "crypto";

// checks whether n8n is configured
const BASE = process.env.N8N_WEBHOOK_BASE;
const SECRET = process.env.DOCOP_WEBHOOK_SECRET;

// Fire-and-forget: never throws, never slows the user's request.
export function emitEvent(type, data) {
    if (!BASE || !SECRET) return;  // n8n not configured: skip quietly

    const body = JSON.stringify({ id: crypto.randomUUID(), type, occurredAt: new Date().toISOString(), data });  //id helps to identify same event hasn't happened twice

    const ts = Date.now().toString();
    const signature = crypto.createHmac("sha256", SECRET).update(`${ts}.${body}`).digest("hex");  // both backend and n8n knows the seceret key so the backend used it to create a signature
    // then n8n can check whether it is really come by my DocOp backend


    // send it to n8n
    //=======================================================================
    fetch(`${BASE}/docop-events`,
        // Fire-and-forget event delivery:
        // - The appointment/database operation is the main operation.
        // - n8n automation is only a side effect and must not block the user request.
        // - Do NOT await the n8n request; the backend continues immediately.
        // - If n8n is down, slow, or unavailable, the appointment operation still succeeds.
        // - A 3-second timeout prevents the event request from hanging indefinitely.
        // - .catch() handles delivery failures without crashing the backend.
        // - This keeps user-facing API response times independent of n8n availability.

        //  we have a one webhook instead of many webhooks then we will use switch to choose amoung the other events

        //                     ┌─ appointment.booked → booking email
        //                      │
        // docop-events ─ Switch├─ appointment.paid → payment email
        //                      │
        //                      ├─ appointment.cancelled → cancellation email
        //                      │
        //                      └─ appointment.completed → feedback email
        {
            method: "POST",
            headers: { "Content-Type": "application/json", "x-docop-timestamp": ts, "x-docop-signature": signature },
            body,
            signal: AbortSignal.timeout(3000),
        })
        .then((res) => { if (!res.ok) console.error(`[event] ${type} rejected by n8n: HTTP ${res.status}`); })
        .catch((err) => console.error(`[event] ${type} not delivered:`, err.message));
}