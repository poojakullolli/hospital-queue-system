const express = require('express');
const { getProfile, updateProfile, uploadAvatar, getAllUsers, getUserById, deleteUser } = require('../controllers/userController');
const { protect, authorize } = require('../middleware/auth');
const { updateProfileValidation } = require('../middleware/validate');

const router = express.Router();

// User routes
router.get('/me', protect, getProfile);
router.put('/me', protect, updateProfileValidation, updateProfile);
router.post('/avatar', protect, uploadAvatar);

// Admin only routes
router.use(protect);
router.use(authorize('admin'));

router.route('/:id')
  .get(getUserById)
  .delete(deleteUser);

module.exports = router;
