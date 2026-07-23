/**
 * Admin API — API communication for Admin Dashboard operations.
 */
import api from './axios';

export const adminApi = {
  getDashboardStats: () => api.get('/admin/stats'),
  getAllUsers: (params) => api.get('/admin/users', { params }),
  updateUser: (id, data) => api.put(`/admin/users/${id}`, data),
  deleteUser: (id) => api.delete(`/admin/users/${id}`),
  getDepartments: () => api.get('/admin/departments'),
  createDepartment: (data) => api.post('/admin/departments', data),
  updateDepartment: (id, data) => api.put(`/admin/departments/${id}`, data),
  deleteDepartment: (id) => api.delete(`/admin/departments/${id}`),
  getAnalytics: (params) => api.get('/admin/analytics', { params }),
  
  // Extended admin methods
  getAllDoctors: (params) => api.get('/doctors', { params }),
  updateDoctor: (id, data) => api.put(`/doctors/${id}`, data),
  getAllAppointments: (params) => api.get('/appointments/my', { params }),
};
