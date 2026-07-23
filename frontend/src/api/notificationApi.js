import api from './axios';

export const notificationApi = {
  getNotifications:   ()          => api.get('/notifications'),
  markAsRead:         (id)        => api.put(`/notifications/${id}/read`),
  markAllAsRead:      ()          => api.put('/notifications/read-all'),
  deleteNotification: (id)        => api.delete(`/notifications/${id}`),
  updateFCMToken:     (fcmToken)  => api.post('/notifications/fcm-token', { fcmToken }),
};
