/**
 * QueueTracker — live queue status for the patient's active appointment.
 *
 * Features:
 *   - Automatically finds today's active appointment from the patient's list
 *   - Subscribes to real-time Socket.IO queue updates via QueueContext
 *   - Shows queue position, estimated wait, and total queue size
 *   - Animated progress bar countdown
 *   - If patient's turn arrives → full-screen call alert
 *   - Queue Board link for waiting room view
 */
import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate }                               from 'react-router-dom';
import toast                                         from 'react-hot-toast';
import {
  Activity, Clock, Users, RefreshCw, ArrowRight,
  Bell, CheckCircle, Calendar, Tv, AlertCircle,
} from 'lucide-react';

import { appointmentApi } from '../../api/appointmentApi';
import { useQueue }       from '../../hooks/useQueue';

import QueueCard      from '../../components/queue/QueueCard';
import WaitTimeDisplay from '../../components/queue/WaitTimeDisplay';
import Button         from '../../components/common/Button';
import Spinner        from '../../components/common/Spinner';

import { formatDate, getStatusColor, getStatusLabel } from '../../utils/helpers';

// ─── Called-to-proceed Banner ──────────────────────────────────────────────────
const CalledBanner = ({ apt }) => (
  <div className="relative overflow-hidden rounded-2xl border border-emerald-500/50 bg-emerald-950/60 p-8 text-center animate-pulse-glow">
    {/* Glow rings */}
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
      <div className="w-72 h-72 rounded-full border border-emerald-500/10 animate-ping" />
    </div>
    <div className="relative z-10 space-y-4">
      <div className="w-20 h-20 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center mx-auto">
        <Bell className="w-10 h-10 text-emerald-400" />
      </div>
      <h2 className="text-3xl font-bold text-emerald-400">It's Your Turn!</h2>
      <p className="text-slate-300">Please proceed to the doctor's cabin now.</p>
      {apt?.queueNumber && (
        <div className="inline-block bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 px-6 py-2 rounded-full text-lg font-bold">
          Token #{apt.queueNumber}
        </div>
      )}
    </div>
  </div>
);

// ─── Stat tile ────────────────────────────────────────────────────────────────
const QueueStat = ({ label, value, icon: Icon, color }) => {
  const colours = {
    cyan:    'text-cyan-400 bg-cyan-500/10 border-cyan-500/20',
    amber:   'text-amber-400 bg-amber-500/10 border-amber-500/20',
    emerald: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
  };
  return (
    <div className={`flex flex-col items-center justify-center gap-2 p-5 rounded-xl border ${colours[color]}`}>
      <Icon className="w-6 h-6" />
      <p className="text-3xl font-bold text-white">{value}</p>
      <p className="text-xs text-slate-500 text-center">{label}</p>
    </div>
  );
};

// ─── Main ──────────────────────────────────────────────────────────────────────
const QueueTracker = () => {
  const navigate = useNavigate();
  const { queueData, position, estimatedWait, subscribeToQueue, unsubscribeFromQueue } = useQueue();

  const [appointments, setAppointments] = useState([]);
  const [activeApt, setActiveApt]       = useState(null);
  const [loading, setLoading]           = useState(true);
  const [refreshing, setRefreshing]     = useState(false);

  // Determine if it's the patient's turn
  const isCalled = position === 1 || queueData?.currentServingId === activeApt?._id;

  // ── Load appointments and find today's active one ──
  const loadAndSubscribe = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);
    try {
      const { data } = await appointmentApi.getMyAppointments({ limit: 50 });
      const apts     = data?.data?.appointments || data?.appointments || [];
      setAppointments(apts);

      // Find the most relevant appointment to track
      const today = new Date().toDateString();
      const todayActive = apts.find((a) => {
        const d = new Date(a.date).toDateString();
        return d === today && ['pending', 'confirmed', 'in-progress'].includes(a.status);
      });

      // Fallback: most recent upcoming
      const nextApt = apts
        .filter((a) => ['pending', 'confirmed'].includes(a.status) && new Date(a.date) >= new Date())
        .sort((a, b) => new Date(a.date) - new Date(b.date))[0];

      const apt = todayActive || nextApt || null;
      setActiveApt(apt);

      if (apt) {
        const doctorId = apt.doctorId?._id || apt.doctorId;
        await subscribeToQueue(doctorId, apt._id);
      }
    } catch (err) {
      console.error('QueueTracker load error:', err);
      toast.error('Failed to load queue information.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [subscribeToQueue]);

  useEffect(() => {
    loadAndSubscribe();
    return () => unsubscribeFromQueue();
  }, [loadAndSubscribe, unsubscribeFromQueue]);

  if (loading) return <Spinner size="lg" className="mt-24" />;

  // No appointment to track
  if (!activeApt) {
    return (
      <div className="max-w-2xl mx-auto space-y-8 animate-fade-in">
        <h1 className="text-2xl font-bold text-white">Live Queue Tracker</h1>
        <div className="text-center py-16 bg-slate-900/50 border border-slate-800 rounded-2xl space-y-4">
          <Activity className="w-14 h-14 text-slate-700 mx-auto" />
          <h2 className="text-xl font-semibold text-slate-400">No Active Appointment</h2>
          <p className="text-slate-500 text-sm max-w-xs mx-auto">
            You need a confirmed appointment for today to see your live queue position.
          </p>
          <div className="flex gap-3 justify-center">
            <Button onClick={() => navigate('/patient/book')}>
              <Calendar className="w-4 h-4 mr-2" />
              Book Appointment
            </Button>
            <Button variant="outline" onClick={() => navigate('/patient/appointments')}>
              View All Appointments
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const doctorId    = activeApt.doctorId?._id || activeApt.doctorId;
  const totalWaiting = queueData?.totalInQueue ?? queueData?.totalWaiting ?? '—';
  const avgWait      = queueData?.averageConsultTime ?? 15;

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-fade-in">

      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Activity className="w-6 h-6 text-cyan-400" />
            Live Queue Tracker
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Real-time position updates for your appointment on{' '}
            <strong className="text-white">{formatDate(activeApt.date)}</strong>
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* Live indicator */}
          <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/30 rounded-full">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs text-emerald-400 font-medium">Live Updates</span>
          </div>
          {/* Refresh */}
          <button
            onClick={() => loadAndSubscribe(true)}
            disabled={refreshing}
            className="p-2.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl transition-colors"
          >
            <RefreshCw className={`w-5 h-5 text-slate-400 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* ── Called Banner ── */}
      {isCalled && <CalledBanner apt={activeApt} />}

      {/* ── Stats row ── */}
      <div className="grid grid-cols-3 gap-4">
        <QueueStat
          label="Your Position"
          value={position !== null ? `#${position}` : '—'}
          icon={Users}
          color="cyan"
        />
        <QueueStat
          label="Est. Wait (min)"
          value={estimatedWait !== null ? estimatedWait : '—'}
          icon={Clock}
          color="amber"
        />
        <QueueStat
          label="Ahead of You"
          value={position !== null ? Math.max(0, position - 1) : '—'}
          icon={Activity}
          color="emerald"
        />
      </div>

      {/* ── Main grid ── */}
      <div className="grid md:grid-cols-2 gap-6">

        {/* Your Appointment Card */}
        <div>
          <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3">
            Your Details
          </h3>
          <QueueCard
            appointment={activeApt}
            position={position ?? '—'}
            estimatedWait={estimatedWait ?? 0}
            isCurrentlyCalled={isCalled}
          />
        </div>

        {/* Wait Time Display */}
        <div>
          <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3">
            Queue Overview
          </h3>
          <WaitTimeDisplay
            minutes={estimatedWait ?? 0}
            position={position ?? 0}
            totalInQueue={totalWaiting}
          />
        </div>
      </div>

      {/* ── Doctor info strip ── */}
      {activeApt.doctorId && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-cyan-500/30 to-indigo-500/20 border border-slate-700 flex items-center justify-center text-xl font-bold text-white shrink-0">
            {(activeApt.doctorId.userId?.name || 'D')[0]}
          </div>
          <div className="flex-1">
            <p className="text-base font-semibold text-white">
              Dr. {activeApt.doctorId.userId?.name || 'Unknown Doctor'}
            </p>
            <p className="text-sm text-slate-400">{activeApt.doctorId.specialty || '—'}</p>
          </div>
          <div className={`px-3 py-1 rounded-full text-xs font-semibold border ${
            queueData?.status === 'active'
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
              : queueData?.status === 'paused'
              ? 'bg-amber-500/10 border-amber-500/30 text-amber-400'
              : 'bg-slate-700/30 border-slate-700 text-slate-400'
          }`}>
            Queue: {queueData?.status || 'Loading…'}
          </div>
        </div>
      )}

      {/* ── Queue Board link ── */}
      {doctorId && (
        <div className="text-center">
          <Button
            variant="ghost"
            onClick={() => window.open(`/queue-board/${doctorId}`, '_blank')}
          >
            <Tv className="w-4 h-4 mr-2" />
            Open Queue Board (TV Mode)
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      )}
    </div>
  );
};

export default QueueTracker;
