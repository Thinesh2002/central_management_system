import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Bell, Check, ChevronLeft, ChevronRight, Loader2, RotateCcw } from "lucide-react";

import notificationsApi from "../../config/sub_api/notifications_api";

const SEVERITY_DOT = {
  info: "bg-sky-400",
  warning: "bg-amber-400",
  error: "bg-red-400",
};

function formatDate(value) {
  if (!value) return "-";

  try {
    return new Date(value).toLocaleString();
  } catch {
    return value;
  }
}

export default function NotificationsPage() {
  const navigate = useNavigate();

  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [page, setPage] = useState(1);
  const [limit] = useState(30);

  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [pagination, setPagination] = useState({ total: 0, total_pages: 1 });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function load() {
    setLoading(true);
    setError("");

    try {
      const res = await notificationsApi.list({
        page,
        limit,
        from: dateFrom || undefined,
        to: dateTo || undefined,
        unread_only: unreadOnly ? 1 : undefined,
      });

      setNotifications(res?.data?.data || []);
      setUnreadCount(res?.data?.unread_count || 0);
      setPagination(res?.data?.pagination || { total: 0, total_pages: 1 });
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || "Failed to load notifications.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  function applyFilters() {
    setPage(1);
    load();
  }

  function resetFilters() {
    setDateFrom("");
    setDateTo("");
    setUnreadOnly(false);
    setPage(1);
  }

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
    <div className="w-full text-slate-100">
      <div className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <Bell size={18} className="text-orange-300" />
            <h1 className="text-lg font-semibold text-white">Notifications</h1>
            {unreadCount > 0 && (
              <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1.5 text-[11px] font-bold text-white">
                {unreadCount}
              </span>
            )}
          </div>

          {unreadCount > 0 && (
            <button
              type="button"
              onClick={handleMarkAllRead}
              className="flex items-center gap-1.5 self-start rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs font-semibold text-orange-300 hover:border-orange-500 hover:text-orange-200"
            >
              <Check size={13} />
              Mark all read
            </button>
          )}
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4">
          <div className="flex flex-wrap items-center gap-2">
            <input
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              type="date"
              className="h-8 rounded-md border border-slate-700 bg-slate-950 px-2.5 text-xs text-slate-100 outline-none focus:border-orange-500"
            />
            <span className="text-xs text-slate-500">to</span>
            <input
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              type="date"
              className="h-8 rounded-md border border-slate-700 bg-slate-950 px-2.5 text-xs text-slate-100 outline-none focus:border-orange-500"
            />

            <label className="flex h-8 items-center gap-1.5 rounded-md border border-slate-700 bg-slate-950 px-2.5 text-xs text-slate-300">
              <input
                type="checkbox"
                checked={unreadOnly}
                onChange={(e) => setUnreadOnly(e.target.checked)}
                className="h-3.5 w-3.5 rounded border-slate-600 bg-slate-900 accent-orange-500"
              />
              Unread only
            </label>

            <div className="ml-auto flex gap-2">
              <button
                type="button"
                onClick={resetFilters}
                className="flex h-8 items-center gap-1.5 rounded-md border border-slate-700 bg-slate-950 px-3 text-xs font-semibold text-slate-300 hover:border-slate-500"
              >
                <RotateCcw size={12} />
                Reset
              </button>
              <button
                type="button"
                onClick={applyFilters}
                disabled={loading}
                className="flex h-8 items-center gap-1.5 rounded-md bg-orange-500 px-3 text-xs font-semibold text-slate-950 hover:bg-orange-400 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? <Loader2 size={12} className="animate-spin" /> : null}
                Apply
              </button>
            </div>
          </div>
        </div>

        {error && (
          <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-300">
            {error}
          </div>
        )}

        <div className="rounded-2xl border border-slate-800 bg-slate-900/80">
          {loading ? (
            <div className="flex items-center justify-center py-16 text-slate-500">
              <Loader2 size={20} className="animate-spin" />
            </div>
          ) : !notifications.length ? (
            <p className="py-16 text-center text-sm text-slate-500">No notifications found.</p>
          ) : (
            <div className="divide-y divide-slate-800">
              {notifications.map((notification) => (
                <button
                  key={notification.id}
                  type="button"
                  onClick={() => handleNotificationClick(notification)}
                  className={`flex w-full items-start gap-3 px-4 py-3 text-left hover:bg-slate-800/40 ${
                    notification.is_read ? "opacity-60" : ""
                  }`}
                >
                  <span
                    className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${
                      SEVERITY_DOT[notification.severity] || SEVERITY_DOT.info
                    }`}
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold text-slate-100">{notification.title}</span>
                    {notification.message && (
                      <span className="mt-0.5 block text-xs text-slate-400">{notification.message}</span>
                    )}
                    <span className="mt-1 block text-[11px] text-slate-600">
                      {formatDate(notification.created_at)}
                    </span>
                  </span>
                  {!notification.is_read && (
                    <span className="mt-1 shrink-0 rounded-full bg-orange-500/20 px-2 py-0.5 text-[10px] font-semibold text-orange-300">
                      New
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {pagination.total_pages > 1 && (
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>
              Page {pagination.page} of {pagination.total_pages} ({pagination.total} total)
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setPage((prev) => Math.max(prev - 1, 1))}
                disabled={page <= 1}
                className="flex h-8 w-8 items-center justify-center rounded-md border border-slate-700 bg-slate-950 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <ChevronLeft size={14} />
              </button>
              <button
                type="button"
                onClick={() => setPage((prev) => Math.min(prev + 1, pagination.total_pages))}
                disabled={page >= pagination.total_pages}
                className="flex h-8 w-8 items-center justify-center rounded-md border border-slate-700 bg-slate-950 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
