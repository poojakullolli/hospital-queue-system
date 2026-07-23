/**
 * BookAppointment — 4-step wizard fully wired to the backend.
 *
 * Step 1: Select Department (loaded from doctorApi with unique specialties)
 * Step 2: Select Doctor    (filtered by specialty, loaded from doctorApi)
 * Step 3: Select Date & Time Slot (available slots from doctorApi.getAvailableSlots)
 * Step 4: Confirm & Book
 */
import React, { useState, useEffect } from 'react';
import { useNavigate }                from 'react-router-dom';
import toast                          from 'react-hot-toast';
import {
  ArrowLeft, ArrowRight, CheckCircle, Stethoscope,
  User, Calendar as CalendarIcon, Clock, Star, AlertCircle,
} from 'lucide-react';

import { doctorApi }      from '../../api/doctorApi';
import { appointmentApi } from '../../api/appointmentApi';

import Card    from '../../components/common/Card';
import Button  from '../../components/common/Button';
import Spinner from '../../components/common/Spinner';

import { formatCurrency, formatDate } from '../../utils/helpers';

// ─── Step indicator ────────────────────────────────────────────────────────────
const StepIndicator = ({ current, steps }) => (
  <div className="relative mb-10">
    {/* Track */}
    <div className="absolute inset-x-0 top-5 h-0.5 bg-slate-800 z-0" />
    <div
      className="absolute top-5 left-0 h-0.5 bg-cyan-600 z-0 transition-all duration-500"
      style={{ width: `${((current - 1) / (steps.length - 1)) * 100}%` }}
    />
    <div className="relative z-10 flex justify-between">
      {steps.map(({ label }, idx) => {
        const num  = idx + 1;
        const done = current > num;
        const active = current === num;
        return (
          <div key={num} className="flex flex-col items-center gap-2">
            <div
              className={`w-10 h-10 rounded-full flex items-center justify-center font-bold border-4 border-slate-950 transition-all duration-300 ${
                done   ? 'bg-emerald-500 text-white'
                : active ? 'bg-cyan-600 text-white shadow-lg shadow-cyan-500/30'
                : 'bg-slate-800 text-slate-500'
              }`}
            >
              {done ? <CheckCircle className="w-5 h-5" /> : num}
            </div>
            <span className={`text-xs font-medium hidden sm:block ${active ? 'text-cyan-400' : done ? 'text-emerald-400' : 'text-slate-500'}`}>
              {label}
            </span>
          </div>
        );
      })}
    </div>
  </div>
);

const STEPS = [
  { label: 'Department' },
  { label: 'Doctor'     },
  { label: 'Date & Time'},
  { label: 'Confirm'    },
];

// ─── Dept icons (emoji fallback) ──────────────────────────────────────────────
const DEPT_ICONS = {
  Cardiology:       '❤️',
  Neurology:        '🧠',
  Orthopedics:      '🦴',
  Dermatology:      '🧴',
  Pediatrics:       '🧒',
  'General Medicine':'🩺',
  Ophthalmology:    '👁️',
  ENT:              '👂',
};

// ─── Main ──────────────────────────────────────────────────────────────────────
const BookAppointment = () => {
  const navigate = useNavigate();

  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    department: '',
    doctor:     null,  // full doctor object
    date:       '',
    slot:       null,  // { start, end } object
    notes:      '',
  });

  // Data states
  const [departments, setDepartments]   = useState([]);
  const [doctors, setDoctors]           = useState([]);
  const [slots, setSlots]               = useState([]);
  const [loadingDepts, setLoadingDepts] = useState(true);
  const [loadingDocs, setLoadingDocs]   = useState(false);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [booking, setBooking]           = useState(false);

  // ── Step 1: Load unique specialties ──
  useEffect(() => {
    (async () => {
      try {
        const { data } = await doctorApi.getAllDoctors({ limit: 100 });
        const docs     = data?.data?.doctors || data?.doctors || [];
        const unique   = [...new Set(docs.map((d) => d.specialty).filter(Boolean))].sort();
        setDepartments(unique);
      } catch {
        toast.error('Could not load departments.');
      } finally {
        setLoadingDepts(false);
      }
    })();
  }, []);

  // ── Step 2: Load doctors for selected department ──
  useEffect(() => {
    if (!formData.department || step < 2) return;
    setLoadingDocs(true);
    setDoctors([]);
    (async () => {
      try {
        const { data } = await doctorApi.getAllDoctors({ specialty: formData.department, limit: 50 });
        setDoctors(data?.data?.doctors || data?.doctors || []);
      } catch {
        toast.error('Could not load doctors.');
      } finally {
        setLoadingDocs(false);
      }
    })();
  }, [formData.department, step]);

  // ── Step 3: Load available slots ──
  useEffect(() => {
    if (!formData.doctor || !formData.date || step < 3) return;
    setLoadingSlots(true);
    setSlots([]);
    (async () => {
      try {
        const { data } = await doctorApi.getAvailableSlots(formData.doctor._id, formData.date);
        setSlots(data?.data?.slots || data?.slots || []);
      } catch {
        toast.error('Could not load time slots.');
      } finally {
        setLoadingSlots(false);
      }
    })();
  }, [formData.doctor, formData.date, step]);

  const nextStep = () => setStep((s) => Math.min(s + 1, 4));
  const prevStep = () => setStep((s) => Math.max(s - 1, 1));

  // ── Can proceed validation ──
  const canNext = () => {
    if (step === 1) return !!formData.department;
    if (step === 2) return !!formData.doctor;
    if (step === 3) return !!formData.date && !!formData.slot;
    return true;
  };

  // ── Final booking ──
  const handleBook = async () => {
    setBooking(true);
    try {
      await appointmentApi.bookAppointment({
        doctorId:   formData.doctor._id,
        date:       formData.date,
        timeSlot:   formData.slot,
        patientNotes: formData.notes,
      });
      toast.success('Appointment booked successfully! 🎉');
      navigate('/patient/appointments?tab=upcoming');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Booking failed. Please try again.');
    } finally {
      setBooking(false);
    }
  };

  // ── Min date = today ──
  const minDate = new Date().toISOString().split('T')[0];

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-white">Book Appointment</h1>
        <p className="text-slate-400 text-sm mt-1">Complete the steps below to schedule your visit.</p>
      </div>

      <StepIndicator current={step} steps={STEPS} />

      <Card className="p-6 md:p-8">
        {/* ─── Step 1: Department ─── */}
        {step === 1 && (
          <div className="space-y-6">
            <h2 className="text-xl font-semibold text-white">Select Department</h2>
            {loadingDepts ? (
              <Spinner size="md" className="py-8" />
            ) : departments.length === 0 ? (
              <div className="text-center py-10 text-slate-500">No departments available.</div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {departments.map((dept) => (
                  <button
                    key={dept}
                    onClick={() => setFormData({ ...formData, department: dept, doctor: null, slot: null })}
                    className={`p-5 rounded-xl border flex flex-col items-center justify-center gap-3 transition-all duration-200 hover:scale-[1.02] ${
                      formData.department === dept
                        ? 'bg-cyan-500/20 border-cyan-500 text-cyan-400 shadow-lg shadow-cyan-500/10'
                        : 'bg-slate-900 border-slate-700 text-slate-400 hover:border-slate-500 hover:text-slate-200'
                    }`}
                  >
                    <span className="text-3xl">{DEPT_ICONS[dept] || '🏥'}</span>
                    <span className="font-medium text-sm text-center">{dept}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ─── Step 2: Doctor ─── */}
        {step === 2 && (
          <div className="space-y-6">
            <h2 className="text-xl font-semibold text-white">
              Select Doctor — <span className="text-cyan-400">{formData.department}</span>
            </h2>
            {loadingDocs ? (
              <Spinner size="md" className="py-8" />
            ) : doctors.length === 0 ? (
              <div className="text-center py-10 text-slate-500">
                No doctors available in this department.
              </div>
            ) : (
              <div className="space-y-3">
                {doctors.map((doc) => (
                  <button
                    key={doc._id}
                    onClick={() => setFormData({ ...formData, doctor: doc, slot: null })}
                    className={`w-full text-left p-4 rounded-xl border flex items-center gap-4 transition-all duration-200 hover:scale-[1.01] ${
                      formData.doctor?._id === doc._id
                        ? 'bg-cyan-500/20 border-cyan-500'
                        : 'bg-slate-900 border-slate-700 hover:border-slate-500'
                    }`}
                  >
                    {/* Avatar */}
                    <div className="w-14 h-14 rounded-full bg-gradient-to-br from-cyan-500/30 to-indigo-500/30 border border-slate-600 flex items-center justify-center shrink-0 text-xl font-bold text-white">
                      {(doc.userId?.name || 'D')[0]}
                    </div>
                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className="text-base font-semibold text-white truncate">
                        Dr. {doc.userId?.name || 'Unknown'}
                      </p>
                      <p className="text-sm text-slate-400">{doc.specialty}</p>
                      <p className="text-xs text-slate-500 mt-0.5">{doc.experience} yrs experience</p>
                    </div>
                    {/* Rating + fee */}
                    <div className="text-right shrink-0">
                      <div className="flex items-center gap-1 justify-end mb-1">
                        <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                        <span className="text-xs text-amber-400 font-medium">
                          {doc.rating?.toFixed(1) || '4.5'}
                        </span>
                      </div>
                      <p className="text-sm font-semibold text-cyan-400">
                        {formatCurrency(doc.fee || 0)}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ─── Step 3: Date & Slot ─── */}
        {step === 3 && (
          <div className="space-y-6">
            <h2 className="text-xl font-semibold text-white">Select Date & Time</h2>

            {/* Date picker */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Choose a Date</label>
              <input
                type="date"
                min={minDate}
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value, slot: null })}
                className="w-full sm:w-64 p-3 bg-slate-900 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:border-cyan-500 transition-colors"
              />
            </div>

            {/* Slots */}
            {formData.date && (
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Available Slots
                  {loadingSlots && <span className="text-slate-500 ml-2 text-xs">Loading…</span>}
                </label>
                {loadingSlots ? (
                  <Spinner size="sm" className="py-4" />
                ) : slots.length === 0 ? (
                  <div className="flex items-center gap-2 p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-400 text-sm">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    No available slots for this date. Please pick another day.
                  </div>
                ) : (
                  <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2.5">
                    {slots.map((slot, i) => (
                      <button
                        key={i}
                        onClick={() => setFormData({ ...formData, slot })}
                        className={`p-2.5 rounded-xl text-sm font-medium border transition-all duration-150 hover:scale-[1.03] ${
                          formData.slot?.start === slot.start
                            ? 'bg-cyan-600 text-white border-cyan-600 shadow-md shadow-cyan-500/20'
                            : 'bg-slate-900 text-slate-300 border-slate-700 hover:border-cyan-500/50'
                        }`}
                      >
                        <Clock className="w-3.5 h-3.5 mx-auto mb-1 opacity-60" />
                        {slot.start}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Notes <span className="text-slate-500 font-normal">(optional)</span>
              </label>
              <textarea
                rows={3}
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Describe your symptoms or any special requirements…"
                className="w-full p-3 bg-slate-900 border border-slate-700 rounded-xl text-white text-sm placeholder-slate-600 resize-none focus:outline-none focus:border-cyan-500 transition-colors"
              />
            </div>
          </div>
        )}

        {/* ─── Step 4: Confirm ─── */}
        {step === 4 && (
          <div className="space-y-6">
            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-8 h-8 text-emerald-400" />
              </div>
              <h2 className="text-2xl font-bold text-white">Confirm Appointment</h2>
              <p className="text-slate-400 text-sm mt-1">Please review your details before booking.</p>
            </div>

            {/* Summary card */}
            <div className="bg-slate-950 border border-slate-800 rounded-xl p-6 space-y-4">
              <SummaryRow label="Department"  value={formData.department} icon="🏥" />
              <SummaryRow
                label="Doctor"
                value={`Dr. ${formData.doctor?.userId?.name || 'Unknown'}`}
                sub={formData.doctor?.specialty}
                icon="🩺"
              />
              <SummaryRow
                label="Date"
                value={formatDate(formData.date, 'EEEE, MMM dd yyyy')}
                icon="📅"
              />
              <SummaryRow
                label="Time"
                value={`${formData.slot?.start} – ${formData.slot?.end}`}
                icon="⏰"
              />
              <SummaryRow
                label="Consultation Fee"
                value={formatCurrency(formData.doctor?.fee || 0)}
                icon="💳"
              />
              {formData.notes && (
                <SummaryRow label="Your Notes" value={formData.notes} icon="📝" />
              )}
            </div>
          </div>
        )}

        {/* ─── Navigation ─── */}
        <div className="mt-8 flex justify-between pt-6 border-t border-slate-800">
          <Button variant="outline" onClick={prevStep} disabled={step === 1}>
            <ArrowLeft className="w-4 h-4 mr-2" /> Back
          </Button>
          {step < 4 ? (
            <Button onClick={nextStep} disabled={!canNext()}>
              Next <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          ) : (
            <Button
              variant="primary"
              isLoading={booking}
              onClick={handleBook}
              className="min-w-[160px]"
            >
              <CheckCircle className="w-4 h-4 mr-2" />
              Confirm Booking
            </Button>
          )}
        </div>
      </Card>
    </div>
  );
};

// ─── Helper: Summary row ──────────────────────────────────────────────────────
const SummaryRow = ({ label, value, sub, icon }) => (
  <div className="flex items-start gap-4">
    <span className="text-xl w-7 text-center shrink-0">{icon}</span>
    <div className="flex-1">
      <p className="text-xs text-slate-500 uppercase tracking-wide font-semibold">{label}</p>
      <p className="text-white font-medium mt-0.5">{value}</p>
      {sub && <p className="text-slate-400 text-xs mt-0.5">{sub}</p>}
    </div>
  </div>
);

export default BookAppointment;
