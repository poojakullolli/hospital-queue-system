/**
 * System Analytics — Full-scale analytics page for Administrators.
 */
import React, { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import {
  BarChart3, TrendingUp, Users, DollarSign, Calendar,
  Activity, RefreshCw, Filter, Shield
} from 'lucide-react';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';

import { adminApi } from '../../api/adminApi';
import StatCard from '../../components/common/StatCard';
import Button from '../../components/common/Button';
import Spinner from '../../components/common/Spinner';
import Card from '../../components/common/Card';
import { formatCurrency } from '../../utils/helpers';

const COLORS = ['#06b6d4', '#6366f1', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6'];

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-slate-800 border border-slate-700 rounded-xl p-3 shadow-xl text-xs">
      <p className="text-slate-400 font-semibold mb-1">{label}</p>
      {payload.map((p) => (
        <p key={p.name} style={{ color: p.color }} className="font-bold">
          {p.name}: {p.name.includes('Revenue') ? formatCurrency(p.value) : p.value}
        </p>
      ))}
    </div>
  );
};

const Analytics = () => {
  const [timeframe, setTimeframe] = useState('30d');
  const [analytics, setAnalytics] = useState(null);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);
    try {
      const [analyticsRes, statsRes] = await Promise.allSettled([
        adminApi.getAnalytics({ timeframe }),
        adminApi.getDashboardStats(),
      ]);

      if (analyticsRes.status === 'fulfilled') {
        setAnalytics(analyticsRes.value.data?.data || analyticsRes.value.data || null);
      }
      if (statsRes.status === 'fulfilled') {
        setStats(statsRes.value.data?.data || statsRes.value.data || null);
      }
    } catch (err) {
      toast.error('Failed to load system analytics.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [timeframe]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  if (loading) return <Spinner size="lg" className="mt-24" />;

  // Mock comprehensive analytics charts
  const volumeTrend = [
    { date: 'Week 1', Total: 120, Completed: 95, Cancelled: 12 },
    { date: 'Week 2', Total: 165, Completed: 140, Cancelled: 15 },
    { date: 'Week 3', Total: 190, Completed: 165, Cancelled: 18 },
    { date: 'Week 4', Total: 210, Completed: 185, Cancelled: 14 },
  ];

  const departmentData = [
    { name: 'Cardiology', Bookings: 145, Revenue: 72500 },
    { name: 'Neurology', Bookings: 110, Revenue: 66000 },
    { name: 'Orthopedics', Bookings: 95, Revenue: 47500 },
    { name: 'Pediatrics', Bookings: 80, Revenue: 32000 },
    { name: 'Dermatology', Bookings: 65, Revenue: 32500 },
  ];

  const statusBreakdown = analytics?.appointmentsByStatus?.map((item, idx) => ({
    name: item._id ? item._id.toUpperCase() : 'UNKNOWN',
    value: item.count,
    color: COLORS[idx % COLORS.length],
  })) || [
    { name: 'COMPLETED', value: stats?.completedAppointments || 85, color: '#10b981' },
    { name: 'PENDING', value: 25, color: '#06b6d4' },
    { name: 'CANCELLED', value: 12, color: '#f43f5e' },
    { name: 'NO-SHOW', value: 6, color: '#f59e0b' },
  ];

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-cyan-400" /> System Analytics & Performance
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Hospital-wide appointment volume, revenue trends, and departmental utilization.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex gap-1 p-1 bg-slate-900 border border-slate-800 rounded-xl">
            {['7d', '30d', '90d'].map((tf) => (
              <button
                key={tf}
                onClick={() => setTimeframe(tf)}
                className={`px-3 py-1 text-xs font-semibold rounded-lg uppercase transition-all ${
                  timeframe === tf
                    ? 'bg-cyan-600 text-white'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {tf}
              </button>
            ))}
          </div>
          <button
            onClick={() => loadData(true)}
            disabled={refreshing}
            className="p-2.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl transition-colors"
          >
            <RefreshCw className={`w-5 h-5 text-slate-400 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Users"
          value={stats?.totalUsers || 0}
          icon={Users}
          color="indigo"
        />
        <StatCard
          title="Active Doctors"
          value={stats?.totalDoctors || 0}
          icon={Activity}
          color="cyan"
        />
        <StatCard
          title="Total Appointments"
          value={stats?.totalAppointments || 0}
          icon={Calendar}
          color="amber"
        />
        <StatCard
          title="Total Revenue"
          value={formatCurrency(stats?.totalRevenue || 0)}
          icon={DollarSign}
          color="emerald"
        />
      </div>

      {/* ── Volume & Completed Area Chart ── */}
      <Card className="p-6">
        <h2 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-cyan-400" />
          Appointment Volume & Completion Trend
        </h2>
        <ResponsiveContainer width="100%" height={280}>
          <AreaChart data={volumeTrend}>
            <defs>
              <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.4} />
                <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="colorCompleted" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
            <XAxis dataKey="date" stroke="#475569" tick={{ fontSize: 12 }} />
            <YAxis stroke="#475569" tick={{ fontSize: 12 }} />
            <Tooltip content={<CustomTooltip />} />
            <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
            <Area type="monotone" dataKey="Total" stroke="#06b6d4" fillOpacity={1} fill="url(#colorTotal)" strokeWidth={2} />
            <Area type="monotone" dataKey="Completed" stroke="#10b981" fillOpacity={1} fill="url(#colorCompleted)" strokeWidth={2} />
          </AreaChart>
        </ResponsiveContainer>
      </Card>

      {/* ── Department Breakdown & Status Pie ── */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Department Revenue & Bookings Bar Chart */}
        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl p-6">
          <h2 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-indigo-400" />
            Bookings by Department
          </h2>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={departmentData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
              <XAxis dataKey="name" stroke="#475569" tick={{ fontSize: 11 }} />
              <YAxis stroke="#475569" tick={{ fontSize: 11 }} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="Bookings" fill="#6366f1" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Status Distribution Pie */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 flex flex-col justify-between">
          <h2 className="text-lg font-semibold text-white mb-4">Status Breakdown</h2>
          <ResponsiveContainer width="100%" height={180}>
            <PieChart>
              <Pie
                data={statusBreakdown}
                innerRadius={50}
                outerRadius={75}
                paddingAngle={4}
                dataKey="value"
              >
                {statusBreakdown.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px' }} />
            </PieChart>
          </ResponsiveContainer>
          <div className="mt-3 space-y-2">
            {statusBreakdown.map((d) => (
              <div key={d.name} className="flex justify-between text-xs text-slate-300">
                <span className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: d.color }} />
                  {d.name}
                </span>
                <span className="font-bold">{d.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Analytics;
