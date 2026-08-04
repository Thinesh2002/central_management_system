import React, { useEffect, useMemo, useState, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import {
  AlertCircle,
  Filter,
  Package,
  PackageCheck,
  Plus,
  Printer,
  RefreshCw,
  Search,
  Truck,
} from "lucide-react";

import ordersApi from "../../../config/sub_api/order_management_api/orders_api";
import { brighthubProductApi } from "../../../config/sub_api/brighthub_api/brighthub_product_api";
import { brighthubOrderApi } from "../../../config/sub_api/brighthub_api/brighthub_order_api";
import { getApiError } from "../../../config/api";
import { useToast } from "../../../components/common/toast/ToastProvider";
import Loader from "../../../components/common/Loader";
import OrderRow from "./components/OrderRow";
import FilterDrawer from "./components/FilterDrawer";
import ImagePreviewModal from "./components/ImagePreviewModal";
import PdfPreviewModal from "./components/PdfPreviewModal";
import PrintLayoutChoiceModal from "./components/PrintLayoutChoiceModal";
import AddWaybillModal from "./components/AddWaybillModal";
import {
  canDarazPack,
  canDarazReady,
  countByStatus,
  matchesStatus,
  normalize,
  orderKey,
  orderSearchText,
  statusBucketKey,
} from "./utils/orderHelpers";
import { extractDarazActionMessage, extractPdfUrls, openDarazDocument } from "./utils/darazDocument";
import { usePageOverlay } from "../../../components/common/page_overlay/PageOverlayProvider";
import { useConfirm } from "../../../components/common/confirm_modal/ConfirmProvider";

const STATUS_TABS = [
  { key: "all", label: "All" },
  { key: "to_pack", label: "To Pack" },
  { key: "to_arrange_shipment", label: "Packed" },
  { key: "ready_to_ship", label: "Ready To Ship" },
  { key: "shipped", label: "Shipped" },
  { key: "delivered", label: "Delivered" },
  { key: "cancelled", label: "Cancelled" },
  { key: "returned", label: "Returned" },
];

const blankFilters = {
  marketplace: "all",
  account: "",
  country: "",
  payment: "",
  dateFrom: "",
  dateTo: "",
  hasWaybill: "all",
  minTotal: "",
  maxTotal: "",
};

function filterOrders(orders, filters, query, status) {
  const q = query.trim().toLowerCase();

  return orders.filter((order) => {
    if (!matchesStatus(order, status)) return false;
    if (q && !orderSearchText(order).includes(q)) return false;

    if (filters.marketplace !== "all" && normalize(order.source) !== normalize(filters.marketplace)) {
      return false;
    }

    if (filters.account && !normalize(order.account_name).includes(normalize(filters.account))) {
      return false;
    }

    if (filters.country && !orderSearchText(order).includes(normalize(filters.country))) {
      return false;
    }

    if (filters.payment && !normalize(order.payment_method).includes(normalize(filters.payment))) {
      return false;
    }

    if (filters.hasWaybill === "yes" && !(order.waybill_id || order.tracking_number)) return false;
    if (filters.hasWaybill === "no" && (order.waybill_id || order.tracking_number)) return false;

    const total = Number(order.grand_total || 0);
    if (filters.minTotal && total < Number(filters.minTotal)) return false;
    if (filters.maxTotal && total > Number(filters.maxTotal)) return false;

    return true;
  });
}

// BrightHub orders are fetched live (no local mirror - BrightHub owns its
// own order/stock ledger) and mapped into the same shape every other
// source already uses, so they render through the exact same table/filters/
// status tabs instead of a separate page.
function mapBrightHubOrder(order, account) {
  return {
    source: "brighthub",
    source_order_id: order.id,
    account_id: account.id || account.account_id,
    account_name: account.account_name || account.account_code || "BrightHub",
    order_no: order.order_no,
    display_order_no: order.order_no,
    order_date: order.created_at,
    order_status: order.status,
    grand_total: order.total,
    discount_total: 0,
    currency: "LKR",
    payment_method: "COD",
    customer_name: order.customer_name,
    customer_phone: order.phone,
    shipping_address_line1: order.shipping_line1,
    shipping_address_line2: order.shipping_line2,
    shipping_city: order.shipping_city || order.city,
    shipping_postal_code: order.shipping_postal_code || order.postal_code,
    first_item_title: order.items?.[0]?.name || order.items?.[0]?.product_name,
    items: (order.items || []).map((item) => ({
      product_title: item.name || item.product_name,
      sku: item.bhid,
      local_sku: item.bhid,
      qty: item.quantity,
    })),
  };
}

async function loadBrightHubOrders() {
  try {
    const accountsRes = await brighthubProductApi.getBrightHubAccounts();
    const payload = accountsRes?.data;
    const accounts = Array.isArray(payload) ? payload : Array.isArray(payload?.data) ? payload.data : [];

    const perAccountOrders = await Promise.all(
      accounts.map(async (account) => {
        try {
          const accountId = account.id || account.account_id;
          const res = await brighthubOrderApi.getBrightHubOrders(accountId, { limit: 200 });
          const rows = Array.isArray(res?.data?.data) ? res.data.data : [];
          return rows.map((order) => mapBrightHubOrder(order, account));
        } catch (err) {
          console.warn("[BRIGHTHUB_ORDERS_LOAD]", account.account_name, err);
          return [];
        }
      })
    );

    return perAccountOrders.flat();
  } catch (err) {
    console.warn("[BRIGHTHUB_ORDERS_LOAD]", err);
    return [];
  }
}

function activeFilterCount(filters) {
  return Object.entries(filters).filter(([key, value]) => {
    if (!value) return false;
    if (key === "marketplace" && value === "all") return false;
    if (key === "hasWaybill" && value === "all") return false;
    return true;
  }).length;
}

const PAGE_SIZE = 50;

const STATUS_KEYS = new Set(STATUS_TABS.map((tab) => tab.key));

export default function OrdersPage() {
  const showToast = useToast();
  const { openOverlay } = usePageOverlay();
  const confirm = useConfirm();
  const [searchParams] = useSearchParams();

  const [orders, setOrders] = useState([]);
  const [filterOptions, setFilterOptions] = useState({ accounts: [], payment_methods: [] });
  const [status, setStatus] = useState(() => {
    const fromUrl = searchParams.get("status");
    return fromUrl && STATUS_KEYS.has(fromUrl) ? fromUrl : "all";
  });
  const [query, setQuery] = useState("");
  const [filters, setFilters] = useState(blankFilters);
  const [filterOpen, setFilterOpen] = useState(false);
  const [selectedKeys, setSelectedKeys] = useState([]);
  const [imagePreview, setImagePreview] = useState(null);
  const [pdfPreviewUrls, setPdfPreviewUrls] = useState([]);
  const [printChoiceOpen, setPrintChoiceOpen] = useState(false);
  const [waybillModalOrder, setWaybillModalOrder] = useState(null);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);

  async function load() {
    setLoading(true);

    try {
      const [ordersRes, optionsRes, brighthubOrders] = await Promise.all([
        ordersApi.listOrders({
          // Status tab counts and the list itself are both derived from
          // this one fetch (see countByStatus below) - capped at 1000 it
          // silently stopped growing once total order volume passed that
          // (confirmed live: 1120 orders across all sources), so the "All"
          // tab looked permanently stuck at 1000 and the oldest orders
          // beyond that cutoff simply vanished from the list. 5000 matches
          // order_model.js's own hard cap on this endpoint.
          limit: 5000,
          date_from: filters.dateFrom || undefined,
          date_to: filters.dateTo || undefined,
        }),
        ordersApi.filterOptions().catch(() => ({ data: {} })),
        loadBrightHubOrders(),
      ]);

      setOrders([...(ordersRes?.data?.orders || []), ...brighthubOrders]);
      setFilterOptions(optionsRes?.data || { accounts: [], payment_methods: [] });
    } catch (error) {
      alert(getApiError(error, "Failed to load orders"));
      setOrders([]);
    } finally {
      setLoading(false);
    }
  }

  // Date range is applied server-side (order_model.js's listUnified) since
  // it's the one filter that needs to reach past whatever's in the current
  // 1000-row client-side page - refetch whenever it changes instead of
  // only filtering what's already in memory.
  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.dateFrom, filters.dateTo]);

  const counts = useMemo(() => countByStatus(orders), [orders]);

  const visibleOrders = useMemo(
    () => filterOrders(orders, filters, query, status),
    [orders, filters, query, status]
  );

  useEffect(() => {
    setPage(1);
  }, [status, filters, query]);

  const pageCount = Math.max(Math.ceil(visibleOrders.length / PAGE_SIZE), 1);

  const pagedOrders = useMemo(
    () => visibleOrders.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    [visibleOrders, page]
  );

  const selectedOrders = useMemo(
    () => visibleOrders.filter((order) => selectedKeys.includes(orderKey(order))),
    [visibleOrders, selectedKeys]
  );

  const selectedDaraz = useMemo(
    () => selectedOrders.filter((order) => order.source === "daraz"),
    [selectedOrders]
  );

  const toggleOrder = useCallback((order) => {
    const key = orderKey(order);
    setSelectedKeys((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]));
  }, []);

  const pagedKeys = pagedOrders.map(orderKey);
  const allPageSelected = pagedKeys.length > 0 && pagedKeys.every((key) => selectedKeys.includes(key));

  function toggleAll() {
    if (allPageSelected) {
      setSelectedKeys((prev) => prev.filter((key) => !pagedKeys.includes(key)));
      return;
    }
    setSelectedKeys((prev) => Array.from(new Set([...prev, ...pagedKeys])));
  }

  // BrightHub orders are viewed on their own detail page (order/status live
  // straight from BrightHub's API) instead of the generic source/id route,
  // which only knows about daraz/woo/local. No separate invoice/tracking
  // view exists for BrightHub yet, so Print/Track fall back to the same page.
  function brightHubDetailUrl(order) {
    return `/product/brighthub-orders/${order.account_id}/${order.source_order_id}`;
  }

  const handleView = useCallback((order) => {
    openOverlay(
      order.source === "brighthub"
        ? brightHubDetailUrl(order)
        : `/order-management/orders/${order.source}/${order.source_order_id}`
    );
  }, []);

  const handlePrintInvoice = useCallback((order) => {
    openOverlay(
      order.source === "brighthub"
        ? brightHubDetailUrl(order)
        : `/order-management/orders/${order.source}/${order.source_order_id}?print=1`
    );
  }, []);

  const handleTrack = useCallback((order) => {
    openOverlay(
      order.source === "brighthub"
        ? brightHubDetailUrl(order)
        : `/order-management/orders/${order.source}/${order.source_order_id}`
    );
  }, []);

  // Manual orders only — the detail page is where waybill/status/items get
  // edited; there's no separate edit form.
  const handleEdit = useCallback((order) => {
    openOverlay(`/order-management/orders/${order.source}/${order.source_order_id}`);
  }, []);

  const handleDelete = useCallback(async (order) => {
    if (!(await confirm(`Delete order ${order.display_order_no || order.order_no}? This can't be undone.`))) {
      return;
    }

    try {
      await ordersApi.deleteOrder(order.source, order.source_order_id);
      showToast("Order deleted.");
      await load();
    } catch (err) {
      alert(getApiError(err, "Failed to delete order"));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleAddWaybill = useCallback((order) => {
    setWaybillModalOrder(order);
  }, []);

  const handleChangeStatus = useCallback(
    async (order, nextStatus) => {
      try {
        await ordersApi.updateStatus(order.source, order.source_order_id, { status: nextStatus });
        showToast("Order status updated.");
        await load();
      } catch (err) {
        alert(getApiError(err, "Failed to update status"));
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  async function runDarazAction(action, orderIds, { printLayout } = {}) {
    if (!orderIds.length) return;

    let invoiceNumber;

    if (action === "set_invoice_number") {
      invoiceNumber = window.prompt("Enter the invoice number to set on the first item of each order");
      if (!invoiceNumber) return;
    }

    setBusy(true);

    try {
      const result = await ordersApi.darazBulkAction(
        {
          action,
          order_ids: orderIds,
          invoice_number: invoiceNumber,
          print_layout: printLayout,
        },
        // A4 grid mode fetches + composes one PDF per package sequentially -
        // slower than Daraz's own batched call, so it needs real headroom.
        action === "print_awb" ? { timeout: 300000 } : undefined
      );

      if (action === "print_awb") {
        // Shown in the same in-app popup style as Print Invoice, instead of
        // a separate browser tab. Bulk prints can return several sheets (up
        // to 9 labels each) - the modal shows each as its own tab.
        const pdfUrls = extractPdfUrls(result);

        if (pdfUrls.length) {
          setPdfPreviewUrls(pdfUrls);
        } else {
          alert(extractDarazActionMessage(result) || "AWB document not returned by Daraz.");
        }

        if (result?.data?.errors?.length) {
          showToast(extractDarazActionMessage(result), { type: "error" });
        }
      } else {
        const opened = openDarazDocument(result);

        if (!opened && (result?.data?.errors?.length || result?.data?.skipped?.length)) {
          alert(extractDarazActionMessage(result));
        } else if (!opened) {
          showToast(result?.message || "Daraz action submitted.");
        }
      }

      await load();
    } catch (err) {
      alert(getApiError(err, "Daraz action failed"));
    } finally {
      setBusy(false);
    }
  }

  const handleDarazRowAction = useCallback((order, action) => {
    runDarazAction(action, [order.source_order_id]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function runBulkAction(action, options) {
    const validOrders = selectedDaraz.filter((order) => {
      if (action === "pack") return canDarazPack(order);
      if (action === "ready_to_ship") return canDarazReady(order);
      // print_awb intentionally doesn't pre-filter on the locally cached
      // waybill_id here — the backend now checks Daraz live for a package
      // ID when it's missing locally, so trusting only our cache would
      // silently drop orders that were actually packed but not yet synced.
      if (action === "print_awb") return statusBucketKey(order) !== "cancelled";
      return order.source === "daraz";
    });

    runDarazAction(action, validOrders.map((order) => order.source_order_id), options);
  }

  function choosePrintLayout(layout) {
    setPrintChoiceOpen(false);
    runBulkAction("print_awb", { printLayout: layout });
  }

  return (
    <div className="space-y-3">
      <section className="overflow-hidden border border-slate-700 bg-[#1b2a3a] shadow-lg shadow-black/20">
        <div className="flex flex-wrap items-center gap-2 px-3 py-2">
          <div className="flex flex-wrap items-stretch overflow-hidden rounded-lg bg-[#111827]">
            {STATUS_TABS.map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setStatus(tab.key)}
                className={`flex items-center gap-1.5 whitespace-nowrap border-b-2 px-2.5 py-1.5 text-[11px] font-bold transition-all duration-150 ${
                  status === tab.key
                    ? "border-b-orange-500 bg-[#1b2a3a] text-orange-300"
                    : "border-b-transparent text-slate-400 hover:bg-[#1b2a3a] hover:text-slate-200"
                }`}
              >
                {tab.label}
                <span
                  className={`flex h-4.5 min-w-4.5 items-center justify-center rounded-full px-1.5 text-[10px] font-bold transition-colors duration-150 ${
                    status === tab.key ? "bg-orange-500 text-white" : "bg-slate-700 text-slate-200"
                  }`}
                >
                  {counts[tab.key] ?? 0}
                </span>
              </button>
            ))}
          </div>

          <label className="flex h-7 min-w-45 flex-1 items-center rounded-md border border-slate-700/70 bg-[#2b3441] px-2.5 transition-colors duration-150 focus-within:border-orange-400">
            <Search size={12} className="text-slate-500" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search order no, customer, phone, SKU, waybill..."
              className="h-full min-w-0 flex-1 bg-transparent px-2 text-[10px] font-medium text-slate-100 outline-none placeholder:text-slate-500"
            />
          </label>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={load}
              disabled={loading}
              title="Refresh"
              className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-700/70 bg-[#44546b] text-white transition-all duration-150 hover:scale-105 hover:bg-[#52657f] disabled:opacity-60"
            >
              <RefreshCw size={12} className={loading ? "animate-spin" : ""} />
            </button>

            <button
              type="button"
              onClick={() => setFilterOpen(true)}
              title="Filter"
              className="relative flex h-7 w-7 items-center justify-center rounded-lg border border-slate-700/70 bg-[#44546b] text-white transition-all duration-150 hover:scale-105 hover:bg-[#52657f]"
            >
              <Filter size={12} />
              {activeFilterCount(filters) > 0 && (
                <span className="absolute -right-1.5 -top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white">
                  {activeFilterCount(filters)}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => openOverlay("/order-management/orders/create")}
              className="flex h-7 items-center gap-1.5 rounded-full bg-orange-500 px-3 text-[11px] font-semibold text-white transition-all duration-150 hover:scale-105 hover:bg-orange-400"
            >
              <Plus size={12} />
              Create Order
            </button>
          </div>
        </div>
      </section>

      {selectedOrders.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-2 border border-amber-500/40 bg-amber-500/10 px-3 py-2">
          <p className="text-[11px] font-semibold text-amber-200">
            {selectedOrders.length} selected
            {selectedDaraz.length ? ` (${selectedDaraz.length} Daraz)` : ""}
          </p>

          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={() => setSelectedKeys([])}
              className="h-6.5 rounded-md border border-slate-700/70 px-2.5 text-[10px] font-semibold text-slate-300 transition-all duration-150 hover:scale-105 hover:bg-slate-800"
            >
              Clear
            </button>

            {selectedDaraz.some(canDarazPack) && (
              <button
                type="button"
                disabled={busy}
                onClick={() => runBulkAction("pack")}
                className="inline-flex h-6.5 items-center gap-1 rounded-md border border-sky-500/25 bg-sky-950 px-2.5 text-[10px] font-semibold text-sky-300 transition-all duration-150 hover:scale-105 hover:bg-sky-900 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:scale-100"
              >
                <PackageCheck size={11} /> Pack
              </button>
            )}

            {selectedDaraz.some(canDarazReady) && (
              <button
                type="button"
                disabled={busy}
                onClick={() => runBulkAction("ready_to_ship")}
                className="inline-flex h-6.5 items-center gap-1 rounded-md border border-violet-500/25 bg-violet-950 px-2.5 text-[10px] font-semibold text-violet-300 transition-all duration-150 hover:scale-105 hover:bg-violet-900 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:scale-100"
              >
                <Truck size={11} /> Ready to Ship
              </button>
            )}

            {selectedDaraz.some((order) => statusBucketKey(order) !== "cancelled") && (
              <button
                type="button"
                disabled={busy}
                onClick={() => setPrintChoiceOpen(true)}
                title="Choose Normal or A4 (3x3 grid) label printing"
                className="inline-flex h-6.5 items-center gap-1 rounded-md border border-emerald-500/25 bg-emerald-950 px-2.5 text-[10px] font-semibold text-emerald-300 transition-all duration-150 hover:scale-105 hover:bg-emerald-900 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:scale-100"
              >
                <Printer size={11} /> Print AWB
              </button>
            )}
          </div>
        </div>
      )}

      {loading ? (
        <div className="border border-slate-800 bg-[#0b1220]">
          <Loader label="Loading orders..." minHeight="0" className="py-16" />
        </div>
      ) : (
        <section className="overflow-visible border border-slate-800 bg-[#0b1220]">
          <div className="overflow-x-auto">
            <table className="min-w-full table-fixed divide-y divide-slate-800">
              <colgroup>
                <col className="w-10" />
                <col className="w-[13%]" />
                <col className="w-[30%]" />
                <col className="w-[17%]" />
                <col className="w-[13%]" />
                <col className="w-[10%]" />
                <col className="w-[14%]" />
              </colgroup>
              <thead className="border-b border-slate-800 bg-[#111827]">
                <tr>
                  <th className="w-10 px-5 py-5">
                    <input
                      type="checkbox"
                      checked={allPageSelected}
                      onChange={toggleAll}
                      className="h-3.5 w-3.5 cursor-pointer rounded border-slate-600 bg-slate-900 accent-orange-500"
                    />
                  </th>
                  {["Order Details", "Product Details", "Customer", "Total", "Status", "Actions"].map(
                    (header) => (
                      <th
                        key={header}
                        className="px-5 py-5 text-left text-[12px] font-semibold uppercase tracking-wide text-orange-300"
                      >
                        {header}
                      </th>
                    )
                  )}
                </tr>
              </thead>

              <tbody>
                {!pagedOrders.length && (
                  <tr>
                    <td colSpan="7" className="px-5 py-8 text-center text-[13px] text-slate-500">
                      No orders found for the selected filter.
                    </td>
                  </tr>
                )}

                {pagedOrders.map((order) => (
                  <OrderRow
                    key={orderKey(order)}
                    order={order}
                    isSelected={selectedKeys.includes(orderKey(order))}
                    onToggle={toggleOrder}
                    onPreviewImage={setImagePreview}
                    onView={handleView}
                    onPrintInvoice={handlePrintInvoice}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                    onTrack={handleTrack}
                    onChangeStatus={handleChangeStatus}
                    onDarazAction={handleDarazRowAction}
                    onAddWaybill={handleAddWaybill}
                  />
                ))}
              </tbody>
            </table>
          </div>

          {visibleOrders.length > PAGE_SIZE && (
            <div className="flex items-center justify-between border-t border-slate-800 px-3 py-2.5">
              <p className="text-[11px] text-slate-500">
                Showing {(page - 1) * PAGE_SIZE + 1}-{Math.min(page * PAGE_SIZE, visibleOrders.length)} of{" "}
                {visibleOrders.length}
              </p>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(p - 1, 1))}
                  className="h-6.5 rounded-md border border-slate-700/70 px-2.5 text-[10px] font-semibold text-slate-300 transition-all duration-150 hover:scale-105 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:scale-100"
                >
                  Previous
                </button>

                <span className="text-[10px] text-slate-500">
                  Page {page} of {pageCount}
                </span>

                <button
                  type="button"
                  disabled={page >= pageCount}
                  onClick={() => setPage((p) => Math.min(p + 1, pageCount))}
                  className="h-6.5 rounded-md border border-slate-700/70 px-2.5 text-[10px] font-semibold text-slate-300 transition-all duration-150 hover:scale-105 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:scale-100"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </section>
      )}

      <FilterDrawer
        open={filterOpen}
        filters={filters}
        setFilters={setFilters}
        options={filterOptions}
        onClose={() => setFilterOpen(false)}
        onReset={() => setFilters(blankFilters)}
      />

      <ImagePreviewModal image={imagePreview} onClose={() => setImagePreview(null)} />

      <PrintLayoutChoiceModal
        open={printChoiceOpen}
        onClose={() => setPrintChoiceOpen(false)}
        onChoose={choosePrintLayout}
      />

      <PdfPreviewModal urls={pdfPreviewUrls} onClose={() => setPdfPreviewUrls([])} />

      <AddWaybillModal
        order={waybillModalOrder}
        onClose={() => setWaybillModalOrder(null)}
        onSaved={load}
      />
    </div>
  );
}
