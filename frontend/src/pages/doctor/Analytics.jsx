/**
 * DoctorAnalytics — dashboard analytics for the logged-in doctor.
 *
 * Sections:
 *  ─ KPI strip (total served / avg per day / rating / revenue)
 *  ─ 30-day appointment trend (LineChart)
 *  ─ Status distribution pie (PieChart)
 *  ─ Top patient return visits
 */
import React, { useState, useEffect, useCallback } from 'react';
import {
  TrendingUp, Users, Star, DollarSign, Activity,
  RefreshCw, BarChart2,
} from 'lucide-react';
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer,
} from 'recharts';

import { doctorApi }      from '../../api/doctorApi';
import { appointmentApi } from '../../api/appointmentApi';

import StatCard from '../../components/common/StatCard';
import Spinner  from '../../components/common/Spinner';
import Card     from '../../components/common/Card';

import { formatDate, formatCurrency } from '../../utils/helpers';

// ─── Colours ──────────────────────────────────────────────────────────────────
const COLOURS = {
  completed:  '#10b981',
  cancelled:  '#f43f5e',
  'no-show':  '#f59e0b',
  pending:    '#06b6d4',
  confirmed:  '#6366f1',
};

const ChartTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-slate-800 border border-slate-700 rounded-xl p-3 shadow-xl text-sm">
      <p className="text-slate-400 text-xs mb-2">{label}</p>
      {payload.map((p) => (
        <p key={p.name} style={{ color: p.color }} className="font-semibold">
          {p.name}: {p.value}
        </p>
      ))}
    </div>
  );
};

const DoctorAnalytics = () => {
  const [doctorProfile, setDoctorProfile] = useState(null);
  const [appointments, setAppointments]   = useState([]);
  const [loading, setLoading]             = useState(true);
  const [refreshing, setRefreshing]       = useState(false);

  const loadData = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);
    try {
      const [profileRes, aptRes] = await Promise.allSettled([
        doctorApi.getDoctorProfile(),
        appointmentApi.getDoctorAppointments({ limit: 200 }),
      ]);

      if (profileRes.status === 'fulfilled') {
        setDoctorProfile(profileRes.value.data?.data?.doctor || profileRes.value.data?.doctor || null);
      }
      if (aptRes.status === 'fulfilled') {
        const apts = aptRes.value.data?.data?.appointments || aptRes.value.data?.appointments || [];
        setAppointments(apts);
      }
    } catch (err) {
      console.error('Analytics load error:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  // ── Derived metrics ──
  const completedApts  = appointments.filter((a) => a.status === 'completed');
  const cancelledApts  = appointments.filter((a) => a.status === 'cancelled');
  const noShowApts     = appointments.filter((a) => a.status === 'no-show');
  const totalRevenue   = completedApts.reduce((s, a) => s + (a.consultationFee || doctorProfile?.fee || 0), 0);
  const avgPerDay      = appointments.length
    ? (appointments.length / 30).toFixed(1)
    : '0.0';

  // ── Status pie data ──
  const pieData = [
    { name: 'Completed', value: completedApts.length,  color: COLOURS.completed  },
    { name: 'Cancelled', value: cancelledApts.length,  color: COLOURS.cancelled  },
    { name: 'No-Show',   value: noShowApts.length,     color: COLOURS['no-show'] },
    { name: 'Pending',   value: appointments.filter((a) => a.status === 'pending').length, color: COLOURS.pending },
  ].filter((d) => d.value > 0);

  // ── 30-day trend data ──
  const trendData = (() => {
    const days = [];
    for (let i = 29; i >= 0; i--) {
      const d   = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toDateString();
      const dayApts = appointments.filter((a) => new Date(a.date).toDateString() === key);
      days.push({
        date:      formatDate(d, 'MMM dd'),
        Total:     dayApts.length,
        Completed: dayApts.filter((a) => a.status === 'completed').length,
      });
    }
    return days;
  })();

  // ── Patient frequency ──
  const patientFreq = (() => {
    const map = {};
    appointments.forEach((a) => {
      const id   = a.patientId?._id;
      const name = a.patientId?.name || 'Unknown';
      if (!id) return;
      map[id] = map[id] || { name, visits: 0 };
      map[id].visits++;
    });
    return Object.values(map)
      .sort((a, b) => b.visits - a.visits)
      .slice(0, 5);
  })();

  if (loading) return <Spinner size="lg" className="mt-24" />;

  return (
    <div className="space-y-8 animate-fade-in">

      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <BarChart2 className="w-6 h-6 text-cyan-400" />
            Analytics
          </h1>
          <p className="text-slate-400 text-sm mt-1">Last 30 days overview</p>
        </div>
        <button
          onClick={() => loadData(true)}
          disabled={refreshing}
          className="p-2.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl"
        >
          <RefreshCw className={`w-5 h-5 text-slate-400 ${refreshing ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Patients Served"
          value={completedApts.length}
          icon={Users}
          color="cyan"
        />
        <StatCard
          title="Avg / Day (30d)"
          value={avgPerDay}
          icon={Activity}
          color="indigo"
        />
        <StatCard
          title="Patient Rating"
          value={`${doctorProfile?.rating?.toFixed(1) || '4.5'} ★`}
          icon={Star}
          color="amber"
        />
        <StatCard
          title="Est. Revenue"
          value={formatCurrency(totalRevenue)}
          icon={DollarSign}
          color="emerald"
        />
      </div>

      {/* Charts grid */}
      <div className="grid lg:grid-cols-3 gap-6">

        {/* 30-day trend */}
        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl p-6">
          <h3 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-cyan-400" />
            30-Day Appointment Trend
          </h3>
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={trendData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
              <XAxis
                dataKey="date"
                stroke="#475569"
                tick={{ fontSize: 11 }}
                interval={4}
              />
              <YAxis stroke="#475569" tick={{ fontSize: 11 }} allowDecimals={false} />
              <Tooltip content={<ChartTooltip />} />
              <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '12px' }} />
              <Line type="monotone" dataKey="Total"     stroke="#06b6d4" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="Completed" stroke="#10b981" strokeWidth={2} dot={false} strokeDasharray="4 2" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Status pie */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
          <h3 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
            <Activity className="w-5 h-5 text-cyan-400" />
            Status Breakdown
          </h3>
          {pieData.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie
                    data={pieData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={3}
                  >
                    {pieData.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px', fontSize: '13px' }}
                  />
                </PieChart>
              </ResponsiveContainer>
              {/* Legend */}
              <div className="mt-3 space-y-2">
                {pieData.map((d) => (
                  <div key={d.name} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: d.color }} />
                      <span className="text-slate-400">{d.name}</span>
                    </div>
                    <span className="font-semibold text-white">{d.value}</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="text-center py-10 text-slate-500">No data yet</div>
          )}
        </div>
      </div>

      {/* Top returning patients */}
      {patientFreq.length > 0 && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Users className="w-5 h-5 text-cyan-400" />
            Top Returning Patients
          </h3>
          <div className="space-y-3">
            {patientFreq.map((p, i) => (
              <div key={i} className="flex items-center gap-4">
                <span className="text-slate-600 text-sm w-5 text-right shrink-0">{i + 1}.</span>
                <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-xs font-bold text-white shrink-0">
                  {p.name[0]}
                </div>
                <span className="text-slate-300 text-sm flex-1 truncate">{p.name}</span>
                <div className="flex-1 max-w-[200px]">
                  <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className="h-2 bg-gradient-to-r from-cyan-600 to-indigo-600 rounded-full"
                      style={{ width: `${(p.visits / patientFreq[0].visits) * 100}%` }}
                    />
                  </div>
                </div>
                <span className="text-cyan-400 text-sm font-semibold shrink-0 w-16 text-right">
                  {p.visits} {p.visits === 1 ? 'visit' : 'visits'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default DoctorAnalytics;
