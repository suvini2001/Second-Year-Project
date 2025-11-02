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

### For Admins (admin/)
- Admin authentication
- Dashboard with statistics
- Add, edit, and remove doctors
- View all appointments and users

### For Doctors (admin/)
- Doctor authentication
- View and manage their appointments
- Update profile and availability

### Backend (backend/)
- RESTful API for all operations
- JWT-based authentication for users, doctors, and admins
- MongoDB for data storage
- Cloudinary integration for image uploads
- Secure password hashing

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
```

For `admin/` and `frontend/`, create `.env` files with:

```
VITE_BACKEND_URL=http://localhost:8000
```

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


