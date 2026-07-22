const express = require('express');
const { 
  getAllDoctors, 
  getDoctorById, 
  getAvailableSlots, 
  updateDoctorProfile, 
  setAvailability, 
  toggleBreak,
  getDoctorStats
} = require('../controllers/doctorController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

// Public routes
router.get('/', getAllDoctors);
router.get('/:id', getDoctorById);
router.get('/:id/slots', getAvailableSlots);

// Doctor only routes
router.use(protect);
router.use(authorize('doctor'));

router.get('/stats/dashboard', getDoctorStats);
router.put('/:id', updateDoctorProfile);
router.put('/:id/availability', setAvailability);
router.put('/:id/break', toggleBreak);

module.exports = router;
