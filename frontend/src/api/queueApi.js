/**
 * Queue API — client API helpers for Smart Queue operations.
 */
import api from './axios';

export const queueApi = {
  getQueue:         (doctorId, date)            => api.get(`/queues/${doctorId}`, { params: { date } }),
  getQueuePosition: (doctorId, appointmentId)   => api.get(`/queues/${doctorId}/position/${appointmentId}`),
  advanceQueue:     (doctorId)                  => api.post(`/queues/${doctorId}/advance`),
  setDelay:         (doctorId, minutes, reason) => api.post(`/queues/${doctorId}/delay`, { minutes, reason }),
  addEmergency:     (doctorId, appointmentId)   => api.post(`/queues/${doctorId}/emergency`, { appointmentId }),
  skipPatient:      (doctorId, appointmentId)   => api.post(`/queues/${doctorId}/skip`, { appointmentId }),
  reorderQueue:     (doctorId, appointmentIds)  => api.post(`/queues/${doctorId}/reorder`, { appointmentIds }),
  pauseQueue:       (doctorId, reason)          => api.put(`/queues/${doctorId}/pause`, { reason }),
  resumeQueue:      (doctorId)                  => api.put(`/queues/${doctorId}/resume`),
  getQueueBoard:    (doctorId)                  => api.get(`/queues/${doctorId}/board`),
};
