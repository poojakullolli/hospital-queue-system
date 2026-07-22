const mongoose = require('mongoose');

const doctorSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
    },
    specialty: {
      type: String,
      required: [true, 'Please add a specialty'],
    },
    qualifications: {
      type: [String],
      required: true,
    },
    experience: {
      type: Number, // In years
      required: true,
      min: 0,
    },
    workingHours: {
      start: { type: String, required: true, default: '09:00' }, // e.g., '09:00'
      end: { type: String, required: true, default: '17:00' },   // e.g., '17:00'
      days: {
        type: [String],
        enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
        default: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
      },
    },
    consultationDuration: {
      type: Number,
      default: 15, // minutes
    },
    fee: {
      type: Number,
      required: true,
      min: 0,
    },
    bio: {
      type: String,
      maxlength: 500,
    },
    rating: {
      type: Number,
      min: 1,
      max: 5,
      default: 5,
    },
    isAvailable: {
      type: Boolean,
      default: true,
    },
    isOnBreak: {
      type: Boolean,
      default: false,
    },
    profileImage: {
      type: String,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Virtual for full details (combining User fields)
doctorSchema.virtual('fullDetails', {
  ref: 'User',
  localField: 'userId',
  foreignField: '_id',
  justOne: true,
});

module.exports = mongoose.model('Doctor', doctorSchema);
