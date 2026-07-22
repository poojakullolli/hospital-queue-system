import React, { useEffect, useState } from 'react';
import QueueCard from '../../components/queue/QueueCard';
import WaitTimeDisplay from '../../components/queue/WaitTimeDisplay';
import { useQueue } from '../../hooks/useQueue';
import Spinner from '../../components/common/Spinner';

const QueueTracker = () => {
  const { queueData, position, estimatedWait, subscribeToQueue } = useQueue();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Mock auto-subscribe to an appointment
    subscribeToQueue('doc1', 'app1');
    setTimeout(() => setLoading(false), 1000);
  }, []);

  if (loading) return <Spinner size="lg" className="mt-20" />;

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-white">Live Queue Tracker</h1>
        <div className="flex items-center gap-2 text-sm">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
          <span className="text-slate-400">Live Updates Active</span>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-8">
        <div>
          <h3 className="text-lg font-semibold text-slate-300 mb-4">Your Details</h3>
          <QueueCard 
            appointment={{ queueNumber: '104', status: 'waiting' }} 
            position={position || 4} 
            estimatedWait={estimatedWait || 25} 
            isCurrentlyCalled={position === 1}
          />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-slate-300 mb-4">Wait Time Estimate</h3>
          <WaitTimeDisplay minutes={estimatedWait || 25} position={position || 4} totalInQueue={queueData?.totalWaiting || 12} />
        </div>
      </div>
    </div>
  );
};

export default QueueTracker;
