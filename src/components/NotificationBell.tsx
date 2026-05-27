/**
 * Header notification bell with unread count badge and dropdown panel for in-app notifications.
 */
'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '@/lib/auth-context';
import {
  fetchNotifications,
  markAsRead,
  markAllAsRead,
  getUnreadCount,
  Notification,
} from '@/lib/notifications';

function timeAgo(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const seconds = Math.floor((now - then) / 1000);

  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  return `${months}mo ago`;
}

function typeIcon(type: Notification['type']) {
  switch (type) {
    case 'reply':
      return (
        <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" className="text-[#004B7F]">
          <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
        </svg>
      );
    case 'mention':
      return (
        <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" className="text-[#007B6C]">
          <circle cx="12" cy="12" r="4" />
          <path d="M16 8v5a3 3 0 006 0v-1a10 10 0 10-3.92 7.94" />
        </svg>
      );
    case 'system':
    default:
      return (
        <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" className="text-[#3D5265]">
          <circle cx="12" cy="12" r="10" />
          <path d="M12 16v-4M12 8h.01" />
        </svg>
      );
  }
}

export default function NotificationBell() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  const refreshCount = useCallback(async () => {
    if (!user) { setUnreadCount(0); return; }
    const count = await getUnreadCount(user.id);
    setUnreadCount(count);
  }, [user]);

  const loadNotifications = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const data = await fetchNotifications(user.id);
    setNotifications(data);
    setLoading(false);
  }, [user]);

  // Poll unread count every 30 seconds
  useEffect(() => {
    refreshCount();
    const interval = setInterval(refreshCount, 30000);
    return () => clearInterval(interval);
  }, [refreshCount]);

  // Load full list when dropdown opens
  useEffect(() => {
    if (open) loadNotifications();
  }, [open, loadNotifications]);

  // Close dropdown when clicking outside
  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  const handleMarkAsRead = async (id: string) => {
    await markAsRead(id);
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    setUnreadCount(prev => Math.max(0, prev - 1));
  };

  const handleMarkAllAsRead = async () => {
    if (!user) return;
    await markAllAsRead(user.id);
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    setUnreadCount(0);
  };

  if (!user) return null;

  return (
    <div className="relative" ref={panelRef}>
      {/* Bell button */}
      <button
        onClick={() => setOpen(!open)}
        className="relative p-2 rounded hover:bg-white/10 transition"
        aria-label="Notifications"
      >
        <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" className="text-white">
          <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 01-3.46 0" />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[10px] font-bold text-white bg-red-500 rounded-full leading-none">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown panel */}
      {open && (
        <div className="absolute right-0 mt-2 w-[calc(100vw-2rem)] sm:w-96 max-w-96 bg-white rounded-lg shadow-xl border border-grey-200 z-50 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-grey-100 bg-grey-50">
            <h3 className="text-sm font-semibold text-[#3D5265]">Notifications</h3>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllAsRead}
                className="text-xs font-medium text-[#007B6C] hover:text-[#005f54] transition"
              >
                Mark all as read
              </button>
            )}
          </div>

          {/* Notification list */}
          <div className="max-h-96 overflow-y-auto">
            {loading && notifications.length === 0 && (
              <div className="px-4 py-8 text-center text-sm text-tertiary">
                Loading...
              </div>
            )}

            {!loading && notifications.length === 0 && (
              <div className="px-4 py-8 text-center text-sm text-tertiary">
                No notifications yet
              </div>
            )}

            {notifications.map(notification => {
              const Tag = notification.link ? 'a' : 'button';
              const tagProps = notification.link
                ? { href: notification.link }
                : { type: 'button' as const };
              return (
              <Tag
                key={notification.id}
                {...tagProps}
                onClick={() => {
                  if (!notification.read) handleMarkAsRead(notification.id);
                  setOpen(false);
                }}
                className={`block w-full text-left px-4 py-3 border-b border-grey-50 hover:bg-grey-50 transition ${
                  !notification.read ? 'bg-blue-50/40' : ''
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 shrink-0">
                    {typeIcon(notification.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className={`text-sm truncate ${
                        !notification.read ? 'font-semibold text-[#004B7F]' : 'font-medium text-[#3D5265]'
                      }`}>
                        {notification.title}
                      </p>
                      {!notification.read && (
                        <span className="shrink-0 w-2 h-2 rounded-full bg-[#004B7F]" />
                      )}
                    </div>
                    <p className="text-xs text-tertiary mt-0.5 line-clamp-2">
                      {notification.message}
                    </p>
                    <p className="text-[11px] text-tertiary/60 mt-1">
                      {timeAgo(notification.created_at)}
                    </p>
                  </div>
                </div>
              </Tag>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
