# Phase 0 – Security & Reliability Hardening

> **Project:** DocOp – MERN medical appointment platform
> **Scope:** Backend (Express, MongoDB, Socket.IO) and one frontend change
> **Result:** 11 fixes, 173 / 173 tests passing

---

## 1. Overview

Phase 0 sets a secure, reliable baseline for DocOp before adding workflow automation (n8n), an AI booking assistant, MCP tools, and container deployment (Docker, Kubernetes).

Automated clients call APIs faster and more often than people, and they follow them literally. That makes flaws such as insecure direct object references, mass assignment and race conditions far more likely to be hit. Fixing them first means every new layer is built on endpoints that enforce identity, ownership and consistency.

| Goal           | Outcome                                                           |
| :------------- | :---------------------------------------------------------------- |
| Access control | Every sensitive endpoint checks who is calling and what they own  |
| Data integrity | Booking, cancellation and payment updates are atomic              |
| Reliability    | Payment is idempotent, so retries cause no duplicate side effects |
| Configuration  | CORS origins and token lifetime come from environment variables   |
| Deployment     | A health endpoint is ready for container orchestration            |
| Quality        | Every fix is covered by automated tests                           |

---

## 2. Summary of Changes

| #   | Category       | Problem (before)                                      | Fix (after)                                        |
| :-- | :------------- | :---------------------------------------------------- | :------------------------------------------------- |
| 1   | Secrets        | Database password printed in server logs              | Logs a static message only                         |
| 2   | Configuration  | CORS open to all sites; socket origins hardcoded      | Allowed origins read from `CORS_ORIGINS`           |
| 3   | Configuration  | No reference list of required variables               | Added `backend/.env.example`                       |
| 4   | Authentication | Patient tokens accepted on doctor routes              | Doctor middleware checks the token's role          |
| 5   | Authentication | Invalid tokens returned HTTP 200                      | Returns HTTP 401 so the frontend logs the user out |
| 6   | Authentication | Patient and doctor tokens never expired               | Tokens expire (default 7 days)                     |
| 7   | Authorization  | Any patient could overwrite another patient's profile | Identity taken only from the verified token        |
| 8   | Authorization  | Doctors could change their password, email or slots   | Only allowlisted fields can be updated             |
| 9   | Authorization  | Anyone could mark any appointment as paid             | Requires login; owner's active appointments only   |
| 10  | Concurrency    | Two patients could book the same slot                 | Slot claimed in a single atomic database operation |
| 11  | Data integrity | Doctor cancellations never freed the slot             | All cancellations release the slot atomically      |
| 12  | Observability  | No way to check service and database health           | `GET /api/health` returns 200 or 503               |

---

## 3. Changes by Category

### 3.1 Secrets & Configuration

| Change                  | Why it matters                                                                                         |
| :---------------------- | :----------------------------------------------------------------------------------------------------- |
| Stop logging the DB URI | Logs are widely readable (hosting dashboards, Docker, Kubernetes); credentials must never appear there |
| CORS from environment   | Each environment (local, Docker, cloud) sets its own origins without code changes                      |
| `.env.example` added    | Documents every required variable without exposing real secrets                                        |

### 3.2 Authentication & Authorization

| Change                        | Vulnerability addressed              | Principle                               |
| :---------------------------- | :----------------------------------- | :-------------------------------------- |
| Role check on doctor routes   | Broken access control                | Verify the role, not just the signature |
| HTTP 401 on invalid tokens    | Stuck, half-logged-in sessions       | Correct status codes                    |
| Token expiry                  | Permanent access from a leaked token | Credential lifecycle management         |
| Patient profile uses token ID | Insecure Direct Object Reference     | Identity comes from the server          |
| Doctor profile allowlist      | Mass assignment                      | Allowlist, never denylist               |
| Authenticated payment         | Payment spoofing                     | Ownership checks                        |
| Idempotent payment            | Duplicate emails on retry            | Idempotency                             |

### 3.3 Data Integrity & Concurrency

| Change                      | Problem solved                                       | Technique                              |
| :-------------------------- | :--------------------------------------------------- | :------------------------------------- |
| Atomic slot reservation     | Race condition caused double bookings                | Conditional single-document update     |
| Strict slot date validation | User input could alter database field paths          | NoSQL injection defence                |
| Booking rollback            | Failed saves left slots blocked with no appointment  | Compensating action                    |
| Shared slot release         | Doctor cancel never freed slots; logic duplicated 3x | Atomic removal, single source of truth |

### 3.4 Observability

| Change          | Behaviour                                              | Used by                                         |
| :-------------- | :----------------------------------------------------- | :---------------------------------------------- |
| Health endpoint | 200 when the database is connected, 503 when it is not | Docker, Kubernetes probes, uptime monitors, n8n |

---

## 4. Files Changed

| Area        | File                                      | Change                                      |
| :---------- | :---------------------------------------- | :------------------------------------------ |
| Config      | `backend/config/mongodb.js`               | Removed credential logging                  |
| Server      | `backend/server.js`                       | Environment-based CORS; health endpoint     |
| Middleware  | `backend/middleware/authDoctor.js`        | Role check                                  |
| Middleware  | `backend/middleware/authUser.js`          | HTTP 401 on invalid tokens                  |
| Controllers | `backend/controllers/userController.js`   | Token expiry, profile fix, payment, booking |
| Controllers | `backend/controllers/doctorController.js` | Token expiry, allowlist, cancel frees slot  |
| Controllers | `backend/controllers/adminController.js`  | Cancel uses shared slot release             |
| Routes      | `backend/routes/userRoute.js`             | Auth before upload; auth on payment         |
| Routes      | `backend/routes/doctorRoute.js`           | File upload support on profile update       |
| Services    | `backend/services/slotService.js`         | **New:** atomic reserve and release         |
| Config      | `backend/.env.example`                    | **New:** environment variable reference     |
| Frontend    | `frontend/src/pages/MockPayment.jsx`      | Sends the login token on payment            |

---

## 5. Configuration

| Variable         | Purpose                                                 | Default         | Required in production |
| :--------------- | :------------------------------------------------------ | :-------------- | :--------------------- |
| `CORS_ORIGINS`   | Comma-separated browser origins allowed to call the API | Local dev ports | Yes                    |
| `JWT_EXPIRES_IN` | Lifetime of patient and doctor tokens                   | `7d`            | No                     |

See `backend/.env.example` for the complete list of variables.

---

## 6. Deployment Notes

### Breaking change

The payment verification endpoint now requires a login token.

### Rollout order

| Step | Action                                                     | Reason                                              |
| :--: | :--------------------------------------------------------- | :-------------------------------------------------- |
| 1    | Set `CORS_ORIGINS` on the host with all live URLs          | Otherwise the live sites lose API access            |
| 2    | Set `JWT_EXPIRES_IN` on the host                           | Makes token lifetime explicit                       |
| 3    | Rotate `JWT_SECRET`                                        | Invalidates old tokens that never expire            |
| 4    | Rotate the database password                               | It previously appeared in logs                      |
| 5    | Deploy the frontend                                        | Works with both the old and the new backend         |
| 6    | Deploy the backend                                         | Deploying it first would break payments temporarily |
| 7    | Smoke-test booking, payment, chat, cancellation and health | Confirms the production rollout                     |

---

## 7. Testing

| Metric         | Result                                                          |
| :------------- | :-------------------------------------------------------------- |
| Total tests    | 173                                                             |
| Passed         | 173                                                             |
| Failed         | 0                                                               |
| New test files | Health endpoint, slot service                                   |
| Updated suites | Auth middleware, user, doctor and admin controllers, user flows |

| Area covered      | What the tests prove                                               |
| :---------------- | :----------------------------------------------------------------- |
| Health endpoint   | 200 when connected, 503 when disconnected                          |
| Doctor middleware | Patient tokens are rejected                                        |
| Token expiry      | Doctor tokens are signed with an expiry                            |
| Patient profile   | A user ID sent in the request body is ignored                      |
| Doctor profile    | Password, email and slot fields cannot be changed                  |
| Payment           | Requires login, rejects other users' appointments, is idempotent   |
| Booking           | Check and write happen in one operation; unsafe dates are rejected |
| Cancellation      | Every role's cancel releases the slot                              |

Tests that encoded the old, unsafe behaviour were updated to assert the new behaviour.

---

## 8. Roadmap

| Phase | Focus         | Description                                                         |
| :---: | :------------ | :------------------------------------------------------------------ |
| 1     | Availability  | Server-side slot generation, canonical time format, clinic timezone |
| 2     | Containers    | Docker images and Compose setup for all services                    |
| 3     | Automation    | n8n workflows: notifications, reminders, daily reports              |
| 4     | MCP           | MCP server exposing DocOp operations as AI tools                    |
| 5     | AI assistant  | Booking assistant with confirmation before any booking              |
| 6     | Orchestration | CI/CD, Kubernetes, Redis-backed rate limiting for multiple replicas |

### Other follow-ups

| Item                       | Detail                                                       |
| :------------------------- | :----------------------------------------------------------- |
| Doctor availability toggle | The profile page sends `available` instead of `availability` |