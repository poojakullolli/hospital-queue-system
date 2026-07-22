import React from 'react';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import { Plus, Activity } from 'lucide-react';

const Departments = () => {
  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-white">Departments</h1>
        <Button size="sm"><Plus className="w-4 h-4 mr-2" /> Add Department</Button>
      </div>
      
      <div className="grid md:grid-cols-3 lg:grid-cols-4 gap-6">
        {['Cardiology', 'Neurology', 'Orthopedics', 'Pediatrics'].map(dept => (
          <Card key={dept} className="p-6 hover border border-slate-800 flex flex-col items-center text-center">
            <div className="w-12 h-12 bg-cyan-500/10 text-cyan-400 rounded-xl flex items-center justify-center mb-4">
              <Activity className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">{dept}</h3>
            <p className="text-sm text-slate-400 mb-4">12 Doctors Active</p>
            <div className="flex gap-2 mt-auto w-full">
              <Button variant="outline" size="sm" className="flex-1">Edit</Button>
              <Button variant="danger" size="sm" className="flex-1">Delete</Button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default Departments;
