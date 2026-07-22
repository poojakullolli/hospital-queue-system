import api from './axios';

export const doctorApi = {
  getAllDoctors: (params) => api.get('/doctors', { params }),
  getDoctorById: (id) => api.get(`/doctors/${id}`),
  getAvailableSlots: (doctorId, date) => api.get(`/doctors/${doctorId}/slots`, { params: { date } }),
  updateDoctor: (id, data) => api.put(`/doctors/${id}`, data),
  toggleAvailability: (id) => api.patch(`/doctors/${id}/availability`),
  toggleBreak: (id) => api.patch(`/doctors/${id}/break`),
  getDoctorStats: (id) => api.get(`/doctors/${id}/stats`),
};
