import React from 'react';
import { Link } from 'react-router-dom';
import { Calendar, Activity, Bell, ShieldCheck, ArrowRight } from 'lucide-react';
import Footer from '../components/layout/Footer';

const Landing = () => {
  return (
    <div className="min-h-screen bg-slate-950 flex flex-col text-slate-200 selection:bg-cyan-500/30">
      <nav className="flex justify-between items-center px-8 py-6 max-w-7xl mx-auto w-full">
        <div className="flex items-center gap-2 text-2xl font-bold text-white">
          <Activity className="w-8 h-8 text-cyan-500" /> MediQueue
        </div>
        <div className="flex gap-4">
          <Link to="/login" className="px-5 py-2.5 text-sm font-medium text-slate-300 hover:text-white transition-colors">Log In</Link>
          <Link to="/register" className="px-5 py-2.5 text-sm font-medium bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg transition-colors shadow-lg shadow-cyan-500/20">Get Started</Link>
        </div>
      </nav>

      <main className="flex-1 flex flex-col items-center text-center mt-20 px-4">
        <h1 className="text-5xl md:text-7xl font-black text-white tracking-tight max-w-4xl mb-6">
          Smart Healthcare, <span className="bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 to-indigo-400">Zero Wait.</span>
        </h1>
        <p className="text-lg md:text-xl text-slate-400 max-w-2xl mb-10">
          Book appointments instantly, track your live queue position, and arrive just in time. The modern way to visit your doctor.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 mb-24">
          <Link to="/register" className="px-8 py-4 text-base font-semibold bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl transition-all shadow-xl shadow-cyan-500/30 flex items-center justify-center gap-2">
            Book Now <ArrowRight className="w-5 h-5" />
          </Link>
        </div>

        <div className="grid md:grid-cols-4 gap-8 max-w-7xl mx-auto w-full px-4 pb-24">
          {[
            { icon: Calendar, title: 'Online Booking', desc: 'Schedule visits 24/7 with your preferred doctors.' },
            { icon: Activity, title: 'Live Queue', desc: 'Watch the queue move in real-time from your phone.' },
            { icon: Bell, title: 'Smart Alerts', desc: 'Get notified when it is your turn to head in.' },
            { icon: ShieldCheck, title: 'Secure Records', desc: 'Your medical history kept private and secure.' },
          ].map((f, i) => (
            <div key={i} className="bg-slate-900 border border-slate-800 p-6 rounded-2xl text-left hover:-translate-y-1 transition-transform">
              <f.icon className="w-10 h-10 text-cyan-400 mb-4" />
              <h3 className="text-xl font-bold text-white mb-2">{f.title}</h3>
              <p className="text-slate-400">{f.desc}</p>
            </div>
          ))}
        </div>
      </main>
      
      <Footer />
    </div>
  );
};

export default Landing;
