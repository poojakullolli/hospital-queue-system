import React from 'react';

const WaitTimeDisplay = ({ minutes = 0, position = 0, totalInQueue = 0 }) => {
  const maxMinutes = 120;
  const percentage = Math.min((minutes / maxMinutes) * 100, 100);
  
  return (
    <div className="flex flex-col items-center justify-center p-6 bg-slate-900 rounded-2xl border border-slate-800">
      <div className="relative w-48 h-48 flex items-center justify-center mb-6">
        <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
          <circle cx="50" cy="50" r="45" fill="none" stroke="#1e293b" strokeWidth="10" />
          <circle 
            cx="50" cy="50" r="45" 
            fill="none" 
            stroke="#06b6d4" 
            strokeWidth="10" 
            strokeDasharray="283" 
            strokeDashoffset={283 - (283 * percentage) / 100}
            className="transition-all duration-1000 ease-out"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
          <span className="text-5xl font-black text-white">{minutes}</span>
          <span className="text-sm font-medium text-slate-400 uppercase tracking-wide">Min Wait</span>
        </div>
      </div>
      <div className="w-full bg-slate-800 rounded-lg p-4 flex justify-between items-center text-sm">
        <div className="text-center flex-1 border-r border-slate-700">
          <p className="text-slate-400 mb-1">Your Position</p>
          <p className="text-xl font-bold text-white">{position}</p>
        </div>
        <div className="text-center flex-1">
          <p className="text-slate-400 mb-1">Total Waiting</p>
          <p className="text-xl font-bold text-white">{totalInQueue}</p>
        </div>
      </div>
    </div>
  );
};

export default WaitTimeDisplay;
