import React, { createContext, useContext, useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';

const SocketContext = createContext();

export const SocketProvider = ({ children }) => {
  const { token, isAuthenticated } = useAuth();
  const [socket, setSocket] = useState(null);

  useEffect(() => {
    if (isAuthenticated && token) {
      const socketInstance = io(import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000', {
        auth: { token },
      });
      
      setSocket(socketInstance);

      return () => {
        socketInstance.disconnect();
      };
    }
  }, [isAuthenticated, token]);

  const joinQueueRoom = (doctorId) => {
    if (socket) socket.emit('join-queue-room', doctorId);
  };

  const leaveQueueRoom = (doctorId) => {
    if (socket) socket.emit('leave-queue-room', doctorId);
  };

  const joinDoctorRoom = (doctorId) => {
    if (socket) socket.emit('join-doctor-room', doctorId);
  };

  return (
    <SocketContext.Provider value={{ socket, joinQueueRoom, leaveQueueRoom, joinDoctorRoom }}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => useContext(SocketContext);
