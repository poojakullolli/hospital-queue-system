import React from 'react';
import { Link } from 'react-router-dom';
import { Activity, ShieldCheck, UserCheck, Stethoscope, User, ArrowRight, Sparkles } from 'lucide-react';
import Footer from '../components/layout/Footer';

const Landing = () => {
  return (
    <div className="min-h-screen bg-slate-950 flex flex-col text-slate-200 selection:bg-cyan-500/30">
      {/* Navigation Bar */}
      <nav className="flex justify-between items-center px-6 md:px-12 py-6 max-w-7xl mx-auto w-full">
        <div className="flex items-center gap-3 text-2xl font-bold text-white tracking-tight">
          <div className="p-2 bg-cyan-500/20 rounded-xl border border-cyan-500/30">
            <Activity className="w-7 h-7 text-cyan-400" />
          </div>
          MediQueue
        </div>
        <div className="flex items-center gap-3">
          <Link
            to="/patient/login"
            className="px-4 py-2 text-sm font-medium text-slate-300 hover:text-white transition-colors"
          >
            Patient Sign In
          </Link>
          <Link
            to="/register"
            className="px-5 py-2.5 text-sm font-semibold bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl transition-all shadow-lg shadow-cyan-500/20"
          >
            Register Patient
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="flex-1 flex flex-col items-center text-center mt-10 md:mt-16 px-4">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-sm font-medium mb-6">
          <Sparkles className="w-4 h-4" /> Next-Gen Smart Hospital Queue Engine
        </div>

        <h1 className="text-4xl md:text-7xl font-black text-white tracking-tight max-w-5xl mb-6 leading-tight">
          Smart Healthcare, <span className="bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 via-teal-300 to-indigo-400">Zero Wait Time.</span>
        </h1>

        <p className="text-base md:text-xl text-slate-400 max-w-2xl mb-12 leading-relaxed">
          Book appointments online, track your live queue position in real-time, and arrive right when your doctor is ready.
        </p>

        {/* ─── 3 Portal Selection Cards ─────────────────────────────────────── */}
        <div className="w-full max-w-6xl mx-auto mb-20">
          <h2 className="text-2xl font-bold text-white mb-8 text-center">Select Your Portal to Access System</h2>
          <div className="grid md:grid-cols-3 gap-6 text-left px-2">
            
            {/* Patient Portal Card */}
            <div className="bg-slate-900/80 border border-slate-800 hover:border-cyan-500/50 p-8 rounded-2xl transition-all hover:shadow-2xl hover:shadow-cyan-500/10 flex flex-col justify-between group">
              <div>
                <div className="w-14 h-14 rounded-2xl bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center text-cyan-400 mb-6 group-hover:scale-110 transition-transform">
                  <User className="w-8 h-8" />
                </div>
                <span className="text-xs font-bold uppercase tracking-wider text-cyan-400 bg-cyan-500/10 px-3 py-1 rounded-full border border-cyan-500/20">Patient Access</span>
                <h3 className="text-2xl font-bold text-white mt-4 mb-2">Patient Portal</h3>
                <p className="text-slate-400 text-sm leading-relaxed mb-6">
                  Book appointments, track live doctor queues, view estimated wait times, and receive turn alerts.
                </p>
              </div>
              <div className="space-y-3 pt-4 border-t border-slate-800">
                <Link
                  to="/patient/login"
                  className="w-full py-3 px-4 bg-cyan-600 hover:bg-cyan-500 text-white font-semibold rounded-xl text-center flex items-center justify-center gap-2 transition-all shadow-md shadow-cyan-600/30"
                >
                  Patient Login <ArrowRight className="w-4 h-4" />
                </Link>
                <Link
                  to="/register"
                  className="w-full py-2.5 px-4 bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium rounded-xl text-center block text-sm transition-all"
                >
                  Create New Account
                </Link>
              </div>
            </div>

            {/* Doctor Portal Card */}
            <div className="bg-slate-900/80 border border-slate-800 hover:border-indigo-500/50 p-8 rounded-2xl transition-all hover:shadow-2xl hover:shadow-indigo-500/10 flex flex-col justify-between group">
              <div>
                <div className="w-14 h-14 rounded-2xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 mb-6 group-hover:scale-110 transition-transform">
                  <Stethoscope className="w-8 h-8" />
                </div>
                <span className="text-xs font-bold uppercase tracking-wider text-indigo-400 bg-indigo-500/10 px-3 py-1 rounded-full border border-indigo-500/20">Medical Staff</span>
                <h3 className="text-2xl font-bold text-white mt-4 mb-2">Doctor Portal</h3>
                <p className="text-slate-400 text-sm leading-relaxed mb-6">
                  Manage today's patient queue, call next patient, start consultations, and set availability.
                </p>
              </div>
              <div className="pt-4 border-t border-slate-800">
                <Link
                  to="/doctor/login"
                  className="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl text-center flex items-center justify-center gap-2 transition-all shadow-md shadow-indigo-600/30"
                >
                  Doctor Login <ArrowRight className="w-4 h-4" />
                </Link>
                <p className="text-xs text-slate-500 text-center mt-3">Accounts created by Hospital Admin</p>
              </div>
            </div>

            {/* Admin Portal Card */}
            <div className="bg-slate-900/80 border border-slate-800 hover:border-purple-500/50 p-8 rounded-2xl transition-all hover:shadow-2xl hover:shadow-purple-500/10 flex flex-col justify-between group">
              <div>
                <div className="w-14 h-14 rounded-2xl bg-purple-500/20 border border-purple-500/30 flex items-center justify-center text-purple-400 mb-6 group-hover:scale-110 transition-transform">
                  <ShieldCheck className="w-8 h-8" />
                </div>
                <span className="text-xs font-bold uppercase tracking-wider text-purple-400 bg-purple-500/10 px-3 py-1 rounded-full border border-purple-500/20">System Admin</span>
                <h3 className="text-2xl font-bold text-white mt-4 mb-2">Admin Portal</h3>
                <p className="text-slate-400 text-sm leading-relaxed mb-6">
                  Full administrative control over doctors, users, departments, queue analytics, and audit logs.
                </p>
              </div>
              <div className="pt-4 border-t border-slate-800">
                <Link
                  to="/admin/login"
                  className="w-full py-3 px-4 bg-purple-600 hover:bg-purple-500 text-white font-semibold rounded-xl text-center flex items-center justify-center gap-2 transition-all shadow-md shadow-purple-600/30"
                >
                  Admin Login <ArrowRight className="w-4 h-4" />
                </Link>
                <p className="text-xs text-slate-500 text-center mt-3">Default: admin@hospital.com / Admin@123</p>
              </div>
            </div>

          </div>
        </div>

        {/* Feature Highlights Grid */}
        <div className="grid md:grid-cols-4 gap-6 max-w-6xl mx-auto w-full px-4 pb-20">
          {[
            { icon: UserCheck, title: 'Instant Booking', desc: 'Select preferred doctor and available time slot.' },
            { icon: Activity, title: 'Live Tracker', desc: 'Real-time Socket.IO live queue updates.' },
            { icon: Stethoscope, title: 'Doctor Console', desc: '1-click queue advancement and consultation status.' },
            { icon: ShieldCheck, title: 'SOC Hardened', desc: 'Encrypted JWT auth, rate-limiting, and SIEM logs.' },
          ].map((f, i) => (
            <div key={i} className="bg-slate-900/50 border border-slate-800/80 p-6 rounded-2xl text-left">
              <f.icon className="w-8 h-8 text-cyan-400 mb-3" />
              <h4 className="text-base font-bold text-white mb-1">{f.title}</h4>
              <p className="text-xs text-slate-400">{f.desc}</p>
            </div>
          ))}
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Landing;
