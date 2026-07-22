const Appointment = require('../models/Appointment');
const asyncHandler = require('../utils/asyncHandler');
const AppError = require('../middleware/AppError');
const { successResponse } = require('../utils/apiResponse');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

exports.createPaymentIntent = asyncHandler(async (req, res, next) => {
  const { appointmentId } = req.body;

  const appointment = await Appointment.findById(appointmentId).populate('patientId');
  if (!appointment) {
    return next(new AppError('Appointment not found', 404));
  }

  if (appointment.patientId._id.toString() !== req.user.id) {
    return next(new AppError('Not authorized', 403));
  }

  if (appointment.paymentStatus === 'paid') {
    return next(new AppError('Appointment is already paid', 400));
  }

  // If no Stripe key, mock success for development
  if (!process.env.STRIPE_SECRET_KEY) {
    return successResponse(res, {
      clientSecret: 'mock_client_secret_for_dev',
      appointmentId: appointment._id,
      mockMode: true
    });
  }

  const paymentIntent = await stripe.paymentIntents.create({
    amount: appointment.consultationFee * 100, // Stripe expects amounts in cents
    currency: 'usd',
    metadata: {
      appointmentId: appointment._id.toString(),
      patientId: req.user.id
    },
  });

  appointment.paymentIntentId = paymentIntent.id;
  await appointment.save();

  successResponse(res, {
    clientSecret: paymentIntent.client_secret,
    appointmentId: appointment._id
  });
});

exports.confirmPayment = asyncHandler(async (req, res, next) => {
  const { appointmentId, paymentIntentId } = req.body;

  const appointment = await Appointment.findById(appointmentId);
  if (!appointment) {
    return next(new AppError('Appointment not found', 404));
  }

  // If mock mode
  if (!process.env.STRIPE_SECRET_KEY) {
    appointment.paymentStatus = 'paid';
    await appointment.save();
    return successResponse(res, appointment, 'Payment confirmed (Mock)');
  }

  const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

  if (paymentIntent.status === 'succeeded') {
    appointment.paymentStatus = 'paid';
    await appointment.save();
    successResponse(res, appointment, 'Payment confirmed successfully');
  } else {
    return next(new AppError('Payment not successful', 400));
  }
});

exports.getPaymentStatus = asyncHandler(async (req, res, next) => {
  const appointment = await Appointment.findById(req.params.appointmentId);
  
  if (!appointment) {
    return next(new AppError('Appointment not found', 404));
  }

  successResponse(res, {
    paymentStatus: appointment.paymentStatus,
    amount: appointment.consultationFee
  });
});
