const express = require('express');
const { 
  getAllDoctors, 
  getDoctorById, 
  getAvailableSlots, 
  updateDoctorProfile, 
  setAvailability, 
  toggleBreak,
  getDoctorStats,
  getDoctorProfileMe
} = require('../controllers/doctorController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

// Protected doctor profile routes (place BEFORE /:id to prevent route collision)
router.get('/profile/me', protect, authorize('doctor'), getDoctorProfileMe);
router.get('/me/profile', protect, authorize('doctor'), getDoctorProfileMe);

// Public routes
router.get('/', getAllDoctors);
router.get('/:id', getDoctorById);
router.get('/:id/slots', getAvailableSlots);

// Doctor only routes
router.use(protect);
router.use(authorize('doctor'));

router.get('/stats/dashboard', getDoctorStats);
router.put('/me', updateDoctorProfile);
router.put('/:id', updateDoctorProfile);
router.put('/:id/availability', setAvailability);
router.put('/:id/break', toggleBreak);

module.exports = router;
