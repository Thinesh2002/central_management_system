import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Bell, Check } from "lucide-react";

import notificationsApi from "../config/sub_api/notifications_api";

const POLL_INTERVAL_MS = 60000;

const SEVERITY_DOT = {
  info: "bg-sky-400",
  warning: "bg-amber-400",
  error: "bg-red-400",
};

function formatRelativeTime(value) {
  if (!value) return "";

  const diffMs = Date.now() - new Date(value).getTime();
  const minutes = Math.floor(diffMs / 60000);

  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;

  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export default function NotificationBell() {
  const navigate = useNavigate();
  const containerRef = useRef(null);

  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);

  async function load() {
    try {
      const res = await notificationsApi.list({ limit: 30 });
      setNotifications(res?.data?.data || []);
      setUnreadCount(res?.data?.unread_count || 0);
    } catch {
      // Silent - the bell just won't update this cycle, no need to alarm the user over a poll failure.
    }
  }

  useEffect(() => {
    load();
    const interval = setInterval(load, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    function handleClickOutside(event) {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  async function handleNotificationClick(notification) {
    if (!notification.is_read) {
      try {
        await notificationsApi.markRead(notification.id);
        setNotifications((prev) =>
          prev.map((row) => (row.id === notification.id ? { ...row, is_read: 1 } : row))
        );
        setUnreadCount((prev) => Math.max(prev - 1, 0));
      } catch {
        // Non-fatal - navigation still proceeds even if marking read failed.
      }
    }

    setOpen(false);
    if (notification.link) navigate(notification.link);
  }

  async function handleMarkAllRead() {
    try {
      await notificationsApi.markAllRead();
      setNotifications((prev) => prev.map((row) => ({ ...row, is_read: 1 })));
      setUnreadCount(0);
    } catch {
      // Silent - user can retry.
    }
  }

  return (
    <div ref={containerRef} className="fixed right-3 top-3 z-30">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="relative flex h-10 w-10 items-center justify-center rounded-lg border border-slate-700 bg-[#0f172a] text-slate-200 shadow-lg shadow-black/40 transition hover:bg-slate-800"
        aria-label="Notifications"
      >
        <Bell size={18} />
        {unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 flex h-4.5 min-w-4.5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 overflow-hidden rounded-lg border border-slate-700 bg-[#0b1220] shadow-2xl shadow-black/50">
          <div className="flex items-center justify-between border-b border-slate-800 bg-slate-900 px-3 py-2">
            <h3 className="text-[13px] font-semibold text-white">Notifications</h3>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={handleMarkAllRead}
                className="flex items-center gap-1 text-[11px] font-semibold text-orange-300 hover:text-orange-200"
              >
                <Check size={11} />
                Mark all read
              </button>
            )}
          </div>

          <div className="max-h-96 overflow-y-auto">
            {!notifications.length ? (
              <p className="px-3 py-8 text-center text-[12px] text-slate-500">No notifications yet.</p>
            ) : (
              notifications.map((notification) => (
                <button
                  key={notification.id}
                  type="button"
                  onClick={() => handleNotificationClick(notification)}
                  className={`flex w-full items-start gap-2 border-b border-slate-800/60 px-3 py-2.5 text-left hover:bg-slate-800/60 ${
                    notification.is_read ? "opacity-60" : ""
                  }`}
                >
                  <span
                    className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${
                      SEVERITY_DOT[notification.severity] || SEVERITY_DOT.info
                    }`}
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block text-[12px] font-semibold text-slate-100">{notification.title}</span>
                    {notification.message && (
                      <span className="mt-0.5 block line-clamp-2 text-[11px] text-slate-400">
                        {notification.message}
                      </span>
                    )}
                    <span className="mt-0.5 block text-[10px] text-slate-600">
                      {formatRelativeTime(notification.created_at)}
                    </span>
                  </span>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
