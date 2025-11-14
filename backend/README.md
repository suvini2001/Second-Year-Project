# Backend Notes: Messaging Hardening, Headers, and Socket.IO Path

## Message Validation & Limits
- Max length: 2000 characters (configurable via `MAX_MESSAGE_LENGTH`).
- Trimming: messages are trimmed server-side; empty after trim is rejected.
- Moderation: optional basic moderation via `BASIC_MODERATION_ENABLED=true`. Replace with a proper service as needed.
- Schema guard: `message` field has `trim: true` and `maxlength: 2000` for defense in depth.

Ack behavior on `send-message`:
- Oversized: `{ ok: false, error: "Message too long (max 2000 characters)" }`
- Empty: `{ ok: false, error: "Message cannot be empty" }`
- Moderation: `{ ok: false, error: "Message contains disallowed content" }` (or similar)

Rate limiting:
- Per appointment + sender sliding window limit (defaults: 20 messages / 10s).
- Config: `SEND_RATE_MAX`, `SEND_RATE_WINDOW_MS`.
- On limit: `{ ok: false, error: "Rate limit exceeded. Try again in Xs" }`.
- For production at scale, consider Redis-backed rate limiting.

## Headers: Users vs Doctors
Express lowercases incoming header names. Keep docs and clients consistent.
- Users: send JWT in header `token`.
- Doctors: send JWT in header `dtoken`.

Example (Axios):
```js
// user
axios.get(`${backendUrl}/api/user/messages/${appointmentId}`, {
  headers: { token }
});

// doctor
axios.get(`${backendUrl}/api/doctor/messages/${appointmentId}`, {
  headers: { dtoken: dToken }
});
```

## Socket.IO Path Alignment
The server uses a custom Socket.IO path: `/socket.io/`.
Some load balancers, CDNs, and proxies are configured to upgrade WebSockets only on that path. If the client uses a different path, you can see 400/404s, long‑poll fallbacks, or intermittent connection issues.

Always set the same path on clients and pass the auth token via `auth`:
```js
import { io } from 'socket.io-client';

const socket = io(backendUrl, {
  path: '/socket.io/',
  auth: { token: userOrDoctorJWT },
  transports: ['websocket'] // optional but helps behind some proxies
});

socket.emit('join-appointment', appointmentId);

socket.emit('send-message', { appointmentId, message, clientMessageId }, (ack) => {
  if (!ack?.ok) console.warn('Send failed:', ack?.error);
});
```

## Environment Variables
- `MAX_MESSAGE_LENGTH` (default `2000`)
- `BASIC_MODERATION_ENABLED` (`true` | `false`, default `false`)
- `SEND_RATE_MAX` (default `20`)
- `SEND_RATE_WINDOW_MS` (default `10000`)
