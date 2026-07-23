/**
 * MyAppointments — full appointment list with tabs, cancel, and reschedule.
 *
 * Tabs: All | Upcoming | Completed | Cancelled
 * Features:
 *   - Search by doctor name
 *   - Pagination (client-side)
 *   - Cancel with reason modal
 *   - Reschedule with date picker modal
 *   - Appointment detail expand
 *   - Badge with status colour
 */
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate, useSearchParams }    from 'react-router-dom';
import toast                                from 'react-hot-toast';
import {
  Calendar, Search, XCircle, RefreshCw, Clock,
  CheckCircle, AlertCircle, ChevronDown, ChevronUp,
  User, Stethoscope, CreditCard, FileText, MapPin,
} from 'lucide-react';

import { appointmentApi } from '../../api/appointmentApi';
import Button             from '../../components/common/Button';
import Spinner            from '../../components/common/Spinner';
import Modal              from '../../components/common/Modal';
import EmptyState         from '../../components/common/EmptyState';

import {
  formatDate, formatTime, formatCurrency,
  getStatusColor, getStatusLabel,
} from '../../utils/helpers';

// ─── Tab config ───────────────────────────────────────────────────────────────
const TABS = [
  { key: 'all',       label: 'All',       icon: Calendar   },
  { key: 'upcoming',  label: 'Upcoming',  icon: Clock      },
  { key: 'completed', label: 'Completed', icon: CheckCircle },
  { key: 'cancelled', label: 'Cancelled', icon: XCircle    },
];

const STATUS_GROUPS = {
  all:       null,
  upcoming:  ['pending', 'confirmed', 'in-progress'],
  completed: ['completed'],
  cancelled: ['cancelled', 'no-show'],
};

// ─── Detail drawer ─────────────────────────────────────────────────────────────
const AppointmentDetail = ({ apt }) => (
  <div className="mt-4 pt-4 border-t border-slate-800 grid sm:grid-cols-2 gap-4 animate-fade-in">
    <div className="space-y-2">
      <p className="text-xs uppercase tracking-wider text-slate-600 font-semibold">Doctor Info</p>
      <div className="flex items-center gap-2 text-sm text-slate-300">
        <User className="w-4 h-4 text-slate-500" />
        {apt.doctorId?.userId?.name || apt.doctorId?.name || 'Unknown Doctor'}
      </div>
      <div className="flex items-center gap-2 text-sm text-slate-300">
        <Stethoscope className="w-4 h-4 text-slate-500" />
        {apt.doctorId?.specialty || 'General'}
      </div>
    </div>
    <div className="space-y-2">
      <p className="text-xs uppercase tracking-wider text-slate-600 font-semibold">Booking Info</p>
      <div className="flex items-center gap-2 text-sm text-slate-300">
        <CreditCard className="w-4 h-4 text-slate-500" />
        Fee: {formatCurrency(apt.consultationFee || apt.doctorId?.fee || 0)}
      </div>
      <div className="flex items-center gap-2 text-sm text-slate-300">
        <CreditCard className="w-4 h-4 text-slate-500" />
        Payment: <span className={`ml-1 capitalize text-xs px-2 py-0.5 rounded-full ${
          apt.paymentStatus === 'paid'
            ? 'bg-emerald-500/10 text-emerald-400'
            : 'bg-amber-500/10 text-amber-400'
        }`}>{apt.paymentStatus || 'pending'}</span>
      </div>
    </div>
    {(apt.patientNotes || apt.notes) && (
      <div className="sm:col-span-2 space-y-1">
        <p className="text-xs uppercase tracking-wider text-slate-600 font-semibold">Notes</p>
        <div className="flex items-start gap-2 text-sm text-slate-300">
          <FileText className="w-4 h-4 text-slate-500 mt-0.5 shrink-0" />
          {apt.patientNotes || apt.notes}
        </div>
      </div>
    )}
    {apt.cancellationReason && (
      <div className="sm:col-span-2 p-3 bg-rose-500/10 border border-rose-500/20 rounded-lg">
        <p className="text-xs text-rose-400 font-semibold mb-1">Cancellation Reason</p>
        <p className="text-sm text-slate-300">{apt.cancellationReason}</p>
      </div>
    )}
  </div>
);

// ─── Appointment Card ──────────────────────────────────────────────────────────
const AppointmentCard = ({ apt, onCancel, onReschedule }) => {
  const [expanded, setExpanded] = useState(false);
  const canAct = ['pending', 'confirmed'].includes(apt.status);

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden hover:border-slate-700 transition-all duration-200">
      {/* Main row */}
      <div
        className="flex flex-col sm:flex-row sm:items-center gap-4 p-5 cursor-pointer"
        onClick={() => setExpanded((v) => !v)}
      >
        {/* Date block */}
        <div className="flex items-center gap-4 sm:w-40 shrink-0">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-cyan-500/20 to-indigo-500/10 border border-cyan-500/20 flex flex-col items-center justify-center">
            <span className="text-cyan-400 text-xs font-bold">{formatDate(apt.date, 'MMM')}</span>
            <span className="text-white text-xl font-bold leading-none">{formatDate(apt.date, 'dd')}</span>
            <span className="text-slate-500 text-xs">{formatDate(apt.date, 'yyyy')}</span>
          </div>
          <div>
            <p className="text-sm font-medium text-slate-200">
              {apt.timeSlot?.start || '—'} – {apt.timeSlot?.end || '—'}
            </p>
            {apt.queueNumber && (
              <p className="text-xs text-slate-500 mt-0.5">
                Token #{apt.queueNumber}
              </p>
            )}
          </div>
        </div>

        {/* Doctor */}
        <div className="flex-1 min-w-0">
          <p className="text-base font-semibold text-white truncate">
            Dr. {apt.doctorId?.userId?.name || apt.doctorId?.name || 'Unknown'}
          </p>
          <p className="text-sm text-slate-500 mt-0.5">{apt.doctorId?.specialty || 'General'}</p>
        </div>

        {/* Status + expander */}
        <div className="flex items-center gap-3 shrink-0">
          <span
            className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold border ${getStatusColor(apt.status)}`}
          >
            {getStatusLabel(apt.status)}
          </span>
          {expanded
            ? <ChevronUp   className="w-4 h-4 text-slate-500" />
            : <ChevronDown className="w-4 h-4 text-slate-500" />
          }
        </div>
      </div>

      {/* Action buttons */}
      {canAct && (
        <div className="flex gap-2 px-5 pb-4">
          <Button
            size="sm"
            variant="outline"
            onClick={(e) => { e.stopPropagation(); onReschedule(apt); }}
          >
            <Calendar className="w-3.5 h-3.5 mr-1.5" />
            Reschedule
          </Button>
          <Button
            size="sm"
            variant="danger"
            onClick={(e) => { e.stopPropagation(); onCancel(apt); }}
          >
            <XCircle className="w-3.5 h-3.5 mr-1.5" />
            Cancel
          </Button>
        </div>
      )}

      {/* Expanded detail */}
      {expanded && (
        <div className="px-5 pb-5">
          <AppointmentDetail apt={apt} />
        </div>
      )}
    </div>
  );
};

// ─── Main Component ────────────────────────────────────────────────────────────
const ITEMS_PER_PAGE = 8;

const MyAppointments = () => {
  const navigate                         = useNavigate();
  const [searchParams, setSearchParams]  = useSearchParams();

  const activeTab = searchParams.get('tab') || 'upcoming';

  const [appointments, setAppointments]  = useState([]);
  const [loading, setLoading]            = useState(true);
  const [refreshing, setRefreshing]      = useState(false);
  const [searchQuery, setSearchQuery]    = useState('');
  const [page, setPage]                  = useState(1);

  // Cancel modal
  const [cancelModal, setCancelModal]    = useState({ open: false, apt: null });
  const [cancelReason, setCancelReason]  = useState('');
  const [cancelling, setCancelling]      = useState(false);

  // Reschedule modal
  const [rescheduleModal, setRescheduleModal] = useState({ open: false, apt: null });
  const [rescheduleDate, setRescheduleDate]   = useState('');
  const [rescheduling, setRescheduling]       = useState(false);

  // ── Fetch ──
  const loadAppointments = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);
    try {
      const { data } = await appointmentApi.getMyAppointments({ limit: 100 });
      const apts = data?.data?.appointments || data?.appointments || [];
      setAppointments(apts);
    } catch (err) {
      toast.error('Failed to load appointments.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { loadAppointments(); }, [loadAppointments]);

  // ── Filter ──
  const filtered = useMemo(() => {
    const group = STATUS_GROUPS[activeTab];
    let list = group ? appointments.filter((a) => group.includes(a.status)) : appointments;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (a) =>
          (a.doctorId?.userId?.name || a.doctorId?.name || '').toLowerCase().includes(q) ||
          (a.doctorId?.specialty || '').toLowerCase().includes(q)
      );
    }
    return list.sort((a, b) => new Date(b.date) - new Date(a.date));
  }, [appointments, activeTab, searchQuery]);

  // ── Pagination ──
  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
  const paginated  = filtered.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);

  const setTab = (key) => {
    setSearchParams({ tab: key });
    setPage(1);
  };

  // ── Cancel ──
  const handleCancelConfirm = async () => {
    setCancelling(true);
    try {
      await appointmentApi.cancelAppointment(cancelModal.apt._id, cancelReason);
      toast.success('Appointment cancelled.');
      setCancelModal({ open: false, apt: null });
      setCancelReason('');
      loadAppointments(true);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to cancel.');
    } finally {
      setCancelling(false);
    }
  };

  // ── Reschedule ──
  const handleRescheduleConfirm = async () => {
    if (!rescheduleDate) { toast.error('Please select a date.'); return; }
    setRescheduling(true);
    try {
      await appointmentApi.rescheduleAppointment(rescheduleModal.apt._id, { date: rescheduleDate });
      toast.success('Appointment rescheduled.');
      setRescheduleModal({ open: false, apt: null });
      setRescheduleDate('');
      loadAppointments(true);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to reschedule.');
    } finally {
      setRescheduling(false);
    }
  };

  if (loading) return <Spinner size="lg" className="mt-24" />;

  return (
    <div className="space-y-6 animate-fade-in">

      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">My Appointments</h1>
          <p className="text-slate-400 text-sm mt-1">{appointments.length} total appointments</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => loadAppointments(true)}
            disabled={refreshing}
            className="p-2.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl transition-colors"
            title="Refresh"
          >
            <RefreshCw className={`w-5 h-5 text-slate-400 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
          <Button onClick={() => navigate('/patient/book')}>
            <Calendar className="w-4 h-4 mr-2" />
            Book New
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-slate-900 border border-slate-800 rounded-xl w-full sm:w-fit">
        {TABS.map(({ key, label, icon: Icon }) => {
          const count = STATUS_GROUPS[key]
            ? appointments.filter((a) => STATUS_GROUPS[key].includes(a.status)).length
            : appointments.length;
          return (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                activeTab === key
                  ? 'bg-cyan-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Icon className="w-4 h-4 hidden sm:block" />
              {label}
              <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                activeTab === key ? 'bg-white/20' : 'bg-slate-800'
              }`}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
        <input
          type="text"
          placeholder="Search by doctor or specialty…"
          value={searchQuery}
          onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
          className="w-full pl-10 pr-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition-colors"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white"
          >
            <XCircle className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* List */}
      {paginated.length === 0 ? (
        <EmptyState
          icon={Calendar}
          title="No Appointments Found"
          description={
            searchQuery
              ? `No appointments match "${searchQuery}"`
              : `You have no ${activeTab === 'all' ? '' : activeTab} appointments.`
          }
        />
      ) : (
        <div className="space-y-3">
          {paginated.map((apt) => (
            <AppointmentCard
              key={apt._id}
              apt={apt}
              onCancel={(a) => { setCancelModal({ open: true, apt: a }); setCancelReason(''); }}
              onReschedule={(a) => { setRescheduleModal({ open: true, apt: a }); setRescheduleDate(''); }}
            />
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center gap-2 pt-2">
          <Button
            size="sm" variant="outline"
            disabled={page === 1}
            onClick={() => setPage((p) => p - 1)}
          >
            Previous
          </Button>
          <span className="flex items-center text-sm text-slate-400 px-4">
            {page} / {totalPages}
          </span>
          <Button
            size="sm" variant="outline"
            disabled={page === totalPages}
            onClick={() => setPage((p) => p + 1)}
          >
            Next
          </Button>
        </div>
      )}

      {/* ── Cancel Modal ── */}
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
              <p className="text-sm text-rose-300 font-medium">This cannot be undone.</p>
              <p className="text-xs text-slate-400 mt-1">
                Cancel appointment with{' '}
                <strong className="text-white">
                  Dr. {cancelModal.apt?.doctorId?.userId?.name || 'Doctor'}
                </strong>{' '}
                on <strong className="text-white">{formatDate(cancelModal.apt?.date)}</strong>?
              </p>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">
              Reason <span className="text-slate-500 font-normal">(optional)</span>
            </label>
            <textarea
              rows={3}
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              placeholder="e.g. Scheduling conflict, feeling better..."
              className="w-full bg-slate-800 border border-slate-700 rounded-lg p-3 text-white text-sm placeholder-slate-600 resize-none focus:outline-none focus:border-cyan-500"
            />
          </div>
          <div className="flex gap-3">
            <Button variant="outline" className="flex-1" onClick={() => setCancelModal({ open: false, apt: null })}>
              Keep It
            </Button>
            <Button variant="danger" className="flex-1" isLoading={cancelling} onClick={handleCancelConfirm}>
              Cancel Appointment
            </Button>
          </div>
        </div>
      </Modal>

      {/* ── Reschedule Modal ── */}
      <Modal
        isOpen={rescheduleModal.open}
        onClose={() => setRescheduleModal({ open: false, apt: null })}
        title="Reschedule Appointment"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-400">
            Choose a new date for your appointment with{' '}
            <strong className="text-white">
              Dr. {rescheduleModal.apt?.doctorId?.userId?.name || 'Doctor'}
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

          <div className="flex gap-3">
            <Button variant="outline" className="flex-1" onClick={() => setRescheduleModal({ open: false, apt: null })}>
              Cancel
            </Button>
            <Button variant="primary" className="flex-1" isLoading={rescheduling} onClick={handleRescheduleConfirm}>
              Confirm
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default MyAppointments;
