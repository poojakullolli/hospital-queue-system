import React, { useState } from 'react';
import EmptyState from '../../components/common/EmptyState';
import { Calendar } from 'lucide-react';

const MyAppointments = () => {
  const [filter, setFilter] = useState('upcoming');

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-white">My Appointments</h1>
      
      <div className="flex space-x-2 border-b border-slate-800 pb-2">
        {['all', 'upcoming', 'completed', 'cancelled'].map(f => (
          <button key={f} onClick={() => setFilter(f)} className={`px-4 py-2 text-sm font-medium rounded-lg capitalize ${filter === f ? 'bg-cyan-500/10 text-cyan-400' : 'text-slate-400 hover:text-white'}`}>
            {f}
          </button>
        ))}
      </div>

      <EmptyState 
        icon={Calendar} 
        title="No Appointments Found" 
        description="You have no appointments matching the selected filter." 
      />
    </div>
  );
};

export default MyAppointments;
