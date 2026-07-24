import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { authApi } from '../api/authApi';
import toast from 'react-hot-toast';

const AuthContext = createContext();

// Inactivity timeout: 15 minutes (in milliseconds)
const INACTIVITY_TIMEOUT = 15 * 60 * 1000;

export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(() => localStorage.getItem('mediqueue_token'));
  const [user, setUser] = useState(() => {
    try {
      const raw = localStorage.getItem('mediqueue_user');
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  });
  const [isLoading, setIsLoading] = useState(true);
  const inactivityTimerRef = useRef(null);

  useEffect(() => {
    const initAuth = async () => {
      const storedToken = localStorage.getItem('mediqueue_token');
      if (storedToken) {
        try {
          const { data } = await authApi.getMe();
          const meUser = data.user || data.data?.user;
          if (meUser) {
            setUser(meUser);
            localStorage.setItem('mediqueue_user', JSON.stringify(meUser));
          }
        } catch (error) {
          // Clear expired or invalid session data quietly
          localStorage.removeItem('mediqueue_token');
          localStorage.removeItem('mediqueue_user');
          setToken(null);
          setUser(null);
        }
      } else {
        localStorage.removeItem('mediqueue_token');
        localStorage.removeItem('mediqueue_user');
        setToken(null);
        setUser(null);
      }
      setIsLoading(false);
    };
    initAuth();
  }, []);

  const logout = useCallback(async (isAuto = false) => {
    try {
      await authApi.logout();
    } catch (error) {
      console.error('Logout error', error);
    } finally {
      localStorage.removeItem('mediqueue_token');
      localStorage.removeItem('mediqueue_user');
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
      const authToken = data.token || data.accessToken || data.data?.token;
      const userObj = data.user || data.data?.user;

      if (!authToken || !userObj) {
        throw new Error('Invalid response structure from login API.');
      }

      localStorage.setItem('mediqueue_token', authToken);
      localStorage.setItem('mediqueue_user', JSON.stringify(userObj));

      setToken(authToken);
      setUser(userObj);
      return userObj;
    } catch (error) {
      throw error;
    }
  };

  const register = async (userData) => {
    try {
      const { data } = await authApi.register(userData);
      const authToken = data.token || data.accessToken || data.data?.token;
      const userObj = data.user || data.data?.user;

      if (authToken) {
        localStorage.setItem('mediqueue_token', authToken);
        setToken(authToken);
      }
      if (userObj) {
        localStorage.setItem('mediqueue_user', JSON.stringify(userObj));
        setUser(userObj);
      }
      return userObj;
    } catch (error) {
      throw error;
    }
  };

  const updateUser = (userData) => {
    setUser((prev) => {
      const updated = { ...prev, ...userData };
      localStorage.setItem('mediqueue_user', JSON.stringify(updated));
      return updated;
    });
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        isAuthenticated: !!user && !!token,
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
