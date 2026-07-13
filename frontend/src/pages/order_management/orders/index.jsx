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
import { getApiError } from "../../../config/api";
import { useToast } from "../../../components/common/toast/ToastProvider";
import Loader from "../../../components/common/Loader";
import OrderRow from "./components/OrderRow";
import FilterDrawer from "./components/FilterDrawer";
import ImagePreviewModal from "./components/ImagePreviewModal";
import PdfPreviewModal from "./components/PdfPreviewModal";
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

    const orderDate = order.order_date ? new Date(order.order_date) : null;

    if (filters.dateFrom && orderDate && orderDate < new Date(filters.dateFrom)) return false;

    if (filters.dateTo && orderDate) {
      const dateTo = new Date(filters.dateTo);
      dateTo.setHours(23, 59, 59, 999);
      if (orderDate > dateTo) return false;
    }

    return true;
  });
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
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);

  async function load() {
    setLoading(true);

    try {
      const [ordersRes, optionsRes] = await Promise.all([
        ordersApi.listOrders({ limit: 1000 }),
        ordersApi.filterOptions().catch(() => ({ data: {} })),
      ]);

      setOrders(ordersRes?.data?.orders || []);
      setFilterOptions(optionsRes?.data || { accounts: [], payment_methods: [] });
    } catch (error) {
      alert(getApiError(error, "Failed to load orders"));
      setOrders([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

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

  const handleView = useCallback((order) => {
    openOverlay(`/order-management/orders/${order.source}/${order.source_order_id}`);
  }, []);

  const handlePrintInvoice = useCallback((order) => {
    openOverlay(`/order-management/orders/${order.source}/${order.source_order_id}?print=1`);
  }, []);

  const handleTrack = useCallback((order) => {
    openOverlay(`/order-management/orders/${order.source}/${order.source_order_id}`);
  }, []);

  // Manual orders only — the detail page is where waybill/status/items get
  // edited; there's no separate edit form.
  const handleEdit = useCallback((order) => {
    openOverlay(`/order-management/orders/${order.source}/${order.source_order_id}`);
  }, []);

  const handleDelete = useCallback(async (order) => {
    if (!window.confirm(`Delete order ${order.display_order_no || order.order_no}? This can't be undone.`)) {
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

  const handleAddWaybill = useCallback(async (order) => {
    const waybillId = window.prompt("Enter waybill / tracking number");
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  async function runDarazAction(action, orderIds) {
    if (!orderIds.length) return;

    let invoiceNumber;

    if (action === "set_invoice_number") {
      invoiceNumber = window.prompt("Enter the invoice number to set on the first item of each order");
      if (!invoiceNumber) return;
    }

    setBusy(true);

    try {
      const result = await ordersApi.darazBulkAction({
        action,
        order_ids: orderIds,
        invoice_number: invoiceNumber,
      });

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

  function runBulkAction(action) {
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

    runDarazAction(action, validOrders.map((order) => order.source_order_id));
  }

  return (
    <div className="space-y-3">
      <section className="overflow-hidden border border-slate-700 bg-[#1b2a3a] shadow-lg shadow-black/20">
        <div className="flex flex-wrap items-center gap-2 px-3 py-2">
          <div className="flex flex-wrap items-stretch rounded-md bg-[#111827]">
            {STATUS_TABS.map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setStatus(tab.key)}
                className={`flex items-center gap-2 whitespace-nowrap border-b-2 px-3 py-2 text-[12px] font-bold transition ${
                  status === tab.key
                    ? "border-b-orange-500 bg-[#1b2a3a] text-orange-300"
                    : "border-b-transparent text-slate-400 hover:bg-[#1b2a3a] hover:text-slate-200"
                }`}
              >
                {tab.label}
                <span
                  className={`flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[11px] font-bold ${
                    status === tab.key ? "bg-orange-500 text-white" : "bg-slate-700 text-slate-200"
                  }`}
                >
                  {counts[tab.key] ?? 0}
                </span>
              </button>
            ))}
          </div>

          <label className="flex h-8 min-w-45 flex-1 items-center border border-slate-600 bg-[#2b3441] px-2.5 focus-within:border-orange-400">
            <Search size={13} className="text-slate-500" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search order no, customer, phone, SKU, waybill..."
              className="h-full min-w-0 flex-1 bg-transparent px-2 text-[11px] font-medium text-slate-100 outline-none placeholder:text-slate-500"
            />
          </label>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={load}
              disabled={loading}
              title="Refresh"
              className="flex h-8 w-8 items-center justify-center rounded-md border border-slate-600 bg-[#44546b] text-white hover:bg-[#52657f] disabled:opacity-60"
            >
              <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
            </button>

            <button
              type="button"
              onClick={() => setFilterOpen(true)}
              title="Filter"
              className="relative flex h-8 w-8 items-center justify-center rounded-md border border-slate-600 bg-[#44546b] text-white hover:bg-[#52657f]"
            >
              <Filter size={13} />
              {activeFilterCount(filters) > 0 && (
                <span className="absolute -right-1.5 -top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white">
                  {activeFilterCount(filters)}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => openOverlay("/order-management/orders/create")}
              className="flex h-8 items-center gap-1.5 rounded-full bg-orange-500 px-3.5 text-[12px] font-semibold text-white hover:bg-orange-400"
            >
              <Plus size={13} />
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
              className="h-7 rounded-sm border border-slate-600 px-2.5 text-[11px] font-semibold text-slate-300 hover:bg-slate-800"
            >
              Clear
            </button>

            {selectedDaraz.some(canDarazPack) && (
              <button
                type="button"
                disabled={busy}
                onClick={() => runBulkAction("pack")}
                className="inline-flex h-7 items-center gap-1 rounded-sm border border-sky-500/40 bg-sky-950 px-2.5 text-[11px] font-semibold text-sky-300 hover:bg-sky-900 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <PackageCheck size={12} /> Pack
              </button>
            )}

            {selectedDaraz.some(canDarazReady) && (
              <button
                type="button"
                disabled={busy}
                onClick={() => runBulkAction("ready_to_ship")}
                className="inline-flex h-7 items-center gap-1 rounded-sm border border-violet-500/40 bg-violet-950 px-2.5 text-[11px] font-semibold text-violet-300 hover:bg-violet-900 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Truck size={12} /> Ready to Ship
              </button>
            )}

            {selectedDaraz.some((order) => statusBucketKey(order) !== "cancelled") && (
              <button
                type="button"
                disabled={busy}
                onClick={() => runBulkAction("print_awb")}
                title="Prints one A4 sheet per 9 selected orders"
                className="inline-flex h-7 items-center gap-1 rounded-sm border border-emerald-500/40 bg-emerald-950 px-2.5 text-[11px] font-semibold text-emerald-300 hover:bg-emerald-900 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Printer size={12} /> Print AWB
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
            <table className="min-w-full divide-y divide-slate-800">
              <thead className="border-b border-slate-800 bg-[#111827]">
                <tr>
                  <th className="w-10 px-5 py-4">
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
                        className="px-5 py-4 text-left text-[12px] font-semibold uppercase tracking-wide text-orange-300"
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

      <FilterDrawer
        open={filterOpen}
        filters={filters}
        setFilters={setFilters}
        options={filterOptions}
        onClose={() => setFilterOpen(false)}
        onReset={() => setFilters(blankFilters)}
      />

      <ImagePreviewModal image={imagePreview} onClose={() => setImagePreview(null)} />

      <PdfPreviewModal urls={pdfPreviewUrls} onClose={() => setPdfPreviewUrls([])} />
    </div>
  );
}
