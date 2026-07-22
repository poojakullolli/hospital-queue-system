const express = require('express');
const { 
  bookAppointment, 
  getMyAppointments, 
  getAppointmentById, 
  updateAppointmentStatus, 
  cancelAppointment,
  getDoctorAppointments,
  getAppointmentsByDate
} = require('../controllers/appointmentController');
const { protect, authorize } = require('../middleware/auth');
const { createAppointmentValidation } = require('../middleware/validate');

const router = express.Router();

router.use(protect);

// Patient routes
router.post('/', authorize('patient'), createAppointmentValidation, bookAppointment);
router.get('/', authorize('patient', 'doctor', 'admin'), (req, res, next) => {
  if (req.user.role === 'patient') {
    return getMyAppointments(req, res, next);
  } else if (req.user.role === 'doctor') {
    return getDoctorAppointments(req, res, next);
  }
});

// Doctor specific list
router.get('/date', authorize('doctor'), getAppointmentsByDate);

router.get('/:id', getAppointmentById);
router.put('/:id/status', authorize('doctor', 'admin'), updateAppointmentStatus);
router.delete('/:id/cancel', cancelAppointment);

module.exports = router;
