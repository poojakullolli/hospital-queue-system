import React from 'react';
import { Hospital } from 'lucide-react';
import { Link } from 'react-router-dom';

const Footer = () => {
  return (
    <footer className="bg-slate-950 border-t border-slate-800 py-8 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row justify-between items-center">
        <div className="flex items-center gap-2 mb-4 md:mb-0">
          <Hospital className="w-6 h-6 text-cyan-500" />
          <span className="text-lg font-bold text-white tracking-tight">MediQueue</span>
        </div>
        <div className="flex gap-6 text-sm text-slate-400">
          <Link to="#" className="hover:text-cyan-400 transition-colors">Privacy Policy</Link>
          <Link to="#" className="hover:text-cyan-400 transition-colors">Terms of Service</Link>
          <Link to="#" className="hover:text-cyan-400 transition-colors">Contact Support</Link>
        </div>
        <div className="text-slate-500 text-sm mt-4 md:mt-0">
          &copy; {new Date().getFullYear()} MediQueue. All rights reserved.
        </div>
      </div>
    </footer>
  );
};

export default Footer;
