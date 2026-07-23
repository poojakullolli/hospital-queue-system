/**
 * Doctor API — extends the base doctorApi with doctor-specific endpoints.
 * Adds getDoctorProfile (self) and updateSchedule methods.
 */
import api from './axios';

export const doctorApi = {
  getAllDoctors:      (params)     => api.get('/doctors', { params }),
  getDoctorById:     (id)         => api.get(`/doctors/${id}`),
  getDoctorProfile:  ()           => api.get('/doctors/profile/me'),
  getAvailableSlots: (doctorId, date) => api.get(`/doctors/${doctorId}/slots`, { params: { date } }),
  updateDoctor:      (id, data)   => api.put(`/doctors/${id}`, data),
  updateSchedule:    (id, data)   => api.patch(`/doctors/${id}/schedule`, data),
  toggleAvailability:(id)         => api.patch(`/doctors/${id}/availability`),
  toggleBreak:       (id)         => api.patch(`/doctors/${id}/break`),
  getDoctorStats:    (id)         => api.get(`/doctors/${id}/stats`),
};
