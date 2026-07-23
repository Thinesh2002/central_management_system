import { useEffect, useState } from "react";
import { CheckCircle2, ExternalLink, Truck, X } from "lucide-react";
import ordersApi from "../../../../config/sub_api/order_management_api/orders_api";
import { getApiError } from "../../../../config/api";

// Same purple-header popup language as PdfPreviewModal/PrintLayoutChoiceModal.
// Replaces the old window.prompt() flow for local orders - no real courier
// API is wired up for manual orders yet, so "Track My Order" opens a search
// for the waybill number rather than a specific courier's tracking page.
export default function AddWaybillModal({ order, onClose, onSaved }) {
  const [waybillId, setWaybillId] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(null);

  // Keyed off the order's id, not the order object itself - on the detail
  // page, onSaved triggers a refetch that replaces the order prop with a
  // new object for the *same* order. Keying off the whole object would
  // re-run this on that refresh and wipe the just-set "saved" confirmation
  // via setSaved(null), snapping the modal back to the plain form right
  // after a successful save (looked exactly like the save had failed).
  useEffect(() => {
    setWaybillId(order?.waybill_id || order?.tracking_number || "");
    setError("");
    setSaved(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [order?.source_order_id]);

  if (!order) return null;

  async function handleSave() {
    if (!waybillId.trim()) {
      setError("Waybill / tracking number is required.");
      return;
    }

    setSaving(true);
    setError("");

    try {
      await ordersApi.createWaybill(order.source, order.source_order_id, {
        waybill_id: waybillId.trim(),
        tracking_number: waybillId.trim(),
      });

      setSaved({ waybillId: waybillId.trim() });
      onSaved?.();
    } catch (err) {
      setError(getApiError(err, "Failed to save waybill"));
    } finally {
      setSaving(false);
    }
  }

  function trackMyOrder() {
    window.open(
      `https://www.google.com/search?q=${encodeURIComponent(`track ${saved.waybillId}`)}`,
      "_blank",
      "noopener"
    );
  }

  return (
    <div
      className="fixed inset-0 z-60 flex items-center justify-center bg-slate-950/75 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm overflow-hidden rounded-2xl border border-[#653bb3]/20 bg-slate-950"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex h-12 items-center justify-between gap-3 border-b border-[#653bb3]/15 bg-[#653bb3] px-4">
          <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-purple-300">
            <Truck size={15} />
            {saved ? "Waybill Saved" : "Add Waybill"}
          </div>
          <button
            type="button"
            onClick={onClose}
            title="Close"
            className="flex h-7 w-7 items-center justify-center rounded-full border border-[#653bb3]/20 bg-purple-500/10 text-purple-200 transition hover:bg-purple-500/25 hover:text-white"
          >
            <X size={14} />
          </button>
        </div>

        {saved ? (
          <div className="space-y-3 p-4">
            <div className="flex items-center gap-2 rounded-md border border-emerald-500/40 bg-emerald-500/10 px-3 py-2.5 text-emerald-300">
              <CheckCircle2 size={16} className="shrink-0" />
              <span className="text-[12px] font-semibold">
                {order.display_order_no || order.order_no}: {saved.waybillId}
              </span>
            </div>

            <button
              type="button"
              onClick={trackMyOrder}
              className="flex h-9 w-full items-center justify-center gap-1.5 rounded-md bg-yellow-500 text-[12px] font-semibold text-slate-950 transition hover:bg-yellow-400"
            >
              <ExternalLink size={13} /> Track My Order
            </button>
          </div>
        ) : (
          <div className="space-y-3 p-4">
            <label className="block">
              <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                Waybill / Tracking Number <span className="text-orange-400">*</span>
              </span>
              <input
                autoFocus
                value={waybillId}
                onChange={(e) => setWaybillId(e.target.value)}
                className="h-10 w-full rounded-md border border-slate-700 bg-[#0a101d] px-3 text-[13px] font-medium text-slate-100 outline-none transition focus:border-orange-400 focus:ring-1 focus:ring-orange-400/40"
                placeholder="e.g. LK123456789"
              />
            </label>

            {error && <p className="text-[11px] font-semibold text-red-400">{error}</p>}

            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="flex h-9 w-full items-center justify-center gap-1.5 rounded-md bg-yellow-500 text-[12px] font-semibold text-slate-950 transition hover:bg-yellow-400 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? "Saving..." : "Save Waybill"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
