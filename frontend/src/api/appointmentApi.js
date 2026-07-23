/**
 * Appointment API — all appointment-related HTTP calls.
 * Adds reschedule support.
 */
import api from './axios';

export const appointmentApi = {
  bookAppointment:      (data)            => api.post('/appointments', data),
  getMyAppointments:    (params)          => api.get('/appointments/my', { params }),
  getAppointmentById:   (id)              => api.get(`/appointments/${id}`),
  updateStatus:         (id, status)      => api.patch(`/appointments/${id}/status`, { status }),
  cancelAppointment:    (id, reason)      => api.patch(`/appointments/${id}/cancel`, { reason }),
  rescheduleAppointment:(id, data)        => api.patch(`/appointments/${id}/reschedule`, data),
  getDoctorAppointments:(params)          => api.get('/appointments/doctor', { params }),
};
