import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { authApi } from '../api/authApi';
import toast from 'react-hot-toast';

const AuthContext = createContext();

// Inactivity timeout: 15 minutes (in milliseconds)
const INACTIVITY_TIMEOUT = 15 * 60 * 1000;

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('mediqueue_token'));
  const [isLoading, setIsLoading] = useState(true);
  const inactivityTimerRef = useRef(null);

  useEffect(() => {
    const initAuth = async () => {
      if (token) {
        try {
          const { data } = await authApi.getMe();
          setUser(data.user);
        } catch (error) {
          // Quietly clear expired/invalid token
          localStorage.removeItem('mediqueue_token');
          setToken(null);
          setUser(null);
        }
      }
      setIsLoading(false);
    };
    initAuth();
  }, [token]);

  const logout = useCallback(async (isAuto = false) => {
    try {
      await authApi.logout();
    } catch (error) {
      console.error('Logout error', error);
    } finally {
      localStorage.removeItem('mediqueue_token');
      setToken(null);
      setUser(null);
      if (isAuto) {
        toast.error('Session expired due to inactivity. Please log in again.');
      } else {
        toast.success('Logged out successfully');
      }
    }
  }, []);

  // Inactivity Timer Listener
  const resetInactivityTimer = useCallback(() => {
    if (inactivityTimerRef.current) {
      clearTimeout(inactivityTimerRef.current);
    }
    if (token && user) {
      inactivityTimerRef.current = setTimeout(() => {
        logout(true);
      }, INACTIVITY_TIMEOUT);
    }
  }, [token, user, logout]);

  useEffect(() => {
    if (!token || !user) return;

    const events = ['mousemove', 'keydown', 'scroll', 'click', 'touchstart'];
    const handleUserActivity = () => resetInactivityTimer();

    events.forEach((evt) => window.addEventListener(evt, handleUserActivity));
    resetInactivityTimer();

    return () => {
      events.forEach((evt) => window.removeEventListener(evt, handleUserActivity));
      if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current);
    };
  }, [token, user, resetInactivityTimer]);

  const login = async (credentials) => {
    try {
      const { data } = await authApi.login(credentials);
      const authToken = data.token || data.accessToken;
      localStorage.setItem('mediqueue_token', authToken);
      setToken(authToken);
      setUser(data.user);
      return data.user;
    } catch (error) {
      throw error;
    }
  };

  const register = async (userData) => {
    try {
      const { data } = await authApi.register(userData);
      const authToken = data.token || data.accessToken;
      localStorage.setItem('mediqueue_token', authToken);
      setToken(authToken);
      setUser(data.user);
      return data.user;
    } catch (error) {
      throw error;
    }
  };

  const updateUser = (userData) => {
    setUser((prev) => ({ ...prev, ...userData }));
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        isAuthenticated: !!user,
        login,
        register,
        logout: () => logout(false),
        updateUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
