/**
 * Sidebar — role-based navigation panel.
 * Renders fixed on desktop, slide-over on mobile.
 * Shows notification badge on the Notifications link for patients.
 */
import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  CalendarPlus,
  ListOrdered,
  Activity,
  Users,
  CalendarDays,
  Building,
  BarChart3,
  Bell,
} from 'lucide-react';

import { useNotifications } from '../../context/NotificationContext';
import { useAuth }           from '../../hooks/useAuth';

const Sidebar = ({ role, isOpen, onClose }) => {
  const { unreadCount } = useNotifications() || {};
  const { isAuthenticated } = useAuth();

  const links = {
    patient: [
      { name: 'Dashboard',       path: '/patient/dashboard',     icon: LayoutDashboard },
      { name: 'Book Appointment',path: '/patient/book',          icon: CalendarPlus    },
      { name: 'My Appointments', path: '/patient/appointments',  icon: ListOrdered     },
      { name: 'Queue Tracker',   path: '/patient/queue',         icon: Activity        },
      { name: 'Notifications',   path: '/patient/notifications', icon: Bell, badge: unreadCount },
    ],
    doctor: [
      { name: 'Dashboard',   path: '/doctor/dashboard', icon: LayoutDashboard },
      { name: 'Queue Manager', path: '/doctor/queue',   icon: Activity        },
      { name: 'My Schedule', path: '/doctor/schedule',  icon: CalendarDays    },
      { name: 'Patients',    path: '/doctor/patients',  icon: Users           },
    ],
    admin: [
      { name: 'Dashboard',   path: '/admin/dashboard',   icon: LayoutDashboard },
      { name: 'Users',       path: '/admin/users',       icon: Users           },
      { name: 'Departments', path: '/admin/departments', icon: Building        },
      { name: 'Analytics',   path: '/admin/analytics',   icon: BarChart3       },
    ],
  };

  const currentLinks = links[role] || [];

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/80 backdrop-blur-sm md:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar panel */}
      <aside
        className={`fixed top-16 left-0 z-40 w-64 h-[calc(100vh-4rem)] bg-slate-900 border-r border-slate-800 transition-transform duration-300 md:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="h-full px-3 py-6 overflow-y-auto">
          <ul className="space-y-1.5">
            {currentLinks.map((link) => {
              const Icon = link.icon;
              return (
                <li key={link.path}>
                  <NavLink
                    to={link.path}
                    onClick={() => { if (window.innerWidth < 768) onClose(); }}
                    className={({ isActive }) =>
                      `flex items-center p-3 text-base font-medium rounded-lg transition-colors ${
                        isActive
                          ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20'
                          : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                      }`
                    }
                  >
                    <Icon className="w-5 h-5 mr-3 shrink-0" />
                    <span className="flex-1">{link.name}</span>
                    {/* Unread badge */}
                    {link.badge > 0 && (
                      <span className="bg-rose-500 text-white text-xs font-bold px-1.5 py-0.5 rounded-full min-w-[20px] text-center">
                        {link.badge > 99 ? '99+' : link.badge}
                      </span>
                    )}
                  </NavLink>
                </li>
              );
            })}
          </ul>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
