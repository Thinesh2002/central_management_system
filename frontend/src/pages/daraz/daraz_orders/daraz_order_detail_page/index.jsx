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
import darazOrderStatusApi from "../../../../config/sub_api/daraz_api/daraz_order_status_api";

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

  if (normal.includes("deliver")) return "bg-emerald-400/10 text-emerald-200 border-emerald-400/20";
  if (normal.includes("cancel")) return "bg-rose-400/10 text-rose-200 border-rose-400/20";
  if (normal.includes("ship")) return "bg-sky-400/10 text-sky-200 border-sky-400/20";
  if (normal.includes("pack") || normal.includes("ready")) return "bg-orange-400/10 text-orange-200 border-orange-400/20";
  if (normal.includes("pending")) return "bg-slate-400/10 text-slate-200 border-slate-600";

  return "bg-slate-400/10 text-slate-200 border-slate-600";
}

function InfoCard({ icon: Icon, title, children }) {
  return (
    <div className="rounded-2xl border border-[#3b2632] bg-[#111827] p-4 shadow-sm shadow-black/20">
      <div className="mb-4 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-orange-400/20 bg-orange-500/10 text-orange-200">
          <Icon size={20} />
        </div>
        <h2 className="text-sm font-bold uppercase tracking-wide text-slate-200">{title}</h2>
      </div>
      {children}
    </div>
  );
}

function Field({ label, value }) {
  return (
    <div>
      <p className="text-xs font-bold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 break-words text-sm font-semibold text-slate-100">{value || "-"}</p>
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
  const [successMessage, setSuccessMessage] = useState("");

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

  async function runOrderAction(actionKey, label, action) {
    setActionLoading(actionKey);
    setError("");
    setSuccessMessage("");

    try {
      const response = await action();
      setSuccessMessage(response?.data?.message || `${label} completed successfully.`);
      await loadOrder();
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          err?.friendlyMessage ||
          err?.message ||
          `${label} failed.`
      );
    } finally {
      setActionLoading("");
    }
  }

  function handlePackOrder() {
    runOrderAction("pack", "Pack order", () => darazOrderStatusApi.pack(orderNumber));
  }

  function handleReadyToShip() {
    runOrderAction("ready", "Ready to ship", () => darazOrderStatusApi.readyToShip(orderNumber));
  }

  function handleCancelOrder() {
    const reason = window.prompt("Cancel reason / note");
    if (reason === null) return;
    runOrderAction("cancel", "Cancel order", () => darazOrderStatusApi.cancel(orderNumber, { reason_detail: reason }));
  }

  function handleSyncTracking() {
    runOrderAction("tracking", "Sync tracking", () => darazOrderStatusApi.syncTracking(orderNumber));
  }

  function handleSyncStatus() {
    runOrderAction("status", "Sync Daraz status", () => darazOrderStatusApi.syncStatus(orderNumber));
  }

  function handleGenerateAwb() {
    runOrderAction("awb", "Print AWB", () => darazOrderStatusApi.printAwb(orderNumber));
  }

  function handlePrintInvoice() {
    runOrderAction("invoice", "Print invoice", () => darazOrderStatusApi.printInvoice(orderNumber));
  }

  function handleSetInvoiceNumber() {
    const invoiceNumber = window.prompt("Enter invoice number");
    if (!invoiceNumber) return;
    runOrderAction("invoice-number", "Set invoice number", () => darazOrderStatusApi.setInvoiceNumber(orderNumber, invoiceNumber));
  }

  if (loading && !order) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#070b16] p-6 text-slate-100">
        <div className="flex items-center gap-3 rounded-3xl border border-[#26334a] bg-[#111827] px-5 py-4 text-sm font-semibold text-slate-600 shadow-sm">
          <RefreshCw size={18} className="animate-spin" />
          Loading order details...
        </div>
      </div>
    );
  }

  const status = valueOf(order, ["local_status", "daraz_status", "status"], "unknown");
  const orderNumber = valueOf(order, ["order_number", "order_id", "daraz_order_id"], orderId);
  const normalizedStatus = String(status || "").toLowerCase();
  const isFinalStatus = ["cancel", "deliver", "return", "failed"].some((word) => normalizedStatus.includes(word));
  const canPack =
    !isFinalStatus &&
    (normalizedStatus.includes("pending") ||
      normalizedStatus.includes("to pack") ||
      normalizedStatus === "pack" ||
      normalizedStatus === "to_pack");
  const canReadyToShip = !isFinalStatus && normalizedStatus.includes("packed");
  const canPrintDocs = !isFinalStatus && (normalizedStatus.includes("ready") || normalizedStatus.includes("ship"));

  return (
    <div className="min-h-screen bg-[#070b16] p-4 text-slate-100 sm:p-6">
      <div className="mx-auto max-w-[1600px] space-y-4">
        <div className="rounded-2xl border border-[#3b2632] bg-[#111827] p-4 shadow-sm shadow-black/20">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => navigate(-1)}
                className="flex h-11 w-11 items-center justify-center rounded-2xl border border-[#26334a] text-slate-200 hover:bg-[#070b16]"
              >
                <ArrowLeft size={20} />
              </button>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-xl font-bold text-slate-100">Order #{orderNumber}</h1>
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
                className="inline-flex items-center gap-2 rounded-2xl border border-[#26334a] bg-[#111827] px-4 py-2 text-sm font-semibold text-slate-200 hover:bg-[#070b16] disabled:cursor-not-allowed disabled:opacity-60"
              >
                <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
                Refresh
              </button>

              {canPack && (
                <button
                  type="button"
                  onClick={handlePackOrder}
                  disabled={!!actionLoading}
                  className="inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <Package size={16} className={actionLoading === "pack" ? "animate-pulse" : ""} />
                  Pack Order
                </button>
              )}

              {canReadyToShip && (
                <button
                  type="button"
                  onClick={handleReadyToShip}
                  disabled={!!actionLoading}
                  className="inline-flex items-center gap-2 rounded-2xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <Truck size={16} className={actionLoading === "ready" ? "animate-pulse" : ""} />
                  Ready To Ship
                </button>
              )}

              {!isFinalStatus && (
                <button
                  type="button"
                  onClick={handleCancelOrder}
                  disabled={!!actionLoading}
                  className="inline-flex items-center gap-2 rounded-2xl border border-rose-200 bg-[#111827] px-4 py-2 text-sm font-semibold text-rose-700 hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Cancel Order
                </button>
              )}

              {canPrintDocs && (
                <button
                  type="button"
                  onClick={handlePrintInvoice}
                  disabled={!!actionLoading}
                  className="inline-flex items-center gap-2 rounded-2xl border border-[#26334a] bg-[#111827] px-4 py-2 text-sm font-semibold text-slate-200 hover:bg-[#070b16] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <Download size={16} className={actionLoading === "invoice" ? "animate-pulse" : ""} />
                  Print Invoice
                </button>
              )}

              <button
                type="button"
                onClick={handleSetInvoiceNumber}
                disabled={!!actionLoading}
                className="inline-flex items-center gap-2 rounded-2xl border border-[#26334a] bg-[#111827] px-4 py-2 text-sm font-semibold text-slate-200 hover:bg-[#070b16] disabled:cursor-not-allowed disabled:opacity-60"
              >
                Set Invoice Number
              </button>

              <button
                type="button"
                onClick={handleSyncStatus}
                disabled={!!actionLoading}
                className="inline-flex items-center gap-2 rounded-2xl border border-[#26334a] bg-[#111827] px-4 py-2 text-sm font-semibold text-slate-200 hover:bg-[#070b16] disabled:cursor-not-allowed disabled:opacity-60"
              >
                <RefreshCw size={16} className={actionLoading === "status" ? "animate-spin" : ""} />
                Sync Daraz Status
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
                Print AWB
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

        {successMessage && (
          <div className="rounded-3xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-semibold text-emerald-700">
            {successMessage}
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

        <div className="overflow-hidden rounded-2xl border border-[#3b2632] bg-[#111827] shadow-sm shadow-black/20">
          <div className="border-b border-[#26334a] p-4">
            <h2 className="text-sm font-bold uppercase tracking-wide text-slate-200">Order Items</h2>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-[#26334a] text-sm">
              <thead className="bg-[#1b2a3a] text-xs uppercase tracking-wide text-orange-300">
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
              <tbody className="divide-y divide-[#26334a] bg-[#111827]">
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
                    <tr key={`${valueOf(item, ["id", "order_item_id"], index)}-${index}`} className="hover:bg-[#16233a]">
                      <td className="min-w-[320px] px-4 py-3 align-top">
                        <div className="flex items-start gap-3">
                          <div className="h-14 w-14 shrink-0 overflow-hidden rounded-xl border border-[#26334a] bg-white">
                            {image ? (
                              <img src={image} alt="Product" className="h-full w-full object-cover" />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center text-slate-500">
                                <Package size={20} />
                              </div>
                            )}
                          </div>
                          <div>
                            <p className="font-bold text-slate-100">{valueOf(item, ["product_name", "name", "item_name"], "-")}</p>
                            <p className="mt-1 text-xs text-slate-500">Item ID: {valueOf(item, ["order_item_id"], "-")}</p>
                            <p className="text-xs text-slate-500">Variation: {valueOf(item, ["variation"], "-")}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 align-top">
                        <p className="font-semibold text-slate-100">{valueOf(item, ["seller_sku", "sku"], "-")}</p>
                        <p className="text-xs text-slate-500">Shop SKU: {valueOf(item, ["shop_sku"], "-")}</p>
                      </td>
                      <td className="px-4 py-3 align-top">
                        <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-bold ${statusClass(itemStatus)}`}>
                          {itemStatus}
                        </span>
                      </td>
                      <td className="px-4 py-3 align-top">
                        <p className="font-semibold text-slate-100">{valueOf(item, ["tracking_number"], "-")}</p>
                        <p className="text-xs text-slate-500">{valueOf(item, ["shipment_provider"], "-")}</p>
                      </td>
                      <td className="px-4 py-3 text-right align-top font-semibold text-slate-100">{valueOf(item, ["quantity"], 1)}</td>
                      <td className="px-4 py-3 text-right align-top font-semibold text-slate-100">{money(valueOf(item, ["paid_price", "unit_price", "price"], 0), itemCurrency)}</td>
                      <td className="px-4 py-3 text-right align-top font-bold text-slate-100">{money(valueOf(item, ["total_amount", "paid_price"], 0), itemCurrency)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        <details className="rounded-2xl border border-[#3b2632] bg-[#111827] p-4 shadow-sm shadow-black/20">
          <summary className="cursor-pointer text-sm font-bold text-slate-200">Raw Daraz Order JSON</summary>
          <pre className="mt-4 max-h-[500px] overflow-auto rounded-2xl bg-slate-950 p-4 text-xs text-slate-100">
            {JSON.stringify(order, null, 2)}
          </pre>
        </details>
      </div>
    </div>
  );
}
