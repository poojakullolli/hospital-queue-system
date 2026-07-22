import React, { useState } from 'react';
import Navbar from './Navbar';
import Sidebar from './Sidebar';
import { useAuth } from '../../hooks/useAuth';

const PageWrapper = ({ children }) => {
  const { user } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200">
      <Navbar onMenuClick={() => setSidebarOpen(!sidebarOpen)} />
      <div className="flex pt-16">
        {user && <Sidebar role={user.role} isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />}
        <main className={`flex-1 min-w-0 transition-all duration-300 ${user ? 'md:ml-64' : ''} p-4 md:p-8`}>
          <div className="max-w-7xl mx-auto animate-fade-in">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};

export default PageWrapper;
