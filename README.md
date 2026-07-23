# MediQueue — Hospital Smart Appointment & Live Queue Management System

A full-stack web application for hospitals to manage patient appointments and real-time queue tracking. Built with React.js, Node.js, MongoDB, and Socket.IO.

![Tech Stack](https://img.shields.io/badge/React-Vite-blue) ![Node.js](https://img.shields.io/badge/Node.js-Express-green) ![MongoDB](https://img.shields.io/badge/Database-MongoDB-brightgreen) ![Socket.IO](https://img.shields.io/badge/Realtime-Socket.IO-black)

---

## 🚀 Features

### 👨‍⚕️ Patient
- Online appointment booking with real-time slot availability
- Live queue tracking with estimated wait time
- Appointment history and management
- Email notifications for booking, reminders, and queue calls

### 🩺 Doctor
- Live queue management dashboard
- One-click patient call/advance queue
- Schedule and availability management
- Daily appointment analytics

### 🛡️ Admin
- Overview dashboard with real-time KPI stats and trend charts
- User Management (view, filter by role, edit role/status, activate/deactivate, add user)
- Doctor Management (view, filter by specialty, edit fee/duration/bio, toggle availability)
- Patient Management (directory, details view, status toggling)
- Department Management (CRUD clinical units, assign head doctor)
- Hospital Working Hours & Queue Settings (opd hours, emergency mode, slot duration, max queue limit)
- Analytics Dashboard (volume area chart, department revenue/bookings bar chart, status pie chart)
- Reports & Export Generator (printable hospital report layout, CSV dataset export)

### ⚡ Real-time Features
- Socket.IO for live queue position updates
- Instant notifications when patient's turn arrives
- Doctor status updates (available/on break) broadcast to all
- TV-mode Queue Board for waiting room displays

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React.js (Vite) + Tailwind CSS v4 |
| Backend | Node.js + Express.js |
| Database | MongoDB + Mongoose |
| Authentication | JWT (Access 15min + Refresh 7d) |
| Real-time | Socket.IO |
| Email | Nodemailer (Gmail SMTP) |
| State Management | React Context API |
| HTTP Client | Axios |
| Payment | Stripe (optional) |

---

## 📁 Project Structure

```
hospital-queue-system/
├── backend/
│   ├── src/
│   │   ├── config/          # Database & Socket.IO config
│   │   ├── controllers/     # Business logic handlers
│   │   ├── middleware/      # Auth, error, validation middleware
│   │   ├── models/          # Mongoose schemas
│   │   ├── routes/          # Express API routes
│   │   ├── services/        # Queue engine, email service
│   │   ├── utils/           # JWT utils, response helpers
│   │   └── seed/            # Database seeder
│   ├── .env                 # Environment variables (not committed)
│   ├── .env.example         # Environment template
│   ├── package.json
│   └── server.js            # Application entry point
├── frontend/
│   ├── src/
│   │   ├── api/             # Axios instances + API calls
│   │   ├── components/      # Reusable UI components
│   │   │   ├── common/      # Button, Card, Modal, Badge...
│   │   │   ├── layout/      # Navbar, Sidebar, Footer...
│   │   │   └── queue/       # QueueBoard, QueueCard...
│   │   ├── context/         # AuthContext, SocketContext, QueueContext
│   │   ├── hooks/           # Custom hooks
│   │   ├── pages/           # Route-level page components
│   │   │   ├── auth/        # Login, Register
│   │   │   ├── patient/     # Dashboard, Book, Queue...
│   │   │   ├── doctor/      # Dashboard, Queue Manager...
│   │   │   └── admin/       # Dashboard, Users, Analytics...
│   │   └── utils/           # Helper functions
│   ├── .env                 # Frontend environment variables
│   ├── .env.example
│   ├── vite.config.js
│   └── index.html
├── .gitignore
└── README.md
```

---

## ⚙️ Prerequisites

- **Node.js** >= 18.x — [Download](https://nodejs.org/)
- **MongoDB** >= 6.x — [Download](https://www.mongodb.com/try/download/community) or use [MongoDB Atlas](https://www.mongodb.com/atlas)
- **npm** >= 9.x (comes with Node.js)
- **Git** — [Download](https://git-scm.com/)
- **GitHub CLI** (gh) — [Download](https://cli.github.com/)

---

## 🔧 Installation & Setup

### 1. Clone the Repository

```bash
git clone https://github.com/YOUR_USERNAME/hospital-queue-system.git
cd hospital-queue-system
```

### 2. Backend Setup

```bash
cd backend

# Install dependencies
npm install

# Copy environment file and fill in your values
cp .env.example .env
```

Edit `backend/.env` with your values:

```env
PORT=5000
NODE_ENV=development
MONGODB_URI=mongodb://localhost:27017/hospital_queue_system
JWT_SECRET=your_super_secret_jwt_key
JWT_REFRESH_SECRET=your_super_secret_refresh_key
CLIENT_URL=http://localhost:5173

# Email (Gmail — enable App Password in Google Account settings)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_16_character_app_password
EMAIL_FROM=MediQueue <your_email@gmail.com>

# Stripe (optional)
STRIPE_SECRET_KEY=sk_test_your_key
```

### 3. Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Copy environment file
cp .env.example .env
```

The frontend `.env` defaults are already configured for local development.

### 4. Start MongoDB

Make sure MongoDB is running locally:
```bash
# Windows (if installed as service)
net start MongoDB

# Or using MongoDB Compass / Atlas connection string
```

---

## 🌱 Database Seeding

Populate the database with sample data (doctors, departments, patients, appointments):

```bash
cd backend
npm run seed
```

This creates:
- **1 Admin** — `admin@hospital.com` / `Admin@123456`
- **8 Doctors** — `doctor1@example.com` / `Doctor@123`
- **15 Patients** — `patient1@example.com` / `Patient@123`
- 6 Departments (Cardiology, Neurology, Orthopedics, Dermatology, Pediatrics, General Medicine)
- 20 sample appointments

---

## 🚀 Running the Application

### Development Mode

**Terminal 1 — Backend:**
```bash
cd backend
npm run dev
# Server starts at http://localhost:5000
```

**Terminal 2 — Frontend:**
```bash
cd frontend
npm run dev
# App starts at http://localhost:5173
```

### Production Build

```bash
# Build frontend
cd frontend
npm run build

# Start backend in production
cd backend
NODE_ENV=production npm start
```

---

## 🔌 API Endpoints

### Authentication

| Method | Endpoint | Description | Auth | Rate Limit |
|--------|----------|-------------|------|------------|
| POST | `/api/auth/register` | General registration (patient/doctor) | Public | 10/15min |
| POST | `/api/auth/register/patient` | Explicit patient registration | Public | 10/15min |
| POST | `/api/auth/register/doctor` | Doctor registration (creates Doctor profile) | Public | 10/15min |
| POST | `/api/auth/login` | Login (all roles) | Public | 10/15min |
| POST | `/api/auth/admin/login` | Admin-only login | Public | 10/15min |
| POST | `/api/auth/refresh` | Refresh access token (rotate) | Cookie/Body | — |
| GET | `/api/auth/me` | Get current user profile | 🔒 Protected | — |
| POST | `/api/auth/logout` | Logout (clears session) | 🔒 Protected | — |
| PUT | `/api/auth/updatepassword` | Change password | 🔒 Protected | — |
| POST | `/api/auth/forgot-password` | Send password reset email | Public | 3/60min |
| POST | `/api/auth/reset-password` | Reset password with token | Public | — |
| GET | `/api/auth/verify-email?token=...` | Verify email address | Public | — |
| POST | `/api/auth/resend-verification` | Resend verification email | 🔒 Protected | — |

### Other Endpoints

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/api/doctors` | List doctors (filterable by specialty/date) | Public |
| GET | `/api/doctors/:id/slots` | Get available time slots | Public |
| POST | `/api/appointments` | Book appointment | 🔒 Patient |
| GET | `/api/appointments` | Get my appointments | 🔒 Protected |
| PUT | `/api/appointments/:id/status` | Update appointment status | 🔒 Doctor |
| GET | `/api/queues/:doctorId` | Get doctor's live queue | 🔒 Protected |
| GET | `/api/queues/:doctorId/position/:appointmentId` | Get position & estimated wait | 🔒 Protected |
| POST | `/api/queues/:doctorId/advance` | Call next patient in queue | 🔒 Doctor/Admin |
| POST | `/api/queues/:doctorId/delay` | Announce doctor delay (mins & reason) | 🔒 Doctor/Admin |
| POST | `/api/queues/:doctorId/emergency` | Bump appointment to Emergency Priority | 🔒 Doctor/Admin |
| POST | `/api/queues/:doctorId/skip` | Move current patient to end of queue | 🔒 Doctor/Admin |
| POST | `/api/queues/:doctorId/reorder` | Reorder waiting list items | 🔒 Doctor/Admin |
| PUT | `/api/queues/:doctorId/pause` | Pause doctor queue | 🔒 Doctor/Admin |
| PUT | `/api/queues/:doctorId/resume` | Resume doctor queue | 🔒 Doctor/Admin |
| GET | `/api/notifications` | Get my notifications | 🔒 Protected |
| POST | `/api/notifications/fcm-token` | Register FCM Device Token for Push | 🔒 Protected |
| PUT | `/api/notifications/read-all` | Mark all notifications as read | 🔒 Protected |

Full API: `http://localhost:5000/api/health`
📑 **Interactive Swagger API Documentation**: [http://localhost:5000/api-docs](http://localhost:5000/api-docs)

---

## 🧪 Running Tests

```bash
cd backend

# Run all tests (uses in-memory MongoDB — no real DB needed)
npm test

# Watch mode
npm run test:watch

# With coverage report
npm test -- --coverage
```

Tests cover: patient registration, doctor registration, admin login, JWT auth,
protected routes, RBAC, token refresh, forgot/reset password, email verification,
and validation edge cases.

---

## 📡 Socket.IO Events

| Event | Direction | Description |
|-------|-----------|-------------|
| `join-queue-room` | Client→Server | Subscribe to doctor's queue |
| `queue-updated` | Server→Client | Queue position changed |
| `appointment-called` | Server→Client | Patient's turn |
| `doctor-status-changed` | Server→Client | Doctor on break/resumed |

---

## 🔐 Authentication Flow

1. Client sends credentials → receives `accessToken` (15min) + `refreshToken` (7d)
2. Axios interceptor attaches `Authorization: Bearer {accessToken}` to every request
3. On 401 response → interceptor calls `/api/auth/refresh` with refresh token
4. New access token stored in memory, original request retried
5. On refresh failure → user redirected to login

---

## 📧 Email Setup (Gmail)

1. Go to [Google Account Security](https://myaccount.google.com/security)
2. Enable 2-Factor Authentication
3. Go to **App passwords** → Generate password for "Mail"
4. Use the 16-character password as `EMAIL_PASS` in `.env`

---

## 💳 Stripe Payment Setup (Optional)

1. Create account at [stripe.com](https://stripe.com)
2. Get your test secret key from Dashboard
3. Add to `backend/.env`: `STRIPE_SECRET_KEY=sk_test_...`
4. Payment integration is optional — the system works fully without it

---

## 🌍 Default Login Credentials (After Seeding)

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@hospital.com | Admin@123456 |
| Doctor | doctor1@example.com | Doctor@123 |
| Patient | patient1@example.com | Patient@123 |

---

## 🏗️ Architecture

```
Client (React)
    │
    ├── Axios HTTP ──────────► Express REST API
    │                                │
    └── Socket.IO ──────────► Socket.IO Server
                                     │
                               MongoDB (Mongoose)
```

---

## 📄 License

MIT License — see [LICENSE](LICENSE)

---

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch: `git checkout -b feature/AmazingFeature`
3. Commit your changes: `git commit -m 'Add AmazingFeature'`
4. Push to the branch: `git push origin feature/AmazingFeature`
5. Open a Pull Request
