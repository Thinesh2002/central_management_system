import React, { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import {
  AlertCircle,
  Banknote,
  ClipboardList,
  Eye,
  Mail,
  MapPin,
  Package,
  PackageCheck,
  Phone,
  Printer,
  ReceiptText,
  RefreshCw,
  Truck,
  User,
  X,
} from "lucide-react";

import ordersApi from "../../../../config/sub_api/order_management_api/orders_api";
import { getApiError } from "../../../../config/api";
import { useToast } from "../../../../components/common/toast/ToastProvider";
import SendMessageCard from "./components/SendMessageCard";

const STATUS_OPTIONS = [
  "pending",
  "packed",
  "ready_to_ship",
  "shipped",
  "delivered",
  "cancelled",
  "returned",
];

const DARAZ_DETAIL_ACTIONS = [
  { value: "get_shipment_providers", label: "Get Shipment Providers" },
  { value: "pack", label: "Pack" },
  { value: "ready_to_ship", label: "Ready To Ship" },
  { value: "print_awb", label: "Print AWB" },
  { value: "recreate_package", label: "Recreate Package" },
  { value: "set_invoice_number", label: "Set Invoice Number" },
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
  if (value === null || value === undefined || value === "") return 0;
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;

  const raw = String(value).replace(/,/g, "").trim();
  const isBracketNegative = raw.startsWith("(") && raw.endsWith(")");
  const cleaned = raw.replace(/[^\d.-]/g, "");
  const parsed = Number(cleaned);

  if (!Number.isFinite(parsed)) return 0;
  return isBracketNegative ? -Math.abs(parsed) : parsed;
}

function safeJson(value) {
  if (!value) return value;
  if (typeof value !== "string") return value;

  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}

function getLiveOrder(order = {}) {
  const payload = order.daraz_live?.live_order || order.raw_payload || {};
  const parsed = safeJson(payload);
  return parsed?.data || parsed?.result?.data || parsed || {};
}

function isShippingFinanceLine(row = {}) {
  const value = [row.fee_name, row.fee_type, row.transaction_type, row.details, row.comment]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return value.includes("shipping");
}

function getTransactionBreakdown(transactions = []) {
  let productPrice = 0;
  let shippingAmount = 0;
  let totalExpense = 0;
  let totalIncome = 0;

  const hasFinance = transactions.length > 0;

  transactions.forEach((row) => {
    const amount = num(row.amount);
    totalIncome += amount;

    if (amount > 0) {
      if (isShippingFinanceLine(row)) shippingAmount += amount;
      else productPrice += amount;
    }

    if (amount < 0) totalExpense += Math.abs(amount);
  });

  return { hasFinance, productPrice, shippingAmount, totalExpense, totalIncome };
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

function getOrderProductPrice(order = {}, items = []) {
  const liveOrder = getLiveOrder(order);
  const itemsSubtotal = items.reduce((sum, item) => sum + getItemLineTotal(item), 0);

  return num(itemsSubtotal || order.item_total || order.subtotal || liveOrder.price || order.price);
}

function getOrderShippingAmount(order = {}) {
  const liveOrder = getLiveOrder(order);

  return num(
    order.shipping_fee ||
      order.shipping_paid ||
      order.shipping_amount ||
      liveOrder.shipping_fee ||
      liveOrder.shipping_fee_original
  );
}

function getOrderDiscount(order = {}) {
  const liveOrder = getLiveOrder(order);
  return num(order.discount_total || order.discount || order.voucher || liveOrder.voucher || 0);
}

function getAmountBreakdown(order, items = [], transactions = []) {
  const tx = getTransactionBreakdown(transactions);

  const productPrice = tx.hasFinance && tx.productPrice > 0 ? tx.productPrice : getOrderProductPrice(order, items);
  const shippingAmount =
    tx.hasFinance && tx.shippingAmount > 0 ? tx.shippingAmount : getOrderShippingAmount(order);
  const discount = getOrderDiscount(order);
  const totalOrder = productPrice + shippingAmount - discount;

  return {
    productPrice,
    shippingAmount,
    discount,
    totalOrder,
    totalExpense: tx.hasFinance ? tx.totalExpense : null,
    totalIncome: tx.hasFinance ? tx.totalIncome : null,
    hasFinance: tx.hasFinance,
  };
}

function getOrderSummary(order = {}, items = []) {
  const totalQty = items.reduce((sum, item) => sum + getItemQty(item), 0);
  const itemSubtotal = items.reduce((sum, item) => sum + getItemLineTotal(item), 0);
  const discount = getOrderDiscount(order);
  const shipping = getOrderShippingAmount(order);
  const total = itemSubtotal + shipping - discount;

  return { totalQty, itemSubtotal, discount, shipping, total };
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

// ---------- UI building blocks ----------

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

function MoneyCard({ label, value, icon: Icon, tone = "slate", note }) {
  const toneClass = {
    blue: "bg-sky-500/10 text-sky-300 ring-sky-500/30",
    red: "bg-red-500/10 text-red-300 ring-red-500/30",
    green: "bg-emerald-500/10 text-emerald-300 ring-emerald-500/30",
    amber: "bg-amber-500/10 text-amber-300 ring-amber-500/30",
    slate: "bg-slate-500/10 text-slate-300 ring-slate-500/30",
  }[tone];

  return (
    <div className="border border-slate-800 bg-[#0b1220] p-3 transition hover:border-slate-700">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">{label}</p>
          <p className="mt-1.5 truncate text-[16px] font-bold text-white">{value}</p>
          {note ? <p className="mt-1 text-[10px] text-slate-500">{note}</p> : null}
        </div>

        <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-md ring-1 ${toneClass}`}>
          <Icon size={15} />
        </div>
      </div>
    </div>
  );
}

function statusBadgeClass(status) {
  const s = String(status || "").toLowerCase();
  if (["delivered", "completed", "success"].includes(s)) return "border-emerald-800 bg-emerald-950 text-emerald-300";
  if (["cancelled", "canceled", "returned", "failed"].includes(s)) return "border-red-800 bg-red-950 text-red-300";
  if (["pending", "unpaid"].includes(s)) return "border-amber-800 bg-amber-950 text-amber-300";
  if (["shipped", "ready_to_ship", "packed"].includes(s)) return "border-sky-800 bg-sky-950 text-sky-300";
  return "border-slate-700 bg-slate-900 text-slate-300";
}

function OrderItemsCard({ order, items, currency }) {
  const summary = getOrderSummary(order, items);

  return (
    <Card title="Items" icon={Package}>
      <div className="hidden grid-cols-[56px_1fr_140px_100px_120px_120px] gap-3 border-b border-slate-800 pb-2 text-[10px] font-semibold uppercase text-slate-500 md:grid">
        <span />
        <span>Product</span>
        <span>Order Item ID</span>
        <span>Qty</span>
        <span>Price</span>
        <span>Subtotal</span>
      </div>

      <div className="divide-y divide-slate-800">
        {items.length ? (
          items.map((item, index) => (
            <div
              key={item.id || item.order_item_id || index}
              className="grid grid-cols-1 gap-2 py-3 md:grid-cols-[56px_1fr_140px_100px_120px_120px] md:items-center"
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

              <div className="min-w-0">
                <p className="truncate text-[11px] font-semibold text-orange-300">{text(getItemName(item))}</p>
                {(item.variation || item.variation_name) && (
                  <p className="mt-0.5 text-[10px] text-slate-400">
                    Variant: {text(item.variation || item.variation_name)}
                  </p>
                )}
                <p className="mt-0.5 text-[10px] font-mono text-slate-500">SKU: {getItemSku(item)}</p>
                {item.status && (
                  <span className="mt-1 inline-flex rounded-md bg-rose-950 px-1.5 py-0.5 text-[10px] font-semibold text-rose-300">
                    {text(item.status)}
                  </span>
                )}
              </div>

              <p className="text-[11px] text-slate-500">
                {text(item.order_item_id || item.daraz_order_item_id || item.id)}
              </p>

              <p className="text-[12px] text-slate-300">{getItemQty(item)}</p>
              <p className="text-[12px] text-slate-300">{money(getItemUnitPrice(item), currency)}</p>
              <p className="text-[12px] font-semibold text-slate-100">
                {money(getItemLineTotal(item), currency)}
              </p>
            </div>
          ))
        ) : (
          <p className="py-6 text-center text-[12px] text-slate-500">No items found.</p>
        )}
      </div>

      <div className="mt-3 flex justify-end">
        <div className="w-full max-w-xs space-y-1.5 text-[12px]">
          <div className="flex justify-between gap-4 text-slate-400">
            <span className="font-semibold">Total Quantity</span>
            <span>{summary.totalQty}</span>
          </div>
          <div className="flex justify-between gap-4 text-emerald-400">
            <span className="font-semibold">Discount</span>
            <span>- {money(summary.discount, currency)}</span>
          </div>
          <div className="flex justify-between gap-4 text-slate-400">
            <span className="font-semibold">Subtotal</span>
            <span>{money(summary.itemSubtotal, currency)}</span>
          </div>
          <div className="flex justify-between gap-4 text-slate-400">
            <span className="font-semibold">Shipping</span>
            <span>{money(summary.shipping, currency)}</span>
          </div>
          <div className="flex justify-between gap-4 border-t border-slate-800 pt-1.5 text-[13px] font-bold text-white">
            <span>Total</span>
            <span>{money(summary.total, currency)}</span>
          </div>
        </div>
      </div>
    </Card>
  );
}

function CustomerCard({ order }) {
  const liveOrder = getLiveOrder(order);
  const shipping = getShippingAddress(order);

  const name =
    order.customer_name ||
    order.shipping_name ||
    `${text(liveOrder.customer_first_name, "")} ${text(liveOrder.customer_last_name, "")}`.trim();

  const phone = order.customer_phone || order.shipping_phone || shipping.phone;
  const email = order.customer_email || order.email;

  return (
    <Card title="Customer" icon={User}>
      <div className="space-y-3">
        <InfoLine label="Name" value={name} />

        <div className="flex items-start gap-2">
          <Phone size={13} className="mt-0.5 text-slate-500" />
          <InfoLine label="Phone" value={phone} />
        </div>

        <div className="flex items-start gap-2">
          <Mail size={13} className="mt-0.5 text-slate-500" />
          <InfoLine label="Email" value={email} />
        </div>
      </div>
    </Card>
  );
}

function AddressCard({ title, address }) {
  return (
    <Card title={title} icon={MapPin}>
      <p className="whitespace-pre-line text-[12px] text-slate-300">{text(address)}</p>
    </Card>
  );
}

function getShippingAddress(order = {}) {
  return fullAddress("shipping", order);
}

function getBillingAddress(order = {}) {
  return fullAddress("billing", order);
}

function TrackingMiniCard({ order, onTrack }) {
  const firstItem = order.items?.[0] || {};

  const tracking =
    firstItem.tracking_code || firstItem.tracking_number || order.waybill_id || order.tracking_number;

  const packageId = firstItem.package_id || order.package_id;

  return (
    <Card
      title="Tracking"
      icon={Truck}
      right={
        <button
          type="button"
          onClick={onTrack}
          className="inline-flex h-7 items-center gap-1 rounded-sm border border-orange-500/40 bg-orange-500 px-2.5 text-[11px] font-semibold text-white hover:bg-orange-400"
        >
          <Eye size={12} /> Track My Order
        </button>
      }
    >
      <div className="grid gap-3 sm:grid-cols-3">
        <InfoLine label="Package ID" value={packageId} />
        <InfoLine label="Tracking No" value={tracking} />
        <InfoLine label="Shipping Provider" value={firstItem.shipment_provider || order.shipment_provider} />
      </div>
    </Card>
  );
}

function flattenTrackingRows(modules = []) {
  const rows = [];

  modules.forEach((moduleItem) => {
    const packages = moduleItem.package_detail_info_list || [];

    packages.forEach((pkg) => {
      const events = pkg.logistic_detail_info_list || [];

      events.forEach((event, index) => {
        rows.push({
          key: `${pkg.ofc_package_id || pkg.tracking_number}-${index}`,
          packageId: pkg.ofc_package_id,
          trackingNumber: pkg.tracking_number,
          title: event.title || "Tracking update",
          description: event.description || "",
          eventTime: Number(event.event_time) || 0,
        });
      });
    });
  });

  return rows.sort((a, b) => b.eventTime - a.eventTime);
}

function TrackOrderModal({ open, onClose, order }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;

    let cancelled = false;
    setLoading(true);
    setError("");

    ordersApi
      .getTracking(order.source, order.source_order_id)
      .then((res) => {
        if (cancelled) return;
        setRows(flattenTrackingRows(res?.data || []));
      })
      .catch((err) => {
        if (cancelled) return;
        setError(getApiError(err, "Failed to load tracking"));
        setRows([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, order.source, order.source_order_id]);

  if (!open) return null;

  const firstItem = order.items?.[0] || {};
  const latest = rows[0];
  const tracking =
    latest?.trackingNumber ||
    firstItem.tracking_code ||
    firstItem.tracking_number ||
    order.waybill_id ||
    order.tracking_number;
  const packageId = latest?.packageId || firstItem.package_id || order.package_id;
  const provider = firstItem.shipment_provider || order.shipment_provider;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="w-full max-w-2xl border border-slate-700 bg-[#0b1220] shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-slate-800 bg-[#07101f] px-4 py-3">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Track My Order</p>
            <h3 className="mt-1 text-[14px] font-bold text-white">{order.order_status || "-"}</h3>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white"
          >
            <X size={16} />
          </button>
        </div>

        <div className="p-4">
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="border border-slate-800 bg-[#070b16] p-3">
              <div className="flex items-center gap-1.5 text-slate-500">
                <PackageCheck size={13} />
                <p className="text-[10px] font-semibold uppercase">Package ID</p>
              </div>
              <p className="mt-1.5 break-words text-[12px] font-semibold text-slate-100">{text(packageId)}</p>
            </div>

            <div className="border border-slate-800 bg-[#070b16] p-3">
              <div className="flex items-center gap-1.5 text-slate-500">
                <Truck size={13} />
                <p className="text-[10px] font-semibold uppercase">Tracking Number</p>
              </div>
              <p className="mt-1.5 break-words text-[12px] font-semibold text-slate-100">{text(tracking)}</p>
            </div>

            <div className="border border-slate-800 bg-[#070b16] p-3">
              <div className="flex items-center gap-1.5 text-slate-500">
                <MapPin size={13} />
                <p className="text-[10px] font-semibold uppercase">Courier</p>
              </div>
              <p className="mt-1.5 break-words text-[12px] font-semibold text-slate-100">{text(provider)}</p>
            </div>
          </div>

          <div className="mt-4">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-[11px] font-semibold text-slate-300">Tracking Timeline</p>
              <span className="text-[10px] text-slate-500">{rows.length} update{rows.length === 1 ? "" : "s"}</span>
            </div>

            {loading ? (
              <p className="py-6 text-center text-[12px] text-slate-500">Loading tracking...</p>
            ) : error ? (
              <div className="border border-red-900 bg-red-950 p-3 text-[11px] text-red-300">{error}</div>
            ) : rows.length ? (
              <div className="space-y-2">
                {rows.map((row) => (
                  <div key={row.key} className="border border-slate-800 bg-[#070b16] p-3">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-[12px] font-semibold text-slate-100">{row.title}</p>
                      <span className="text-[10px] text-slate-500">
                        {row.eventTime ? new Date(row.eventTime).toLocaleString() : "-"}
                      </span>
                    </div>
                    {row.description && (
                      <p className="mt-1 text-[11px] text-slate-400">{row.description}</p>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="border border-amber-900 bg-amber-950 p-3 text-[11px] text-amber-300">
                No tracking events yet — this becomes available once the order is packed and ready to ship.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function DarazFinanceTable({ transactions, currency }) {
  const total = transactions.reduce((sum, row) => sum + num(row.amount), 0);

  return (
    <Card
      title="Finance"
      icon={Banknote}
      right={
        transactions.length ? (
          <span className="rounded-md bg-slate-800 px-2 py-1 text-[10px] font-semibold text-slate-300">
            Total {money(total, currency)}
          </span>
        ) : null
      }
    >
      {transactions.length ? (
        <div className="overflow-x-auto">
          <table className="min-w-full text-[11px]">
            <thead>
              <tr className="border-b border-slate-800 text-left text-[10px] font-semibold uppercase text-slate-500">
                <th className="pb-2 pr-3">Date</th>
                <th className="pb-2 pr-3">Transaction</th>
                <th className="pb-2 pr-3">Fee / Reason</th>
                <th className="pb-2 pr-3">Amount</th>
                <th className="pb-2 pr-3">Order Item</th>
                <th className="pb-2">SKU</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-800">
              {transactions.map((row, index) => (
                <tr key={`${row.transaction_number || row.id || index}`}>
                  <td className="py-2 pr-3 text-slate-400">{text(row.transaction_date)}</td>
                  <td className="py-2 pr-3 text-slate-300">{text(row.transaction_type)}</td>
                  <td className="py-2 pr-3 text-slate-300">{text(row.fee_name || row.fee_type || row.details)}</td>
                  <td className={`py-2 pr-3 font-semibold ${num(row.amount) < 0 ? "text-red-400" : "text-emerald-400"}`}>
                    {money(row.amount, currency)}
                  </td>
                  <td className="py-2 pr-3 text-slate-400">
                    {text(row.orderItem_no || row.order_item_no || row.trade_order_line_id)}
                  </td>
                  <td className="py-2 text-slate-400">{text(row.seller_sku || row.lazada_sku)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="border border-slate-800 bg-[#070b16] p-3">
          <p className="text-[12px] font-semibold text-slate-300">No finance transactions yet.</p>
          <p className="mt-1 text-[11px] text-slate-500">
            Daraz finance lines appear once the Daraz Order API is connected and transactions sync.
          </p>
        </div>
      )}
    </Card>
  );
}

export default function OrderDetailPage() {
  const { source, id } = useParams();
  const showToast = useToast();

  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [trackOpen, setTrackOpen] = useState(false);
  const [detailDarazAction, setDetailDarazAction] = useState("get_shipment_providers");
  const [darazBusy, setDarazBusy] = useState(false);
  const [transactions, setTransactions] = useState([]);

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

  useEffect(() => {
    if (source !== "daraz") return;

    let cancelled = false;

    ordersApi
      .getFinance(source, id)
      .then((res) => {
        if (!cancelled) setTransactions(res?.data || []);
      })
      .catch(() => {
        if (!cancelled) setTransactions([]);
      });

    return () => {
      cancelled = true;
    };
  }, [source, id]);

  const items = order?.items || [];

  const amounts = useMemo(() => getAmountBreakdown(order || {}, items, transactions), [order, items, transactions]);

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
    setDarazBusy(true);

    try {
      const result = await ordersApi.darazBulkAction({ action, order_ids: [id] });
      alert(result?.message || "Daraz action submitted.");
      await load(true);
    } catch (err) {
      alert(getApiError(err, "Daraz action failed"));
    } finally {
      setDarazBusy(false);
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
        <div className="flex items-center gap-1.5 rounded-md border border-red-900 bg-red-950 px-3 py-2 text-[12px] text-red-300">
          <AlertCircle size={13} />
          {error || "Order not found."}
        </div>
      </div>
    );
  }

  const isDaraz = source === "daraz";
  const orderNo = order.display_order_no || order.order_no;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-end gap-2">
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

          {source === "local" && (
            <button
              type="button"
              onClick={saveWaybill}
              className="inline-flex h-7 items-center gap-1 rounded-sm border border-sky-500/40 bg-sky-950 px-2.5 text-[11px] font-semibold text-sky-300 hover:bg-sky-900"
            >
              Set Waybill
            </button>
          )}

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
                onClick={() => setTrackOpen(true)}
                className="inline-flex h-7 items-center gap-1 rounded-sm border border-orange-500/40 bg-orange-500 px-2.5 text-[11px] font-semibold text-white hover:bg-orange-400"
              >
                <Eye size={12} /> Track My Order
              </button>

              <button
                type="button"
                disabled={darazBusy}
                onClick={() => runDarazAction("print_awb")}
                className="inline-flex h-7 items-center gap-1 rounded-sm border border-emerald-500/40 bg-emerald-950 px-2.5 text-[11px] font-semibold text-emerald-300 hover:bg-emerald-900 disabled:opacity-60"
              >
                <Printer size={12} /> Print AWB
              </button>

              <div className="flex items-center gap-1.5 border border-slate-700 bg-[#0b1220] px-1.5 py-1">
                <select
                  value={detailDarazAction}
                  disabled={darazBusy}
                  onChange={(event) => setDetailDarazAction(event.target.value)}
                  className="h-7 min-w-[170px] cursor-pointer border-none bg-transparent px-1 text-[11px] font-semibold text-slate-300 outline-none"
                >
                  {DARAZ_DETAIL_ACTIONS.map((action) => (
                    <option key={action.value} value={action.value}>
                      {action.label}
                    </option>
                  ))}
                </select>

                <button
                  type="button"
                  disabled={darazBusy}
                  onClick={() => runDarazAction(detailDarazAction)}
                  className="h-7 shrink-0 rounded-sm border border-slate-700 bg-slate-800 px-2.5 text-[11px] font-semibold text-slate-200 hover:bg-slate-700 disabled:opacity-60"
                >
                  Run Daraz API
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 border border-slate-800 bg-[#0b1220] px-4 py-3">
        <div>
          <h1 className="flex items-center gap-1.5 text-[12px] font-semibold text-white">
            <Package size={12} className="text-orange-400" />
            Order #{text(orderNo)}
          </h1>
          <p className="mt-0.5 text-[11px] text-slate-500">
            {order.source_label} &middot; {niceDate(order.order_date)}
          </p>
        </div>

        <span className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-semibold ${statusBadgeClass(order.order_status)}`}>
          {order.order_status || "-"}
        </span>
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
        <MoneyCard
          label="Product Price"
          value={money(amounts.productPrice, order.currency)}
          icon={ReceiptText}
          tone="blue"
          note="Items product total"
        />

        <MoneyCard
          label="Shipping Amount"
          value={money(amounts.shippingAmount, order.currency)}
          icon={Truck}
          tone="slate"
          note="Buyer paid shipping"
        />

        <MoneyCard
          label="Total Order"
          value={money(amounts.totalOrder, order.currency)}
          icon={ReceiptText}
          tone="green"
          note="Product + shipping - discount"
        />

        <MoneyCard
          label="Total Expense"
          value={amounts.hasFinance ? money(amounts.totalExpense, order.currency) : "Pending"}
          icon={Banknote}
          tone={amounts.hasFinance ? "red" : "amber"}
          note={amounts.hasFinance ? "All negative finance lines" : "Finance not ready"}
        />

        <MoneyCard
          label="Total Income"
          value={amounts.hasFinance ? money(amounts.totalIncome, order.currency) : "Pending"}
          icon={Banknote}
          tone={amounts.hasFinance ? "green" : "amber"}
          note={amounts.hasFinance ? "Net finance amount" : "Waiting Daraz finance"}
        />
      </div>

      <div className="grid gap-3 xl:grid-cols-[1fr_340px]">
        <div className="space-y-3">
          <OrderItemsCard order={order} items={items} currency={order.currency} />

          {isDaraz && <TrackingMiniCard order={order} onTrack={() => setTrackOpen(true)} />}

          {isDaraz && <DarazFinanceTable transactions={transactions} currency={order.currency} />}

          {isDaraz && <SendMessageCard order={order} />}

          <Card title="Notes / History" icon={ClipboardList}>
            <textarea
              className="min-h-[100px] w-full border border-slate-700 bg-[#070b16] px-3 py-2 text-[12px] text-slate-100 outline-none focus:border-orange-400"
              placeholder="Enter order note..."
            />

            <div className="mt-2.5 flex justify-end">
              <button
                type="button"
                className="inline-flex h-8 items-center gap-1.5 bg-orange-500 px-3 text-[12px] font-semibold text-white hover:bg-orange-400"
              >
                Save Note
              </button>
            </div>
          </Card>
        </div>

        <aside className="space-y-3">
          <CustomerCard order={order} />
          <AddressCard title="Shipping Address" address={getShippingAddress(order)} />
          <AddressCard title="Billing Address" address={getBillingAddress(order)} />
        </aside>
      </div>

      {isDaraz && <TrackOrderModal open={trackOpen} onClose={() => setTrackOpen(false)} order={order} />}
    </div>
  );
}
