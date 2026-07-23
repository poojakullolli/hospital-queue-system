/**
 * NotificationContext — manages in-app notification state.
 *
 * Provides:
 *   notifications     — array of notification objects
 *   unreadCount       — number of unread notifications
 *   fetchNotifications— manually refresh
 *   markAsRead(id)    — mark one as read
 *   markAllAsRead()   — mark all as read
 *   deleteNotification(id) — delete one
 */
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { notificationApi } from '../api/notificationApi';
import { useAuth } from './AuthContext';

const NotificationContext = createContext();

export const NotificationProvider = ({ children }) => {
  const { isAuthenticated } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  /** Fetch all notifications from the server. */
  const fetchNotifications = useCallback(async () => {
    if (!isAuthenticated) return;
    setLoading(true);
    try {
      const { data } = await notificationApi.getNotifications();
      setNotifications(data?.data?.notifications || data?.notifications || []);
    } catch (err) {
      // Silently fail — notifications are non-critical
      console.error('Failed to fetch notifications:', err.message);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  // Initial load + poll every 60 seconds (lightweight real-time alternative)
  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 60_000);
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
