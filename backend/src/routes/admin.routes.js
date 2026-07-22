const express = require('express');
const { 
  getDashboardStats, 
  getAllUsers, 
  updateUser, 
  deleteUser, 
  getDepartments, 
  createDepartment, 
  updateDepartment, 
  deleteDepartment, 
  getSystemAnalytics 
} = require('../controllers/adminController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

// Allow public to see departments
router.get('/departments', getDepartments);

router.use(protect);
router.use(authorize('admin'));

router.get('/stats', getDashboardStats);
router.get('/users', getAllUsers);
router.route('/users/:id')
  .put(updateUser)
  .delete(deleteUser);

router.post('/departments', createDepartment);
router.route('/departments/:id')
  .put(updateDepartment)
  .delete(deleteDepartment);

router.get('/analytics', getSystemAnalytics);

module.exports = router;
