import { useEffect, useState } from "react";
import { ArrowLeft, Edit, Loader2, RefreshCw, Save, Trash2 } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import manualOrdersApi from "../../../config/sub_api/order_management_api/manual_orders_api";
import ProductImage from "./components/ProductImage";
import OrderStatusBadge from "./components/OrderStatusBadge";
import {
  ORDER_STATUSES,
  dateOnly,
  dateTime,
  money,
  normalizeError,
  unwrapApiResponse,
} from "./utils/orderFrontendHelpers";

export default function ManualOrderDetailPage() {
  const navigate = useNavigate();
  const { orderId } = useParams();
  const [order, setOrder] = useState(null);
  const [logs, setLogs] = useState([]);
  const [status, setStatus] = useState("Pending");
  const [loading, setLoading] = useState(true);
  const [savingStatus, setSavingStatus] = useState(false);
  const [error, setError] = useState("");

  async function loadOrder() {
    try {
      setLoading(true);
      setError("");

      const response = await manualOrdersApi.getOrderById(orderId);
      const result = unwrapApiResponse(response);
      const data = result.data || null;
      setOrder(data);
      setStatus(data?.order_status || "Pending");

      try {
        const logResponse = await manualOrdersApi.getOrderLogs(orderId, { limit: 50 });
        const logResult = unwrapApiResponse(logResponse);
        setLogs(Array.isArray(logResult.data) ? logResult.data : []);
      } catch (_) {
        setLogs([]);
      }
    } catch (err) {
      setError(normalizeError(err, "Order load panna mudiyala"));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadOrder();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderId]);

  async function updateStatus() {
    try {
      setSavingStatus(true);
      setError("");
      const response = await manualOrdersApi.updateOrderStatus(orderId, {
        order_status: status,
        tracking_number: order?.tracking_number || null,
        reason: "Status updated from detail page",
      });
      const result = unwrapApiResponse(response);
      setOrder(result.data || order);
      await loadOrder();
    } catch (err) {
      setError(normalizeError(err, "Status update panna mudiyala"));
    } finally {
      setSavingStatus(false);
    }
  }

  async function deleteOrder() {
    const ok = window.confirm("Delete this order? It will be soft deleted only.");
    if (!ok) return;

    try {
      await manualOrdersApi.deleteOrder(orderId, { reason: "Deleted from detail page" });
      navigate("/orders");
    } catch (err) {
      setError(normalizeError(err, "Order delete panna mudiyala"));
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 text-slate-400">
        <Loader2 className="mr-2 animate-spin" size={22} /> Loading order...
      </div>
    );
  }

  if (error && !order) {
    return (
      <div className="min-h-screen bg-slate-950 px-4 py-6 text-slate-100">
        <div className="mx-auto max-w-4xl rounded-2xl border border-rose-500/40 bg-rose-500/10 p-5 text-rose-200">{error}</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 px-4 py-5 text-slate-100 md:px-6">
      <div className="mx-auto max-w-7xl space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => navigate("/orders")}
              className="rounded-xl border border-slate-700 p-2.5 text-slate-300 hover:border-orange-500 hover:text-orange-300"
            >
              <ArrowLeft size={18} />
            </button>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-white">{order?.order_id}</h1>
              <p className="text-sm text-slate-400">Manual / custom order detail with product images and SKU.</p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={loadOrder} className="inline-flex items-center gap-2 rounded-xl border border-slate-700 px-4 py-2.5 text-sm font-semibold text-slate-200 hover:border-orange-500 hover:text-orange-300">
              <RefreshCw size={16} /> Refresh
            </button>
            <button type="button" onClick={() => navigate(`/orders/${encodeURIComponent(orderId)}/edit`)} className="inline-flex items-center gap-2 rounded-xl bg-orange-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-orange-600">
              <Edit size={16} /> Edit
            </button>
            <button type="button" onClick={deleteOrder} className="inline-flex items-center gap-2 rounded-xl border border-rose-500/40 px-4 py-2.5 text-sm font-semibold text-rose-300 hover:bg-rose-500/10">
              <Trash2 size={16} /> Delete
            </button>
          </div>
        </div>

        {error ? <div className="rounded-2xl border border-rose-500/40 bg-rose-500/10 px-5 py-4 text-sm text-rose-200">{error}</div> : null}

        <div className="grid gap-5 xl:grid-cols-[1fr_360px]">
          <div className="space-y-5">
            <section className="rounded-2xl border border-slate-800 bg-slate-950/80 p-5">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-base font-semibold text-slate-100">Customer Details</h2>
                  <p className="text-sm text-slate-400">Delivery and payment information.</p>
                </div>
                <OrderStatusBadge status={order?.order_status} />
              </div>

              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                <Info label="Customer" value={order?.customer_name} />
                <Info label="Phone" value={order?.customer_phone} />
                <Info label="Phone 2" value={order?.customer_phone_2 || "-"} />
                <Info label="City" value={order?.customer_city || "-"} />
                <Info label="District" value={order?.customer_district || "-"} />
                <Info label="Province" value={order?.customer_province || "-"} />
                <Info label="Payment" value={order?.payment_method} />
                <Info label="Order Type" value={order?.order_type} />
                <Info label="Order Date" value={dateTime(order?.order_date)} />
                <Info label="Due Date" value={dateOnly(order?.due_date)} />
                <Info label="Tracking" value={order?.tracking_number || "-"} />
                <Info label="Created By" value={order?.created_by || "-"} />
              </div>

              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <InfoBox label="Address" value={order?.customer_address || "-"} />
                <InfoBox label="Note" value={order?.note || "-"} />
              </div>
            </section>

            <section className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-950/80">
              <div className="border-b border-slate-800 px-5 py-4">
                <h2 className="text-base font-semibold text-slate-100">Order Items</h2>
                <p className="text-sm text-slate-400">Product images, SKU, quantity and item total.</p>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-[900px] w-full text-left text-sm">
                  <thead className="bg-slate-900/90 text-xs uppercase tracking-wide text-slate-400">
                    <tr>
                      <th className="px-4 py-3">Product</th>
                      <th className="px-4 py-3">SKU</th>
                      <th className="px-4 py-3">Qty</th>
                      <th className="px-4 py-3">Unit Price</th>
                      <th className="px-4 py-3">Total</th>
                      <th className="px-4 py-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {order?.items?.length ? (
                      order.items.map((item) => (
                        <tr key={item.id} className="hover:bg-slate-900/50">
                          <td className="px-4 py-4">
                            <div className="flex items-center gap-3">
                              <ProductImage src={item.image_url} alt={item.product_name} />
                              <div className="min-w-0">
                                <div className="line-clamp-2 font-semibold text-slate-100">{item.product_name}</div>
                                {item.description ? <div className="mt-1 line-clamp-1 text-xs text-slate-500">{item.description}</div> : null}
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-4 text-xs font-bold text-orange-200">{item.sku || "NO-SKU"}</td>
                          <td className="px-4 py-4 text-slate-200">{item.quantity}</td>
                          <td className="px-4 py-4 text-slate-200">Rs. {money(item.unit_price)}</td>
                          <td className="px-4 py-4 font-bold text-white">Rs. {money(item.item_total)}</td>
                          <td className="px-4 py-4 text-slate-300">{item.item_status}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="6" className="px-4 py-12 text-center text-slate-400">No items found.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="rounded-2xl border border-slate-800 bg-slate-950/80 p-5">
              <h2 className="mb-4 text-base font-semibold text-slate-100">Order Logs</h2>
              <div className="space-y-3">
                {logs.length ? (
                  logs.map((log) => (
                    <div key={log.id} className="rounded-xl border border-slate-800 bg-slate-900/60 px-4 py-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="text-sm font-semibold text-slate-100">{log.action} • {log.table_name}</div>
                        <div className="text-xs text-slate-500">{dateTime(log.created_at)}</div>
                      </div>
                      <div className="mt-1 text-xs text-slate-400">Changed by: {log.changed_by || "-"} {log.reason ? `• ${log.reason}` : ""}</div>
                    </div>
                  ))
                ) : (
                  <div className="rounded-xl border border-dashed border-slate-700 py-8 text-center text-slate-400">No logs found.</div>
                )}
              </div>
            </section>
          </div>

          <aside className="space-y-5">
            <section className="rounded-2xl border border-slate-800 bg-slate-950/80 p-5">
              <h2 className="mb-4 text-base font-semibold text-slate-100">Quick Status</h2>
              <select value={status} onChange={(e) => setStatus(e.target.value)} className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2.5 text-sm text-slate-100 outline-none focus:border-orange-500">
                {ORDER_STATUSES.map((value) => <option key={value} value={value}>{value}</option>)}
              </select>
              <button type="button" onClick={updateStatus} disabled={savingStatus || status === order?.order_status} className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-orange-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-orange-600 disabled:opacity-50">
                {savingStatus ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
                Save Status
              </button>
            </section>

            <section className="rounded-2xl border border-slate-800 bg-slate-950/80 p-5">
              <h2 className="mb-4 text-base font-semibold text-slate-100">Total Summary</h2>
              <div className="space-y-3 text-sm">
                <SummaryRow label="Item Total" value={`Rs. ${money(order?.item_total)}`} />
                <SummaryRow label="Discount" value={`Rs. ${money(order?.discount)}`} />
                <SummaryRow label="Subtotal" value={`Rs. ${money(order?.subtotal)}`} />
                <SummaryRow label="Buyer Shipping" value={`Rs. ${money(order?.shipping_cost_paid_by_buyer)}`} />
                <SummaryRow label="Actual Shipping" value={`Rs. ${money(order?.shipping_cost_actual)}`} muted />
                <SummaryRow label="Paid Amount" value={`Rs. ${money(order?.paid_amount)}`} />
                <div className="border-t border-slate-800 pt-3">
                  <div className="flex justify-between text-lg font-bold text-white">
                    <span>Order Total</span>
                    <span>Rs. {money(order?.order_total)}</span>
                  </div>
                </div>
              </div>
            </section>
          </aside>
        </div>
      </div>
    </div>
  );
}

function Info({ label, value }) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/60 px-4 py-3">
      <div className="text-xs uppercase tracking-wide text-slate-500">{label}</div>
      <div className="mt-1 text-sm font-semibold text-slate-100">{value || "-"}</div>
    </div>
  );
}

function InfoBox({ label, value }) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/60 px-4 py-3">
      <div className="text-xs uppercase tracking-wide text-slate-500">{label}</div>
      <div className="mt-2 whitespace-pre-line text-sm text-slate-200">{value}</div>
    </div>
  );
}

function SummaryRow({ label, value, muted }) {
  return (
    <div className={`flex justify-between ${muted ? "text-slate-500" : "text-slate-300"}`}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}
