import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Package, User, MapPin, Loader2, Save } from "lucide-react";
import { brighthubOrderApi } from "../../../../config/sub_api/brighthub_api/brighthub_order_api";
import Loader from "../../../../components/common/Loader";
import { useToast } from "../../../../components/common/toast/ToastProvider";
import { useConfirm } from "../../../../components/common/confirm_modal/ConfirmProvider";

const STATUS_OPTIONS = ["pending", "confirmed", "shipped", "delivered", "cancelled"];

function money(value) {
  if (value === null || value === undefined || value === "") return "-";

  const number = Number(value);
  return Number.isFinite(number) ? number.toFixed(2) : "-";
}

function formatDate(value) {
  if (!value) return "-";

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "-" : date.toLocaleString();
}

function Info({ label, value }) {
  return (
    <div className="rounded-xl border border-white/10 bg-[#070B14] p-3">
      <p className="text-xs font-medium uppercase text-slate-500">{label}</p>
      <div className="mt-1 break-words text-sm font-medium text-slate-100">{value ?? "-"}</div>
    </div>
  );
}

export default function BrightHubOrderDetailPage() {
  const { accountId, id } = useParams();
  const showToast = useToast();
  const confirm = useConfirm();

  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const [saving, setSaving] = useState(false);

  async function loadOrder() {
    try {
      setLoading(true);
      setError("");

      const res = await brighthubOrderApi.getBrightHubOrderDetail(accountId, id);
      const data = res?.data?.data || null;

      setOrder(data);
      setStatus(data?.status || "");
    } catch (err) {
      setOrder(null);
      setError(err?.response?.data?.error || err?.response?.data?.message || err?.friendlyMessage || "Failed to load the order.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadOrder();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accountId, id]);

  async function handleUpdateStatus() {
    if (!status || status === order?.status) return;

    if (status === "cancelled") {
      const confirmed = await confirm("Cancel this order? This releases the stock/sales that were committed when it was placed.");
      if (!confirmed) return;
    }

    setSaving(true);

    try {
      await brighthubOrderApi.updateBrightHubOrderStatus(accountId, id, status);
      showToast(`Order status updated to ${status}.`);
      await loadOrder();
    } catch (err) {
      showToast(
        err?.response?.data?.error || err?.response?.data?.message || err?.friendlyMessage || "Failed to update order status.",
        { type: "error" }
      );
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#070B14]">
        <Loader label="Loading order..." minHeight="100vh" />
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="min-h-screen bg-[#070B14] px-4 py-5 text-slate-100 md:px-6">
        <div className="rounded-xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {error || "Order not found."}
        </div>
      </div>
    );
  }

  const items = Array.isArray(order.items) ? order.items : [];

  return (
    <div className="min-h-screen bg-[#070B14] px-4 py-5 text-slate-100 md:px-6">
      <div className="mb-5">
        <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-yellow-400/20 bg-yellow-400/10 px-3 py-1 text-xs font-medium text-yellow-200">
          <Package size={13} />
          Order {order.order_no || `#${order.id}`}
        </div>

        <h1 className="text-xl font-semibold text-white">{order.customer_name || "Website Order"}</h1>
      </div>

      <div className="grid gap-5 xl:grid-cols-3">
        <section className="space-y-5 xl:col-span-2">
          <div className="rounded-2xl border border-white/10 bg-[#0D1322] p-5 shadow-xl shadow-black/20">
            <div className="mb-4 flex items-center gap-2">
              <Package size={18} className="text-yellow-300" />
              <h2 className="font-semibold text-white">Order Items</h2>
            </div>

            {items.length === 0 ? (
              <p className="text-sm text-slate-500">No line items on this order.</p>
            ) : (
              <div className="overflow-x-auto rounded-lg border border-white/10">
                <table className="w-full text-left text-[13px]">
                  <thead className="bg-white/[0.03] text-[11px] uppercase tracking-wide text-slate-500">
                    <tr>
                      <th className="px-3 py-2 font-medium">Product</th>
                      <th className="px-3 py-2 font-medium">SKU</th>
                      <th className="px-3 py-2 font-medium">BHID</th>
                      <th className="px-3 py-2 text-right font-medium">Qty</th>
                      <th className="px-3 py-2 text-right font-medium">Price</th>
                      <th className="px-3 py-2 text-right font-medium">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {items.map((item, index) => (
                      <tr key={item.id || index}>
                        <td className="px-3 py-2 text-slate-200">
                          <div className="flex items-center gap-2">
                            {item.image_main_url ? (
                              <img
                                src={item.image_main_url}
                                alt={item.product_name || "Product"}
                                className="h-9 w-9 shrink-0 rounded border border-white/10 bg-white object-contain"
                              />
                            ) : null}
                            <span>{item.product_name || "-"}</span>
                          </div>
                        </td>
                        <td className="px-3 py-2 font-mono text-xs text-slate-400">{item.sku || "-"}</td>
                        <td className="px-3 py-2 font-mono text-xs text-yellow-200/80">{item.bhid || "-"}</td>
                        <td className="px-3 py-2 text-right text-slate-300">{item.quantity ?? "-"}</td>
                        <td className="px-3 py-2 text-right text-slate-300">{money(item.price)}</td>
                        <td className="px-3 py-2 text-right font-semibold text-slate-100">
                          {money(item.line_total ?? (item.price && item.quantity ? item.price * item.quantity : null))}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div className="mt-4 flex justify-end">
              <div className="rounded-lg border border-white/10 bg-[#070B14] px-4 py-2 text-right">
                <p className="text-xs uppercase text-slate-500">Order Total</p>
                <p className="text-lg font-semibold text-white">{money(order.total)}</p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-[#0D1322] p-5 shadow-xl shadow-black/20">
            <div className="mb-4 flex items-center gap-2">
              <MapPin size={18} className="text-yellow-300" />
              <h2 className="font-semibold text-white">Shipping</h2>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <Info label="Address Line 1" value={order.shipping_line1} />
              <Info label="Address Line 2" value={order.shipping_line2} />
              <Info label="City" value={order.shipping_city || order.city} />
              <Info label="Postal Code" value={order.shipping_postal_code || order.postal_code} />
            </div>
          </div>
        </section>

        <aside className="space-y-5">
          <section className="rounded-2xl border border-white/10 bg-[#0D1322] p-5 shadow-xl shadow-black/20">
            <div className="mb-4 flex items-center gap-2">
              <User size={18} className="text-yellow-300" />
              <h2 className="font-semibold text-white">Customer</h2>
            </div>

            <div className="space-y-3">
              <Info label="Name" value={order.customer_name} />
              <Info label="Phone" value={order.phone} />
              <Info label="Placed At" value={formatDate(order.created_at)} />
            </div>
          </section>

          <section className="rounded-2xl border border-white/10 bg-[#0D1322] p-5 shadow-xl shadow-black/20">
            <h2 className="mb-3 font-semibold text-white">Status</h2>

            <select
              value={status}
              onChange={(event) => setStatus(event.target.value)}
              className="mb-3 h-9 w-full rounded-lg border border-white/10 bg-[#070B14] px-3 text-sm text-slate-100 outline-none focus:border-yellow-400/60"
            >
              {STATUS_OPTIONS.map((option) => (
                <option key={option} value={option} className="capitalize">
                  {option.charAt(0).toUpperCase() + option.slice(1)}
                </option>
              ))}
            </select>

            <button
              type="button"
              onClick={handleUpdateStatus}
              disabled={saving || status === order.status}
              className="inline-flex h-9 w-full items-center justify-center gap-1.5 rounded-md bg-yellow-500 text-[12px] font-semibold text-slate-950 hover:bg-yellow-400 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
              {saving ? "Updating..." : "Update Status"}
            </button>

            {status === "cancelled" && status !== order.status && (
              <p className="mt-2 text-xs text-amber-300">Cancelling releases the stock/sales committed at creation.</p>
            )}
          </section>
        </aside>
      </div>
    </div>
  );
}
