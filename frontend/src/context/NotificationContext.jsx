/**
 * NotificationContext — manages in-app and FCM push notification state.
 */
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import { notificationApi } from '../api/notificationApi';
import { requestFCMToken, onForegroundMessage } from '../config/firebase';
import { useAuth } from './AuthContext';

const NotificationContext = createContext();

export const NotificationProvider = ({ children }) => {
  const { isAuthenticated, user } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  /** Fetch all notifications from the server. */
  const fetchNotifications = useCallback(async () => {
    if (!isAuthenticated) return;
    setLoading(true);
    try {
      const { data } = await notificationApi.getNotifications();
      setNotifications(data?.data?.notifications || data?.data || data?.notifications || []);
    } catch (err) {
      console.error('Failed to fetch notifications:', err.message);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  // Sync FCM device token with backend on login
  useEffect(() => {
    if (isAuthenticated) {
      (async () => {
        const token = await requestFCMToken();
        if (token) {
          try {
            await notificationApi.updateFCMToken(token);
          } catch (err) {
            console.error('FCM Token sync error:', err);
          }
        }
      })();
    }
  }, [isAuthenticated, user]);

  // Listen for FCM foreground push notifications
  useEffect(() => {
    const unsubscribe = onForegroundMessage((payload) => {
      if (payload?.notification) {
        toast(payload.notification.title + '\n' + payload.notification.body, {
          icon: '🔔',
          duration: 6000,
        });
        fetchNotifications();
      }
    });
    return () => unsubscribe();
  }, [fetchNotifications]);

  // Initial load + poll every 45 seconds
  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 45_000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  const markAsRead = async (id) => {
    try {
      await notificationApi.markAsRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n._id === id ? { ...n, isRead: true } : n))
      );
    } catch (err) {
      console.error('markAsRead error:', err.message);
    }
  };

  const markAllAsRead = async () => {
    try {
      await notificationApi.markAllAsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    } catch (err) {
      console.error('markAllAsRead error:', err.message);
    }
  };

  const deleteNotification = async (id) => {
    try {
      await notificationApi.deleteNotification(id);
      setNotifications((prev) => prev.filter((n) => n._id !== id));
    } catch (err) {
      console.error('deleteNotification error:', err.message);
    }
  };

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        loading,
        fetchNotifications,
        markAsRead,
        markAllAsRead,
        deleteNotification,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => useContext(NotificationContext);
