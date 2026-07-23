/**
 * Queue API — updated to include skipPatient endpoint.
 */
import api from './axios';

export const queueApi = {
  getQueue:         (doctorId, date)            => api.get(`/queues/${doctorId}`, { params: { date } }),
  getQueuePosition: (doctorId, appointmentId)   => api.get(`/queues/${doctorId}/position/${appointmentId}`),
  advanceQueue:     (doctorId)                  => api.post(`/queues/${doctorId}/advance`),
  skipPatient:      (doctorId, appointmentId)   => api.post(`/queues/${doctorId}/skip`, { appointmentId }),
  pauseQueue:       (doctorId, reason)          => api.post(`/queues/${doctorId}/pause`, { reason }),
  resumeQueue:      (doctorId)                  => api.post(`/queues/${doctorId}/resume`),
  getQueueBoard:    (doctorId)                  => api.get(`/queues/${doctorId}/board`),
};
