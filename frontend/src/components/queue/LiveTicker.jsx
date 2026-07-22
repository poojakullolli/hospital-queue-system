import React from 'react';
import { Info } from 'lucide-react';

const LiveTicker = ({ messages = [] }) => {
  if (!messages || messages.length === 0) return null;

  return (
    <div className="bg-cyan-950 text-cyan-200 py-2 border-t border-cyan-900 overflow-hidden relative flex items-center">
      <div className="px-4 bg-cyan-950 z-10 flex items-center gap-2 font-semibold uppercase tracking-wider border-r border-cyan-900">
        <Info className="w-5 h-5" />
        <span>Updates</span>
      </div>
      <div className="whitespace-nowrap flex-1 overflow-hidden">
        <div className="inline-block animate-[marquee_20s_linear_infinite] pl-[100%]">
          {messages.map((msg, i) => (
            <span key={i} className="mx-8 text-lg">• {msg}</span>
          ))}
        </div>
      </div>
      <style>{`
        @keyframes marquee {
          0% { transform: translateX(0); }
          100% { transform: translateX(-100%); }
        }
      `}</style>
    </div>
  );
};

export default LiveTicker;
