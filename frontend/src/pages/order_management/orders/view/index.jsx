import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  AlertCircle,
  ArrowLeft,
  Mail,
  MapPin,
  Package,
  Phone,
  Printer,
  RefreshCw,
  User,
} from "lucide-react";

import ordersApi from "../../../../config/sub_api/order_management_api/orders_api";
import { getApiError } from "../../../../config/api";
import { useToast } from "../../../../components/common/toast/ToastProvider";

const STATUS_OPTIONS = [
  "pending",
  "packed",
  "ready_to_ship",
  "shipped",
  "delivered",
  "cancelled",
  "returned",
];

function money(value, currency = "LKR") {
  return `${currency} ${Number(value || 0).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function niceDate(value) {
  if (!value) return "-";
  try {
    return new Date(value).toLocaleString();
  } catch {
    return "-";
  }
}

function text(value, fallback = "-") {
  if (value === null || value === undefined || value === "") return fallback;
  return String(value);
}

function num(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function getItemImage(item = {}) {
  return item.product_main_image || item.product_image_url || item.image_url || item.image || "";
}

function getItemName(item = {}) {
  return item.product_title || item.name || item.product_name || item.title || "-";
}

function getItemSku(item = {}) {
  return item.local_sku || item.sku || item.seller_sku || item.shop_sku || item.marketplace_sku || "-";
}

function getItemQty(item = {}) {
  return num(item.qty || item.quantity || 1) || 1;
}

function getItemUnitPrice(item = {}) {
  const direct = num(item.unit_price || item.price);
  if (direct) return direct;

  const lineTotal = num(item.line_total || item.total_price);
  const qty = getItemQty(item);
  return lineTotal && qty ? lineTotal / qty : 0;
}

function getItemLineTotal(item = {}) {
  const lineTotal = num(item.line_total || item.total_price);
  return lineTotal || getItemUnitPrice(item) * getItemQty(item);
}

function Card({ children, title, icon: Icon, right }) {
  return (
    <section className="overflow-hidden border border-slate-800 bg-[#0b1220]">
      {title && (
        <div className="flex items-center justify-between gap-2 border-b border-slate-800 bg-[#07101f] px-4 py-2.5">
          <h3 className="flex items-center gap-1.5 text-[12px] font-semibold text-white">
            {Icon ? <Icon size={13} className="text-orange-400" /> : null}
            {title}
          </h3>
          {right}
        </div>
      )}
      <div className="p-4">{children}</div>
    </section>
  );
}

function InfoLine({ label, value }) {
  return (
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-0.5 break-words text-[12px] font-semibold text-slate-200">{text(value)}</p>
    </div>
  );
}

function fullAddress(prefix, source = {}) {
  const parts = [
    source[`${prefix}_address_line1`] || source[`${prefix}_address_line`],
    source[`${prefix}_address_line2`],
    source[`${prefix}_city`],
    source[`${prefix}_district`],
    source[`${prefix}_province`],
    source[`${prefix}_postal_code`],
    source[`${prefix}_country`],
  ];

  return parts.filter(Boolean).join(", ") || "-";
}

export default function OrderDetailPage() {
  const { source, id } = useParams();
  const navigate = useNavigate();
  const showToast = useToast();

  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  async function load(refresh = false) {
    if (refresh) setRefreshing(true);
    else setLoading(true);

    try {
      const result = await ordersApi.getOrder(source, id);
      setOrder(result?.data || null);
      setError("");
    } catch (err) {
      setError(getApiError(err, "Failed to load order"));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [source, id]);

  const items = order?.items || [];

  const summary = useMemo(() => {
    const itemSubtotal = items.reduce((sum, item) => sum + getItemLineTotal(item), 0);
    const totalQty = items.reduce((sum, item) => sum + getItemQty(item), 0);
    const discount = num(order?.discount_total || order?.discount);
    const shipping = num(order?.shipping_fee || order?.shipping_amount);
    const total = num(order?.grand_total) || itemSubtotal + shipping - discount;

    return { itemSubtotal, totalQty, discount, shipping, total };
  }, [items, order]);

  async function changeStatus(nextStatus) {
    try {
      await ordersApi.updateStatus(source, id, { status: nextStatus });
      showToast("Order status updated.");
      await load(true);
    } catch (err) {
      alert(getApiError(err, "Failed to update status"));
    }
  }

  async function saveWaybill() {
    const waybillId = window.prompt("Enter waybill / tracking number");
    if (!waybillId) return;

    try {
      await ordersApi.createWaybill(source, id, { waybill_id: waybillId, tracking_number: waybillId });
      showToast("Waybill saved.");
      await load(true);
    } catch (err) {
      alert(getApiError(err, "Failed to save waybill"));
    }
  }

  async function runDarazAction(action) {
    try {
      const result = await ordersApi.darazBulkAction({ action, order_ids: [id] });
      alert(result?.message || "Daraz action submitted.");
    } catch (err) {
      alert(getApiError(err, "Daraz action failed"));
    }
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center text-[12px] text-slate-500">
        Loading order...
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="space-y-3">
        <button
          type="button"
          onClick={() => navigate("/order-management/orders")}
          className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-orange-300 hover:text-orange-200"
        >
          <ArrowLeft size={14} /> Back to Orders
        </button>

        <div className="flex items-center gap-1.5 rounded-md border border-red-900 bg-red-950 px-3 py-2 text-[12px] text-red-300">
          <AlertCircle size={13} />
          {error || "Order not found."}
        </div>
      </div>
    );
  }

  const isDaraz = source === "daraz";
  const orderNo = order.display_order_no || order.order_no;
  const customerName = order.customer_name || order.shipping_name || order.buyer_name;
  const customerPhone = order.customer_phone || order.shipping_phone;
  const customerEmail = order.customer_email || order.email;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => navigate("/order-management/orders")}
          className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-orange-300 hover:text-orange-200"
        >
          <ArrowLeft size={14} /> Back to Orders
        </button>

        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex h-7 items-center gap-1 rounded-sm border border-slate-700 px-2.5 text-[11px] font-semibold text-slate-300 hover:bg-slate-800"
          >
            <Printer size={12} /> Print Invoice
          </button>

          <button
            type="button"
            onClick={() => load(true)}
            disabled={refreshing}
            className="inline-flex h-7 items-center gap-1 rounded-sm border border-slate-700 px-2.5 text-[11px] font-semibold text-slate-300 hover:bg-slate-800 disabled:opacity-60"
          >
            <RefreshCw size={12} className={refreshing ? "animate-spin" : ""} /> Refresh
          </button>

          <button
            type="button"
            onClick={saveWaybill}
            className="inline-flex h-7 items-center gap-1 rounded-sm border border-sky-500/40 bg-sky-950 px-2.5 text-[11px] font-semibold text-sky-300 hover:bg-sky-900"
          >
            Set Waybill
          </button>

          <select
            defaultValue=""
            onChange={(e) => {
              if (e.target.value) changeStatus(e.target.value);
              e.target.value = "";
            }}
            className="h-7 cursor-pointer border border-slate-700 bg-[#0b1220] px-2.5 text-[11px] font-semibold text-slate-300 outline-none hover:border-orange-400"
          >
            <option value="">Change Status</option>
            {STATUS_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option.replace(/_/g, " ")}
              </option>
            ))}
          </select>

          {isDaraz && (
            <>
              <button
                type="button"
                onClick={() => runDarazAction("pack")}
                className="inline-flex h-7 items-center rounded-sm border border-violet-500/40 bg-violet-950 px-2.5 text-[11px] font-semibold text-violet-300 hover:bg-violet-900"
              >
                Pack
              </button>
              <button
                type="button"
                onClick={() => runDarazAction("ready_to_ship")}
                className="inline-flex h-7 items-center rounded-sm border border-violet-500/40 bg-violet-950 px-2.5 text-[11px] font-semibold text-violet-300 hover:bg-violet-900"
              >
                Ready to Ship
              </button>
              <button
                type="button"
                onClick={() => runDarazAction("print_awb")}
                className="inline-flex h-7 items-center gap-1 rounded-sm border border-emerald-500/40 bg-emerald-950 px-2.5 text-[11px] font-semibold text-emerald-300 hover:bg-emerald-900"
              >
                <Printer size={12} /> Print AWB
              </button>
            </>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 border border-slate-800 bg-[#0b1220] px-4 py-3">
        <div>
          <h1 className="flex items-center gap-1.5 text-[14px] font-semibold text-white">
            <Package size={14} className="text-orange-400" />
            Order #{text(orderNo)}
          </h1>
          <p className="mt-0.5 text-[11px] text-slate-500">
            {order.source_label} &middot; {niceDate(order.order_date)}
          </p>
        </div>

        <span className="inline-flex rounded-full border border-slate-700 bg-slate-900 px-2.5 py-1 text-[11px] font-semibold text-slate-200">
          {order.order_status || "-"}
        </span>
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {[
          ["Item Subtotal", summary.itemSubtotal, "text-slate-100"],
          ["Shipping", summary.shipping, "text-sky-300"],
          ["Discount", summary.discount, "text-emerald-300"],
          ["Grand Total", summary.total, "text-orange-300"],
        ].map(([label, value, className]) => (
          <div key={label} className="border border-slate-800 bg-[#0b1220] p-3">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">{label}</p>
            <p className={`mt-1 text-[16px] font-bold ${className}`}>{money(value, order.currency)}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-3 xl:grid-cols-[1fr_340px]">
        <div className="space-y-3">
          <Card title="Items" icon={Package}>
            <div className="hidden grid-cols-[64px_1fr_100px_120px_120px] gap-3 border-b border-slate-800 pb-2 text-[10px] font-semibold uppercase text-slate-500 md:grid">
              <span />
              <span>Product</span>
              <span>Qty</span>
              <span>Price</span>
              <span>Subtotal</span>
            </div>

            <div className="divide-y divide-slate-800">
              {items.length ? (
                items.map((item, index) => (
                  <div
                    key={item.id || index}
                    className="grid grid-cols-1 gap-2 py-3 md:grid-cols-[64px_1fr_100px_120px_120px] md:items-center"
                  >
                    <div className="h-12 w-12 overflow-hidden rounded border border-slate-700 bg-white">
                      {getItemImage(item) ? (
                        <img src={getItemImage(item)} alt="" className="h-full w-full object-contain" />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-[9px] text-slate-400">
                          No image
                        </div>
                      )}
                    </div>

                    <div>
                      <p className="text-[12px] font-semibold text-slate-100">{text(getItemName(item))}</p>
                      {item.variation_name && (
                        <p className="mt-0.5 text-[11px] text-slate-400">{item.variation_name}</p>
                      )}
                      <p className="mt-0.5 text-[11px] font-mono text-slate-500">SKU: {getItemSku(item)}</p>
                    </div>

                    <p className="text-[12px] text-slate-300">{getItemQty(item)}</p>
                    <p className="text-[12px] text-slate-300">{money(getItemUnitPrice(item), order.currency)}</p>
                    <p className="text-[12px] font-semibold text-slate-100">
                      {money(getItemLineTotal(item), order.currency)}
                    </p>
                  </div>
                ))
              ) : (
                <p className="py-6 text-center text-[12px] text-slate-500">No items found.</p>
              )}
            </div>
          </Card>
        </div>

        <aside className="space-y-3">
          <Card title="Customer" icon={User}>
            <div className="space-y-3">
              <InfoLine label="Name" value={customerName} />

              <div className="flex items-start gap-2">
                <Phone size={13} className="mt-0.5 text-slate-500" />
                <InfoLine label="Phone" value={customerPhone} />
              </div>

              <div className="flex items-start gap-2">
                <Mail size={13} className="mt-0.5 text-slate-500" />
                <InfoLine label="Email" value={customerEmail} />
              </div>
            </div>
          </Card>

          <Card title="Shipping Address" icon={MapPin}>
            <p className="whitespace-pre-line text-[12px] text-slate-300">
              {fullAddress("shipping", order)}
            </p>
          </Card>

          <Card title="Billing Address" icon={MapPin}>
            <p className="whitespace-pre-line text-[12px] text-slate-300">
              {fullAddress("billing", order)}
            </p>
          </Card>
        </aside>
      </div>
    </div>
  );
}
