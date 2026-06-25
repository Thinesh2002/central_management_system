import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  Download,
  MapPin,
  Package,
  RefreshCw,
  Truck,
  User,
} from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { darazOrdersApi } from "../../../../config/sub_api/daraz_api/daraz_orders_api";

function valueOf(obj, keys, fallback = "-") {
  for (const key of keys) {
    const value = obj?.[key];
    if (value !== undefined && value !== null && value !== "") return value;
  }
  return fallback;
}

function asArray(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  return [value];
}

function normalizeOrderPayload(payload) {
  const data = payload?.data || payload?.result || payload || {};
  const order = data.order || data.row || data.data || payload?.order || payload || {};

  const items =
    order.items ||
    order.order_items ||
    data.items ||
    data.order_items ||
    data.OrderItems ||
    [];

  return {
    order,
    items: asArray(items),
  };
}

function money(value, currency = "LKR") {
  const number = Number(value || 0);
  return `${currency} ${number.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatDate(value) {
  if (!value) return "-";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);

  return date.toLocaleString("en-GB", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function statusClass(status) {
  const normal = String(status || "").toLowerCase();

  if (normal.includes("deliver")) return "bg-emerald-50 text-emerald-700 border-emerald-200";
  if (normal.includes("cancel")) return "bg-rose-50 text-rose-700 border-rose-200";
  if (normal.includes("ship")) return "bg-blue-50 text-blue-700 border-blue-200";
  if (normal.includes("pack") || normal.includes("ready")) return "bg-amber-50 text-amber-700 border-amber-200";
  if (normal.includes("pending")) return "bg-slate-50 text-slate-700 border-slate-200";

  return "bg-slate-50 text-slate-700 border-slate-200";
}

function InfoCard({ icon: Icon, title, children }) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-4 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-50 text-slate-700">
          <Icon size={20} />
        </div>
        <h2 className="text-sm font-bold uppercase tracking-wide text-slate-700">{title}</h2>
      </div>
      {children}
    </div>
  );
}

function Field({ label, value }) {
  return (
    <div>
      <p className="text-xs font-bold uppercase tracking-wide text-slate-400">{label}</p>
      <p className="mt-1 break-words text-sm font-semibold text-slate-800">{value || "-"}</p>
    </div>
  );
}

export default function DarazOrderDetail() {
  const { orderId } = useParams();
  const navigate = useNavigate();

  const [order, setOrder] = useState(null);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState("");
  const [error, setError] = useState("");

  const currency = useMemo(() => valueOf(order, ["currency"], "LKR"), [order]);

  async function loadOrder() {
    if (!orderId) return;

    setLoading(true);
    setError("");

    try {
      const payload = await darazOrdersApi.getOrderById(orderId);
      const normalized = normalizeOrderPayload(payload);
      setOrder(normalized.order);
      setItems(normalized.items);
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          err?.friendlyMessage ||
          err?.message ||
          "Failed to load Daraz order detail."
      );
      setOrder(null);
      setItems([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadOrder();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderId]);

  async function handleSyncTracking() {
    setActionLoading("tracking");
    setError("");

    try {
      await darazOrdersApi.syncTracking(orderId);
      await loadOrder();
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          err?.friendlyMessage ||
          err?.message ||
          "Tracking sync failed."
      );
    } finally {
      setActionLoading("");
    }
  }

  async function handleGenerateAwb() {
    setActionLoading("awb");
    setError("");

    try {
      await darazOrdersApi.generateAwb(orderId);
      await loadOrder();
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          err?.friendlyMessage ||
          err?.message ||
          "AWB generation failed."
      );
    } finally {
      setActionLoading("");
    }
  }

  if (loading && !order) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 p-6">
        <div className="flex items-center gap-3 rounded-3xl border border-slate-200 bg-white px-5 py-4 text-sm font-semibold text-slate-600 shadow-sm">
          <RefreshCw size={18} className="animate-spin" />
          Loading order details...
        </div>
      </div>
    );
  }

  const status = valueOf(order, ["local_status", "daraz_status", "status"], "unknown");
  const orderNumber = valueOf(order, ["order_number", "order_id", "daraz_order_id"], orderId);

  return (
    <div className="min-h-screen bg-slate-50 p-4 sm:p-6">
      <div className="mx-auto max-w-[1600px] space-y-4">
        <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => navigate(-1)}
                className="flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 text-slate-700 hover:bg-slate-50"
              >
                <ArrowLeft size={20} />
              </button>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-xl font-bold text-slate-900">Order #{orderNumber}</h1>
                  <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-bold ${statusClass(status)}`}>
                    {status}
                  </span>
                </div>
                <p className="text-sm text-slate-500">
                  Account: {valueOf(order, ["account_code"], "-")} • Created: {formatDate(valueOf(order, ["order_created_at", "created_at", "created_time"], ""))}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={loadOrder}
                disabled={loading}
                className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
                Refresh
              </button>
              <button
                type="button"
                onClick={handleSyncTracking}
                disabled={!!actionLoading}
                className="inline-flex items-center gap-2 rounded-2xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Truck size={16} className={actionLoading === "tracking" ? "animate-pulse" : ""} />
                Sync Tracking
              </button>
              <button
                type="button"
                onClick={handleGenerateAwb}
                disabled={!!actionLoading}
                className="inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Download size={16} className={actionLoading === "awb" ? "animate-pulse" : ""} />
                Generate AWB
              </button>
            </div>
          </div>
        </div>

        {error && (
          <div className="flex items-start gap-3 rounded-3xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
            <AlertTriangle size={18} className="mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="grid gap-4 xl:grid-cols-4">
          <InfoCard icon={User} title="Customer Details">
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1">
              <Field label="Customer Name" value={valueOf(order, ["customer_full_name", "customer_name", "shipping_name"], "-")} />
              <Field label="Phone" value={valueOf(order, ["customer_phone", "shipping_phone"], "-")} />
              <Field label="Email" value={valueOf(order, ["customer_email"], "-")} />
              <Field label="Payment" value={valueOf(order, ["payment_method"], "-")} />
            </div>
          </InfoCard>

          <InfoCard icon={MapPin} title="Shipping Details">
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1">
              <Field label="Receiver" value={valueOf(order, ["shipping_name", "customer_full_name"], "-")} />
              <Field label="Phone" value={valueOf(order, ["shipping_phone", "customer_phone"], "-")} />
              <Field label="Address 1" value={valueOf(order, ["shipping_address_1", "shipping_address", "address_shipping"], "-")} />
              <Field label="Address 2" value={valueOf(order, ["shipping_address_2"], "-")} />
              <Field label="City / Region" value={`${valueOf(order, ["shipping_city"], "-")} / ${valueOf(order, ["shipping_region"], "-")}`} />
              <Field label="Postcode / Country" value={`${valueOf(order, ["shipping_postcode"], "-")} / ${valueOf(order, ["shipping_country"], "-")}`} />
            </div>
          </InfoCard>

          <InfoCard icon={Truck} title="Tracking Details">
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1">
              <Field label="Package ID" value={valueOf(order, ["package_id"], "-")} />
              <Field label="Tracking Number" value={valueOf(order, ["tracking_number"], "-")} />
              <Field label="Shipment Provider" value={valueOf(order, ["shipment_provider"], "-")} />
              <Field label="Shipment Type" value={valueOf(order, ["shipment_type"], "-")} />
              <Field label="Updated" value={formatDate(valueOf(order, ["order_updated_at", "updated_at", "updated_time"], ""))} />
            </div>
          </InfoCard>

          <InfoCard icon={Package} title="Order Summary">
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1">
              <Field label="Items Count" value={valueOf(order, ["items_count"], items.length)} />
              <Field label="Quantity" value={valueOf(order, ["total_quantity"], "-")} />
              <Field label="Subtotal" value={money(valueOf(order, ["subtotal"], 0), currency)} />
              <Field label="Shipping Fee" value={money(valueOf(order, ["shipping_fee"], 0), currency)} />
              <Field label="Discount / Voucher" value={`${money(valueOf(order, ["discount_amount"], 0), currency)} / ${money(valueOf(order, ["voucher_amount"], 0), currency)}`} />
              <Field label="Total" value={money(valueOf(order, ["total_amount", "order_total", "total"], 0), currency)} />
            </div>
          </InfoCard>
        </div>

        <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 p-4">
            <h2 className="text-sm font-bold uppercase tracking-wide text-slate-700">Order Items</h2>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-100 text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3 text-left">Product</th>
                  <th className="px-4 py-3 text-left">SKU</th>
                  <th className="px-4 py-3 text-left">Status</th>
                  <th className="px-4 py-3 text-left">Tracking</th>
                  <th className="px-4 py-3 text-right">Qty</th>
                  <th className="px-4 py-3 text-right">Paid Price</th>
                  <th className="px-4 py-3 text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {items.length === 0 && (
                  <tr>
                    <td colSpan="7" className="px-4 py-10 text-center text-slate-500">
                      No items found for this order.
                    </td>
                  </tr>
                )}

                {items.map((item, index) => {
                  const image = valueOf(item, ["product_main_image", "main_image", "image", "image_url"], "");
                  const itemStatus = valueOf(item, ["local_item_status", "item_status", "status"], "-");
                  const itemCurrency = valueOf(item, ["currency"], currency);

                  return (
                    <tr key={`${valueOf(item, ["id", "order_item_id"], index)}-${index}`} className="hover:bg-slate-50">
                      <td className="min-w-[320px] px-4 py-3 align-top">
                        <div className="flex items-start gap-3">
                          <div className="h-14 w-14 shrink-0 overflow-hidden rounded-2xl border border-slate-200 bg-slate-50">
                            {image ? (
                              <img src={image} alt="Product" className="h-full w-full object-cover" />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center text-slate-400">
                                <Package size={20} />
                              </div>
                            )}
                          </div>
                          <div>
                            <p className="font-bold text-slate-900">{valueOf(item, ["product_name", "name", "item_name"], "-")}</p>
                            <p className="mt-1 text-xs text-slate-500">Item ID: {valueOf(item, ["order_item_id"], "-")}</p>
                            <p className="text-xs text-slate-500">Variation: {valueOf(item, ["variation"], "-")}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 align-top">
                        <p className="font-semibold text-slate-800">{valueOf(item, ["seller_sku", "sku"], "-")}</p>
                        <p className="text-xs text-slate-500">Shop SKU: {valueOf(item, ["shop_sku"], "-")}</p>
                      </td>
                      <td className="px-4 py-3 align-top">
                        <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-bold ${statusClass(itemStatus)}`}>
                          {itemStatus}
                        </span>
                      </td>
                      <td className="px-4 py-3 align-top">
                        <p className="font-semibold text-slate-800">{valueOf(item, ["tracking_number"], "-")}</p>
                        <p className="text-xs text-slate-500">{valueOf(item, ["shipment_provider"], "-")}</p>
                      </td>
                      <td className="px-4 py-3 text-right align-top font-semibold text-slate-800">{valueOf(item, ["quantity"], 1)}</td>
                      <td className="px-4 py-3 text-right align-top font-semibold text-slate-800">{money(valueOf(item, ["paid_price", "unit_price", "price"], 0), itemCurrency)}</td>
                      <td className="px-4 py-3 text-right align-top font-bold text-slate-900">{money(valueOf(item, ["total_amount", "paid_price"], 0), itemCurrency)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        <details className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
          <summary className="cursor-pointer text-sm font-bold text-slate-700">Raw Order JSON</summary>
          <pre className="mt-4 max-h-[500px] overflow-auto rounded-2xl bg-slate-950 p-4 text-xs text-slate-100">
            {JSON.stringify(order, null, 2)}
          </pre>
        </details>
      </div>
    </div>
  );
}
