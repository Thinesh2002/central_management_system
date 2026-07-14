import { useEffect, useState } from "react";
import { CalendarClock, MapPin, Package, Truck, User, X } from "lucide-react";
import ordersApi from "../../../../config/sub_api/order_management_api/orders_api";
import { getApiError } from "../../../../config/api";

function text(value, fallback = "-") {
  if (value === null || value === undefined || value === "") return fallback;
  return String(value);
}

function niceDate(value) {
  if (!value) return "-";
  try {
    return new Date(value).toLocaleString();
  } catch {
    return "-";
  }
}

// Trans Express's exact per-entry shape for status_history wasn't confirmed
// beyond its name in their docs, so this reads defensively across the
// spellings a snake_case API is likely to use.
function historyText(entry) {
  if (!entry) return "-";
  if (typeof entry === "string") return entry;
  return entry.status || entry.order_status || entry.remark || entry.description || entry.title || "-";
}

function historyDate(entry) {
  if (!entry || typeof entry !== "object") return null;
  return entry.date || entry.updated_at || entry.created_at || entry.time || null;
}

function InfoLine({ icon: Icon, label, value }) {
  return (
    <div className="flex items-start gap-2">
      {Icon && <Icon size={13} className="mt-0.5 shrink-0 text-purple-300" />}
      <div className="min-w-0">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">{label}</p>
        <p className="mt-0.5 break-words text-[12px] font-semibold text-slate-200">{text(value)}</p>
      </div>
    </div>
  );
}

// Same purple-header popup language as the rest of this session's modals.
// Trans Express's tracking fields are shaped nothing like Daraz's (no
// package_id, different address breakdown), so this is a dedicated modal
// rather than reusing Daraz's TrackOrderModal.
export default function WaybillTrackingModal({ open, onClose, order }) {
  const [tracking, setTracking] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open || !order) return undefined;

    let cancelled = false;
    setLoading(true);
    setError("");
    setTracking(null);

    ordersApi
      .getTracking("local", order.source_order_id)
      .then((res) => {
        if (!cancelled) setTracking(res?.data || {});
      })
      .catch((err) => {
        if (!cancelled) setError(getApiError(err, "Failed to load tracking"));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [open, order]);

  if (!open || !order) return null;

  const history = Array.isArray(tracking?.status_history) ? tracking.status_history : [];

  return (
    <div
      className="fixed inset-0 z-60 flex items-center justify-center bg-slate-950/75 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="flex max-h-[85vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-purple-500/40 bg-slate-950"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex h-12 shrink-0 items-center justify-between gap-3 border-b border-purple-500/30 bg-linear-to-r from-purple-950 via-[#1a1033] to-purple-950 px-4">
          <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-purple-300">
            <Truck size={15} />
            Track My Order
          </div>
          <button
            type="button"
            onClick={onClose}
            title="Close"
            className="flex h-7 w-7 items-center justify-center rounded-full border border-purple-500/40 bg-purple-500/10 text-purple-200 transition hover:bg-purple-500/25 hover:text-white"
          >
            <X size={14} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <p className="py-6 text-center text-[12px] text-slate-500">Loading tracking...</p>
          ) : error ? (
            <div className="rounded-md border border-red-900 bg-red-950 p-3 text-[11px] text-red-300">{error}</div>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 rounded-md border border-slate-800 bg-[#070b16] p-3">
                <InfoLine icon={Package} label="Waybill ID" value={tracking?.waybill_id || order.waybill_id} />
                <InfoLine icon={Package} label="Order No" value={tracking?.order_no || order.display_order_no || order.order_no} />
                <InfoLine icon={User} label="Customer" value={tracking?.customer_name} />
                <InfoLine icon={MapPin} label="City / District" value={[tracking?.customer_city, tracking?.customer_district].filter(Boolean).join(", ")} />
                <InfoLine icon={CalendarClock} label="Placed" value={niceDate(tracking?.placed_date)} />
                <InfoLine icon={CalendarClock} label="Completed" value={niceDate(tracking?.completed_date)} />
              </div>

              <div>
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-[11px] font-semibold text-slate-300">Status History</p>
                  <span className="text-[10px] text-slate-500">{history.length} update{history.length === 1 ? "" : "s"}</span>
                </div>

                {history.length ? (
                  <div className="space-y-2">
                    {[...history].reverse().map((entry, index) => (
                      <div key={index} className="rounded-md border border-slate-800 bg-[#070b16] p-3">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-[12px] font-semibold text-slate-100">{historyText(entry)}</p>
                          <span className="text-[10px] text-slate-500">{niceDate(historyDate(entry))}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-md border border-amber-900 bg-amber-950 p-3 text-[11px] text-amber-300">
                    No tracking events yet.
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
