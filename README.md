# 2YP Medical Appointment System

<!-- Deployment badges -->
[![User site status](https://img.shields.io/website?label=docop.me&url=https%3A%2F%2Fdocop.me)](https://docop.me) [![Admin site status](https://img.shields.io/website?label=admin&url=https%3A%2F%2Fsecond-year-project-iw16gwhcc-suvini-fonsekas-projects.vercel.app)](https://second-year-project-iw16gwhcc-suvini-fonsekas-projects.vercel.app/) [![Backend status](https://img.shields.io/website?label=docop-backend&url=https%3A%2F%2Fdocop-backend.onrender.com)](https://docop-backend.onrender.com)

This repository contains a full-stack web application for managing medical appointments, with separate admin, doctor, and user interfaces. The system is divided into three main parts:

- **backend/**: Node.js/Express REST API with MongoDB, authentication, and file upload.
- **admin/**: React-based admin dashboard for managing doctors and appointments.
- **frontend/**: React-based user interface for patients to book appointments, view doctors, and manage profiles.

---

## Live Deployments

- Frontend (user-facing): https://docop.me  (deployed on Vercel)
- Admin / Doctor portal: https://second-year-project-iw16gwhcc-suvini-fonsekas-projects.vercel.app/  (deployed on Vercel)
- Backend API: https://docop-backend.onrender.com  (deployed on Render)

This repository contains a complete, fully-deployed project. ✅

## How to visit the live sites

Quick links to the production deployments (clickable):

- User (production): [https://docop.me](https://docop.me) — the public patient-facing site.
- Admin / Doctor portal (production): [https://second-year-project-iw16gwhcc-suvini-fonsekas-projects.vercel.app/](https://second-year-project-iw16gwhcc-suvini-fonsekas-projects.vercel.app/) — combined admin & doctor dashboard.
- Backend API (production): [https://docop-backend.onrender.com](https://docop-backend.onrender.com) — REST API & Socket.IO server.

Helpful notes:

- These badges above display live, at-a-glance status for the three deployments (production). If you maintain a separate staging environment you can add additional shields.io / Vercel / Render status badges here.
- Recommended browsers: Chrome, Edge, Firefox (desktop and modern mobile browsers are supported but desktop offers the best admin UX).
- API health check: hit `https://docop-backend.onrender.com` in your browser or `GET /api/health` (if implemented) to confirm the backend is responding.





## Features

### For Users (frontend/)
- Browse doctors by specialty
- Book, view, and manage appointments
- User authentication (login/register)
- Profile management
- Mock payment integration
- Real‑time, appointment‑scoped chat with your doctor (Socket.IO)
- Unread message badges with automatic read-on-open

### For Admins (admin/)
- Admin authentication
- Dashboard with statistics
- Add, edit, and remove doctors
- View all appointments and users

### For Doctors (admin/)
- Doctor authentication
- View and manage their appointments
- Update profile and availability
- Real‑time chat with patients for each appointment
- Inbox view with last message preview and unread counts

### Backend (backend/)
- RESTful API for all operations
- JWT-based authentication for users, doctors, and admins
- MongoDB for data storage
- Cloudinary integration for image uploads
- Secure password hashing
- Socket.IO for real‑time messaging (JWT-authenticated WebSocket connections)
- Transactional email via Brevo (Sendinblue) for notifications

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
├── backend/      # Express API, MongoDB models, routes, controllers
│
├── admin/        # React admin dashboard (Vite + Tailwind)
│
└── frontend/     # React user interface (Vite + Tailwind)
```

---

## Getting Started

### Prerequisites

- Node.js (v18+ recommended)
- MongoDB database
- Cloudinary account (for image uploads)

### Environment Variables

Create a `.env` file in the `backend/` directory with the following variables:

```
MONGODB_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret
CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name
CLOUDINARY_API_KEY=your_cloudinary_api_key
CLOUDINARY_API_SECRET=your_cloudinary_api_secret
PORT=8000
# 2YP Medical Appointment System

A full-stack web application for managing medical appointments, featuring real-time chat and file sharing. This project provides separate interfaces for patients, doctors, and administrators, built with the MERN stack (MongoDB, Express, React, Node.js) and integrated with Socket.IO and Cloudinary.

## Project Structure

The repository is a monorepo containing three distinct applications:

-   `backend/`: The core of the system. A Node.js/Express REST API that handles business logic, database interactions (MongoDB), user authentication (JWT), and real-time communication (Socket.IO).
-   `frontend/`: A React-based single-page application (built with Vite) for patients. It allows them to browse doctors, book appointments, and communicate with their assigned doctor.
-   `admin/`: A separate React-based single-page application (built with Vite) that serves as a combined portal for both system administrators and doctors.

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

-   Node.js (v18+ recommended)
-   MongoDB (local or a cloud service like MongoDB Atlas)
-   A Cloudinary account for file storage.

### 1. Backend Setup

1.  Navigate to the `backend` directory: `cd backend`
2.  Install dependencies: `npm install`
3.  Create a `.env` file and add the following variables:

    ```env
    # MongoDB Connection
    MONGODB_URI=your_mongodb_connection_string

    # JWT Secret
    JWT_SECRET=a_strong_and_secret_key

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

    # Frontend URL for CORS
    FRONTEND_URL=http://localhost:5173
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
- **Purpose:** Send transactional emails, such as payment confirmations to patients and notifications to doctors.
- **Service location:** `backend/services/emailService.js` exports `sendEmail({ to, subject, html, text, sender })`.

### When emails are sent
- **Payment confirmation:** After a successful mock payment verification (`POST /api/user/verify-payment`), the backend sends:
    - A confirmation email to the patient
    - A notification email to the doctor
    - Implementation: see `verifyMockPayment` in `backend/controllers/userController.js`

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
- Check server logs for "Email send failures" emitted from `verifyMockPayment`.
- Confirm outbound connections are allowed if running behind a firewall.

---

## Security Notes

-   **Password Hashing:** User and doctor passwords are securely hashed with `bcrypt` before being stored.
-   **Authentication:** All sensitive API routes and WebSocket connections are protected by JWT middleware.
-   **Authorization:** Backend logic ensures that users and doctors can only access data related to their own appointments and profiles.



