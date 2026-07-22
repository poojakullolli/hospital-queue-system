/**
 * @fileoverview MedicalRecord Model — post-consultation clinical summary.
 *
 * Created by the doctor after completing an appointment.
 * Contains diagnosis, prescriptions, lab orders, and attachments.
 *
 * Relationships:
 *   - One  MedicalRecord → One Appointment   (MedicalRecord.appointmentId)
 *   - Many MedicalRecords → One Patient      (MedicalRecord.patientId → User._id)
 *   - Many MedicalRecords → One Doctor       (MedicalRecord.doctorId  → Doctor._id)
 *   - One  MedicalRecord may link to a follow-up Appointment (followUpAppointmentId)
 *
 * Access rules (enforced in middleware):
 *   - Patient can VIEW their own records.
 *   - Doctor can CREATE/UPDATE records for their own patients.
 *   - Admin can VIEW all records.
 *   - Records are immutable after 24 h (isLocked=true) except by admin.
 */

const mongoose = require('mongoose');

// ─── Sub-schema: Prescription Item ────────────────────────────────────────────
/**
 * A single line on the prescription (one drug).
 */
const prescriptionItemSchema = new mongoose.Schema(
  {
    /** Generic or brand name of the medication */
    medicineName: {
      type: String,
      required: [true, 'Medicine name is required'],
      trim: true,
      maxlength: [200, 'Medicine name cannot exceed 200 characters'],
    },

    /** Dosage strength, e.g. '500 mg', '10 mg/5 ml' */
    dosage: {
      type: String,
      required: [true, 'Dosage is required'],
      trim: true,
      maxlength: 100,
    },

    /** How to take it, e.g. 'Twice daily after meals' */
    frequency: {
      type: String,
      required: [true, 'Frequency is required'],
      trim: true,
      maxlength: 200,
    },

    /** Total treatment duration, e.g. '7 days', '2 weeks' */
    duration: {
      type: String,
      trim: true,
      maxlength: 100,
    },

    /** Route: oral, injection, topical, inhaled, drops */
    route: {
      type: String,
      enum: {
        values: ['oral', 'injection', 'topical', 'inhaled', 'drops', 'other'],
        message: '{VALUE} is not a valid route of administration',
      },
      default: 'oral',
    },

    /** Additional instructions, e.g. 'Do not crush tablet' */
    instructions: {
      type: String,
      trim: true,
      maxlength: 500,
    },

    /** Quantity to dispense (for pharmacy) */
    quantity: {
      type: Number,
      min: 0,
    },

    /** Whether this is a refill of a previous prescription */
    isRefill: {
      type: Boolean,
      default: false,
    },
  },
  { _id: true }
);

// ─── Sub-schema: Diagnosis ─────────────────────────────────────────────────────
/**
 * Clinical diagnosis with optional ICD-10 code.
 * Supports primary and secondary (comorbid) diagnoses.
 */
const diagnosisSchema = new mongoose.Schema(
  {
    /** Short diagnosis label, e.g. 'Type 2 Diabetes Mellitus' */
    condition: {
      type: String,
      required: [true, 'Condition is required'],
      trim: true,
      maxlength: 300,
    },

    /** ICD-10 code for interoperability, e.g. 'E11.9' */
    icdCode: {
      type: String,
      trim: true,
      uppercase: true,
      match: [/^[A-Z]\d{2}(\.\d{1,4})?$/, 'ICD-10 code format is invalid (e.g., E11.9)'],
    },

    /** Whether this is the primary diagnosis */
    isPrimary: {
      type: Boolean,
      default: true,
    },

    /** Severity level */
    severity: {
      type: String,
      enum: {
        values: ['mild', 'moderate', 'severe', 'critical'],
        message: '{VALUE} is not a valid severity',
      },
    },

    /** Additional clinical notes about this diagnosis */
    notes: {
      type: String,
      trim: true,
      maxlength: 1000,
    },
  },
  { _id: true }
);

// ─── Sub-schema: Lab Order ─────────────────────────────────────────────────────
/**
 * Laboratory test ordered by the doctor.
 */
const labOrderSchema = new mongoose.Schema(
  {
    /** Name of the test, e.g. 'Complete Blood Count', 'HbA1c' */
    testName: {
      type: String,
      required: [true, 'Test name is required'],
      trim: true,
      maxlength: 200,
    },

    /** Testing laboratory or department */
    laboratory: {
      type: String,
      trim: true,
      maxlength: 200,
    },

    /** LOINC code for interoperability */
    loincCode: {
      type: String,
      trim: true,
    },

    /** Test completion status */
    status: {
      type: String,
      enum: {
        values: ['ordered', 'sample-collected', 'processing', 'completed', 'cancelled'],
        message: '{VALUE} is not a valid lab order status',
      },
      default: 'ordered',
    },

    /** Date ordered */
    orderedAt: {
      type: Date,
      default: Date.now,
    },

    /** Date results received */
    resultsAt: {
      type: Date,
    },

    /** Textual summary of results */
    results: {
      type: String,
      trim: true,
      maxlength: 2000,
    },

    /** Flag indicating abnormal values */
    isAbnormal: {
      type: Boolean,
      default: false,
    },

    /** Doctor's comments on the results */
    doctorRemarks: {
      type: String,
      trim: true,
      maxlength: 1000,
    },
  },
  { _id: true, timestamps: true }
);

// ─── Sub-schema: Attachment ────────────────────────────────────────────────────
/**
 * Uploaded document — scan report, X-ray, referral letter, etc.
 */
const attachmentSchema = new mongoose.Schema(
  {
    /** Display name for the file */
    fileName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 255,
    },

    /** File type category */
    fileType: {
      type: String,
      enum: {
        values: ['image', 'pdf', 'dicom', 'video', 'other'],
        message: '{VALUE} is not a valid file type',
      },
      required: true,
    },

    /** MIME type, e.g. 'image/jpeg', 'application/pdf' */
    mimeType: {
      type: String,
      trim: true,
    },

    /** Storage URL (S3, Cloudinary, or local /uploads) */
    url: {
      type: String,
      required: true,
    },

    /** File size in bytes */
    sizeBytes: {
      type: Number,
      min: 0,
    },

    /** Category label for filtering, e.g. 'X-ray', 'MRI', 'Report' */
    category: {
      type: String,
      trim: true,
      maxlength: 100,
    },

    /** Who uploaded this file */
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },

    /** When uploaded */
    uploadedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: true }
);

// ─── Main MedicalRecord Schema ─────────────────────────────────────────────────
const medicalRecordSchema = new mongoose.Schema(
  {
    /**
     * The appointment this record was generated from.
     * One-to-one relationship.
     */
    appointmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Appointment',
      required: [true, 'Appointment reference is required'],
      unique: true, // one record per appointment
    },

    /** Patient (denormalized for fast patient-history queries) */
    patientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Patient reference is required'],
      index: true,
    },

    /** Doctor who authored this record */
    doctorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Doctor',
      required: [true, 'Doctor reference is required'],
      index: true,
    },

    /** Date of the consultation (denormalized for range queries) */
    visitDate: {
      type: Date,
      required: [true, 'Visit date is required'],
    },

    /** Chief complaint (copied from Appointment for convenience) */
    chiefComplaint: {
      type: String,
      trim: true,
      maxlength: 500,
    },

    /** Doctor's subjective observations / history of presenting illness */
    subjective: {
      type: String,
      trim: true,
      maxlength: 3000,
    },

    /** Clinical examination findings */
    objective: {
      type: String,
      trim: true,
      maxlength: 3000,
    },

    /**
     * Structured diagnoses — always at least one.
     * First item is the primary diagnosis.
     */
    diagnoses: {
      type: [diagnosisSchema],
      validate: {
        validator: (arr) => arr.length > 0,
        message: 'At least one diagnosis is required',
      },
    },

    /**
     * Prescription — list of medications.
     * May be empty for non-pharmacological visits.
     */
    prescriptions: {
      type: [prescriptionItemSchema],
      default: [],
    },

    /** Laboratory tests ordered during this visit */
    labOrders: {
      type: [labOrderSchema],
      default: [],
    },

    /**
     * Treatment plan / management instructions beyond medication.
     * E.g., physiotherapy, diet, lifestyle recommendations.
     */
    treatmentPlan: {
      type: String,
      trim: true,
      maxlength: 3000,
    },

    /** Doctor's advice to patient (patient-facing language) */
    advice: {
      type: String,
      trim: true,
      maxlength: 2000,
    },

    /** Referral to another specialist or facility */
    referral: {
      doctorName:    { type: String, trim: true },
      specialty:     { type: String, trim: true },
      facility:      { type: String, trim: true },
      urgency:       { type: String, enum: ['routine', 'urgent', 'emergency'] },
      referralNotes: { type: String, maxlength: 500 },
    },

    /** Whether a follow-up appointment is recommended */
    followUpRequired: {
      type: Boolean,
      default: false,
    },

    /** Recommended follow-up interval, e.g. '2 weeks', '1 month' */
    followUpAfter: {
      type: String,
      trim: true,
      maxlength: 100,
    },

    /** Link to the booked follow-up appointment (if already scheduled) */
    followUpAppointmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Appointment',
    },

    /** Uploaded scans, reports, and documents */
    attachments: {
      type: [attachmentSchema],
      default: [],
    },

    /**
     * Locked records cannot be edited (set to true 24 h after creation).
     * Admins can unlock in exceptional cases.
     */
    isLocked: {
      type: Boolean,
      default: false,
      index: true,
    },

    /** Timestamp when the record was locked */
    lockedAt: {
      type: Date,
    },

    /** Confidentiality flag — if true, only the patient and treating doctor can view */
    isConfidential: {
      type: Boolean,
      default: false,
    },

    /** Internal audit notes added by admin */
    adminNotes: {
      type: String,
      maxlength: 1000,
    },
  },
  {
    timestamps: true,
    toJSON:  { virtuals: true },
    toObject: { virtuals: true },
  }
);

// ─── Indexes ───────────────────────────────────────────────────────────────────
medicalRecordSchema.index({ patientId: 1, visitDate: -1 });   // patient history (most recent first)
medicalRecordSchema.index({ doctorId: 1, visitDate: -1 });    // doctor's past consultations
medicalRecordSchema.index({ appointmentId: 1 }, { unique: true }); // one record per appointment
medicalRecordSchema.index({ 'diagnoses.icdCode': 1 });        // diagnosis-based search
medicalRecordSchema.index({ visitDate: -1 });                 // admin date-range reports

// ─── Middleware / Hooks ────────────────────────────────────────────────────────
/**
 * Pre-save: auto-lock records 24 hours after initial creation.
 * We check via a field rather than TTL so admins can override.
 */
medicalRecordSchema.pre('save', function (next) {
  if (!this.isNew && !this.isLocked) {
    const hoursSinceCreation = (Date.now() - this.createdAt.getTime()) / (1000 * 60 * 60);
    if (hoursSinceCreation >= 24) {
      this.isLocked = true;
      this.lockedAt = new Date();
    }
  }
  next();
});

// ─── Instance Methods ──────────────────────────────────────────────────────────
/**
 * Return the primary diagnosis, or null if none.
 * @returns {Object|null}
 */
medicalRecordSchema.methods.getPrimaryDiagnosis = function () {
  return this.diagnoses.find((d) => d.isPrimary) || this.diagnoses[0] || null;
};

/**
 * Return a summary string suitable for a patient-facing view.
 * @returns {string}
 */
medicalRecordSchema.methods.getSummary = function () {
  const primary = this.getPrimaryDiagnosis();
  const rx      = this.prescriptions.length;
  const labs    = this.labOrders.length;
  return `Diagnosis: ${primary ? primary.condition : 'N/A'} | Medications: ${rx} | Lab orders: ${labs}`;
};

// ─── Static Methods ────────────────────────────────────────────────────────────
/**
 * Retrieve a patient's full medical history, sorted by most recent visit.
 * @param {string} patientId
 * @param {Object} [options] - { page, limit, startDate, endDate }
 * @returns {Promise<MedicalRecord[]>}
 */
medicalRecordSchema.statics.getPatientHistory = function (patientId, options = {}) {
  const { page = 1, limit = 10, startDate, endDate } = options;
  const filter = { patientId };
  if (startDate || endDate) {
    filter.visitDate = {};
    if (startDate) filter.visitDate.$gte = new Date(startDate);
    if (endDate)   filter.visitDate.$lte = new Date(endDate);
  }
  return this.find(filter)
    .sort({ visitDate: -1 })
    .skip((page - 1) * limit)
    .limit(limit)
    .populate('doctorId', 'specialty')
    .populate({ path: 'doctorId', populate: { path: 'userId', select: 'name avatar' } });
};

module.exports = mongoose.model('MedicalRecord', medicalRecordSchema);
