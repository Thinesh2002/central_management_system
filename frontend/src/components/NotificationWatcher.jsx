import { useEffect, useRef } from "react";

import notificationsApi from "../config/sub_api/notifications_api";
import { useToast } from "./common/toast/ToastProvider";

const POLL_INTERVAL_MS = 20000;
const MAX_TOASTS_PER_POLL = 3;

// Headless - no icon, no badge anywhere. Just polls for new notifications
// and surfaces each one as an auto-dismissing toast, "like a message."
export default function NotificationWatcher() {
  const showToast = useToast();
  const lastSeenIdRef = useRef(null);
  const firstLoadRef = useRef(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const res = await notificationsApi.list({ limit: 10 });
        if (cancelled) return;

        const rows = res?.data?.data || [];
        if (!rows.length) return;

        const newestId = rows[0].id;

        // Skip the very first load (everything would look "new" on page
        // open) - only toast for notifications that arrived since the last
        // poll.
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
      } catch {
        // Silent - just skip this poll cycle.
      }
    }

    load();
    const interval = setInterval(load, POLL_INTERVAL_MS);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}
