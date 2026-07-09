import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  AlertCircle,
  ImageOff,
  Package,
  PackageCheck,
  Plus,
  Printer,
  RefreshCw,
  Search,
  Truck,
  X,
} from "lucide-react";

import ordersApi from "../../../config/sub_api/order_management_api/orders_api";
import { getApiError } from "../../../config/api";
import { useToast } from "../../../components/common/toast/ToastProvider";
import { resolveImageUrl } from "../../product_management/products/product_dashboard/utils/localProductsImageHelpers";

const STATUS_TABS = [
  { key: "all", label: "All" },
  { key: "pending", label: "Pending" },
  { key: "packed", label: "Packed" },
  { key: "ready_to_ship", label: "Ready to Ship" },
  { key: "shipped", label: "Shipped" },
  { key: "delivered", label: "Delivered" },
  { key: "cancelled", label: "Cancelled" },
  { key: "returned", label: "Returned" },
];

const SOURCE_TABS = [
  { key: "all", label: "All Sources" },
  { key: "local", label: "Manual" },
  { key: "daraz", label: "Daraz" },
  { key: "woo", label: "WooCommerce" },
];

const PAGE_SIZE = 50;

function normalize(value) {
  return String(value || "").trim().toLowerCase();
}

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

function orderSearchText(order) {
  return [
    order.order_no,
    order.display_order_no,
    order.account_name,
    order.customer_name,
    order.shipping_name,
    order.customer_phone,
    order.shipping_phone,
    order.customer_email,
    order.waybill_id,
    order.tracking_number,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function statusBadgeClass(status) {
  const s = normalize(status);
  if (["delivered", "completed", "success"].includes(s)) {
    return "border-emerald-800 bg-emerald-950 text-emerald-300";
  }
  if (["cancelled", "canceled", "returned", "shipped_back_success", "failed"].includes(s)) {
    return "border-red-800 bg-red-950 text-red-300";
  }
  if (["pending", "unpaid"].includes(s)) {
    return "border-amber-800 bg-amber-950 text-amber-300";
  }
  if (["shipped", "ready_to_ship", "packed"].includes(s)) {
    return "border-sky-800 bg-sky-950 text-sky-300";
  }
  return "border-slate-700 bg-slate-900 text-slate-300";
}

function sourceBadgeClass(source) {
  if (source === "daraz") return "border-orange-800 bg-orange-950 text-orange-300";
  if (source === "woo") return "border-violet-800 bg-violet-950 text-violet-300";
  return "border-slate-700 bg-slate-900 text-slate-300";
}

function orderKey(order) {
  return `${order.source}:${order.source_order_id}`;
}

function ProductThumb({ order, onPreview }) {
  const url = resolveImageUrl(order.thumbnail_url || "");
  const title = order.first_item_title || order.display_order_no;

  return (
    <button
      type="button"
      onClick={() => url && onPreview({ url, title })}
      disabled={!url}
      title={url ? "Click to preview" : "No image"}
      className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded border border-slate-700 bg-white disabled:cursor-default"
    >
      {url ? (
        <img src={url} alt={title || "Product"} className="h-full w-full object-contain" />
      ) : (
        <ImageOff size={14} className="text-slate-400" />
      )}
    </button>
  );
}

function ImagePreviewModal({ image, onClose }) {
  if (!image) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg border border-slate-700 bg-[#0b1220] shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-slate-800 px-4 py-2.5">
          <p className="truncate text-[12px] font-semibold text-white">{image.title || "Product image"}</p>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white"
          >
            <X size={16} />
          </button>
        </div>

        <div className="flex items-center justify-center bg-white p-4">
          <img src={image.url} alt={image.title || "Product"} className="max-h-[60vh] w-full object-contain" />
        </div>
      </div>
    </div>
  );
}

export default function OrdersPage() {
  const navigate = useNavigate();
  const showToast = useToast();

  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("all");
  const [sourceFilter, setSourceFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [accountFilter, setAccountFilter] = useState("");
  const [filterOptions, setFilterOptions] = useState({ accounts: [], payment_methods: [] });
  const [selectedKeys, setSelectedKeys] = useState([]);
  const [busy, setBusy] = useState(false);
  const [page, setPage] = useState(1);
  const [imagePreview, setImagePreview] = useState(null);

  async function load() {
    setLoading(true);
    setError("");

    try {
      const [ordersRes, optionsRes] = await Promise.all([
        ordersApi.listOrders({ limit: 1000 }),
        ordersApi.filterOptions().catch(() => ({ data: {} })),
      ]);

      setOrders(ordersRes?.data?.orders || []);
      setFilterOptions(optionsRes?.data || { accounts: [], payment_methods: [] });
    } catch (err) {
      setError(getApiError(err, "Failed to load orders"));
      setOrders([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const counts = useMemo(() => {
    const map = { all: orders.length };

    orders.forEach((order) => {
      const key = normalize(order.order_status) || "unknown";
      map[key] = (map[key] || 0) + 1;
    });

    return map;
  }, [orders]);

  const filteredOrders = useMemo(() => {
    const q = search.trim().toLowerCase();

    return orders.filter((order) => {
      if (status !== "all" && normalize(order.order_status) !== status) return false;
      if (sourceFilter !== "all" && order.source !== sourceFilter) return false;

      if (accountFilter && normalize(order.account_name) !== normalize(accountFilter)) {
        return false;
      }

      if (q && !orderSearchText(order).includes(q)) return false;

      return true;
    });
  }, [orders, status, sourceFilter, accountFilter, search]);

  useEffect(() => {
    setPage(1);
  }, [status, sourceFilter, accountFilter, search]);

  const pageCount = Math.max(Math.ceil(filteredOrders.length / PAGE_SIZE), 1);

  const pagedOrders = useMemo(
    () => filteredOrders.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    [filteredOrders, page]
  );

  const selectedOrders = useMemo(
    () => filteredOrders.filter((order) => selectedKeys.includes(orderKey(order))),
    [filteredOrders, selectedKeys]
  );

  const selectedDaraz = useMemo(
    () => selectedOrders.filter((order) => order.source === "daraz"),
    [selectedOrders]
  );

  const pagedKeys = pagedOrders.map(orderKey);
  const allPageSelected = pagedKeys.length > 0 && pagedKeys.every((key) => selectedKeys.includes(key));

  function toggleOrder(order) {
    const key = orderKey(order);
    setSelectedKeys((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]));
  }

  function toggleAll() {
    if (allPageSelected) {
      setSelectedKeys((prev) => prev.filter((key) => !pagedKeys.includes(key)));
      return;
    }

    setSelectedKeys((prev) => Array.from(new Set([...prev, ...pagedKeys])));
  }

  async function changeStatus(order, nextStatus) {
    try {
      await ordersApi.updateStatus(order.source, order.source_order_id, { status: nextStatus });
      showToast("Order status updated.");
      await load();
    } catch (err) {
      alert(getApiError(err, "Failed to update status"));
    }
  }

  async function saveWaybill(order) {
    const waybillId = window.prompt("Enter waybill / tracking number for this order");
    if (!waybillId) return;

    try {
      await ordersApi.createWaybill(order.source, order.source_order_id, {
        waybill_id: waybillId,
        tracking_number: waybillId,
      });
      showToast("Waybill saved.");
      await load();
    } catch (err) {
      alert(getApiError(err, "Failed to save waybill"));
    }
  }

  async function runDarazBulkAction(action) {
    if (!selectedDaraz.length) return;

    setBusy(true);

    try {
      const result = await ordersApi.darazBulkAction({
        action,
        order_ids: selectedDaraz.map((order) => order.source_order_id),
      });

      showToast(result?.message || "Daraz action submitted.");
    } catch (err) {
      alert(getApiError(err, "Daraz action failed"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-3">
      <section className="overflow-hidden border border-slate-700 bg-[#1b2a3a] shadow-lg shadow-black/20">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-700 px-3 py-2">
          <h3 className="flex items-center gap-1.5 text-[12px] font-semibold text-white">
            <Package size={13} className="text-orange-400" />
            Orders
          </h3>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={load}
              disabled={loading}
              className="flex h-6 items-center gap-1 rounded-sm border border-slate-600 bg-[#44546b] px-2.5 text-[10px] font-semibold text-white hover:bg-[#52657f] disabled:opacity-60"
            >
              <RefreshCw size={11} className={loading ? "animate-spin" : ""} />
              REFRESH
            </button>

            <button
              type="button"
              onClick={() => navigate("/order-management/orders/create")}
              className="flex h-6 items-center gap-1 rounded-sm border border-orange-500/40 bg-orange-500 px-2.5 text-[10px] font-semibold text-white hover:bg-orange-400"
            >
              <Plus size={11} />
              CREATE MANUAL ORDER
            </button>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-1.5 border-b border-slate-700 px-3 py-2">
          {STATUS_TABS.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setStatus(tab.key)}
              className={`h-7 rounded-sm border px-2.5 text-[11px] font-semibold ${
                status === tab.key
                  ? "border-orange-400 bg-orange-500/10 text-orange-300"
                  : "border-slate-700 bg-transparent text-slate-400 hover:text-slate-200"
              }`}
            >
              {tab.label} {counts[tab.key] !== undefined ? `(${counts[tab.key]})` : ""}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 gap-2 px-3 py-2.5 md:grid-cols-2 xl:grid-cols-[1fr_170px_200px]">
          <label className="block">
            <div className="flex h-8 items-center border border-slate-600 bg-[#2b3441] px-2.5 focus-within:border-orange-400">
              <Search size={13} className="text-slate-500" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search order no, customer, phone, waybill..."
                className="h-full min-w-0 flex-1 bg-transparent px-2 text-[11px] font-medium text-slate-100 outline-none placeholder:text-slate-500"
              />
            </div>
          </label>

          <select
            value={sourceFilter}
            onChange={(e) => setSourceFilter(e.target.value)}
            className="h-8 w-full cursor-pointer border border-slate-600 bg-[#2b3441] px-2.5 text-[11px] font-medium text-white outline-none focus:border-orange-400"
          >
            {SOURCE_TABS.map((tab) => (
              <option key={tab.key} value={tab.key}>
                {tab.label}
              </option>
            ))}
          </select>

          <select
            value={accountFilter}
            onChange={(e) => setAccountFilter(e.target.value)}
            className="h-8 w-full cursor-pointer border border-slate-600 bg-[#2b3441] px-2.5 text-[11px] font-medium text-white outline-none focus:border-orange-400"
          >
            <option value="">All Accounts</option>
            {(filterOptions.accounts || []).map((account) => (
              <option key={account} value={account}>
                {account}
              </option>
            ))}
          </select>
        </div>
      </section>

      {selectedOrders.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-2 border border-orange-500/40 bg-orange-500/10 px-3 py-2">
          <p className="text-[11px] font-semibold text-orange-200">
            {selectedOrders.length} order{selectedOrders.length === 1 ? "" : "s"} selected
            {selectedDaraz.length ? ` (${selectedDaraz.length} Daraz)` : ""}
          </p>

          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={() => setSelectedKeys([])}
              className="h-7 rounded-sm border border-slate-600 px-2.5 text-[11px] font-semibold text-slate-300 hover:bg-slate-800"
            >
              Clear
            </button>

            <button
              type="button"
              disabled={!selectedDaraz.length || busy}
              onClick={() => runDarazBulkAction("pack")}
              className="inline-flex h-7 items-center gap-1 rounded-sm border border-sky-500/40 bg-sky-950 px-2.5 text-[11px] font-semibold text-sky-300 hover:bg-sky-900 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <PackageCheck size={12} /> Pack
            </button>

            <button
              type="button"
              disabled={!selectedDaraz.length || busy}
              onClick={() => runDarazBulkAction("ready_to_ship")}
              className="inline-flex h-7 items-center gap-1 rounded-sm border border-violet-500/40 bg-violet-950 px-2.5 text-[11px] font-semibold text-violet-300 hover:bg-violet-900 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Truck size={12} /> Ready to Ship
            </button>

            <button
              type="button"
              disabled={!selectedDaraz.length || busy}
              onClick={() => runDarazBulkAction("print_awb")}
              className="inline-flex h-7 items-center gap-1 rounded-sm border border-emerald-500/40 bg-emerald-950 px-2.5 text-[11px] font-semibold text-emerald-300 hover:bg-emerald-900 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Printer size={12} /> Print AWB
            </button>
          </div>
        </div>
      )}

      {error && (
        <div className="flex items-center gap-1.5 rounded-md border border-red-900 bg-red-950 px-3 py-2 text-[12px] text-red-300">
          <AlertCircle size={13} />
          {error}
        </div>
      )}

      {loading ? (
        <div className="border border-slate-800 bg-slate-950 p-5 text-center text-[12px] text-slate-500">
          Loading orders...
        </div>
      ) : (
        <section className="overflow-visible border border-slate-800 bg-[#0b1220]">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-800">
              <thead className="border-b border-slate-800 bg-[#111827]">
                <tr>
                  <th className="w-10 px-3 py-2.5">
                    <input
                      type="checkbox"
                      checked={allPageSelected}
                      onChange={toggleAll}
                      className="h-3.5 w-3.5 cursor-pointer rounded border-slate-600 bg-slate-900 accent-orange-500"
                    />
                  </th>
                  {["Product", "Order No", "Source", "Account", "Customer", "Date", "Status", "Total", "Waybill", ""].map(
                    (header) => (
                      <th
                        key={header}
                        className="px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-orange-300"
                      >
                        {header}
                      </th>
                    )
                  )}
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-800">
                {!pagedOrders.length && (
                  <tr>
                    <td colSpan="10" className="px-3 py-8 text-center text-[12px] text-slate-500">
                      No orders found.
                    </td>
                  </tr>
                )}

                {pagedOrders.map((order) => {
                  const key = orderKey(order);
                  const isSelected = selectedKeys.includes(key);

                  return (
                    <tr key={key} className={`transition ${isSelected ? "bg-orange-500/5" : "hover:bg-[#111827]"}`}>
                      <td className="px-3 py-2.5">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleOrder(order)}
                          className="h-3.5 w-3.5 cursor-pointer rounded border-slate-600 bg-slate-900 accent-orange-500"
                        />
                      </td>

                      <td className="px-3 py-2.5">
                        <div className="flex items-center gap-2">
                          <ProductThumb order={order} onPreview={setImagePreview} />
                          <span className="max-w-[160px] truncate text-[11px] text-slate-400" title={order.first_item_title || ""}>
                            {order.first_item_title || "-"}
                          </span>
                        </div>
                      </td>

                      <td className="px-3 py-2.5">
                        <button
                          type="button"
                          onClick={() =>
                            navigate(`/order-management/orders/${order.source}/${order.source_order_id}`)
                          }
                          className="cursor-pointer text-[12px] font-semibold text-orange-300 underline decoration-dotted hover:text-orange-200"
                        >
                          {order.display_order_no || order.order_no}
                        </button>
                      </td>

                      <td className="px-3 py-2.5">
                        <span
                          className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold ${sourceBadgeClass(order.source)}`}
                        >
                          {order.source_label}
                        </span>
                      </td>

                      <td className="px-3 py-2.5 text-[12px] text-slate-300">{order.account_name || "-"}</td>

                      <td className="px-3 py-2.5 text-[12px] text-slate-300">
                        {order.customer_name || order.shipping_name || "-"}
                      </td>

                      <td className="px-3 py-2.5 text-[12px] text-slate-400">{niceDate(order.order_date)}</td>

                      <td className="px-3 py-2.5">
                        <span
                          className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold ${statusBadgeClass(order.order_status)}`}
                        >
                          {order.order_status || "-"}
                        </span>
                      </td>

                      <td className="px-3 py-2.5 text-[12px] font-semibold text-slate-100">
                        {money(order.grand_total, order.currency)}
                      </td>

                      <td className="px-3 py-2.5 text-[12px] text-slate-400">
                        {order.waybill_id || order.tracking_number || "-"}
                      </td>

                      <td className="px-3 py-2.5 text-right">
                        <div className="inline-flex items-center gap-1.5">
                          {order.source === "local" && (
                            <button
                              type="button"
                              onClick={() => saveWaybill(order)}
                              title="Set waybill / tracking number"
                              className="h-7 rounded-sm border border-slate-700 px-2 text-[10px] font-semibold text-slate-300 hover:border-sky-400 hover:text-sky-300"
                            >
                              Waybill
                            </button>
                          )}

                          <select
                            defaultValue=""
                            onChange={(e) => {
                              if (e.target.value) changeStatus(order, e.target.value);
                              e.target.value = "";
                            }}
                            className="h-7 cursor-pointer border border-slate-700 bg-[#0b1220] px-2 text-[10px] font-semibold text-slate-300 outline-none hover:border-orange-400"
                          >
                            <option value="">Set Status</option>
                            {STATUS_TABS.filter((tab) => tab.key !== "all").map((tab) => (
                              <option key={tab.key} value={tab.key}>
                                {tab.label}
                              </option>
                            ))}
                          </select>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {filteredOrders.length > PAGE_SIZE && (
            <div className="flex items-center justify-between border-t border-slate-800 px-3 py-2.5">
              <p className="text-[11px] text-slate-500">
                Showing {(page - 1) * PAGE_SIZE + 1}-{Math.min(page * PAGE_SIZE, filteredOrders.length)} of{" "}
                {filteredOrders.length}
              </p>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(p - 1, 1))}
                  className="h-7 rounded-sm border border-slate-700 px-2.5 text-[11px] font-semibold text-slate-300 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Previous
                </button>

                <span className="text-[11px] text-slate-500">
                  Page {page} of {pageCount}
                </span>

                <button
                  type="button"
                  disabled={page >= pageCount}
                  onClick={() => setPage((p) => Math.min(p + 1, pageCount))}
                  className="h-7 rounded-sm border border-slate-700 px-2.5 text-[11px] font-semibold text-slate-300 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </section>
      )}

      <ImagePreviewModal image={imagePreview} onClose={() => setImagePreview(null)} />
    </div>
  );
}
