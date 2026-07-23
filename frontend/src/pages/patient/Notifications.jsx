/**
 * NotificationsPage — full-page Notification Centre for patients.
 *
 * Features:
 *   - List all notifications, most recent first
 *   - Unread highlighted in cyan
 *   - Filter: All | Unread
 *   - Mark individual or all as read
 *   - Delete individual notification
 *   - Type-based icons and colours
 */
import React, { useState } from 'react';
import { Bell, Check, CheckCheck, Trash2, Filter } from 'lucide-react';

import { useNotifications } from '../../context/NotificationContext';

import Spinner from '../../components/common/Spinner';
import Button  from '../../components/common/Button';

import { formatDateTime } from '../../utils/helpers';

// ─── Type config ──────────────────────────────────────────────────────────────
const TYPE_CONFIG = {
  'appointment-booked':    { icon: '📅', label: 'Booking',    color: 'cyan'    },
  'appointment-called':    { icon: '🔔', label: 'Called',     color: 'emerald' },
  'appointment-completed': { icon: '✅', label: 'Completed',  color: 'emerald' },
  'queue-update':          { icon: '🏥', label: 'Queue',      color: 'indigo'  },
  'system':                { icon: 'ℹ️', label: 'System',     color: 'slate'   },
};

const colourMap = {
  cyan:    'bg-cyan-500/10 border-cyan-500/20 text-cyan-400',
  emerald: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400',
  indigo:  'bg-indigo-500/10 border-indigo-500/20 text-indigo-400',
  amber:   'bg-amber-500/10 border-amber-500/20 text-amber-400',
  slate:   'bg-slate-700/30 border-slate-700 text-slate-400',
};

// ─── Single notification row ──────────────────────────────────────────────────
const NotificationRow = ({ notification, onMarkRead, onDelete }) => {
  const cfg   = TYPE_CONFIG[notification.type] || TYPE_CONFIG.system;
  const colour = colourMap[cfg.color];

  return (
    <div
      className={`flex items-start gap-4 p-4 rounded-xl border transition-all duration-200 group cursor-pointer ${
        notification.isRead
          ? 'bg-slate-900/40 border-slate-800 opacity-75'
          : 'bg-slate-800/60 border-cyan-500/20 hover:border-cyan-500/40'
      }`}
      onClick={() => !notification.isRead && onMarkRead(notification._id)}
    >
      {/* Icon */}
      <div className={`w-10 h-10 rounded-xl border flex items-center justify-center text-lg shrink-0 ${colour}`}>
        {cfg.icon}
      </div>

      {/* Body */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className={`text-sm font-semibold ${notification.isRead ? 'text-slate-400' : 'text-white'}`}>
              {notification.title}
            </p>
            <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{notification.message}</p>
          </div>
          {!notification.isRead && (
            <span className="w-2.5 h-2.5 rounded-full bg-cyan-500 shrink-0 mt-1 animate-pulse" />
          )}
        </div>

        <div className="flex items-center gap-3 mt-2">
          <span className={`text-xs px-2 py-0.5 rounded-full border ${colour}`}>{cfg.label}</span>
          <span className="text-xs text-slate-600">{formatDateTime(notification.createdAt)}</span>
        </div>
      </div>

      {/* Delete */}
      <button
        onClick={(e) => { e.stopPropagation(); onDelete(notification._id); }}
        className="shrink-0 opacity-0 group-hover:opacity-100 text-slate-600 hover:text-rose-400 transition-all p-1 rounded"
        title="Delete"
      >
        <Trash2 className="w-4 h-4" />
      </button>
    </div>
  );
};

// ─── Main ──────────────────────────────────────────────────────────────────────
const NotificationsPage = () => {
  const {
    notifications, unreadCount, loading,
    fetchNotifications, markAsRead, markAllAsRead, deleteNotification,
  } = useNotifications();

  const [filter, setFilter] = useState('all'); // 'all' | 'unread'

  const displayed = filter === 'unread'
    ? notifications.filter((n) => !n.isRead)
    : notifications;

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-fade-in">

      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Bell className="w-6 h-6 text-cyan-400" />
            Notification Centre
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            {unreadCount > 0
              ? `${unreadCount} unread notification${unreadCount > 1 ? 's' : ''}`
              : 'All caught up!'}
          </p>
        </div>

        <div className="flex gap-2">
          {unreadCount > 0 && (
            <Button size="sm" variant="outline" onClick={markAllAsRead}>
              <CheckCheck className="w-4 h-4 mr-1.5" />
              Mark All Read
            </Button>
          )}
          <Button size="sm" variant="ghost" onClick={fetchNotifications} disabled={loading}>
            <Filter className="w-4 h-4 mr-1.5" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 p-1 bg-slate-900 border border-slate-800 rounded-xl w-fit">
        {[
          { key: 'all',    label: 'All',    count: notifications.length },
          { key: 'unread', label: 'Unread', count: unreadCount          },
        ].map(({ key, label, count }) => (
          <button
            key={key}
            onClick={() => setFilter(key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              filter === key
                ? 'bg-cyan-600 text-white'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            {label}
            <span className={`text-xs px-1.5 py-0.5 rounded-full ${filter === key ? 'bg-white/20' : 'bg-slate-800'}`}>
              {count}
            </span>
          </button>
        ))}
      </div>

      {/* List */}
      {loading ? (
        <Spinner size="md" className="py-16" />
      ) : displayed.length === 0 ? (
        <div className="text-center py-20 bg-slate-900/40 border border-slate-800 rounded-2xl space-y-3">
          <Bell className="w-12 h-12 text-slate-700 mx-auto" />
          <p className="text-slate-500 font-medium">
            {filter === 'unread' ? 'No unread notifications' : 'No notifications yet'}
          </p>
          <p className="text-slate-600 text-sm">
            {filter === 'unread'
              ? 'You are all caught up.'
              : 'Notifications about your appointments will appear here.'}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {displayed.map((n) => (
            <NotificationRow
              key={n._id}
              notification={n}
              onMarkRead={markAsRead}
              onDelete={deleteNotification}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default NotificationsPage;
