import React from 'react';
import StatCard from '../../components/common/StatCard';
import { Users, Clock, CheckCircle } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

const DoctorDashboard = () => {
  const data = [
    { name: 'Mon', apps: 12 },
    { name: 'Tue', apps: 19 },
    { name: 'Wed', apps: 15 },
    { name: 'Thu', apps: 22 },
    { name: 'Fri', apps: 18 },
  ];

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold text-white">Doctor Dashboard</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard title="Waiting Patients" value="8" icon={Clock} color="amber" />
        <StatCard title="In Progress" value="1" icon={Users} color="cyan" />
        <StatCard title="Completed Today" value="12" icon={CheckCircle} color="emerald" />
      </div>

      <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl h-80">
        <h3 className="text-lg font-semibold text-white mb-6">Appointments This Week</h3>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data}>
            <XAxis dataKey="name" stroke="#64748b" />
            <YAxis stroke="#64748b" />
            <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px' }} />
            <Bar dataKey="apps" fill="#06b6d4" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default DoctorDashboard;
