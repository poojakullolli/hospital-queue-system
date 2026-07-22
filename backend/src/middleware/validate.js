const { validationResult, check } = require('express-validator');
const { errorResponse } = require('../utils/apiResponse');

const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (errors.isEmpty()) {
    return next();
  }

  const extractedErrors = [];
  errors.array().map((err) => extractedErrors.push({ [err.path || err.param]: err.msg }));

  return errorResponse(res, 'Validation Error', 400, extractedErrors);
};

const registerValidation = [
  check('name', 'Name is required').not().isEmpty(),
  check('email', 'Please include a valid email').isEmail(),
  check('password', 'Please enter a password with 6 or more characters').isLength({ min: 6 }),
  validate
];

const loginValidation = [
  check('email', 'Please include a valid email').isEmail(),
  check('password', 'Password is required').exists(),
  validate
];

const createAppointmentValidation = [
  check('doctorId', 'Doctor ID is required').not().isEmpty(),
  check('date', 'Valid date is required').isISO8601(),
  check('timeSlot.start', 'Start time is required').not().isEmpty(),
  check('timeSlot.end', 'End time is required').not().isEmpty(),
  check('consultationFee', 'Consultation fee is required').isNumeric(),
  validate
];

const updateProfileValidation = [
  check('name', 'Name is required').optional().not().isEmpty(),
  check('email', 'Please include a valid email').optional().isEmail(),
  validate
];

module.exports = {
  validate,
  registerValidation,
  loginValidation,
  createAppointmentValidation,
  updateProfileValidation
};
