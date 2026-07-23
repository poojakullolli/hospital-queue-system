/**
 * QueueManager — the doctor's primary tool for running their daily queue.
 *
 * Smart Queue Features:
 *  ─ Currently-serving card with Start / Complete / No-Show / Skip actions
 *  ─ Call Next Patient button
 *  ─ Emergency Priority bump button on waiting list items
 *  ─ Waiting list with ordered queue numbers & status indicators
 *  ─ Pause / Resume queue with reason input
 *  ─ Update Doctor Delay announcement (broadcasting + updating wait calculation)
 *  ─ Prescription generator modal (offline printable HTML)
 *  ─ Real-time updates via Socket.IO (queue-updated & emergency-added events)
 */
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate }  from 'react-router-dom';
import toast            from 'react-hot-toast';
import {
  Play, SkipForward, CheckCircle, XCircle, Clock,
  PauseCircle, PlayCircle, RefreshCw, Users, Activity,
  FileText, ChevronRight, AlertCircle, Bell, Timer,
  Stethoscope, Printer, ShieldAlert, AlertTriangle,
} from 'lucide-react';

import { useAuth }   from '../../hooks/useAuth';
import { useSocket } from '../../hooks/useSocket';

import { doctorApi }      from '../../api/doctorApi';
import { appointmentApi } from '../../api/appointmentApi';
import { queueApi }       from '../../api/queueApi';

import Button  from '../../components/common/Button';
import Card    from '../../components/common/Card';
import Modal   from '../../components/common/Modal';
import Spinner from '../../components/common/Spinner';

import {
  formatDate, getStatusColor, getStatusLabel, getInitials,
} from '../../utils/helpers';

// ─── Prescription Modal ────────────────────────────────────────────────────────
const PrescriptionModal = ({ isOpen, onClose, appointment, doctor }) => {
  const [rx, setRx] = useState({
    diagnosis: '',
    medicines: [{ name: '', dosage: '', duration: '', instructions: '' }],
    advice: '',
    followUp: '',
  });

  const addMedicine = () =>
    setRx((r) => ({
      ...r,
      medicines: [...r.medicines, { name: '', dosage: '', duration: '', instructions: '' }],
    }));

  const updateMed = (i, field, value) => {
    const updated = [...rx.medicines];
    updated[i][field] = value;
    setRx((r) => ({ ...r, medicines: updated }));
  };

  const removeMed = (i) =>
    setRx((r) => ({
      ...r,
      medicines: r.medicines.filter((_, idx) => idx !== i),
    }));

  const handlePrint = () => {
    const printContent = `
      <!DOCTYPE html><html><head><title>Prescription</title>
      <style>
        body { font-family: Arial; padding: 40px; max-width: 700px; margin: 0 auto; }
        h1 { color: #0891b2; font-size: 24px; } h2 { font-size: 18px; color: #334155; }
        .header { border-bottom: 2px solid #0891b2; padding-bottom: 16px; margin-bottom: 24px; }
        .section { margin-bottom: 20px; }
        .label { font-weight: bold; color: #334155; }
        table { width: 100%; border-collapse: collapse; margin-top: 8px; }
        th, td { border: 1px solid #e2e8f0; padding: 8px 12px; text-align: left; font-size: 13px; }
        th { background: #f1f5f9; font-weight: bold; }
        .footer { border-top: 2px solid #e2e8f0; padding-top: 16px; margin-top: 32px; }
        @media print { .no-print { display: none; } }
      </style></head><body>
      <div class="header">
        <h1>🏥 MediQueue Hospital</h1>
        <p><strong>Dr. ${doctor?.userId?.name || 'Doctor'}</strong> — ${doctor?.specialty || 'General'}</p>
        <p>Date: ${new Date().toLocaleDateString('en-IN', { dateStyle: 'long' })}</p>
      </div>
      <div class="section">
        <span class="label">Patient:</span> ${appointment?.patientId?.name || 'Patient'}<br/>
        <span class="label">Token:</span> #${appointment?.queueNumber || '—'}
      </div>
      <div class="section">
        <span class="label">Diagnosis:</span><br/><p>${rx.diagnosis || '—'}</p>
      </div>
      <div class="section">
        <span class="label">Medications:</span>
        <table>
          <tr><th>Medicine</th><th>Dosage</th><th>Duration</th><th>Instructions</th></tr>
          ${rx.medicines.map((m) => `<tr><td>${m.name}</td><td>${m.dosage}</td><td>${m.duration}</td><td>${m.instructions}</td></tr>`).join('')}
        </table>
      </div>
      ${rx.advice ? `<div class="section"><span class="label">Advice:</span><p>${rx.advice}</p></div>` : ''}
      ${rx.followUp ? `<div class="section"><span class="label">Follow Up:</span><p>${rx.followUp}</p></div>` : ''}
      <div class="footer"><p><em>Digitally generated via MediQueue. Valid for 30 days.</em></p></div>
      </body></html>
    `;
    const win = window.open('', '_blank');
    win.document.write(printContent);
    win.document.close();
    win.print();
  };

  if (!isOpen) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Generate Prescription" size="xl">
      <div className="space-y-5 pb-2">
        <div className="flex items-center gap-3 p-3 bg-cyan-500/10 border border-cyan-500/20 rounded-xl">
          <Stethoscope className="w-5 h-5 text-cyan-400 shrink-0" />
          <div>
            <p className="text-sm font-semibold text-white">
              {appointment?.patientId?.name || 'Patient'} — Token #{appointment?.queueNumber || '—'}
            </p>
            <p className="text-xs text-slate-400">{formatDate(appointment?.date)}</p>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1.5">Diagnosis *</label>
          <textarea
            rows={2}
            value={rx.diagnosis}
            onChange={(e) => setRx((r) => ({ ...r, diagnosis: e.target.value }))}
            placeholder="Enter primary diagnosis..."
            className="w-full bg-slate-800 border border-slate-700 rounded-lg p-3 text-white text-sm placeholder-slate-600 resize-none focus:outline-none focus:border-cyan-500"
          />
        </div>

        <div>
          <div className="flex justify-between items-center mb-2">
            <label className="text-sm font-medium text-slate-300">Medications</label>
            <button onClick={addMedicine} className="text-xs text-cyan-400 hover:text-cyan-300">
              + Add Medicine
            </button>
          </div>
          <div className="space-y-2">
            {rx.medicines.map((med, i) => (
              <div key={i} className="grid grid-cols-4 gap-2 items-center">
                {[
                  { field: 'name',         placeholder: 'Drug name'   },
                  { field: 'dosage',       placeholder: 'e.g. 500mg'  },
                  { field: 'duration',     placeholder: 'e.g. 5 days' },
                  { field: 'instructions', placeholder: 'After meals' },
                ].map(({ field, placeholder }) => (
                  <input
                    key={field}
                    value={med[field]}
                    onChange={(e) => updateMed(i, field, e.target.value)}
                    placeholder={placeholder}
                    className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-xs placeholder-slate-600 focus:outline-none focus:border-cyan-500"
                  />
                ))}
              </div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">Advice</label>
            <textarea
              rows={2}
              value={rx.advice}
              onChange={(e) => setRx((r) => ({ ...r, advice: e.target.value }))}
              placeholder="Rest, diet, restrictions..."
              className="w-full bg-slate-800 border border-slate-700 rounded-lg p-3 text-white text-sm placeholder-slate-600 resize-none focus:outline-none focus:border-cyan-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">Follow-Up</label>
            <textarea
              rows={2}
              value={rx.followUp}
              onChange={(e) => setRx((r) => ({ ...r, followUp: e.target.value }))}
              placeholder="Follow up in 7 days / after tests..."
              className="w-full bg-slate-800 border border-slate-700 rounded-lg p-3 text-white text-sm placeholder-slate-600 resize-none focus:outline-none focus:border-cyan-500"
            />
          </div>
        </div>

        <div className="flex gap-3 pt-2">
          <Button variant="outline" className="flex-1" onClick={onClose}>Close</Button>
          <Button variant="primary" className="flex-1" onClick={handlePrint}>
            <Printer className="w-4 h-4 mr-2" /> Print / Download
          </Button>
        </div>
      </div>
    </Modal>
  );
};

// ─── Delay Modal ──────────────────────────────────────────────────────────────
const DelayModal = ({ isOpen, onClose, onConfirm, loading }) => {
  const [minutes, setMinutes] = useState(15);
  const [reason, setReason]   = useState('');

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Update Doctor Delay" size="sm">
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1.5">Delay (minutes)</label>
          <input
            type="number"
            min="5"
            max="120"
            step="5"
            value={minutes}
            onChange={(e) => setMinutes(Number(e.target.value))}
            className="w-full bg-slate-800 border border-slate-700 rounded-lg p-3 text-white text-sm focus:outline-none focus:border-cyan-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1.5">Reason / Announcement</label>
          <textarea
            rows={2}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="e.g. Attending emergency surgery, traffic delay..."
            className="w-full bg-slate-800 border border-slate-700 rounded-lg p-3 text-white text-sm placeholder-slate-600 resize-none focus:outline-none focus:border-cyan-500"
          />
        </div>
        <div className="flex gap-3">
          <Button variant="outline" className="flex-1" onClick={onClose}>Cancel</Button>
          <Button variant="primary" className="flex-1" isLoading={loading} onClick={() => onConfirm(minutes, reason)}>
            Announce Delay
          </Button>
        </div>
      </div>
    </Modal>
  );
};

// ─── Pause Modal ──────────────────────────────────────────────────────────────
const PauseModal = ({ isOpen, onClose, onConfirm, loading }) => {
  const [reason, setReason] = useState('');
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Pause Queue" size="sm">
      <div className="space-y-4">
        <p className="text-sm text-slate-400">Patients will be notified that the queue is paused.</p>
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1.5">Reason</label>
          <textarea
            rows={2}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="e.g. Lunch break, procedure..."
            className="w-full bg-slate-800 border border-slate-700 rounded-lg p-3 text-white text-sm placeholder-slate-600 resize-none focus:outline-none focus:border-cyan-500"
          />
        </div>
        <div className="flex gap-3">
          <Button variant="outline" className="flex-1" onClick={onClose}>Cancel</Button>
          <Button variant="danger" className="flex-1" isLoading={loading} onClick={() => onConfirm(reason)}>
            Pause Queue
          </Button>
        </div>
      </div>
    </Modal>
  );
};

// ─── Waiting patient item ─────────────────────────────────────────────────────
const WaitingItem = ({ apt, isNext, onEmergency }) => (
  <div className={`flex items-center justify-between gap-3 p-3 rounded-xl border transition-all ${
    apt.isEmergency
      ? 'bg-rose-500/10 border-rose-500/30'
      : isNext
      ? 'bg-cyan-500/10 border-cyan-500/30'
      : 'bg-slate-800/50 border-slate-800 hover:border-slate-700'
  }`}>
    <div className="flex items-center gap-3 min-w-0 flex-1">
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-sm font-bold shrink-0 ${
        apt.isEmergency
          ? 'bg-rose-600 text-white animate-pulse'
          : isNext
          ? 'bg-cyan-600 text-white'
          : 'bg-slate-800 text-slate-400 border border-slate-700'
      }`}>
        #{apt.queueNumber || '—'}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-sm font-semibold text-white truncate">{apt.patientId?.name || 'Patient'}</p>
          {apt.isEmergency && (
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-rose-500 text-white shrink-0 uppercase tracking-wider">
              Emergency
            </span>
          )}
        </div>
        <p className="text-xs text-slate-500">{apt.timeSlot?.start || '—'}</p>
      </div>
    </div>
    <div className="flex items-center gap-1.5 shrink-0">
      {!apt.isEmergency && (
        <button
          onClick={() => onEmergency(apt._id)}
          title="Bump to Emergency Priority"
          className="text-xs px-2 py-1 bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/30 rounded-lg transition-colors"
        >
          🚨 Emergency
        </button>
      )}
      {isNext && !apt.isEmergency && (
        <span className="text-xs text-cyan-400 font-medium px-2 py-1 bg-cyan-500/10 rounded-lg">Next</span>
      )}
    </div>
  </div>
);

// ─── Main ──────────────────────────────────────────────────────────────────────
const QueueManager = () => {
  const { user }   = useAuth();
  const { socket, joinDoctorRoom } = useSocket();
  const navigate   = useNavigate();

  const [doctorProfile, setDoctorProfile]     = useState(null);
  const [queue, setQueue]                     = useState(null);
  const [appointments, setAppointments]       = useState([]);
  const [loading, setLoading]                 = useState(true);
  const [refreshing, setRefreshing]           = useState(false);

  // Action states
  const [advancing, setAdvancing]             = useState(false);
  const [completing, setCompleting]           = useState(false);
  const [noShowing, setNoShowing]             = useState(false);
  const [pausingResume, setPausingResume]     = useState(false);

  // Modals
  const [rxModal, setRxModal]                 = useState(false);
  const [pauseModal, setPauseModal]           = useState(false);
  const [delayModal, setDelayModal]           = useState(false);

  // ── Load doctor profile ──
  const loadProfile = useCallback(async () => {
    try {
      const { data } = await doctorApi.getDoctorProfile();
      const doc = data?.data?.doctor || data?.doctor || null;
      setDoctorProfile(doc);
      return doc;
    } catch {
      return null;
    }
  }, []);

  // ── Load today's queue and appointments ──
  const loadQueueData = useCallback(async (docId, silent = false) => {
    if (!docId) return;
    if (!silent) setLoading(true);
    else setRefreshing(true);
    try {
      const today = new Date().toISOString().split('T')[0];

      const [aptRes, queueRes] = await Promise.allSettled([
        appointmentApi.getDoctorAppointments({ date: today, limit: 100 }),
        queueApi.getQueue(docId, today),
      ]);

      if (aptRes.status === 'fulfilled') {
        const apts = aptRes.value.data?.data?.appointments || aptRes.value.data?.appointments || [];
        setAppointments(apts);
      }

      if (queueRes.status === 'fulfilled') {
        const q = queueRes.value.data?.data?.queue || queueRes.value.data?.queue || null;
        setQueue(q);
      }
    } catch (err) {
      console.error('QueueManager load error:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // ── Bootstrap ──
  useEffect(() => {
    (async () => {
      const doc = await loadProfile();
      if (doc?._id) {
        await loadQueueData(doc._id);
        joinDoctorRoom(doc._id);
      } else {
        setLoading(false);
      }
    })();
  }, [loadProfile, loadQueueData, joinDoctorRoom]);

  // ── Real-time updates ──
  useEffect(() => {
    if (!socket || !doctorProfile?._id) return;
    const handler = () => loadQueueData(doctorProfile._id, true);
    socket.on('queue-updated', handler);
    socket.on('emergency-added', handler);
    socket.on('appointment-status-changed', handler);
    return () => {
      socket.off('queue-updated', handler);
      socket.off('emergency-added', handler);
      socket.off('appointment-status-changed', handler);
    };
  }, [socket, doctorProfile, loadQueueData]);

  // ── Derived data ──
  const todayApts       = appointments;
  const waitingApts     = todayApts.filter((a) => ['pending', 'confirmed'].includes(a.status))
                                   .sort((a, b) => (a.isEmergency ? -1 : 0) - (b.isEmergency ? -1 : 0) || (a.queueNumber || 0) - (b.queueNumber || 0));
  const completedApts   = todayApts.filter((a) => a.status === 'completed');
  const cancelledApts   = todayApts.filter((a) => ['cancelled', 'no-show'].includes(a.status));

  const currentApt = todayApts.find((a) => a.status === 'in-progress')
    || (queue?.currentServing
        ? todayApts.find((a) => a._id === (queue.currentServing?._id || queue.currentServing))
        : null);

  const isQueuePaused = queue?.status === 'paused';

  // ── Actions ──
  const handleCallNext = async () => {
    if (!doctorProfile?._id) { toast.error('Doctor profile not loaded.'); return; }
    setAdvancing(true);
    try {
      await queueApi.advanceQueue(doctorProfile._id);
      toast.success('Next patient called!');
      await loadQueueData(doctorProfile._id, true);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to advance queue.');
    } finally {
      setAdvancing(false);
    }
  };

  const handleComplete = async () => {
    if (!currentApt?._id) return;
    setCompleting(true);
    try {
      await appointmentApi.updateStatus(currentApt._id, 'completed');
      toast.success('Consultation completed!');
      await loadQueueData(doctorProfile._id, true);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to complete appointment.');
    } finally {
      setCompleting(false);
    }
  };

  const handleNoShow = async () => {
    if (!currentApt?._id) return;
    setNoShowing(true);
    try {
      await appointmentApi.updateStatus(currentApt._id, 'no-show');
      toast.success('Marked as no-show.');
      await loadQueueData(doctorProfile._id, true);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to mark no-show.');
    } finally {
      setNoShowing(false);
    }
  };

  const handleSkip = async () => {
    if (!doctorProfile?._id || !currentApt?._id) return;
    try {
      await queueApi.skipPatient(doctorProfile._id, currentApt._id);
      toast.success('Patient skipped and moved to end of queue.');
      await loadQueueData(doctorProfile._id, true);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to skip patient.');
    }
  };

  const handleStart = async () => {
    if (!currentApt?._id) return;
    try {
      await appointmentApi.updateStatus(currentApt._id, 'in-progress');
      toast.success('Consultation started!');
      await loadQueueData(doctorProfile._id, true);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to start consultation.');
    }
  };

  const handleEmergency = async (appointmentId) => {
    if (!doctorProfile?._id) return;
    try {
      await queueApi.addEmergency(doctorProfile._id, appointmentId);
      toast.success('🚨 Patient bumped to Emergency Priority!');
      await loadQueueData(doctorProfile._id, true);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to bump emergency.');
    }
  };

  const handlePause = async (reason) => {
    setPausingResume(true);
    try {
      await queueApi.pauseQueue(doctorProfile._id, reason);
      toast.success('Queue paused.');
      setPauseModal(false);
      await loadQueueData(doctorProfile._id, true);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to pause queue.');
    } finally {
      setPausingResume(false);
    }
  };

  const handleResume = async () => {
    setPausingResume(true);
    try {
      await queueApi.resumeQueue(doctorProfile._id);
      toast.success('Queue resumed!');
      await loadQueueData(doctorProfile._id, true);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to resume queue.');
    } finally {
      setPausingResume(false);
    }
  };

  const handleDelay = async (minutes, reason) => {
    if (!doctorProfile?._id) return;
    setPausingResume(true);
    try {
      await queueApi.setDelay(doctorProfile._id, minutes, reason);
      toast.success(`Delay of ${minutes} min announced to waiting patients.`);
      setDelayModal(false);
      await loadQueueData(doctorProfile._id, true);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to announce delay.');
    } finally {
      setPausingResume(false);
    }
  };

  if (loading) return <Spinner size="lg" className="mt-24" />;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Activity className="w-6 h-6 text-cyan-400" />
            Smart Queue Engine
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            {formatDate(new Date(), 'EEEE, MMMM dd yyyy')} &nbsp;·&nbsp;
            <span className={queue?.status === 'active' ? 'text-emerald-400 font-semibold' : 'text-amber-400 font-semibold'}>
              Queue Status: {queue?.status ? queue.status.toUpperCase() : 'NOT STARTED'}
            </span>
            {queue?.delayMinutes > 0 && (
              <span className="ml-2 text-rose-400 text-xs font-bold px-2 py-0.5 rounded bg-rose-500/10 border border-rose-500/20">
                +{queue.delayMinutes}m delay
              </span>
            )}
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => doctorProfile?._id && loadQueueData(doctorProfile._id, true)}
            disabled={refreshing}
            className="p-2.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl"
            title="Refresh Queue"
          >
            <RefreshCw className={`w-5 h-5 text-slate-400 ${refreshing ? 'animate-spin' : ''}`} />
          </button>

          <Button size="sm" variant="outline" onClick={() => setDelayModal(true)}>
            <Timer className="w-4 h-4 mr-1.5 text-amber-400" />
            Update Delay
          </Button>

          {isQueuePaused ? (
            <Button size="sm" variant="primary" isLoading={pausingResume} onClick={handleResume}>
              <PlayCircle className="w-4 h-4 mr-1.5" />
              Resume Queue
            </Button>
          ) : (
            <Button size="sm" variant="outline" onClick={() => setPauseModal(true)}>
              <PauseCircle className="w-4 h-4 mr-1.5" />
              Pause Queue
            </Button>
          )}
        </div>
      </div>

      {/* ── Queue paused banner ── */}
      {isQueuePaused && (
        <div className="flex items-center gap-3 p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl">
          <AlertCircle className="w-5 h-5 text-amber-400 shrink-0" />
          <div>
            <p className="text-sm font-semibold text-amber-300">Queue is currently paused</p>
            {queue?.pauseReason && <p className="text-xs text-slate-400 mt-0.5">{queue.pauseReason}</p>}
          </div>
          <Button size="sm" variant="primary" className="ml-auto" isLoading={pausingResume} onClick={handleResume}>
            Resume
          </Button>
        </div>
      )}

      {/* ── Main Layout ── */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Left: Currently Serving & Main controls */}
        <div className="lg:col-span-2 space-y-4">
          <div className={`relative overflow-hidden rounded-2xl border p-6 ${
            currentApt
              ? 'bg-gradient-to-br from-slate-900 via-cyan-950/30 to-slate-900 border-cyan-500/40 shadow-[0_0_40px_rgba(8,145,178,0.12)]'
              : 'bg-slate-900 border-slate-800'
          }`}>
            <div className="relative z-10">
              <p className="text-xs font-bold text-cyan-400 uppercase tracking-widest mb-4">
                ● Currently Serving
              </p>

              {currentApt ? (
                <>
                  <div className="flex items-start justify-between gap-4 mb-6">
                    <div className="flex items-center gap-4">
                      <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-cyan-500/30 to-indigo-500/20 border border-cyan-500/30 flex items-center justify-center text-2xl font-bold text-white">
                        {getInitials(currentApt.patientId?.name || 'P')}
                      </div>
                      <div>
                        <h2 className="text-2xl font-bold text-white">
                          {currentApt.patientId?.name || 'Patient'}
                        </h2>
                        <p className="text-slate-400 text-sm mt-0.5">
                          {currentApt.timeSlot?.start} – {currentApt.timeSlot?.end}
                        </p>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-4xl font-black text-cyan-400 bg-slate-950 px-5 py-3 rounded-xl border border-slate-800">
                        #{currentApt.queueNumber || '—'}
                      </div>
                      <span className={`mt-2 inline-flex text-xs font-semibold px-2 py-1 rounded-full border ${getStatusColor(currentApt.status)}`}>
                        {getStatusLabel(currentApt.status)}
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-3">
                    {currentApt.status === 'confirmed' && (
                      <Button variant="primary" className="flex-1 min-w-[130px]" onClick={handleStart}>
                        <Play className="w-4 h-4 mr-2" /> Start Consultation
                      </Button>
                    )}
                    {currentApt.status === 'in-progress' && (
                      <Button
                        variant="primary"
                        className="flex-1 min-w-[130px]"
                        isLoading={completing}
                        onClick={handleComplete}
                      >
                        <CheckCircle className="w-4 h-4 mr-2" /> Complete
                      </Button>
                    )}
                    <Button variant="outline" onClick={handleSkip}>
                      <SkipForward className="w-4 h-4 mr-2" /> Skip
                    </Button>
                    <Button variant="danger" isLoading={noShowing} onClick={handleNoShow}>
                      <XCircle className="w-4 h-4 mr-2" /> No Show
                    </Button>
                    <Button variant="outline" onClick={() => setRxModal(true)}>
                      <FileText className="w-4 h-4 mr-2" /> Prescription
                    </Button>
                  </div>
                </>
              ) : (
                <div className="text-center py-10">
                  <Stethoscope className="w-14 h-14 text-slate-700 mx-auto mb-3" />
                  <p className="text-slate-500 font-medium">No patient in consultation</p>
                  <p className="text-slate-600 text-sm mt-1">Call next patient to begin</p>
                </div>
              )}
            </div>
          </div>

          <Button
            variant="primary"
            className="w-full py-4 text-base font-semibold"
            isLoading={advancing}
            disabled={waitingApts.length === 0}
            onClick={handleCallNext}
          >
            <Bell className="w-5 h-5 mr-2" />
            {waitingApts.length === 0 ? 'No Patients Waiting' : `Call Next Patient (${waitingApts.length} waiting)`}
          </Button>

          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'Waiting', value: waitingApts.length, color: 'text-amber-400' },
              { label: 'Completed', value: completedApts.length, color: 'text-emerald-400' },
              { label: 'No-Show', value: cancelledApts.length, color: 'text-rose-400' },
            ].map(({ label, value, color }) => (
              <div key={label} className="bg-slate-900 border border-slate-800 rounded-xl p-4 text-center">
                <p className={`text-3xl font-bold ${color}`}>{value}</p>
                <p className="text-xs text-slate-500 mt-1">{label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Right: Waiting List with Emergency Priority Action */}
        <div className="flex flex-col gap-4">
          <h3 className="text-lg font-semibold text-white flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Users className="w-5 h-5 text-cyan-400" /> Waiting List
            </span>
            <span className="bg-amber-500/10 text-amber-400 border border-amber-500/20 text-xs font-bold px-2.5 py-0.5 rounded-full">
              {waitingApts.length}
            </span>
          </h3>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col gap-3 max-h-[500px] overflow-y-auto">
            {waitingApts.length === 0 ? (
              <div className="text-center py-12">
                <Users className="w-10 h-10 text-slate-700 mx-auto mb-2" />
                <p className="text-slate-500 text-sm">No patients waiting</p>
              </div>
            ) : (
              waitingApts.map((apt, i) => (
                <WaitingItem
                  key={apt._id}
                  apt={apt}
                  isNext={i === 0}
                  onEmergency={handleEmergency}
                />
              ))
            )}
          </div>
        </div>
      </div>

      {/* Modals */}
      <PrescriptionModal
        isOpen={rxModal}
        onClose={() => setRxModal(false)}
        appointment={currentApt}
        doctor={doctorProfile}
      />
      <PauseModal
        isOpen={pauseModal}
        onClose={() => setPauseModal(false)}
        onConfirm={handlePause}
        loading={pausingResume}
      />
      <DelayModal
        isOpen={delayModal}
        onClose={() => setDelayModal(false)}
        onConfirm={handleDelay}
        loading={pausingResume}
      />
    </div>
  );
};

export default QueueManager;
