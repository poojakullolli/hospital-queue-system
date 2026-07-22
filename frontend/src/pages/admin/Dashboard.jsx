import React from 'react';
import StatCard from '../../components/common/StatCard';
import { Users, Stethoscope, UserCheck, Calendar } from 'lucide-react';
import { LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

const AdminDashboard = () => {
  const lineData = [{ name: '1', val: 40 }, { name: '2', val: 60 }, { name: '3', val: 55 }, { name: '4', val: 80 }];
  const pieData = [{ name: 'Cardio', value: 400 }, { name: 'Neuro', value: 300 }, { name: 'Ortho', value: 300 }];
  const COLORS = ['#06b6d4', '#6366f1', '#10b981'];

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold text-white">Admin Overview</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard title="Total Users" value="1,240" icon={Users} color="indigo" />
        <StatCard title="Doctors" value="45" icon={Stethoscope} color="cyan" />
        <StatCard title="Patients" value="1,150" icon={UserCheck} color="emerald" />
        <StatCard title="Today's Apps" value="128" icon={Calendar} color="amber" />
      </div>

      <div className="grid lg:grid-cols-3 gap-6 h-80">
        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 p-6 rounded-xl">
          <h3 className="text-lg font-semibold text-white mb-4">Appointments Trend</h3>
          <ResponsiveContainer width="100%" height="90%">
            <LineChart data={lineData}>
              <XAxis dataKey="name" stroke="#64748b" />
              <YAxis stroke="#64748b" />
              <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: 'none' }} />
              <Line type="monotone" dataKey="val" stroke="#06b6d4" strokeWidth={3} dot={{r:4}} />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl flex flex-col">
          <h3 className="text-lg font-semibold text-white mb-4">By Department</h3>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={pieData} innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                {pieData.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
              </Pie>
              <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: 'none' }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
