import api from './axios';

export const appointmentApi = {
  bookAppointment: (data) => api.post('/appointments', data),
  getMyAppointments: (params) => api.get('/appointments/my', { params }),
  getAppointmentById: (id) => api.get(`/appointments/${id}`),
  updateStatus: (id, status) => api.patch(`/appointments/${id}/status`, { status }),
  cancelAppointment: (id, reason) => api.patch(`/appointments/${id}/cancel`, { reason }),
  getDoctorAppointments: (params) => api.get('/appointments/doctor', { params }),
};
