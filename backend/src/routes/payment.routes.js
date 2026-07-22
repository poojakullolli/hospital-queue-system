const express = require('express');
const { 
  createPaymentIntent, 
  confirmPayment, 
  getPaymentStatus 
} = require('../controllers/paymentController');
const { protect } = require('../middleware/auth');

const router = express.Router();

router.use(protect);

router.post('/create-intent', createPaymentIntent);
router.post('/confirm', confirmPayment);
router.get('/:appointmentId/status', getPaymentStatus);

module.exports = router;
