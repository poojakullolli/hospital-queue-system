const express = require('express');
const { 
  getQueue, 
  getQueuePosition, 
  advanceQueue, 
  pauseQueue, 
  resumeQueue, 
  getQueueBoard 
} = require('../controllers/queueController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

// Public / Patient routes
router.get('/:doctorId', getQueue);
router.get('/:doctorId/position/:appointmentId', getQueuePosition);
router.get('/:doctorId/board', getQueueBoard); // Public waiting room display

// Doctor only routes
router.use(protect);
router.use(authorize('doctor', 'admin'));

router.post('/:doctorId/advance', advanceQueue);
router.put('/:doctorId/pause', pauseQueue);
router.put('/:doctorId/resume', resumeQueue);

module.exports = router;
