/**
 * Doctor Dashboard — overview page with live stats, today's patient list,
 * and a weekly analytics chart.
 *
 * Sections:
 *   ─ Greeting + availability/break toggles
 *   ─ Live stat strip (waiting / in-progress / completed / total today)
 *   ─ Today's Patients table with status badges
 *   ─ Weekly Appointments bar chart (recharts)
 */
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate }    from 'react-router-dom';
import toast              from 'react-hot-toast';
import {
  Users, Clock, CheckCircle, Activity, RefreshCw,
  Coffee, Wifi, WifiOff, ChevronRight, Calendar,
  TrendingUp, UserCheck,
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, LineChart, Line, Legend,
} from 'recharts';

import { useAuth }   from '../../hooks/useAuth';
import { useSocket } from '../../hooks/useSocket';

import { doctorApi }      from '../../api/doctorApi';
import { appointmentApi } from '../../api/appointmentApi';
import { queueApi }       from '../../api/queueApi';

import StatCard from '../../components/common/StatCard';
import Button   from '../../components/common/Button';
import Spinner  from '../../components/common/Spinner';
import Card     from '../../components/common/Card';

import {
  formatDate, formatCurrency, getStatusColor, getStatusLabel, getInitials,
} from '../../utils/helpers';

// ─── Custom tooltip for recharts ──────────────────────────────────────────────
const ChartTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-slate-800 border border-slate-700 rounded-xl p-3 shadow-xl">
      <p className="text-xs text-slate-400 mb-1">{label}</p>
      {payload.map((p) => (
        <p key={p.name} className="text-sm font-semibold" style={{ color: p.color }}>
          {p.name}: {p.value}
        </p>
      ))}
    </div>
  );
};

// ─── Patient row in today's list ──────────────────────────────────────────────
const PatientRow = ({ apt, index, onView }) => (
  <div
    className="flex items-center gap-4 p-4 rounded-xl border border-slate-800 hover:border-slate-700 bg-slate-900/50 hover:bg-slate-900 transition-all duration-200 cursor-pointer group"
    onClick={() => onView(apt)}
  >
    {/* Queue # */}
    <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center shrink-0">
      <span className="text-cyan-400 text-sm font-bold">#{apt.queueNumber || index + 1}</span>
    </div>

    {/* Avatar + name */}
    <div className="flex items-center gap-3 flex-1 min-w-0">
      <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-500/30 to-cyan-500/20 border border-slate-700 flex items-center justify-center text-xs font-bold text-white shrink-0">
        {getInitials(apt.patientId?.name || 'P')}
      </div>
      <div className="min-w-0">
        <p className="text-sm font-semibold text-white truncate">
          {apt.patientId?.name || 'Patient'}
        </p>
        <p className="text-xs text-slate-500">
          {apt.timeSlot?.start} – {apt.timeSlot?.end}
        </p>
      </div>
    </div>

    {/* Status */}
    <span className={`shrink-0 text-xs font-semibold px-2.5 py-1 rounded-full border ${getStatusColor(apt.status)}`}>
      {getStatusLabel(apt.status)}
    </span>

    {/* Arrow */}
    <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-slate-400 transition-colors shrink-0" />
  </div>
);

// ─── Main ──────────────────────────────────────────────────────────────────────
const DoctorDashboard = () => {
  const { user }   = useAuth();
  const { socket } = useSocket();
  const navigate   = useNavigate();

  const [doctorProfile, setDoctorProfile]   = useState(null);
  const [appointments, setAppointments]     = useState([]);
  const [queueStatus, setQueueStatus]       = useState(null);
  const [weeklyData, setWeeklyData]         = useState([]);
  const [loading, setLoading]               = useState(true);
  const [refreshing, setRefreshing]         = useState(false);
  const [togglingBreak, setTogglingBreak]   = useState(false);

  // ── Stats derived from today's appointments ──
  const todayApts = appointments.filter((a) => {
    const aptDate = new Date(a.date).toDateString();
    return aptDate === new Date().toDateString();
  });

  const stats = {
    waiting:   todayApts.filter((a) => ['pending', 'confirmed'].includes(a.status)).length,
    inProgress:todayApts.filter((a) => a.status === 'in-progress').length,
    completed: todayApts.filter((a) => a.status === 'completed').length,
    total:     todayApts.length,
  };

  // ── Load doctor profile ──
  const loadProfile = useCallback(async () => {
    try {
      const { data } = await doctorApi.getDoctorProfile();
      setDoctorProfile(data?.data?.doctor || data?.doctor || null);
    } catch {
      // Profile may not exist yet — graceful fallback
    }
  }, []);

  // ── Load today's appointments ──
  const loadAppointments = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);
    try {
      const today = new Date().toISOString().split('T')[0];
      const { data } = await appointmentApi.getDoctorAppointments({ date: today, limit: 100 });
      const apts = data?.data?.appointments || data?.appointments || [];
      setAppointments(apts);

      // Build weekly chart data from appointments
      buildWeeklyData(apts);
    } catch (err) {
      console.error('Failed to load appointments:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // ── Build last-7-days chart data ──
  const buildWeeklyData = (apts) => {
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const d    = new Date();
      d.setDate(d.getDate() - i);
      const key  = d.toDateString();
      const label= d.toLocaleDateString('en-IN', { weekday: 'short' });
      const dayApts = apts.filter((a) => new Date(a.date).toDateString() === key);
      days.push({
        name:      label,
        Total:     dayApts.length,
        Completed: dayApts.filter((a) => a.status === 'completed').length,
        Cancelled: dayApts.filter((a) => a.status === 'cancelled').length,
      });
    }
    setWeeklyData(days);
  };

  // ── Load queue status ──
  const loadQueue = useCallback(async () => {
    if (!doctorProfile?._id) return;
    try {
      const { data } = await queueApi.getQueue(doctorProfile._id);
      setQueueStatus(data?.data?.queue || data?.queue || null);
    } catch {
      // Queue may not be created yet
    }
  }, [doctorProfile]);

  useEffect(() => {
    loadProfile();
    loadAppointments();
  }, [loadProfile, loadAppointments]);

  useEffect(() => {
    if (doctorProfile?._id) loadQueue();
  }, [doctorProfile, loadQueue]);

  // ── Real-time socket: refresh when queue updates ──
  useEffect(() => {
    if (!socket || !doctorProfile?._id) return;
    const handler = () => {
      loadAppointments(true);
      loadQueue();
    };
    socket.on('queue-updated', handler);
    return () => socket.off('queue-updated', handler);
  }, [socket, doctorProfile, loadAppointments, loadQueue]);

  // ── Toggle break ──
  const handleToggleBreak = async () => {
    if (!doctorProfile?._id) return;
    setTogglingBreak(true);
    try {
      const { data } = await doctorApi.toggleBreak(doctorProfile._id);
      const updated = data?.data?.doctor || data?.doctor;
      if (updated) setDoctorProfile(updated);
      toast.success(updated?.isOnBreak ? 'Break started.' : 'Break ended. Back to queue!');
      loadQueue();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update status.');
    } finally {
      setTogglingBreak(false);
    }
  };

  if (loading) return <Spinner size="lg" className="mt-24" />;

  const isOnBreak = doctorProfile?.isOnBreak;

  return (
    <div className="space-y-8 animate-fade-in">

      {/* ── Header ── */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white">
            Good {new Date().getHours() < 12 ? 'Morning' : new Date().getHours() < 17 ? 'Afternoon' : 'Evening'},{' '}
            <span className="text-gradient">Dr. {user?.name?.split(' ')[0] || 'Doctor'}</span>!
          </h1>
          <div className="flex items-center gap-3 mt-2">
            <span className="text-slate-400 text-sm">
              {new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </span>
            {/* Availability badge */}
            <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full border ${
              isOnBreak
                ? 'bg-amber-500/10 border-amber-500/30 text-amber-400'
                : doctorProfile?.isAvailable !== false
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                : 'bg-slate-700/30 border-slate-700 text-slate-400'
            }`}>
              <span className={`w-1.5 h-1.5 rounded-full ${isOnBreak ? 'bg-amber-400' : 'bg-emerald-400 animate-pulse'}`} />
              {isOnBreak ? 'On Break' : 'Available'}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Refresh */}
          <button
            onClick={() => { loadAppointments(true); loadQueue(); }}
            disabled={refreshing}
            className="p-2.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl transition-colors"
          >
            <RefreshCw className={`w-5 h-5 text-slate-400 ${refreshing ? 'animate-spin' : ''}`} />
          </button>

          {/* Break toggle */}
          <Button
            variant={isOnBreak ? 'primary' : 'outline'}
            isLoading={togglingBreak}
            onClick={handleToggleBreak}
          >
            <Coffee className="w-4 h-4 mr-2" />
            {isOnBreak ? 'End Break' : 'Take a Break'}
          </Button>

          {/* Go to Queue Manager */}
          <Button onClick={() => navigate('/doctor/queue')}>
            <Activity className="w-4 h-4 mr-2" />
            Manage Queue
          </Button>
        </div>
      </div>

      {/* ── Stat Strip ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Waiting"     value={stats.waiting}    icon={Clock}       color="amber"   />
        <StatCard title="In Progress" value={stats.inProgress} icon={Activity}    color="cyan"    />
        <StatCard title="Completed"   value={stats.completed}  icon={CheckCircle} color="emerald" />
        <StatCard title="Total Today" value={stats.total}      icon={Users}       color="indigo"  />
      </div>

      {/* ── Main grid ── */}
      <div className="grid lg:grid-cols-3 gap-6">

        {/* ── Today's Patient List ── */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold text-white flex items-center gap-2">
              <UserCheck className="w-5 h-5 text-cyan-400" />
              Today's Patients
              <span className="bg-slate-800 text-slate-400 text-xs px-2 py-0.5 rounded-full">{todayApts.length}</span>
            </h2>
            <Button variant="ghost" size="sm" onClick={() => navigate('/doctor/queue')}>
              Queue Manager <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>

          {todayApts.length === 0 ? (
            <div className="text-center py-14 bg-slate-900/40 border border-slate-800 rounded-2xl">
              <Calendar className="w-12 h-12 text-slate-700 mx-auto mb-3" />
              <p className="text-slate-500 font-medium">No patients scheduled for today</p>
            </div>
          ) : (
            <div className="space-y-2">
              {todayApts
                .sort((a, b) => (a.queueNumber || 0) - (b.queueNumber || 0))
                .map((apt, i) => (
                  <PatientRow
                    key={apt._id}
                    apt={apt}
                    index={i}
                    onView={() => navigate('/doctor/queue')}
                  />
                ))}
            </div>
          )}
        </div>

        {/* ── Queue Status Panel ── */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <Activity className="w-5 h-5 text-cyan-400" />
            Queue Status
          </h2>

          <Card className="p-5 space-y-4">
            {/* Status */}
            <div className="flex items-center justify-between">
              <span className="text-slate-400 text-sm">Queue Status</span>
              <span className={`text-xs font-bold px-2.5 py-1 rounded-full border ${
                queueStatus?.status === 'active'  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' :
                queueStatus?.status === 'paused'  ? 'bg-amber-500/10 border-amber-500/30 text-amber-400' :
                'bg-slate-700/30 border-slate-700 text-slate-400'
              }`}>
                {queueStatus?.status ? queueStatus.status.toUpperCase() : 'NOT STARTED'}
              </span>
            </div>

            {/* Current number */}
            <div className="text-center py-4 bg-slate-900 rounded-xl border border-slate-800">
              <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Currently Serving</p>
              <p className="text-5xl font-black text-cyan-400">
                {queueStatus?.currentNumber ? `#${queueStatus.currentNumber}` : '—'}
              </p>
            </div>

            {/* Waiting count */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-slate-900 rounded-xl p-3 border border-slate-800 text-center">
                <p className="text-2xl font-bold text-white">{queueStatus?.totalInQueue ?? '—'}</p>
                <p className="text-xs text-slate-500 mt-0.5">In Queue</p>
              </div>
              <div className="bg-slate-900 rounded-xl p-3 border border-slate-800 text-center">
                <p className="text-2xl font-bold text-white">{queueStatus?.averageConsultTime ?? '—'}</p>
                <p className="text-xs text-slate-500 mt-0.5">Avg Min/Patient</p>
              </div>
            </div>

            {/* Queue Board link */}
            {doctorProfile?._id && (
              <button
                onClick={() => window.open(`/queue-board/${doctorProfile._id}`, '_blank')}
                className="w-full text-xs text-cyan-400 hover:text-cyan-300 flex items-center justify-center gap-1 py-2 bg-cyan-500/5 border border-cyan-500/20 rounded-lg transition-colors"
              >
                Open Queue Board (TV Mode) <ChevronRight className="w-3 h-3" />
              </button>
            )}
          </Card>
        </div>
      </div>

      {/* ── Weekly Analytics Chart ── */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-cyan-400" />
            Last 7 Days — Appointments
          </h2>
          <Button variant="ghost" size="sm" onClick={() => navigate('/doctor/schedule')}>
            View Schedule <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        </div>

        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={weeklyData} barGap={4}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
            <XAxis dataKey="name" stroke="#475569" tick={{ fontSize: 12 }} />
            <YAxis stroke="#475569" tick={{ fontSize: 12 }} allowDecimals={false} />
            <Tooltip content={<ChartTooltip />} />
            <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '16px' }} />
            <Bar dataKey="Total"     fill="#06b6d4" radius={[4, 4, 0, 0]} maxBarSize={32} />
            <Bar dataKey="Completed" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={32} />
            <Bar dataKey="Cancelled" fill="#f43f5e" radius={[4, 4, 0, 0]} maxBarSize={32} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default DoctorDashboard;
