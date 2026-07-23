/**
 * Doctor Schedule — manage working hours, days, and consultation settings.
 * Loads current settings from API and saves back on submit.
 */
import React, { useState, useEffect } from 'react';
import toast                           from 'react-hot-toast';
import {
  CalendarDays, Clock, DollarSign, Settings,
  Save, RefreshCw, CheckCircle,
} from 'lucide-react';

import { doctorApi } from '../../api/doctorApi';
import { useAuth }   from '../../hooks/useAuth';

import Card    from '../../components/common/Card';
import Button  from '../../components/common/Button';
import Input   from '../../components/common/Input';
import Spinner from '../../components/common/Spinner';
import Select  from '../../components/common/Select';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const DAY_ABBR = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const Schedule = () => {
  const { user } = useAuth();

  const [doctorProfile, setDoctorProfile] = useState(null);
  const [loading, setLoading]             = useState(true);
  const [saving, setSaving]               = useState(false);
  const [saved, setSaved]                 = useState(false);

  const [form, setForm] = useState({
    workingDays:         ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
    startTime:           '09:00',
    endTime:             '17:00',
    consultationDuration:15,
    fee:                 500,
    bio:                 '',
  });

  // ── Load profile ──
  useEffect(() => {
    (async () => {
      try {
        const { data } = await doctorApi.getDoctorProfile();
        const doc = data?.data?.doctor || data?.doctor || null;
        setDoctorProfile(doc);

        if (doc) {
          setForm({
            workingDays:         doc.workingHours?.days || ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
            startTime:           doc.workingHours?.start || '09:00',
            endTime:             doc.workingHours?.end || '17:00',
            consultationDuration:doc.consultationDuration || 15,
            fee:                 doc.fee || 500,
            bio:                 doc.bio || '',
          });
        }
      } catch {
        // graceful — form defaults remain
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const toggleDay = (day) => {
    setForm((f) => ({
      ...f,
      workingDays: f.workingDays.includes(day)
        ? f.workingDays.filter((d) => d !== day)
        : [...f.workingDays, day],
    }));
  };

  const handleSave = async () => {
    if (form.workingDays.length === 0) { toast.error('Please select at least one working day.'); return; }
    if (!doctorProfile?._id) { toast.error('Doctor profile not found.'); return; }
    setSaving(true);
    try {
      await doctorApi.updateDoctor(doctorProfile._id, {
        workingHours: {
          days:  form.workingDays,
          start: form.startTime,
          end:   form.endTime,
        },
        consultationDuration: Number(form.consultationDuration),
        fee: Number(form.fee),
        bio: form.bio,
      });
      toast.success('Schedule saved successfully!');
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save schedule.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <Spinner size="lg" className="mt-24" />;

  return (
    <div className="max-w-3xl mx-auto space-y-8 animate-fade-in">

      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <CalendarDays className="w-6 h-6 text-cyan-400" />
            Manage Schedule
          </h1>
          <p className="text-slate-400 text-sm mt-1">Configure your working hours and consultation settings.</p>
        </div>
      </div>

      {/* Working Days */}
      <Card className="p-6 space-y-5">
        <h2 className="text-lg font-semibold text-white flex items-center gap-2">
          <CalendarDays className="w-5 h-5 text-cyan-400" />
          Working Days
        </h2>
        <div className="flex flex-wrap gap-3">
          {DAYS.map((day, i) => {
            const active = form.workingDays.includes(day);
            return (
              <button
                key={day}
                onClick={() => toggleDay(day)}
                className={`flex flex-col items-center gap-1.5 px-4 py-3 rounded-xl border text-sm font-medium transition-all duration-200 hover:scale-105 ${
                  active
                    ? 'bg-cyan-500/20 border-cyan-500 text-cyan-300 shadow-md shadow-cyan-500/10'
                    : 'bg-slate-900 border-slate-700 text-slate-400 hover:border-slate-500 hover:text-white'
                }`}
              >
                <span className="text-lg">{active ? '✓' : DAY_ABBR[i][0]}</span>
                <span className="text-xs">{DAY_ABBR[i]}</span>
              </button>
            );
          })}
        </div>
        <p className="text-xs text-slate-500">
          {form.workingDays.length} working {form.workingDays.length === 1 ? 'day' : 'days'} selected
        </p>
      </Card>

      {/* Working Hours */}
      <Card className="p-6 space-y-5">
        <h2 className="text-lg font-semibold text-white flex items-center gap-2">
          <Clock className="w-5 h-5 text-cyan-400" />
          Consulting Hours
        </h2>
        <div className="grid sm:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">Start Time</label>
            <input
              type="time"
              value={form.startTime}
              onChange={(e) => setForm((f) => ({ ...f, startTime: e.target.value }))}
              className="w-full px-4 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:border-cyan-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">End Time</label>
            <input
              type="time"
              value={form.endTime}
              onChange={(e) => setForm((f) => ({ ...f, endTime: e.target.value }))}
              className="w-full px-4 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:border-cyan-500"
            />
          </div>
        </div>

        {/* Visual hours bar */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <p className="text-xs text-slate-500 mb-2">Schedule Preview</p>
          <div className="flex items-center gap-2 text-sm">
            <Clock className="w-4 h-4 text-slate-500" />
            <span className="text-cyan-400 font-semibold">{form.startTime}</span>
            <div className="flex-1 h-2 bg-slate-800 rounded-full mx-2">
              <div
                className="h-2 bg-gradient-to-r from-cyan-600 to-indigo-600 rounded-full"
                style={{
                  marginLeft: `${((parseInt(form.startTime) - 6) / 18) * 100}%`,
                  width: `${((parseInt(form.endTime) - parseInt(form.startTime)) / 18) * 100}%`,
                }}
              />
            </div>
            <span className="text-indigo-400 font-semibold">{form.endTime}</span>
          </div>
        </div>
      </Card>

      {/* Consultation Settings */}
      <Card className="p-6 space-y-5">
        <h2 className="text-lg font-semibold text-white flex items-center gap-2">
          <Settings className="w-5 h-5 text-cyan-400" />
          Consultation Settings
        </h2>
        <div className="grid sm:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">Duration per Patient</label>
            <div className="flex gap-2">
              {[10, 15, 20, 30, 45, 60].map((m) => (
                <button
                  key={m}
                  onClick={() => setForm((f) => ({ ...f, consultationDuration: m }))}
                  className={`flex-1 py-2 text-sm font-medium rounded-lg border transition-all ${
                    form.consultationDuration === m
                      ? 'bg-cyan-600 text-white border-cyan-600'
                      : 'bg-slate-900 text-slate-400 border-slate-700 hover:border-slate-500'
                  }`}
                >
                  {m}m
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">
              Consultation Fee (₹)
            </label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input
                type="number"
                value={form.fee}
                min="0"
                step="50"
                onChange={(e) => setForm((f) => ({ ...f, fee: e.target.value }))}
                className="w-full pl-9 pr-4 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:border-cyan-500"
              />
            </div>
          </div>
        </div>

        {/* Bio */}
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1.5">Professional Bio</label>
          <textarea
            rows={3}
            value={form.bio}
            onChange={(e) => setForm((f) => ({ ...f, bio: e.target.value }))}
            placeholder="Describe your speciality, experience, and approach..."
            className="w-full p-3 bg-slate-900 border border-slate-700 rounded-xl text-white text-sm placeholder-slate-600 resize-none focus:outline-none focus:border-cyan-500"
          />
          <p className="text-xs text-slate-600 mt-1">{form.bio.length}/500 characters</p>
        </div>
      </Card>

      {/* Save button */}
      <div className="flex justify-end">
        <Button
          variant="primary"
          size="lg"
          isLoading={saving}
          onClick={handleSave}
          className="min-w-[180px]"
        >
          {saved ? (
            <>
              <CheckCircle className="w-5 h-5 mr-2" />
              Saved!
            </>
          ) : (
            <>
              <Save className="w-5 h-5 mr-2" />
              Save Schedule
            </>
          )}
        </Button>
      </div>
    </div>
  );
};

export default Schedule;
