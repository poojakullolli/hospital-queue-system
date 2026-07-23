/**
 * HospitalSettings — Hospital Working Hours & Queue Configuration.
 */
import React, { useState } from 'react';
import toast from 'react-hot-toast';
import {
  Settings, Clock, ShieldAlert, Save, Activity,
  Sliders, Bell, CheckCircle
} from 'lucide-react';

import Card from '../../components/common/Card';
import Button from '../../components/common/Button';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

const HospitalSettings = () => {
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState({
    hospitalName: 'MediQueue Hospital & Medical Center',
    emergency247: true,
    openingTime: '08:00',
    closingTime: '20:00',
    workingDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
    defaultConsultationDuration: 15,
    maxQueueCapacity: 50,
    patientCallLeadTime: 2, // notify 2 patients ahead
    autoAdvanceEnabled: false,
    emergencyBanner: '',
  });

  const toggleDay = (day) => {
    setSettings((s) => ({
      ...s,
      workingDays: s.workingDays.includes(day)
        ? s.workingDays.filter((d) => d !== day)
        : [...s.workingDays, day],
    }));
  };

  const handleSave = () => {
    setSaving(true);
    setTimeout(() => {
      setSaving(false);
      toast.success('Hospital settings and queue configuration saved successfully!');
    }, 600);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Settings className="w-6 h-6 text-cyan-400" /> Hospital & Queue Settings
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Configure system-wide operational hours, emergency modes, and live queue rules.
          </p>
        </div>
        <Button onClick={handleSave} isLoading={saving}>
          <Save className="w-4 h-4 mr-2" /> Save Configuration
        </Button>
      </div>

      {/* ── Hospital Working Hours ── */}
      <Card className="p-6 space-y-6">
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <Clock className="w-6 h-6 text-cyan-400" />
            <div>
              <h2 className="text-lg font-semibold text-white">Hospital Operating Hours</h2>
              <p className="text-xs text-slate-400">Regular outpatient & consultation clinic schedule</p>
            </div>
          </div>

          <label className="flex items-center gap-2 cursor-pointer bg-slate-900 px-3 py-1.5 rounded-xl border border-slate-700">
            <input
              type="checkbox"
              checked={settings.emergency247}
              onChange={(e) => setSettings({ ...settings, emergency247: e.target.checked })}
              className="rounded bg-slate-800 border-slate-600 text-cyan-500 focus:ring-cyan-500"
            />
            <span className="text-xs font-semibold text-emerald-400">24/7 Emergency Active</span>
          </label>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">Hospital Name</label>
            <input
              type="text"
              value={settings.hospitalName}
              onChange={(e) => setSettings({ ...settings, hospitalName: e.target.value })}
              className="w-full p-2.5 bg-slate-900 border border-slate-700 rounded-xl text-white text-sm focus:border-cyan-500 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">Opening Time</label>
              <input
                type="time"
                value={settings.openingTime}
                onChange={(e) => setSettings({ ...settings, openingTime: e.target.value })}
                className="w-full p-2.5 bg-slate-900 border border-slate-700 rounded-xl text-white text-sm focus:border-cyan-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">Closing Time</label>
              <input
                type="time"
                value={settings.closingTime}
                onChange={(e) => setSettings({ ...settings, closingTime: e.target.value })}
                className="w-full p-2.5 bg-slate-900 border border-slate-700 rounded-xl text-white text-sm focus:border-cyan-500 focus:outline-none"
              />
            </div>
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-2">OPD Working Days</label>
          <div className="flex flex-wrap gap-2">
            {DAYS.map((day) => {
              const active = settings.workingDays.includes(day);
              return (
                <button
                  key={day}
                  onClick={() => toggleDay(day)}
                  className={`px-4 py-2 rounded-xl text-xs font-semibold border transition-all ${
                    active
                      ? 'bg-cyan-500/20 border-cyan-500 text-cyan-300'
                      : 'bg-slate-900 border-slate-700 text-slate-500 hover:text-slate-300'
                  }`}
                >
                  {day}
                </button>
              );
            })}
          </div>
        </div>
      </Card>

      {/* ── Queue Management Rules ── */}
      <Card className="p-6 space-y-6">
        <div className="flex items-center gap-3 border-b border-slate-800 pb-4">
          <Sliders className="w-6 h-6 text-indigo-400" />
          <div>
            <h2 className="text-lg font-semibold text-white">Live Queue System Rules</h2>
            <p className="text-xs text-slate-400">Configure global queue thresholds and wait time algorithms</p>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Default Slot Duration (Minutes)
            </label>
            <select
              value={settings.defaultConsultationDuration}
              onChange={(e) => setSettings({ ...settings, defaultConsultationDuration: Number(e.target.value) })}
              className="w-full p-2.5 bg-slate-900 border border-slate-700 rounded-xl text-white text-sm focus:border-cyan-500 focus:outline-none"
            >
              <option value={10}>10 minutes</option>
              <option value={15}>15 minutes (Standard)</option>
              <option value={20}>20 minutes</option>
              <option value={30}>30 minutes</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Max Patients Per Doctor Queue / Day
            </label>
            <input
              type="number"
              value={settings.maxQueueCapacity}
              onChange={(e) => setSettings({ ...settings, maxQueueCapacity: Number(e.target.value) })}
              className="w-full p-2.5 bg-slate-900 border border-slate-700 rounded-xl text-white text-sm focus:border-cyan-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Patient Notification Advance Lead (Positions Ahead)
            </label>
            <select
              value={settings.patientCallLeadTime}
              onChange={(e) => setSettings({ ...settings, patientCallLeadTime: Number(e.target.value) })}
              className="w-full p-2.5 bg-slate-900 border border-slate-700 rounded-xl text-white text-sm focus:border-cyan-500 focus:outline-none"
            >
              <option value={1}>1 position ahead</option>
              <option value={2}>2 positions ahead (Recommended)</option>
              <option value={3}>3 positions ahead</option>
              <option value={5}>5 positions ahead</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              System Broadcast Announcement Banner
            </label>
            <input
              type="text"
              placeholder="e.g. Outpatient registration closes at 6:00 PM"
              value={settings.emergencyBanner}
              onChange={(e) => setSettings({ ...settings, emergencyBanner: e.target.value })}
              className="w-full p-2.5 bg-slate-900 border border-slate-700 rounded-xl text-white text-sm focus:border-cyan-500 focus:outline-none"
            />
          </div>
        </div>
      </Card>
    </div>
  );
};

export default HospitalSettings;
