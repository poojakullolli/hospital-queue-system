import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import { QueueProvider } from './context/QueueContext';
import { NotificationProvider } from './context/NotificationContext';

import ProtectedRoute from './components/layout/ProtectedRoute';

// Auth Pages
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';

// Patient Pages
import PatientDashboard from './pages/patient/Dashboard';
import BookAppointment  from './pages/patient/BookAppointment';
import MyAppointments   from './pages/patient/MyAppointments';
import QueueTracker     from './pages/patient/QueueTracker';
import Notifications    from './pages/patient/Notifications';

// Doctor Pages
import DoctorDashboard from './pages/doctor/Dashboard';
import QueueManager    from './pages/doctor/QueueManager';
import Schedule        from './pages/doctor/Schedule';
import DoctorAnalytics from './pages/doctor/Analytics';

// Admin Pages
import AdminDashboard from './pages/admin/Dashboard';
import UserManagement from './pages/admin/UserManagement';
import Departments from './pages/admin/Departments';
import Analytics from './pages/admin/Analytics';

// Public Pages
import Landing from './pages/Landing';
import NotFound from './pages/NotFound';
import Unauthorized from './pages/Unauthorized';

// Queue Board (public, for waiting room TVs)
import QueueBoard from './components/queue/QueueBoard';

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <SocketProvider>
          <QueueProvider>
            <NotificationProvider>
            <Toaster
              position="top-right"
              toastOptions={{
                className: '!bg-slate-800 !text-white !border !border-slate-700',
                duration: 4000,
                success: { iconTheme: { primary: '#10b981', secondary: '#fff' } },
                error: { iconTheme: { primary: '#f43f5e', secondary: '#fff' } },
              }}
            />
            <Routes>
              {/* Public Routes */}
              <Route path="/" element={<Landing />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/queue-board/:doctorId" element={<QueueBoard />} />
              <Route path="/unauthorized" element={<Unauthorized />} />

              {/* Patient Routes */}
              <Route element={<ProtectedRoute allowedRoles={['patient']} />}>
                <Route path="/patient/dashboard"      element={<PatientDashboard />} />
                <Route path="/patient/book"           element={<BookAppointment />} />
                <Route path="/patient/appointments"   element={<MyAppointments />} />
                <Route path="/patient/queue"          element={<QueueTracker />} />
                <Route path="/patient/notifications"  element={<Notifications />} />
              </Route>

              {/* Doctor Routes */}
              <Route element={<ProtectedRoute allowedRoles={['doctor']} />}>
                <Route path="/doctor/dashboard"  element={<DoctorDashboard />} />
                <Route path="/doctor/queue"      element={<QueueManager />} />
                <Route path="/doctor/schedule"   element={<Schedule />} />
                <Route path="/doctor/analytics"  element={<DoctorAnalytics />} />
              </Route>

              {/* Admin Routes */}
              <Route element={<ProtectedRoute allowedRoles={['admin']} />}>
                <Route path="/admin/dashboard" element={<AdminDashboard />} />
                <Route path="/admin/users" element={<UserManagement />} />
                <Route path="/admin/departments" element={<Departments />} />
                <Route path="/admin/analytics" element={<Analytics />} />
              </Route>

              {/* Catch-all */}
              <Route path="*" element={<NotFound />} />
            </Routes>
            </NotificationProvider>
          </QueueProvider>
        </SocketProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
