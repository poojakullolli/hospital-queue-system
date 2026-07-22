import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { queueApi } from '../../api/queueApi';
import { io } from 'socket.io-client';
import { Hospital, UserRound } from 'lucide-react';
import LiveTicker from './LiveTicker';

const QueueBoard = () => {
  const { doctorId } = useParams();
  const [boardData, setBoardData] = useState({ current: null, next: [], doctor: null });

  useEffect(() => {
    const fetchBoard = async () => {
      try {
        const { data } = await queueApi.getQueueBoard(doctorId);
        setBoardData(data);
      } catch (err) {
        console.error(err);
      }
    };
    fetchBoard();

    const socket = io(import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000');
    socket.emit('join-queue-room', doctorId);
    socket.on('queue-updated', fetchBoard);

    return () => {
      socket.disconnect();
    };
  }, [doctorId]);

  const { current, next, doctor } = boardData;

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col overflow-hidden">
      <header className="px-8 py-6 bg-slate-900 border-b border-slate-800 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <Hospital className="w-10 h-10 text-cyan-500" />
          <h1 className="text-3xl font-bold tracking-tight">MediQueue</h1>
        </div>
        <div className="text-right">
          <h2 className="text-2xl font-semibold text-slate-200">{doctor?.name || 'Doctor'}</h2>
          <p className="text-cyan-400">{doctor?.specialty || 'Department'}</p>
        </div>
      </header>

      <main className="flex-1 grid grid-cols-3 gap-8 p-8">
        <div className="col-span-2 flex flex-col">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl p-10 flex-1 flex flex-col items-center justify-center text-center shadow-2xl relative overflow-hidden">
            <div className="absolute inset-0 bg-cyan-500/5 blur-[100px] rounded-full"></div>
            <h3 className="text-3xl text-slate-400 uppercase tracking-widest mb-6 font-medium">Now Serving</h3>
            {current ? (
              <>
                <div className="text-9xl font-black text-cyan-400 mb-8 tracking-tighter drop-shadow-[0_0_30px_rgba(34,211,238,0.4)]">
                  #{current.queueNumber}
                </div>
                <div className="text-4xl text-white font-medium flex items-center justify-center gap-4">
                  <UserRound className="w-10 h-10 text-slate-500" />
                  {current.patientName}
                </div>
              </>
            ) : (
              <div className="text-6xl text-slate-600 font-bold">Waiting...</div>
            )}
          </div>
        </div>

        <div className="col-span-1 flex flex-col bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
          <div className="bg-slate-800 py-4 px-6 border-b border-slate-700">
            <h3 className="text-xl font-bold text-white uppercase tracking-wider">Next Up</h3>
          </div>
          <div className="flex-1 p-4 space-y-4 overflow-y-auto">
            {next && next.length > 0 ? next.slice(0, 5).map((pat, idx) => (
              <div key={idx} className="bg-slate-950 border border-slate-800 p-5 rounded-xl flex justify-between items-center">
                <span className="text-3xl font-bold text-slate-300">#{pat.queueNumber}</span>
                <span className="text-xl text-slate-400">{pat.patientName}</span>
              </div>
            )) : (
              <div className="text-center p-8 text-slate-500">No more patients in queue</div>
            )}
          </div>
        </div>
      </main>

      <LiveTicker messages={['Please have your ID ready', 'Keep masks on in the waiting area', 'Thank you for your patience']} />
    </div>
  );
};

export default QueueBoard;
