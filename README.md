# 2YP Medical Appointment System

<!-- Deployment badges -->
[![K8s cluster](https://img.shields.io/website?label=k8s.docop.me&url=http%3A%2F%2Fk8s.docop.me)](http://k8s.docop.me) [![User site status](https://img.shields.io/website?label=docop.me&url=https%3A%2F%2Fdocop.me)](https://docop.me) [![Admin site status](https://img.shields.io/website?label=admin&url=https%3A%2F%2Fsecond-year-project-iw16gwhcc-suvini-fonsekas-projects.vercel.app)](https://second-year-project-iw16gwhcc-suvini-fonsekas-projects.vercel.app/) [![Backend status](https://img.shields.io/website?label=docop-backend&url=https%3A%2F%2Fdocop-backend.onrender.com)](https://docop-backend.onrender.com)
[![CI](https://github.com/suvini2001/Second-Year-Project/actions/workflows/ci.yml/badge.svg?branch=kubernetes)](https://github.com/suvini2001/Second-Year-Project/actions/workflows/ci.yml)

This repository contains a full-stack web application for managing medical appointments, with separate admin, doctor, and user interfaces. The system is divided into three main parts:

- **backend/**: Node.js/Express REST API with MongoDB, authentication, and file upload.
- **admin/**: React-based admin dashboard for managing doctors and appointments.
- **frontend/**: React-based user interface for patients to book appointments, view doctors, and manage profiles.
- **mcp-server/**: Model Context Protocol server that exposes DocOp data to AI clients as read-only tools.
- **automation workflows/**: exported n8n workflows (emails, reminders, reports, AI assistant, admin MCP tools).
- **nginx/**: reverse proxy for n8n and the MCP endpoints.
- **k8s/**: Kubernetes manifests for the local cluster (`kubectl apply -k k8s/`).
- **k8s-cloud/**: Kustomize overlay for the cloud server: public addresses, HTTPS, images from GHCR.
- **.github/workflows/**: CI that lints, tests, validates the manifests and publishes the images.
- **scripts/**: `deploy-cloud.sh`, run on the server for each new version.

## Project phases

The project was upgraded in phases, each on its own branch and tag:

| Phase | Branch | Tag | What it adds | Docs |
|---|---|---|---|---|
| 0 | | | Security and reliability hardening | [docs/PHASE0_SECURITY_HARDENING.md](docs/PHASE0_SECURITY_HARDENING.md) |
| 1 | `version2.0` | `phase-1-docker` | Docker Compose for the whole stack | [Run with Docker](#run-with-docker) |
| 2 | `automation` | `phase-2-automation` | n8n automation: signed events, emails, reminders, health monitor, weekly report | [AUTOMATION.md](./AUTOMATION.md) |
| 3 | `AI-Chat-bot` | `phase-3-ai-assistant` | AI booking assistant (n8n agent + Gemini) with human-confirmed bookings | [ASSISTANT.md](./ASSISTANT.md) |
| 4 | `MCP` | `phase-4-mcp` | MCP in both directions: DocOp MCP server, n8n as MCP client and server, Claude Desktop demo, nginx | [MCP.md](./MCP.md) |
| 5 | `kubernetes` | `phase-5-kubernetes` | Kubernetes: replicas, probes, Postgres StatefulSet, Traefik Ingress, Redis-backed Socket.IO, CI to GHCR, cloud deploy with HTTPS | [K8S.md](./K8S.md) |

---

## Live Deployments

### 🌐 Cloud Kubernetes Cluster (Oracle Cloud VM)
Direct public links to the live containerized Kubernetes cluster:

- **Frontend (Patient Site):** [http://k8s.docop.me](http://k8s.docop.me)
- **Admin Panel (Doctor Site):** [http://k8s.docop.me/admin](http://k8s.docop.me/admin)
- **n8n Automation:** [http://n8n.k8s.docop.me](http://n8n.k8s.docop.me)

### 🚀 Serverless / Cloud Hosting (Vercel & Render)
- **Frontend (Patient Site):** [https://docop.me](https://docop.me) (deployed on Vercel)
- **Admin Panel (Doctor Site):** [https://second-year-project-iw16gwhcc-suvini-fonsekas-projects.vercel.app/](https://second-year-project-iw16gwhcc-suvini-fonsekas-projects.vercel.app/) (deployed on Vercel)
- **Backend API:** [https://docop-backend.onrender.com](https://docop-backend.onrender.com) (deployed on Render)

This repository contains a complete, fully-deployed project. ✅

## How to visit the live sites

Quick clickable links to the live deployments:

### 1. Kubernetes Cluster (Production)
- **Patient Site (Frontend):** [http://k8s.docop.me](http://k8s.docop.me) — the public patient-facing site for discovering doctors and booking appointments.
- **Admin & Doctor Portal:** [http://k8s.docop.me/admin](http://k8s.docop.me/admin) — portal for doctors and administrators to manage appointments and schedules.
- **n8n Automation Engine:** [http://n8n.k8s.docop.me](http://n8n.k8s.docop.me) — automated workflow engine handling event notifications, appointment reminders, and AI booking assistant.

### 2. Alternative Deployments (Vercel & Render)
- **Patient Site:** [https://docop.me](https://docop.me)
- **Admin / Doctor Portal:** [https://second-year-project-iw16gwhcc-suvini-fonsekas-projects.vercel.app/](https://second-year-project-iw16gwhcc-suvini-fonsekas-projects.vercel.app/)
- **Backend API:** [https://docop-backend.onrender.com](https://docop-backend.onrender.com)

Helpful notes:

- Recommended browsers: Chrome, Edge, Firefox (desktop and modern mobile browsers are supported).
- Cluster health check: `GET http://k8s.docop.me/api/health` to confirm the backend in the cluster is healthy and connected to MongoDB.





## Security & Reliability

The application has been hardened to prevent common web vulnerabilities and ensure reliable operation:
- **Strict Role-Based Access Control:** Strong JWT validation rejects unauthorized tokens and spoofed roles.
- **Data Protection:** Profile updates use safe allowlists and authenticated user IDs to prevent IDOR and mass assignment.
- **Atomic Operations:** Concurrent booking and payment flows use atomic database operations (`$push`, `$pull`, `$ne`) to prevent race conditions and double-booking.
- **Hardened Configuration:** `CORS_ORIGINS` strictly controls allowed domains, and database credentials are removed from startup logs.
- **Health Probes:** A robust `GET /api/health` endpoint allows Docker and Kubernetes to accurately monitor application readiness.
- **Idempotency:** Payment endpoints safely handle repeated requests without side effects.
- **Documentation:** For full details on these security features, see [Phase 0 – Security & Reliability Hardening](docs/PHASE0_SECURITY_HARDENING.md).

---

## Real-time chat

The system includes a secure, appointment-scoped chat between users and doctors.

- Transport: Socket.IO on the same HTTP server as the REST API
- Auth: JWT is sent in the Socket.IO handshake (socket.auth.token). The server verifies and attaches userId and userType (user|doctor)
- Rooms:
   - appointment-<appointmentId> for real-time messages within a conversation
   - user-<userId> and doctor-<doctorId> for inbox/unread updates
- Events:
   - Client -> Server: join-appointment, send-message { appointmentId, message }
   - Server -> Client: receive-message { …message }, inbox-update { appointmentId }
- Persistence: All messages are stored in MongoDB with read status
   - Schema: message { appointmentId, senderId, senderType, message, timestamp, isRead }
- REST helpers:
   - GET /api/user/messages/:appointmentId (auth: user) — fetch history and mark doctor messages as read
   - GET /api/doctor/messages/:appointmentId (auth: doctor) — fetch history and mark user messages as read
   - GET /api/user/inbox and /api/doctor/inbox — one row per appointment with lastMessage and unreadCount
   - GET /api/user/unread-messages and /api/doctor/unread-messages — total unread count

Frontend notes
- Pass the JWT as the Socket.IO handshake auth: io(BASE_URL, { auth: { token } })
- Join the room for the active conversation: socket.emit('join-appointment', appointmentId)
- Listen for receive-message and inbox-update to refresh the UI

---

## Project Structure

```
2YP/
│
├── backend/               # Express API, MongoDB models, routes, controllers
├── admin/                 # React admin dashboard (Vite + Tailwind)
├── frontend/              # React user interface (Vite + Tailwind)
├── mcp-server/            # MCP server: DocOp data as read-only AI tools
├── automation workflows/  # Exported n8n workflows + end-to-end test script
├── nginx/                 # Reverse proxy config (MCP-safe, no buffering)
├── k8s/                   # Kubernetes manifests for local cluster (kubectl apply -k k8s/)
├── k8s-cloud/             # Kustomize overlay for cloud server (HTTPS, GHCR)
├── .github/workflows/     # CI that lints, tests, validates manifests, builds & pushes images
├── scripts/               # deploy-cloud.sh, run on the server for each new version
├── docs/                  # Phase 0 security notes & phase documentation
└── docker-compose.yml     # The whole stack
```

---



---

## Features by Role

### 1. User (Patient) Features (`frontend/`)

-   **Authentication:** Secure user registration and login with JWT.
-   **Doctor Discovery:** Browse a list of available doctors and view their specialities.
-   **Appointment Booking:** Select a doctor and book an available time slot.
-   **Appointment Management:** View a list of upcoming and past appointments (`My Appointments`).
-   **Real-Time Chat:** Engage in a private, real-time chat with the doctor for each appointment.
    -   **File Sharing:** Upload images and documents (PDF, DOCX) directly in the chat.
    -   **Download Files:** Download files shared by the doctor.
    -   **Optimistic UI:** Sent messages appear instantly and update their status (sending → sent → read).
    -   **Upload Indicator:** A visual spinner is displayed while a file is uploading.
-   **Profile Management:** Update personal profile information.

### 2. Doctor Features (`admin/`)

-   **Authentication:** Secure doctor-specific login.
-   **Dashboard:** View key statistics like total appointments, revenue, and patient count.
-   **Appointment Management:** See a list of all assigned appointments and filter them by status (upcoming, completed).
-   **Real-Time Chat:** Communicate with patients for each specific appointment.
    -   **File Sharing:** Securely send images and documents to patients.
    -   **Download Files:** Access files uploaded by patients.
    -   **Read Receipts:** See when a patient has read a message (`✓✓`).
    -   **Upload Indicator:** A visual spinner provides feedback during file uploads.
-   **Inbox:** View a list of all conversations, with the latest message and an unread message count for each.
-   **Profile Management:** Update professional details and availability.

### 3. Administrator Features (`admin/`)

-   **Authentication:** Secure admin-specific login.
-   **Dashboard:** Access an overview of the entire system, including total doctors, patients, and appointments.
-   **Doctor Management:** Add new doctors to the system and view a list of all registered doctors.
-   **Appointment Oversight:** View a comprehensive list of all appointments across the platform.

---

### Real-Time Chat System

The chat system is built with Socket.IO and provides secure, private, and persistent conversations for each appointment.

-   **Technology:** Socket.IO is integrated into the main `backend` Express server.
-   **Authentication:** WebSocket connections are authenticated using the same JWT sent by the client during the initial handshake. The server decodes the token to identify the user/doctor and their role.
-   **Scoped Rooms:** To ensure privacy, clients join rooms specific to their context:
    -   `appointment-<appointmentId>`: For broadcasting messages only to participants of a single appointment.
    -   `user-<userId>` / `doctor-<doctorId>`: For sending notifications like unread message counts to a specific user's inbox.
-   **Key Events:**
    -   `join-appointment`: Client joins a specific chat room.
    -   `send-message`: Client sends a message (text or file metadata) with an optimistic `clientMessageId`. The server provides an acknowledgement (`ack`) to confirm success or failure.
    -   `receive-message`: Server broadcasts a new message to all clients in the appointment room.
    -   `messages-read`: Fired when a user opens a chat, allowing the server to update the `isRead` status in the database and notify the sender.
-   **File Sharing & Persistence:**
    1.  The client first makes a REST `POST` request to `/api/[user|doctor]/upload/chat-file` with the file.
    2.  The backend uses `multer` for file handling and uploads the file to **Cloudinary**.
    3.  For documents like PDFs, the backend generates a special Cloudinary URL with `flags: 'attachment'` to ensure it triggers a download. For images, a thumbnail is generated.
    4.  The backend returns the file's metadata (URL, filename, size).
    5.  The client then emits a `send-message` event over Socket.IO with this metadata.
    6.  All messages, including file metadata, are saved in the `messages` collection in MongoDB.

---

## Getting Started

### Prerequisites

-   Node.js 20 (the Docker images use Node 20)
-   MongoDB (local or a cloud service like MongoDB Atlas)
-   A Cloudinary account for file storage.

### 1. Backend Setup

1.  Navigate to the `backend` directory: `cd backend`
2.  Install dependencies: `npm install`
3.  Copy the example environment file and configure it:
    `cp .env.example .env` (or manually copy `backend/.env.example` to `backend/.env`)

    Ensure the following variables are set in your `.env`:

    ```env
    # MongoDB Connection
    MONGODB_URI=your_mongodb_connection_string

    # JWT Configuration
    JWT_SECRET=a_strong_and_secret_key
    JWT_EXPIRES_IN=7d

    # Cloudinary Credentials
    CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name
    CLOUDINARY_API_KEY=your_cloudinary_api_key
    CLOUDINARY_API_SECRET=your_cloudinary_api_secret

    # Server Port
    PORT=8000

    # Default Admin Credentials
    ADMIN_EMAIL=admin@example.com
    ADMIN_PASSWORD=adminpassword

    # Email (Brevo / Sendinblue)
    BREVO_API_KEY=your_brevo_api_key
    EMAIL_FROM=docopservice@docop.me
    EMAIL_FROM_NAME=DocOp

    # Frontend URL for CORS (comma-separated for multiple origins)
    CORS_ORIGINS=http://localhost:5173,http://localhost:5174
    ```

4.  Start the backend server: `npm run server`

### 2. Frontend & Admin Setup

1.  **For the User Frontend:**
    -   Navigate to the directory: `cd frontend`
    -   Install dependencies: `npm install`
    -   Create a `.env` file with the backend URL:
        ```env
        VITE_BACKEND_URL=http://localhost:8000
        ```
    -   Start the development server: `npm run dev` (usually runs on `http://localhost:5173`)

2.  **For the Admin/Doctor Portal:**
    -   Navigate to the directory: `cd admin`
    -   Install dependencies: `npm install`
    -   Create a `.env` file with the backend URL:
        ```env
        VITE_BACKEND_URL=http://localhost:8000
        ```
    -   Start the development server: `npm run dev` (usually runs on `http://localhost:5174`)

### 3. Accessing the Application

-   **User App:** Open `http://localhost:5173` in your browser.
-   **Admin/Doctor App:** Open `http://localhost:5174` in your browser.

---

### Email Notifications

- **Provider:** Brevo (formerly Sendinblue) via SDK `@getbrevo/brevo`.
- **Purpose:** Since Phase 2, appointment emails (booked, paid, cancelled, completed, reminders) are sent by **n8n**, not by the backend. See [AUTOMATION.md](./AUTOMATION.md). The backend helper below is kept for the test endpoint.
- **Service location:** `backend/services/emailService.js` exports `sendEmail({ to, subject, html, text, sender })`.

### When emails are sent
- **Appointment emails:** the backend emits a signed `appointment.*` event, and the n8n workflow *DocOp – Appointment events* sends the patient and doctor emails.
- **Doctor day summary:** sent by n8n when an admin approves it in Claude Desktop (see [MCP.md](./MCP.md)).

### Environment variables
Add these to `backend/.env` (already shown in Backend Setup above):

```
BREVO_API_KEY=your_brevo_api_key
EMAIL_FROM=docopservice@docop.me
EMAIL_FROM_NAME=DocOp
```

- `EMAIL_FROM` and `EMAIL_FROM_NAME` define the default sender.
- If `EMAIL_FROM` is not set, the service falls back to `ADMIN_EMAIL` as sender.
- If `BREVO_API_KEY` is missing, email sends will fail with an explicit error.

### Test endpoint (secured)
- Path: `POST /api/user/test-email`
- Auth: Requires a valid user JWT (`Authorization: Bearer <token>`)
- Body fields: `to` (required), `subject` (optional), `text` or `html` (optional)

Example (Windows cmd):

```
curl -X POST "http://localhost:8000/api/user/test-email" ^
    -H "Authorization: Bearer YOUR_JWT_TOKEN" ^
    -H "Content-Type: application/json" ^
    -d "{\"to\":\"you@example.com\",\"subject\":\"DocOp Test\",\"html\":\"<b>Hello from DocOp</b>\"}"
```

### Using the helper in code
- Import: `import { sendEmail } from "../services/emailService.js";`
- Call: `await sendEmail({ to: "user@example.com", subject: "Subject", html: "<p>Body</p>" });`

### Troubleshooting
- Verify `BREVO_API_KEY` is valid and not rate‑limited.
- Ensure `EMAIL_FROM` is a verified sender/domain in Brevo.
- For appointment emails, check the workflow's **Executions** in n8n and the backend log line `[event] … not delivered`.
- Confirm outbound connections are allowed if running behind a firewall.

---

## Security Notes

-   **Password Hashing:** User and doctor passwords are securely hashed with `bcrypt` before being stored.
-   **Authentication:** All sensitive API routes and WebSocket connections are protected by JWT middleware.
-   **Authorization:** Backend logic ensures that users and doctors can only access data related to their own appointments and profiles.



## Run with Docker

- [AUTOMATION.md](./AUTOMATION.md): n8n automation setup
- [ASSISTANT.md](./ASSISTANT.md): the AI booking assistant
- [MCP.md](./MCP.md): the MCP server, n8n MCP tools and Claude Desktop setup

1. Copy `.env.example` to `.env` (root) and fill in the values. Generate each secret with `openssl rand -hex 32`.
2. Create `backend/.env` from `backend/.env.example`.
3. Start everything:
```bash
   docker compose up --build
```

| Service                  |                              URL                 |
|--------------------------|--------------------------------------------------|
| Patient site             | http://localhost:5173                            |
| Admin panel              | http://localhost:5174                            |
| API                      | http://localhost:8000                            |
| n8n                      | http://localhost:5678                            |
| DocOp MCP server         | http://localhost:3001/mcp (bearer token)         |
| nginx (n8n + MCP proxy)  | http://localhost:8080                            |

Stop with `docker compose down`.