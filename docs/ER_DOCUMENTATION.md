# Database ER Documentation
## Hospital Smart Appointment & Live Queue Management System

---

## Overview

MongoDB database: **`hospital_queue_system`**

**Collections:** Users · Doctors · Departments · Appointments · Queues · MedicalRecords · Notifications

---

## Entity-Relationship Diagram

```mermaid
erDiagram
    USER {
        ObjectId _id PK
        string name
        string email UK
        string password
        string role "patient or doctor or admin"
        string phone
        string avatar
        boolean isActive
        boolean isEmailVerified
        string refreshToken
        object patientProfile "embedded"
        object adminProfile "embedded"
        date lastLogin
        date createdAt
        date updatedAt
    }

    DOCTOR {
        ObjectId _id PK
        ObjectId userId FK
        ObjectId departmentId FK
        string specialty
        string[] qualifications
        number experience
        string licenseNumber UK
        object workingHours "embedded"
        number consultationDuration
        number fee
        string bio
        string[] languages
        object rating "embedded"
        boolean isAvailable
        boolean isOnBreak
        object[] leaveRecords
        date createdAt
        date updatedAt
    }

    DEPARTMENT {
        ObjectId _id PK
        string name UK
        string slug UK
        string description
        string icon
        string image
        ObjectId headDoctorId FK
        object location "embedded"
        object contact "embedded"
        string[] services
        number averageWaitTime
        boolean isActive
        number sortOrder
        date createdAt
        date updatedAt
    }

    APPOINTMENT {
        ObjectId _id PK
        ObjectId patientId FK
        ObjectId doctorId FK
        date date
        object timeSlot "embedded start+end"
        number queueNumber
        string status "pending or confirmed or completed etc"
        object[] statusHistory
        string chiefComplaint
        string patientNotes
        string doctorNotes
        object vitals "embedded"
        object payment "embedded"
        string cancellationReason
        boolean isFollowUp
        ObjectId followUpOf FK
        string type "in-person or telemedicine"
        date createdAt
        date updatedAt
    }

    QUEUE {
        ObjectId _id PK
        ObjectId doctorId FK
        date date
        object[] items "embedded QueueItems"
        object[] completedItems
        ObjectId currentServing FK
        number currentNumber
        number nextQueueNumber
        number servedCount
        number averageConsultTime
        string status "pending or active or paused or closed"
        string pauseReason
        date openedAt
        date closedAt
        date createdAt
        date updatedAt
    }

    MEDICALRECORD {
        ObjectId _id PK
        ObjectId appointmentId FK UK
        ObjectId patientId FK
        ObjectId doctorId FK
        date visitDate
        string chiefComplaint
        string subjective
        string objective
        object[] diagnoses "embedded"
        object[] prescriptions "embedded"
        object[] labOrders "embedded"
        string treatmentPlan
        string advice
        object referral "embedded"
        boolean followUpRequired
        ObjectId followUpAppointmentId FK
        object[] attachments "embedded"
        boolean isLocked
        date lockedAt
        date createdAt
        date updatedAt
    }

    NOTIFICATION {
        ObjectId _id PK
        ObjectId userId FK
        string title
        string message
        string type
        string priority "low or normal or high or urgent"
        boolean isRead
        date readAt
        ObjectId appointmentId FK
        ObjectId medicalRecordId FK
        string actionUrl
        object channels "embedded"
        object metadata
        date expiresAt "TTL index"
        date createdAt
        date updatedAt
    }

    USER ||--o{ APPOINTMENT : "books as patient"
    USER ||--o| DOCTOR : "has profile"
    USER ||--o{ NOTIFICATION : "receives"
    USER ||--o{ MEDICALRECORD : "has history as patient"

    DOCTOR ||--o{ APPOINTMENT : "is assigned to"
    DOCTOR ||--o{ QUEUE : "has daily queue"
    DOCTOR ||--o{ MEDICALRECORD : "creates"
    DOCTOR }o--|| DEPARTMENT : "belongs to"

    DEPARTMENT ||--o| DOCTOR : "headed by"

    APPOINTMENT ||--o| QUEUE : "appears in queue items"
    APPOINTMENT ||--o| MEDICALRECORD : "generates after completion"
    APPOINTMENT ||--o{ NOTIFICATION : "triggers notifications"
    APPOINTMENT ||--o| APPOINTMENT : "is follow-up of"

    MEDICALRECORD ||--o{ NOTIFICATION : "triggers on publish"
```

---

## Collection Details

### 1. `users` Collection

**Purpose:** Base identity document for all system users (Patient, Doctor, Admin). Role-specific data is embedded as sub-documents.

| Field | Type | Required | Validation | Description |
|-------|------|----------|------------|-------------|
| `_id` | ObjectId | Auto | — | Primary key |
| `name` | String | ✅ | 2–80 chars | Full display name |
| `email` | String | ✅ | Unique, valid format | Login email (stored lowercase) |
| `password` | String | ✅ | ≥8 chars, `select:false` | bcrypt hash (rounds=12) |
| `role` | String | ✅ | `patient\|doctor\|admin` | Determines access level |
| `phone` | String | ❌ | E.164 format | Contact phone |
| `avatar` | String | ❌ | URL/filename | Profile photo |
| `isActive` | Boolean | ✅ | — | Soft-delete flag |
| `isEmailVerified` | Boolean | ✅ | — | Email confirmation |
| `refreshToken` | String | ❌ | `select:false` | JWT refresh token |
| `resetPasswordToken` | String | ❌ | `select:false` | Hashed reset token |
| `resetPasswordExpire` | Date | ❌ | — | Token expiry |
| `lastLogin` | Date | ❌ | — | Last successful login |
| `notificationPreferences` | Object | ✅ | — | `{email, sms, push}` booleans |
| `patientProfile` | Embedded | ✅ | — | See patientProfile sub-schema |
| `adminProfile` | Embedded | ✅ | — | See adminProfile sub-schema |
| `createdAt` | Date | Auto | — | Mongoose timestamp |
| `updatedAt` | Date | Auto | — | Mongoose timestamp |

**`patientProfile` Sub-document:**

| Field | Type | Validation | Description |
|-------|------|------------|-------------|
| `dateOfBirth` | Date | Must be past | Used for age virtual |
| `gender` | String | Enum: male/female/other/prefer_not_to_say | Biological sex |
| `bloodGroup` | String | Enum: A+/A-/B+/B-/AB+/AB-/O+/O-/unknown | ABO+Rh group |
| `allergies` | String[] | — | Known drug/food allergies |
| `chronicConditions` | String[] | — | Ongoing conditions |
| `emergencyContact` | Object | — | `{name, phone, relationship}` |
| `insurance` | Object | — | `{provider, policyNumber, expiryDate}` |
| `address` | Object | — | `{street, city, state, zip, country}` |

**`adminProfile` Sub-document:**

| Field | Type | Description |
|-------|------|-------------|
| `permissions` | Object | `{manageUsers, manageDoctors, manageDepartments, viewAnalytics, manageSettings}` |
| `department` | ObjectId | Supervised department |
| `employeeId` | String | Internal staff ID |

**Indexes:**
```
{ email: 1 }                unique: true    — fast login
{ role: 1, isActive: 1 }                   — admin user filters
{ createdAt: -1 }                          — recent-first sort
```

**Virtuals:**
- `patientProfile.age` — computed from dateOfBirth
- `doctorProfile` — populates linked Doctor document

**Methods:**
- `comparePassword(entered)` — bcrypt verify
- `toSafeObject()` — strips sensitive fields for API responses
- `findByEmailWithPassword(email)` [static] — login query

---

### 2. `doctors` Collection

**Purpose:** Extended professional profile linked one-to-one with a User document.

| Field | Type | Required | Validation | Description |
|-------|------|----------|------------|-------------|
| `_id` | ObjectId | Auto | — | Primary key |
| `userId` | ObjectId (→User) | ✅ | Unique | One-to-one reference |
| `departmentId` | ObjectId (→Department) | ❌ | — | Department affiliation |
| `specialty` | String | ✅ | ≤100 chars | Medical specialty |
| `qualifications` | String[] | ✅ | ≥1 item | e.g. `['MBBS', 'MD']` |
| `experience` | Number | ✅ | 0–60 | Years of practice |
| `licenseNumber` | String | ❌ | Sparse unique | Medical registration number |
| `workingHours` | Embedded | ✅ | — | `{start, end, days[]}` |
| `consultationDuration` | Number | ✅ | 10/15/20/30/45/60 | Minutes per slot |
| `fee` | Number | ✅ | ≥0 | Consultation fee (INR) |
| `bio` | String | ❌ | ≤1000 chars | Professional biography |
| `languages` | String[] | ❌ | — | Languages spoken |
| `profileImage` | String | ❌ | — | Photo URL |
| `rating` | Embedded | ✅ | — | `{average, count, breakdown{1..5}}` |
| `isAvailable` | Boolean | ✅ | — | Accepting appointments |
| `isOnBreak` | Boolean | ✅ | — | Temporary break status |
| `leaveRecords` | Embedded[] | ❌ | — | `{fromDate, toDate, reason, approvedBy}` |
| `maxPatientsPerDay` | Number | ❌ | ≥0 | Daily cap (0=unlimited) |

**Indexes:**
```
{ userId: 1 }                              unique — profile lookup
{ specialty: 1, isAvailable: 1 }                 — patient doctor-search
{ departmentId: 1, isAvailable: 1 }              — department filter
{ 'rating.average': -1 }                         — top-rated sort
```

**Instance Methods:**
- `isOnLeave(date)` — returns true if approved leave covers the date
- `recalculateRating()` — recomputes average from star breakdown

---

### 3. `departments` Collection

**Purpose:** Hospital specialty departments used for organizing doctors and patient navigation.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `_id` | ObjectId | Auto | Primary key |
| `name` | String | ✅ | Unique department name (≤100 chars) |
| `slug` | String | Auto | URL-friendly, auto-generated from name |
| `description` | String | ✅ | Patient-facing description (≤1000 chars) |
| `icon` | String | ❌ | Lucide icon name |
| `image` | String | ❌ | Banner image URL |
| `headDoctorId` | ObjectId (→Doctor) | ❌ | Head/chief doctor |
| `location` | Object | ❌ | `{building, floor, wing, roomNumbers[]}` |
| `contact` | Object | ❌ | `{phone, extension, email}` |
| `services` | String[] | ❌ | Offered procedures/tests |
| `averageWaitTime` | Number | ❌ | Aggregate average (minutes) |
| `isActive` | Boolean | ✅ | Public listing visibility |
| `sortOrder` | Number | ❌ | Display order |

**Indexes:**
```
{ slug: 1 }                   unique — URL routing
{ isActive: 1, sortOrder: 1 }        — sorted public listing
```

**Virtuals:** `doctors` — all Doctors with `departmentId = this._id`

**Hooks:** Pre-save auto-generates `slug` from `name`

---

### 4. `appointments` Collection

**Purpose:** A single scheduled consultation between a patient and doctor.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `_id` | ObjectId | Auto | Primary key |
| `patientId` | ObjectId (→User) | ✅ | Booking patient |
| `doctorId` | ObjectId (→Doctor) | ✅ | Assigned doctor |
| `date` | Date | ✅ | Appointment date (≥ today) |
| `timeSlot` | Object | ✅ | `{start: 'HH:MM', end: 'HH:MM'}` |
| `queueNumber` | Number | ❌ | Sequential ticket (≥1) |
| `status` | String | ✅ | `pending\|confirmed\|checked-in\|in-progress\|completed\|cancelled\|no-show` |
| `statusHistory` | Embedded[] | Auto | `{status, changedAt, changedBy, note}` |
| `chiefComplaint` | String | ❌ | Reason for visit (≤500) |
| `patientNotes` | String | ❌ | Pre-consultation notes (≤1000) |
| `doctorNotes` | String | ❌ | Post-consultation notes (≤2000) |
| `vitals` | Embedded | ❌ | `{weight, height, bloodPressure, pulseRate, temperature, oxygenSaturation, bloodGlucose}` |
| `payment` | Embedded | ✅ | `{amount, currency, status, method, transactionId, paidAt}` |
| `cancellationReason` | String | ❌ | Why cancelled (≤500) |
| `cancelledBy` | String | ❌ | `patient\|doctor\|admin\|system` |
| `isFollowUp` | Boolean | ✅ | Is a follow-up visit |
| `followUpOf` | ObjectId (→Appointment) | ❌ | Parent appointment |
| `type` | String | ✅ | `in-person\|telemedicine` |
| `meetingLink` | String | ❌ | Video call URL |
| `reminderSent` | Boolean | ✅ | Duplicate reminder guard |

**Vitals sub-document fields:**
`weight (kg), height (cm), bloodPressure (systolic/diastolic), pulseRate (bpm), temperature (°C), oxygenSaturation (SpO₂ %), bloodGlucose (mg/dL), recordedAt, recordedBy`

**Indexes:**
```
{ doctorId:1, date:1, 'timeSlot.start':1 }  unique — anti-double-booking
{ patientId:1, date:-1 }                           — patient history
{ doctorId:1, date:1, status:1 }                   — doctor daily queue
{ status:1, date:1 }                               — admin reports
{ 'payment.status':1 }                             — billing reports
```

**Instance Methods:** `isCancellable()` — checks 1h cancellation window

---

### 5. `queues` Collection

**Purpose:** Live queue state per doctor per day. Single document per doctor-date pair.

| Field | Type | Description |
|-------|------|-------------|
| `_id` | ObjectId | Primary key |
| `doctorId` | ObjectId (→Doctor) | Queue owner |
| `date` | Date | Calendar date (midnight UTC) |
| `items` | QueueItem[] | Active waiting patients (ordered array) |
| `completedItems` | QueueItem[] | Served/skipped/no-show archive |
| `currentServing` | ObjectId (→Appointment) | Currently in-progress |
| `currentNumber` | Number | Last called ticket number |
| `nextQueueNumber` | Number | Auto-increment counter for next ticket |
| `servedCount` | Number | Patients served today |
| `averageConsultTime` | Number | Rolling average (minutes) |
| `status` | String | `pending\|active\|paused\|closed` |
| `pauseReason` | String | Displayed to waiting patients |
| `totalPauseDuration` | Number | Cumulative pause (minutes) |
| `openedAt / closedAt` | Date | Queue session timestamps |
| `adminNotes` | String | Admin override notes |

**QueueItem sub-document:**

| Field | Description |
|-------|-------------|
| `appointmentId` | Linked Appointment |
| `patientId` | Patient reference |
| `queueNumber` | Display ticket number |
| `itemStatus` | `waiting\|called\|in-progress\|completed\|skipped\|no-show` |
| `timeSlot` | Booked slot snapshot |
| `checkedInAt` | Reception desk check-in |
| `calledAt` | Doctor called patient |
| `consultationStartedAt / EndedAt` | Consultation window |
| `actualConsultDuration` | Minutes spent (feeds averageConsultTime) |
| `estimatedWaitAtCheckIn` | Wait snapshot at check-in |

**Indexes:**
```
{ doctorId:1, date:1 }   unique — one queue per doctor per day
{ status:1, date:1 }            — admin monitoring
```

**Virtuals:** `waitingCount`, `totalPatients`

**Instance Methods:** `getPosition()`, `getEstimatedWaitTime()`, `recalculateAverageConsultTime()`, `callNext()`

---

### 6. `medicalrecords` Collection

**Purpose:** Post-consultation clinical record created by the doctor. Immutable after 24h.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `_id` | ObjectId | Auto | Primary key |
| `appointmentId` | ObjectId (→Appointment) | ✅ Unique | One-to-one link |
| `patientId` | ObjectId (→User) | ✅ | Patient reference |
| `doctorId` | ObjectId (→Doctor) | ✅ | Authoring doctor |
| `visitDate` | Date | ✅ | Date of consultation |
| `chiefComplaint` | String | ❌ | Chief complaint |
| `subjective` | String | ❌ | HPI / history |
| `objective` | String | ❌ | Examination findings |
| `diagnoses` | Embedded[] | ✅ (≥1) | `{condition, icdCode, isPrimary, severity, notes}` |
| `prescriptions` | Embedded[] | ❌ | `{medicineName, dosage, frequency, duration, route, instructions, quantity}` |
| `labOrders` | Embedded[] | ❌ | `{testName, loincCode, status, results, isAbnormal, doctorRemarks}` |
| `treatmentPlan` | String | ❌ | Non-pharmacological management |
| `advice` | String | ❌ | Patient instructions |
| `referral` | Object | ❌ | `{doctorName, specialty, facility, urgency, notes}` |
| `followUpRequired` | Boolean | ✅ | Follow-up recommended |
| `followUpAppointmentId` | ObjectId (→Appointment) | ❌ | Booked follow-up |
| `attachments` | Embedded[] | ❌ | `{fileName, fileType, url, mimeType, sizeBytes, category}` |
| `isLocked` | Boolean | ✅ | Auto-locked after 24h |
| `isConfidential` | Boolean | ✅ | Restricted access |

**Indexes:**
```
{ appointmentId:1 }             unique — one record per appointment
{ patientId:1, visitDate:-1 }          — patient medical history
{ doctorId:1, visitDate:-1 }           — doctor consultation history
{ 'diagnoses.icdCode':1 }              — diagnosis search
```

**Static Methods:** `getPatientHistory(patientId, opts)` — paginated history

---

### 7. `notifications` Collection

**Purpose:** Multi-channel notifications with automatic 30-day TTL cleanup.

| Field | Type | Description |
|-------|------|-------------|
| `userId` | ObjectId (→User) | Recipient |
| `title` | String | Short title (≤150) |
| `message` | String | Body text (≤1000) |
| `type` | String | 15 semantic types (`appointment-booked`, `queue-update`, `lab-results-ready`, etc.) |
| `priority` | String | `low\|normal\|high\|urgent` |
| `isRead` | Boolean | Read status |
| `readAt` | Date | Set when isRead flips to true |
| `appointmentId` | ObjectId | Related appointment |
| `medicalRecordId` | ObjectId | Related medical record |
| `actionUrl` | String | Deep-link for navigation |
| `channels` | Object | `{inApp, email, sms, push}` each with `{sent, delivered, sentAt, error}` |
| `metadata` | Mixed | Arbitrary extra data (queuePosition, estimatedWait, etc.) |
| `expiresAt` | Date | TTL — auto-deleted 30 days after creation |
| `batchId` | String | Shared ID for bulk broadcasts |

**Indexes:**
```
{ userId:1, isRead:1, createdAt:-1 }   — notification bell
{ userId:1, type:1 }                   — type filter
{ expiresAt:1 }    expireAfterSeconds:0 — TTL auto-delete
```

**Static Methods:** `getForUser(userId, opts)`, `markAllReadForUser(userId)`

---

## Relationships Summary Table

| Relationship | From | To | Cardinality | Field |
|---|---|---|---|---|
| User books appointments | User (patient) | Appointment | 1:N | `Appointment.patientId` |
| User has doctor profile | User (doctor) | Doctor | 1:1 | `Doctor.userId` |
| User receives notifications | User | Notification | 1:N | `Notification.userId` |
| User has medical history | User (patient) | MedicalRecord | 1:N | `MedicalRecord.patientId` |
| Doctor has appointments | Doctor | Appointment | 1:N | `Appointment.doctorId` |
| Doctor has daily queue | Doctor | Queue | 1:N | `Queue.doctorId` |
| Doctor creates medical records | Doctor | MedicalRecord | 1:N | `MedicalRecord.doctorId` |
| Doctor belongs to department | Doctor | Department | N:1 | `Doctor.departmentId` |
| Department has head doctor | Department | Doctor | 1:1 | `Department.headDoctorId` |
| Appointment in queue | Appointment | Queue | N:1 | `Queue.items[].appointmentId` |
| Appointment generates record | Appointment | MedicalRecord | 1:1 | `MedicalRecord.appointmentId` |
| Appointment triggers notifications | Appointment | Notification | 1:N | `Notification.appointmentId` |
| Appointment follows up another | Appointment | Appointment | Self | `Appointment.followUpOf` |
| Medical record triggers notification | MedicalRecord | Notification | 1:N | `Notification.medicalRecordId` |

---

## Data Flow Diagrams

### Appointment Booking Flow
```
Patient → POST /api/appointments
  ├─ Appointment.create() → status: 'pending'
  ├─ queueService.addToQueue() → queueNumber assigned
  │    └─ Queue.items.push() → sorted by timeSlot
  ├─ Notification.create() → type: 'appointment-booked'
  └─ emailService.sendAppointmentConfirmation()
```

### Live Queue Advancement Flow
```
Doctor → POST /api/queue/:doctorId/advance
  ├─ Queue.callNext() → currentServing updated
  ├─ Appointment.status = 'in-progress'
  ├─ Socket.IO → 'queue-updated' broadcast to room 'queue-{doctorId}'
  ├─ Socket.IO → 'appointment-called' to specific patient
  ├─ Notification.create() → type: 'appointment-called'
  └─ emailService.sendQueueCallNotification()
```

### Medical Record Creation Flow
```
Doctor → POST /api/medical-records (after appointment completed)
  ├─ MedicalRecord.create() with diagnoses + prescriptions
  ├─ MedicalRecord pre-save hook → auto-lock after 24h
  ├─ Notification.create() → type: 'medical-record-ready'
  └─ Patient → GET /api/medical-records/:id (view their own record)
```

---

*Documentation generated: 2026-07-22 | MediQueue v1.0*
