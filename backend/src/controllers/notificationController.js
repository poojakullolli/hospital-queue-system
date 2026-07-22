const Notification = require('../models/Notification');
const asyncHandler = require('../utils/asyncHandler');
const AppError = require('../middleware/AppError');
const { successResponse } = require('../utils/apiResponse');

exports.getNotifications = asyncHandler(async (req, res, next) => {
  const notifications = await Notification.find({ userId: req.user.id })
    .sort('-createdAt')
    .limit(50); // limit to last 50
    
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
