import React from 'react';
import Card from '../common/Card';
import Badge from '../common/Badge';
import { getStatusColor, getStatusLabel } from '../../utils/helpers';
import { Clock } from 'lucide-react';

const QueueCard = ({ appointment, position, estimatedWait, isCurrentlyCalled }) => {
  if (!appointment) return null;

  return (
    <Card className={`p-6 relative overflow-hidden transition-all duration-300 ${isCurrentlyCalled ? 'animate-pulse-glow border-cyan-500' : ''}`}>
      {isCurrentlyCalled && (
        <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-cyan-500 to-indigo-500"></div>
      )}
      <div className="flex justify-between items-start mb-4">
        <div>
          <p className="text-sm text-slate-400 font-medium uppercase tracking-wider mb-1">Queue Number</p>
          <div className="text-4xl font-bold text-white bg-slate-900 inline-block px-4 py-2 rounded-lg border border-slate-700">
            #{appointment.queueNumber || '--'}
          </div>
        </div>
        <Badge className={getStatusColor(appointment.status)}>
          {getStatusLabel(appointment.status)}
        </Badge>
      </div>
      
      <div className="grid grid-cols-2 gap-4 mt-6 p-4 bg-slate-900/50 rounded-xl border border-slate-800">
        <div>
          <p className="text-xs text-slate-400 mb-1">Position in Queue</p>
          <p className="text-xl font-semibold text-white">{position || '--'}</p>
        </div>
        <div>
          <p className="text-xs text-slate-400 mb-1 flex items-center"><Clock className="w-3 h-3 mr-1" /> Est. Wait</p>
          <p className="text-xl font-semibold text-white">{estimatedWait ? `${estimatedWait} mins` : '--'}</p>
        </div>
      </div>
      
      {isCurrentlyCalled && (
        <div className="mt-4 text-center p-2 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-lg font-bold animate-pulse">
          IT IS YOUR TURN!
        </div>
      )}
    </Card>
  );
};

export default QueueCard;
