import React, { useEffect, useRef, useState } from "react";
import { NavLink } from "react-router-dom";
import { Bell } from "lucide-react";

import notificationsApi from "../config/sub_api/notifications_api";
import { useToast } from "./common/toast/ToastProvider";

const POLL_INTERVAL_MS = 20000;
const MAX_TOASTS_PER_POLL = 3;

export default function NotificationBell({ onNavigate }) {
  const showToast = useToast();

  const [unreadCount, setUnreadCount] = useState(0);
  const lastSeenIdRef = useRef(null);
  const firstLoadRef = useRef(true);

  async function load() {
    try {
      const res = await notificationsApi.list({ limit: 10 });
      const rows = res?.data?.data || [];
      setUnreadCount(res?.data?.unread_count || 0);

      if (rows.length) {
        const newestId = rows[0].id;

        // Skip the very first load (everything would look "new" on page
        // open) — only toast for notifications that arrived since the last
        // poll, so it behaves like a live message rather than a history dump.
        if (!firstLoadRef.current && lastSeenIdRef.current != null) {
          rows
            .filter((row) => row.id > lastSeenIdRef.current)
            .slice(0, MAX_TOASTS_PER_POLL)
            .reverse()
            .forEach((row) => {
              showToast(row.title, {
                type: row.severity === "error" || row.severity === "warning" ? "error" : "success",
                duration: 5000,
              });
            });
        }

        lastSeenIdRef.current = newestId;
        firstLoadRef.current = false;
      }
    } catch {
      // Silent - the badge just won't update this cycle, no need to alarm the user over a poll failure.
    }
  }

  useEffect(() => {
    load();
    const interval = setInterval(load, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, []);

  return (
    <NavLink
      to="/notifications"
      onClick={onNavigate}
      className={({ isActive }) =>
        `relative flex cursor-pointer items-center gap-2.5 rounded-md px-3.5 py-2 text-[12px] font-semibold transition ${
          isActive ? "bg-[#1b3158] text-white" : "text-slate-300 hover:bg-[#16233a] hover:text-white"
        }`
      }
    >
      {({ isActive }) => (
        <>
          <Bell size={15} className={isActive ? "text-[#7fb3ff]" : "text-slate-400"} />
          <span className="flex-1 truncate">Notifications</span>
          {unreadCount > 0 && (
            <span className="flex h-4.5 min-w-4.5 shrink-0 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </>
      )}
    </NavLink>
  );
}
