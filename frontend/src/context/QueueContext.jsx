import React, { createContext, useContext, useState, useEffect } from 'react';
import { useSocket } from './SocketContext';
import { queueApi } from '../api/queueApi';
import toast from 'react-hot-toast';

const QueueContext = createContext();

export const QueueProvider = ({ children }) => {
  const { socket, joinQueueRoom, leaveQueueRoom } = useSocket();
  const [queueData, setQueueData] = useState({});
  const [position, setPosition] = useState(null);
  const [estimatedWait, setEstimatedWait] = useState(null);
  const [activeDoctorId, setActiveDoctorId] = useState(null);
  const [activeAppointmentId, setActiveAppointmentId] = useState(null);

  useEffect(() => {
    if (!socket) return;

    const handleQueueUpdated = (data) => {
      setQueueData(data?.queue || data);
      if (activeDoctorId && activeAppointmentId) {
        refreshPosition(activeDoctorId, activeAppointmentId);
      }
    };

    const handleAppointmentCalled = (data) => {
      if (data.appointmentId === activeAppointmentId) {
        toast.success('🔔 It is your turn! Please proceed to the doctor\'s cabin.', { duration: 10000 });
      }
    };

    const handleQueueDelayed = (data) => {
      toast.error(`⚠️ Doctor Delay Notice: ${data.minutes} min delay announced. ${data.reason ? `Reason: ${data.reason}` : ''}`, { duration: 8000 });
      if (activeDoctorId && activeAppointmentId) {
        refreshPosition(activeDoctorId, activeAppointmentId);
      }
    };

    const handleEmergencyAdded = () => {
      toast('🚨 Emergency priority patient added to queue.', { icon: 'ℹ️' });
      if (activeDoctorId && activeAppointmentId) {
        refreshPosition(activeDoctorId, activeAppointmentId);
      }
    };

    const handleDoctorStatus = (data) => {
      setQueueData(prev => ({ ...prev, doctorStatus: data.status }));
    };

    socket.on('queue-updated', handleQueueUpdated);
    socket.on('appointment-called', handleAppointmentCalled);
    socket.on('queue-delayed', handleQueueDelayed);
    socket.on('emergency-added', handleEmergencyAdded);
    socket.on('doctor-status-changed', handleDoctorStatus);

    return () => {
      socket.off('queue-updated', handleQueueUpdated);
      socket.off('appointment-called', handleAppointmentCalled);
      socket.off('queue-delayed', handleQueueDelayed);
      socket.off('emergency-added', handleEmergencyAdded);
      socket.off('doctor-status-changed', handleDoctorStatus);
    };
  }, [socket, activeDoctorId, activeAppointmentId]);

  const refreshPosition = async (doctorId, appointmentId) => {
    try {
      const { data } = await queueApi.getQueuePosition(doctorId, appointmentId);
      const res = data?.data || data;
      setPosition(res.position);
      setEstimatedWait(res.estimatedWaitMinutes);
    } catch (error) {
      console.error('Error fetching position', error);
    }
  };

  const subscribeToQueue = async (doctorId, appointmentId) => {
    if (activeDoctorId && activeDoctorId !== doctorId) {
      leaveQueueRoom(activeDoctorId);
    }
    setActiveDoctorId(doctorId);
    setActiveAppointmentId(appointmentId);
    joinQueueRoom(doctorId);
    
    try {
      const { data: qData } = await queueApi.getQueue(doctorId);
      setQueueData(qData?.data || qData);
      await refreshPosition(doctorId, appointmentId);
    } catch (error) {
      console.error('Error subscribing to queue', error);
    }
  };

  const unsubscribeFromQueue = () => {
    if (activeDoctorId) {
      leaveQueueRoom(activeDoctorId);
      setActiveDoctorId(null);
      setActiveAppointmentId(null);
      setPosition(null);
      setEstimatedWait(null);
    }
  };

  return (
    <QueueContext.Provider value={{ queueData, position, estimatedWait, subscribeToQueue, unsubscribeFromQueue }}>
      {children}
    </QueueContext.Provider>
  );
};

export const useQueue = () => useContext(QueueContext);
