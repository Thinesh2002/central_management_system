import { useEffect, useRef, useState } from "react";
import { Package, X } from "lucide-react";

import notificationsApi from "../config/sub_api/notifications_api";
import { useToast } from "./common/toast/ToastProvider";
import { usePageOverlay } from "./common/page_overlay/PageOverlayProvider";

const POLL_INTERVAL_MS = 20000;
const MAX_TOASTS_PER_POLL = 3;
const ORDER_CARD_DURATION_MS = 12000;

const RAW_API_BASE_URL = String(
  import.meta.env.VITE_API_BASE_URL || "https://backend.teckvora.com/api"
).replace(/\/$/, "");
const BACKEND_BASE_URL = RAW_API_BASE_URL.replace(/\/api$/, "");

function buildImageUrl(value) {
  if (!value) return "";
  const url = String(value).trim();
  if (!url) return "";

  if (url.startsWith("http://") || url.startsWith("https://") || url.startsWith("data:")) {
    return url;
  }
  if (url.startsWith("//")) return `https:${url}`;
  if (url.startsWith("/")) return `${BACKEND_BASE_URL}${url}`;
  return `${BACKEND_BASE_URL}/${url}`;
}

function money(value) {
  const number = Number(value || 0);
  return number.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// Desktop notifications need the browser's permission exactly once - ask
// only when we're about to show the first real one, and only if the user
// has never answered before ("default"); once they grant or deny it,
// the browser remembers, so this never nags on every login.
async function ensureDesktopPermission() {
  if (typeof window === "undefined" || !("Notification" in window)) return false;
  if (Notification.permission === "granted") return true;
  if (Notification.permission !== "default") return false;

  try {
    const result = await Notification.requestPermission();
    return result === "granted";
  } catch {
    return false;
  }
}

function showDesktopNotification(row) {
  ensureDesktopPermission().then((granted) => {
    if (!granted) return;

    try {
      const data = row.data || {};
      const notification = new Notification(row.title, {
        body: row.message || "",
        icon: buildImageUrl(data.image_url) || "/icon.png",
        tag: `notification-${row.id}`,
      });

      notification.onclick = () => {
        window.focus();
        notification.close();
      };
    } catch {
      // Some browsers (e.g. backgrounded mobile) can throw constructing a
      // Notification directly - the in-app card below still covers it.
    }
  });
}

// Headless for plain notifications - just polls and surfaces each as an
// auto-dismissing toast "like a message." A "new_order" notification gets
// richer treatment instead: a desktop notification plus a bottom-right
// order preview card (image, customer, total) that stays up long enough
// to actually notice.
export default function NotificationWatcher() {
  const showToast = useToast();
  const { openOverlay } = usePageOverlay();
  const lastSeenIdRef = useRef(null);
  const firstLoadRef = useRef(true);
  const [orderCards, setOrderCards] = useState([]);
  const dismissTimers = useRef({});

  function dismissOrderCard(id) {
    setOrderCards((prev) => prev.filter((card) => card.id !== id));
    if (dismissTimers.current[id]) {
      clearTimeout(dismissTimers.current[id]);
      delete dismissTimers.current[id];
    }
  }

  function pushOrderCard(row) {
    setOrderCards((prev) => [...prev, row]);
    dismissTimers.current[row.id] = setTimeout(
      () => dismissOrderCard(row.id),
      ORDER_CARD_DURATION_MS
    );
    showDesktopNotification(row);
  }

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
        // open) - only surface notifications that arrived since the last
        // poll.
        if (!firstLoadRef.current && lastSeenIdRef.current != null) {
          const freshRows = rows
            .filter((row) => row.id > lastSeenIdRef.current)
            .reverse();

          freshRows.forEach((row) => {
            if (row.type === "new_order") {
              pushOrderCard(row);
              return;
            }
          });

          freshRows
            .filter((row) => row.type !== "new_order")
            .slice(0, MAX_TOASTS_PER_POLL)
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

  useEffect(() => {
    return () => {
      Object.values(dismissTimers.current).forEach(clearTimeout);
    };
  }, []);

  if (!orderCards.length) return null;

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-4 z-[200] flex flex-col items-center gap-2 px-4 sm:items-end sm:pr-6">
      {orderCards.map((row) => {
        const data = row.data || {};
        const image = buildImageUrl(data.image_url);

        return (
          <div
            key={row.id}
            className="pointer-events-auto flex w-full max-w-sm items-start gap-3 border border-emerald-500/40 bg-[#0b1220] p-3 shadow-2xl shadow-black/50"
          >
            <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-sm border border-slate-700 bg-slate-900">
              {image ? (
                <img
                  src={image}
                  alt={data.product_title || "Product"}
                  className="h-full w-full object-cover"
                  onError={(event) => {
                    event.currentTarget.style.display = "none";
                  }}
                />
              ) : (
                <Package size={20} className="text-slate-600" />
              )}
            </div>

            <div className="min-w-0 flex-1">
              <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-emerald-400">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
                New Order
              </p>

              <p className="mt-0.5 truncate text-sm font-bold text-white" title={row.title}>
                {row.title}
              </p>

              <p className="mt-0.5 truncate text-xs text-slate-400" title={data.product_title || ""}>
                {data.product_title || "-"}
                {data.sku ? ` · ${data.sku}` : ""}
              </p>

              <div className="mt-1 flex items-center justify-between gap-2">
                <span className="text-xs font-semibold text-slate-300">
                  {data.customer_name || "Customer"} — LKR {money(data.grand_total)}
                </span>
              </div>

              <button
                type="button"
                onClick={() => {
                  dismissOrderCard(row.id);
                  if (row.link) openOverlay(row.link);
                }}
                className="mt-2 cursor-pointer text-xs font-bold text-emerald-400 underline decoration-dotted hover:text-emerald-300"
              >
                View Order →
              </button>
            </div>

            <button
              type="button"
              onClick={() => dismissOrderCard(row.id)}
              className="shrink-0 cursor-pointer text-slate-500 hover:text-white"
              aria-label="Dismiss"
            >
              <X size={14} />
            </button>
          </div>
        );
      })}
    </div>
  );
}
