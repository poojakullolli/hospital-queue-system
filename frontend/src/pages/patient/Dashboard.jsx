/**
 * Patient Dashboard — main overview page.
 *
 * Sections:
 *   - Greeting + Book Appointment CTA
 *   - Stats strip (total / upcoming / completed / cancelled)
 *   - Live Queue Status widget (if patient has a confirmed today's appointment)
 *   - Upcoming Appointments list (next 3)
 *   - Notification Centre panel
 */
import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  Calendar, CheckCircle, XCircle, Clock, ArrowRight, Bell,
  Activity, RefreshCw, ChevronRight, AlertCircle,
} from 'lucide-react';

import { useAuth }          from '../../hooks/useAuth';
import { useNotifications } from '../../context/NotificationContext';
import { useQueue }         from '../../hooks/useQueue';

import { appointmentApi }   from '../../api/appointmentApi';
import { queueApi }         from '../../api/queueApi';

import StatCard    from '../../components/common/StatCard';
import Button      from '../../components/common/Button';
import Spinner     from '../../components/common/Spinner';
import Badge       from '../../components/common/Badge';
import Modal       from '../../components/common/Modal';

import { formatDate, formatCurrency, getStatusColor, getStatusLabel } from '../../utils/helpers';

// ─── Sub-component: Notification list ─────────────────────────────────────────
const NotificationItem = ({ notification, onMarkRead, onDelete }) => {
  const typeIcons = {
    'appointment-booked':    '📅',
    'appointment-called':    '🔔',
    'appointment-completed': '✅',
    'queue-update':          '🏥',
    'system':                'ℹ️',
  };

  return (
    <div
      className={`flex items-start gap-3 p-3 rounded-lg border transition-colors cursor-pointer group ${
        notification.isRead
          ? 'bg-slate-900/50 border-slate-800 opacity-70'
          : 'bg-slate-800/50 border-cyan-500/20 hover:border-cyan-500/40'
      }`}
      onClick={() => !notification.isRead && onMarkRead(notification._id)}
    >
      <span className="text-xl mt-0.5 shrink-0">
        {typeIcons[notification.type] || '📌'}
      </span>
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-medium truncate ${notification.isRead ? 'text-slate-400' : 'text-white'}`}>
          {notification.title}
        </p>
        <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{notification.message}</p>
        <p className="text-xs text-slate-600 mt-1">
          {formatDate(notification.createdAt, 'MMM dd, hh:mm a')}
        </p>
      </div>
      {!notification.isRead && (
        <span className="w-2 h-2 rounded-full bg-cyan-500 mt-2 shrink-0 animate-pulse" />
      )}
      <button
        onClick={(e) => { e.stopPropagation(); onDelete(notification._id); }}
        className="shrink-0 opacity-0 group-hover:opacity-100 text-slate-600 hover:text-rose-400 transition-opacity text-xs px-1"
        title="Delete"
      >
        ✕
      </button>
    </div>
  );
};

// ─── Sub-component: Appointment row ───────────────────────────────────────────
const AppointmentRow = ({ apt, onCancel, onReschedule }) => (
  <div className="flex flex-col sm:flex-row sm:items-center gap-3 p-4 bg-slate-900 border border-slate-800 rounded-xl hover:border-slate-700 transition-colors">
    {/* Date block */}
    <div className="flex items-center gap-3 sm:w-36 shrink-0">
      <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex flex-col items-center justify-center">
        <span className="text-cyan-400 text-xs font-bold leading-none">
          {formatDate(apt.date, 'MMM')}
        </span>
        <span className="text-white text-sm font-bold leading-none">
          {formatDate(apt.date, 'dd')}
        </span>
      </div>
      <div>
        <p className="text-xs text-slate-500">{apt.timeSlot?.start} – {apt.timeSlot?.end}</p>
        <p className="text-xs text-slate-600">#{apt.queueNumber || '—'}</p>
      </div>
    </div>

    {/* Doctor info */}
    <div className="flex-1 min-w-0">
      <p className="text-sm font-semibold text-white truncate">
        Dr. {apt.doctorId?.userId?.name || apt.doctorId?.name || 'Unknown'}
      </p>
      <p className="text-xs text-slate-500">{apt.doctorId?.specialty || '—'}</p>
    </div>

    {/* Status badge */}
    <div className="shrink-0">
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(apt.status)}`}>
        {getStatusLabel(apt.status)}
      </span>
    </div>

    {/* Actions */}
    {['pending', 'confirmed'].includes(apt.status) && (
      <div className="flex gap-2 shrink-0">
        <Button size="sm" variant="outline" onClick={() => onReschedule(apt)}>
          Reschedule
        </Button>
        <Button size="sm" variant="danger" onClick={() => onCancel(apt)}>
          Cancel
        </Button>
      </div>
    )}
  </div>
);

// ─── Sub-component: Live Queue Widget ─────────────────────────────────────────
const LiveQueueWidget = ({ appointment, onNavigate }) => {
  const [queueInfo, setQueueInfo] = useState(null);
  const [loading, setLoading]     = useState(true);

  const fetchQueue = useCallback(async () => {
    if (!appointment?.doctorId?._id && !appointment?.doctorId) return;
    const doctorId = appointment.doctorId?._id || appointment.doctorId;
    const aptId    = appointment._id;
    try {
      const { data } = await queueApi.getQueuePosition(doctorId, aptId);
      setQueueInfo(data?.data || data);
    } catch {
      // queue may not be active yet
    } finally {
      setLoading(false);
    }
  }, [appointment]);

  useEffect(() => {
    fetchQueue();
    const iv = setInterval(fetchQueue, 30_000);
    return () => clearInterval(iv);
  }, [fetchQueue]);

  if (loading) return (
    <div className="flex items-center justify-center h-24">
      <Spinner size="sm" />
    </div>
  );

  const position     = queueInfo?.position ?? '—';
  const waitMins     = queueInfo?.estimatedWaitMinutes ?? queueInfo?.estimatedWait ?? null;
  const isCalled     = queueInfo?.isCalled || position === 1;

  return (
    <div
      className={`relative overflow-hidden rounded-xl border p-5 cursor-pointer transition-all duration-300 hover:scale-[1.01] ${
        isCalled
          ? 'bg-emerald-950/60 border-emerald-500/50 animate-pulse-glow'
          : 'bg-slate-900 border-cyan-500/30'
      }`}
      onClick={onNavigate}
    >
      {/* Glow layer */}
      <div className="absolute -right-8 -top-8 w-40 h-40 rounded-full blur-3xl opacity-10 bg-cyan-500" />

      <div className="relative z-10 flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          {/* Pulse dot */}
          <div className={`w-3 h-3 rounded-full shrink-0 ${isCalled ? 'bg-emerald-500' : 'bg-cyan-500'} animate-pulse`} />
          <div>
            <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">Live Queue</p>
            {isCalled ? (
              <p className="text-emerald-400 font-bold text-lg">🔔 It's your turn! Proceed now.</p>
            ) : (
              <p className="text-white font-semibold text-lg">
                Position <span className="text-cyan-400 text-2xl font-bold">#{position}</span>
              </p>
            )}
          </div>
        </div>

        <div className="text-right shrink-0">
          {waitMins !== null && !isCalled && (
            <>
              <p className="text-2xl font-bold text-white">{waitMins}<span className="text-sm font-normal text-slate-400 ml-1">min</span></p>
              <p className="text-xs text-slate-500">est. wait</p>
            </>
          )}
          <ChevronRight className="w-5 h-5 text-slate-600 mt-1 ml-auto" />
        </div>
      </div>

      {/* Queue number pill */}
      {appointment.queueNumber && (
        <div className="mt-3 flex items-center gap-2">
          <span className="text-xs text-slate-500">Token</span>
          <span className="bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-xs font-bold px-2 py-0.5 rounded-full">
            #{appointment.queueNumber}
          </span>
        </div>
      )}
    </div>
  );
};

// ─── Main Dashboard Component ─────────────────────────────────────────────────
const PatientDashboard = () => {
  const { user }                                      = useAuth();
  const navigate                                      = useNavigate();
  const { notifications, unreadCount, markAsRead, markAllAsRead, deleteNotification } = useNotifications();

  const [appointments, setAppointments] = useState([]);
  const [stats, setStats]               = useState({ total: 0, upcoming: 0, completed: 0, cancelled: 0 });
  const [loading, setLoading]           = useState(true);
  const [refreshing, setRefreshing]     = useState(false);

  // Cancel modal
  const [cancelModal, setCancelModal]   = useState({ open: false, apt: null });
  const [cancelReason, setCancelReason] = useState('');
  const [cancelling, setCancelling]     = useState(false);

  // Reschedule modal
  const [rescheduleModal, setRescheduleModal] = useState({ open: false, apt: null });
  const [rescheduleDate, setRescheduleDate]   = useState('');
  const [rescheduling, setRescheduling]       = useState(false);

  // Notification panel
  const [notifPanelOpen, setNotifPanelOpen] = useState(false);

  // Find today's active appointment for queue widget
  const todayApt = appointments.find((a) => {
    const aptDate = new Date(a.date);
    const today   = new Date();
    return (
      aptDate.toDateString() === today.toDateString() &&
      ['pending', 'confirmed', 'in-progress', 'checked-in'].includes(a.status)
    );
  });

  const loadAppointments = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);
    try {
      const { data } = await appointmentApi.getMyAppointments({ limit: 20 });
      const apts = data?.data?.appointments || data?.appointments || [];
      setAppointments(apts);
      setStats({
        total:     apts.length,
        upcoming:  apts.filter((a) => ['pending', 'confirmed'].includes(a.status)).length,
        completed: apts.filter((a) => a.status === 'completed').length,
        cancelled: apts.filter((a) => a.status === 'cancelled').length,
      });
    } catch (err) {
      console.error('Failed to fetch appointments:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { loadAppointments(); }, [loadAppointments]);

  // ── Cancel handler ──
  const handleCancelConfirm = async () => {
    setCancelling(true);
    try {
      await appointmentApi.cancelAppointment(cancelModal.apt._id, cancelReason);
      toast.success('Appointment cancelled successfully.');
      setCancelModal({ open: false, apt: null });
      setCancelReason('');
      loadAppointments(true);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to cancel appointment.');
    } finally {
      setCancelling(false);
    }
  };

  // ── Reschedule handler ──
  const handleRescheduleConfirm = async () => {
    if (!rescheduleDate) { toast.error('Please select a new date.'); return; }
    setRescheduling(true);
    try {
      await appointmentApi.rescheduleAppointment(rescheduleModal.apt._id, { date: rescheduleDate });
      toast.success('Appointment rescheduled successfully.');
      setRescheduleModal({ open: false, apt: null });
      setRescheduleDate('');
      loadAppointments(true);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to reschedule appointment.');
    } finally {
      setRescheduling(false);
    }
  };

  // ── Upcoming appointments (next 3, sorted by date) ──
  const upcomingApts = appointments
    .filter((a) => ['pending', 'confirmed'].includes(a.status))
    .sort((a, b) => new Date(a.date) - new Date(b.date))
    .slice(0, 3);

  if (loading) return <Spinner size="lg" className="mt-24" />;

  return (
    <div className="space-y-8 animate-fade-in">

      {/* ── Header ── */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white">
            Welcome back, <span className="text-gradient">{user?.name || 'Patient'}</span>!
          </h1>
          <p className="text-slate-400 mt-1 text-sm">
            {new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* Notification Bell */}
          <div className="relative">
            <button
              onClick={() => setNotifPanelOpen((v) => !v)}
              className="relative p-2.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl transition-colors"
              aria-label="Notifications"
            >
              <Bell className="w-5 h-5 text-slate-300" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-rose-500 text-white text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>
          </div>

          {/* Refresh */}
          <button
            onClick={() => loadAppointments(true)}
            disabled={refreshing}
            className="p-2.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl transition-colors"
            title="Refresh"
          >
            <RefreshCw className={`w-5 h-5 text-slate-400 ${refreshing ? 'animate-spin' : ''}`} />
          </button>

          {/* Book CTA */}
          <Button onClick={() => navigate('/patient/book')} className="gap-2">
            <Calendar className="w-5 h-5" />
            Book Appointment
          </Button>
        </div>
      </div>

      {/* ── Stats Strip ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total Appointments" value={stats.total}     icon={Calendar}     color="cyan"    />
        <StatCard title="Upcoming"           value={stats.upcoming}  icon={Clock}        color="amber"   />
        <StatCard title="Completed"          value={stats.completed} icon={CheckCircle}  color="emerald" />
        <StatCard title="Cancelled"          value={stats.cancelled} icon={XCircle}      color="rose"    />
      </div>

      {/* ── Live Queue Widget (today's appointment only) ── */}
      {todayApt && (
        <div>
          <h2 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
            <Activity className="w-5 h-5 text-cyan-400" />
            Live Queue Status
          </h2>
          <LiveQueueWidget
            appointment={todayApt}
            onNavigate={() => navigate('/patient/queue')}
          />
        </div>
      )}

      {/* ── Main two-column grid ── */}
      <div className="grid lg:grid-cols-3 gap-6">

        {/* ── Left: Upcoming Appointments ── */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold text-white flex items-center gap-2">
              <Calendar className="w-5 h-5 text-cyan-400" />
              Upcoming Appointments
            </h2>
            <Button variant="ghost" size="sm" onClick={() => navigate('/patient/appointments')}>
              View All <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          </div>

          {upcomingApts.length === 0 ? (
            <div className="text-center py-12 bg-slate-900/50 border border-slate-800 rounded-xl">
              <Calendar className="w-12 h-12 text-slate-700 mx-auto mb-3" />
              <p className="text-slate-500 font-medium">No upcoming appointments</p>
              <p className="text-slate-600 text-sm mt-1">Book an appointment to get started</p>
              <Button className="mt-4" size="sm" onClick={() => navigate('/patient/book')}>
                Book Now
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {upcomingApts.map((apt) => (
                <AppointmentRow
                  key={apt._id}
                  apt={apt}
                  onCancel={(a) => { setCancelModal({ open: true, apt: a }); setCancelReason(''); }}
                  onReschedule={(a) => { setRescheduleModal({ open: true, apt: a }); setRescheduleDate(''); }}
                />
              ))}
            </div>
          )}
        </div>

        {/* ── Right: Notification Centre ── */}
        <div>
          <div className="flex justify-between items-center mb-3">
            <h2 className="text-lg font-semibold text-white flex items-center gap-2">
              <Bell className="w-5 h-5 text-cyan-400" />
              Notifications
              {unreadCount > 0 && (
                <span className="bg-rose-500/20 border border-rose-500/30 text-rose-400 text-xs font-bold px-2 py-0.5 rounded-full">
                  {unreadCount} new
                </span>
              )}
            </h2>
            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                className="text-xs text-cyan-400 hover:text-cyan-300 transition-colors"
              >
                Mark all read
              </button>
            )}
          </div>

          <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-3 space-y-2 max-h-[420px] overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="text-center py-10">
                <Bell className="w-10 h-10 text-slate-700 mx-auto mb-2" />
                <p className="text-slate-500 text-sm">No notifications yet</p>
              </div>
            ) : (
              notifications.slice(0, 10).map((n) => (
                <NotificationItem
                  key={n._id}
                  notification={n}
                  onMarkRead={markAsRead}
                  onDelete={deleteNotification}
                />
              ))
            )}
          </div>
        </div>
      </div>

      {/* ────────────────────── MODALS ────────────────────── */}

      {/* Cancel Modal */}
      <Modal
        isOpen={cancelModal.open}
        onClose={() => setCancelModal({ open: false, apt: null })}
        title="Cancel Appointment"
        size="sm"
      >
        <div className="space-y-4">
          <div className="flex items-start gap-3 p-3 bg-rose-500/10 border border-rose-500/20 rounded-lg">
            <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm text-rose-300 font-medium">Are you sure?</p>
              <p className="text-xs text-slate-400 mt-1">
                This will cancel your appointment with{' '}
                <strong className="text-white">
                  Dr. {cancelModal.apt?.doctorId?.userId?.name || 'Unknown'}
                </strong>{' '}
                on <strong className="text-white">{formatDate(cancelModal.apt?.date)}</strong>.
              </p>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">
              Reason <span className="text-slate-500">(optional)</span>
            </label>
            <textarea
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              placeholder="e.g. Schedule conflict, feeling better..."
              rows={3}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg p-3 text-white text-sm placeholder-slate-600 resize-none focus:outline-none focus:border-cyan-500"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => setCancelModal({ open: false, apt: null })}
            >
              Keep Appointment
            </Button>
            <Button
              variant="danger"
              className="flex-1"
              isLoading={cancelling}
              onClick={handleCancelConfirm}
            >
              Cancel Appointment
            </Button>
          </div>
        </div>
      </Modal>

      {/* Reschedule Modal */}
      <Modal
        isOpen={rescheduleModal.open}
        onClose={() => setRescheduleModal({ open: false, apt: null })}
        title="Reschedule Appointment"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-400">
            Select a new date for your appointment with{' '}
            <strong className="text-white">
              Dr. {rescheduleModal.apt?.doctorId?.userId?.name || 'Unknown'}
            </strong>.
          </p>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">New Date</label>
            <input
              type="date"
              value={rescheduleDate}
              min={new Date().toISOString().split('T')[0]}
              onChange={(e) => setRescheduleDate(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg p-3 text-white text-sm focus:outline-none focus:border-cyan-500"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => setRescheduleModal({ open: false, apt: null })}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              className="flex-1"
              isLoading={rescheduling}
              onClick={handleRescheduleConfirm}
            >
              Confirm Reschedule
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default PatientDashboard;
