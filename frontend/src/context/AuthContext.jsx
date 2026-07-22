import React, { createContext, useContext, useState, useEffect } from 'react';
import { authApi } from '../api/authApi';
import toast from 'react-hot-toast';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('mediqueue_token'));
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const initAuth = async () => {
      if (token) {
        try {
          const { data } = await authApi.getMe();
          setUser(data.user);
        } catch (error) {
          console.error('Auth init error:', error);
          localStorage.removeItem('mediqueue_token');
          setToken(null);
        }
      }
      setIsLoading(false);
    };
    initAuth();
  }, [token]);

  const login = async (credentials) => {
    try {
      const { data } = await authApi.login(credentials);
      localStorage.setItem('mediqueue_token', data.token);
      setToken(data.token);
      setUser(data.user);
      toast.success('Login successful!');
      return data.user;
    } catch (error) {
      toast.error(error.response?.data?.message || 'Login failed');
      throw error;
    }
  };

  const register = async (userData) => {
    try {
      const { data } = await authApi.register(userData);
      localStorage.setItem('mediqueue_token', data.token);
      setToken(data.token);
      setUser(data.user);
      toast.success('Registration successful!');
      return data.user;
    } catch (error) {
      toast.error(error.response?.data?.message || 'Registration failed');
      throw error;
    }
  };

  const logout = async () => {
    try {
      await authApi.logout();
    } catch (error) {
      console.error('Logout error', error);
    } finally {
      localStorage.removeItem('mediqueue_token');
      setToken(null);
      setUser(null);
      toast.success('Logged out successfully');
    }
  };

  const updateUser = (userData) => {
    setUser({ ...user, ...userData });
  };

  return (
    <AuthContext.Provider value={{ user, token, isLoading, isAuthenticated: !!user, login, register, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
