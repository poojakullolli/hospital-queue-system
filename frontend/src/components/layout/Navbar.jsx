import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { Hospital, User, LogOut, Bell, Menu } from 'lucide-react';
import Avatar from '../common/Avatar';

const Navbar = ({ onMenuClick }) => {
  const { user, logout } = useAuth();

  return (
    <nav className="sticky top-0 z-40 w-full bg-slate-900/80 backdrop-blur-lg border-b border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center gap-2">
            <button className="p-2 -ml-2 text-slate-400 hover:text-white md:hidden" onClick={onMenuClick}>
              <Menu className="w-6 h-6" />
            </button>
            <NavLink to="/" className="flex items-center gap-2">
              <Hospital className="w-8 h-8 text-cyan-500" />
              <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 to-indigo-400 hidden sm:block">
                MediQueue
              </span>
            </NavLink>
          </div>

          <div className="flex items-center gap-4">
            <button className="p-2 text-slate-400 hover:text-white relative">
              <Bell className="w-5 h-5" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-rose-500 rounded-full"></span>
            </button>
            
            <div className="flex items-center gap-3 pl-4 border-l border-slate-700">
              <div className="hidden sm:block text-right">
                <p className="text-sm font-medium text-white">{user?.fullName || 'User'}</p>
                <p className="text-xs text-slate-400 capitalize">{user?.role || 'Guest'}</p>
              </div>
              <Avatar name={user?.fullName} size="sm" />
              <button onClick={logout} className="p-2 text-slate-400 hover:text-rose-500 transition-colors" title="Logout">
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
