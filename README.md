# 2YP Medical Appointment System

This repository contains a full-stack web application for managing medical appointments, with separate admin, doctor, and user interfaces. The system is divided into three main parts:

- **backend/**: Node.js/Express REST API with MongoDB, authentication, and file upload.
- **admin/**: React-based admin dashboard for managing doctors and appointments.
- **frontend/**: React-based user interface for patients to book appointments, view doctors, and manage profiles.

---

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
ADMIN_EMAIL=your_admin_email
ADMIN_PASSWORD=your_admin_password
FRONTEND_URL=http://localhost:5173
```

For `admin/` and `frontend/`, create `.env` files with:

```
VITE_BACKEND_URL=http://localhost:8000
```

Notes
- The Socket.IO server allows CORS from the Vite dev servers by default: http://localhost:5173 (frontend) and http://localhost:5174 (admin)
- No extra services are required for chat; it runs on the same backend port

---

## Installation

1. **Clone the repository:**
   ```
   git clone https://github.com/suvini2001/2YP.git
   cd 2YP
   ```

2. **Install dependencies:**
   ```
   cd backend && npm install
   cd ../admin && npm install
   cd ../frontend && npm install
   ```

3. **Set up environment variables** as described above.

4. **Start the backend server:**
   ```
   cd backend
   npm run server
   ```

5. **Start the admin and frontend apps (in separate terminals):**
   ```
   cd admin
   npm run dev
   ```
   ```
   cd frontend
   npm run dev
   ```

---

## Security Notes

- Do NOT commit your `.env` files or any secrets to the repository.
- Always rotate secrets if they were ever exposed.
- Use `.env.example` to share required environment variables (without real values).

---


