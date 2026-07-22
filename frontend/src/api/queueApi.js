import api from './axios';

export const queueApi = {
  getQueue: (doctorId, date) => api.get(`/queue/${doctorId}`, { params: { date } }),
  getQueuePosition: (doctorId, appointmentId) => api.get(`/queue/${doctorId}/position/${appointmentId}`),
  advanceQueue: (doctorId) => api.post(`/queue/${doctorId}/advance`),
  pauseQueue: (doctorId, reason) => api.post(`/queue/${doctorId}/pause`, { reason }),
  resumeQueue: (doctorId) => api.post(`/queue/${doctorId}/resume`),
  getQueueBoard: (doctorId) => api.get(`/queue/${doctorId}/board`),
};
