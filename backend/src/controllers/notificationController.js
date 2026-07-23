const Notification = require('../models/Notification');
const User = require('../models/User');
const asyncHandler = require('../utils/asyncHandler');
const AppError = require('../middleware/AppError');
const { successResponse } = require('../utils/apiResponse');

exports.getNotifications = asyncHandler(async (req, res, next) => {
  const notifications = await Notification.find({ userId: req.user.id })
    .sort('-createdAt')
    .limit(50);
    
  successResponse(res, notifications);
});

exports.markAsRead = asyncHandler(async (req, res, next) => {
  const notification = await Notification.findOneAndUpdate(
    { _id: req.params.id, userId: req.user.id },
    { isRead: true },
    { new: true }
  );

  if (!notification) {
    return next(new AppError('Notification not found', 404));
  }

  successResponse(res, notification);
});

exports.markAllAsRead = asyncHandler(async (req, res, next) => {
  await Notification.updateMany(
    { userId: req.user.id, isRead: false },
    { isRead: true }
  );

  successResponse(res, null, 'All notifications marked as read');
});

exports.deleteNotification = asyncHandler(async (req, res, next) => {
  const notification = await Notification.findOneAndDelete({
    _id: req.params.id,
    userId: req.user.id
  });

  if (!notification) {
    return next(new AppError('Notification not found', 404));
  }

  successResponse(res, null, 'Notification deleted');
});

/** Save / Register user FCM Device Token for push notifications */
exports.updateFCMToken = asyncHandler(async (req, res, next) => {
  const { fcmToken } = req.body;
  if (!fcmToken) {
    return next(new AppError('FCM token is required', 400));
  }

  const user = await User.findByIdAndUpdate(
    req.user.id,
    { fcmToken },
    { new: true }
  );

  successResponse(res, { fcmToken: user.fcmToken }, 'FCM Device Token updated');
});
