import React from 'react';
import Button from '../../components/common/Button';
import Card from '../../components/common/Card';
import { Play, SkipForward, XCircle } from 'lucide-react';

const QueueManager = () => {
  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-white">Queue Manager</h1>
        <Button variant="outline">Take a Break</Button>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <Card className="p-8 border-cyan-500/50 shadow-[0_0_30px_rgba(8,145,178,0.15)] relative overflow-hidden">
            <h3 className="text-sm font-semibold text-cyan-500 uppercase tracking-wider mb-6">Currently Serving</h3>
            <div className="flex justify-between items-start">
              <div>
                <h2 className="text-4xl font-bold text-white mb-2">Jane Smith</h2>
                <p className="text-slate-400">Queue #104 • Female, 32 yrs</p>
              </div>
              <div className="text-3xl font-black text-cyan-400 bg-slate-900 px-6 py-4 rounded-xl border border-slate-700">#104</div>
            </div>
            <div className="mt-8 flex gap-4">
              <Button variant="primary" className="flex-1"><CheckCircleIcon className="w-5 h-5 mr-2" /> Mark Done</Button>
              <Button variant="danger"><XCircle className="w-5 h-5 mr-2" /> No Show</Button>
            </div>
          </Card>
        </div>
        
        <div className="bg-slate-900 rounded-xl border border-slate-800 p-6 flex flex-col h-[500px]">
          <h3 className="text-lg font-semibold text-white mb-4">Waiting List</h3>
          <div className="flex-1 overflow-y-auto space-y-3 pr-2">
            {[105, 106, 107].map(num => (
              <div key={num} className="bg-slate-800 p-4 rounded-lg flex justify-between items-center">
                <span className="font-bold text-slate-300">#{num}</span>
                <span className="text-slate-400">Patient Name</span>
              </div>
            ))}
          </div>
          <div className="pt-4 mt-4 border-t border-slate-800">
            <Button className="w-full"><SkipForward className="w-5 h-5 mr-2" /> Call Next Patient</Button>
          </div>
        </div>
      </div>
    </div>
  );
};

const CheckCircleIcon = ({className}) => <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>;

export default QueueManager;
