import { useMemo, useState } from "react";
import { AlertTriangle, Download, Package, RefreshCw } from "lucide-react";
import { useNavigate } from "react-router-dom";
import DarazOrderFilterPopup from "./components/daraz_order_filter";
import DarazImagePreview from "./components/daraz_image_preview";
import DarazOrderPagination from "./components/daraz_order_pagination";
import DarazOrderSearchFilter from "./components/daraz_order_search";
import DarazOrderTable from "./components/daraz_order_table";
import DarazOrderTabs from "./components/daraz_order_tabs";
import { DARAZ_STATUS_CHANGE_OPTIONS, PAGE_SIZES, STATUS_TABS } from "./constants/daraz_order_constants";
import useDarazOrders from "./hooks/use_daraz_orders";
import {
  formatDate,
  getAccountCode,
  getAccountName,
  getCreatedDate,
  getCustomerName,
  getCustomerPhone,
  getOrderNumber,
  getOrderRouteId,
  getOrderStatus,
  getOrderTotal,
  getShippingCity,
  getShippingMethod,
  getShippingProvider,
  getTrackingNumber,
} from "./utils/daraz_order_utils";

export default function DarazOrdersDashboard() {
  const navigate = useNavigate();
  const [showFilters, setShowFilters] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const [selectedOrderIds, setSelectedOrderIds] = useState([]);
  const [bulkStatus, setBulkStatus] = useState("");

  const orders = useDarazOrders();

  const visibleOrderIds = useMemo(
    () => orders.groupedOrders.map((order) => String(order._route_id || getOrderRouteId(order) || "")).filter(Boolean),
    [orders.groupedOrders]
  );

  function openDetail(order) {
    const routeId = order?._route_id || getOrderRouteId(order);
    if (routeId) navigate(`/daraz/orders/${encodeURIComponent(String(routeId))}`);
  }

  function toggleOrder(orderId) {
    if (!orderId) return;
    setSelectedOrderIds((prev) => (prev.includes(orderId) ? prev.filter((id) => id !== orderId) : [...prev, orderId]));
  }

  function toggleAllVisible() {
    setSelectedOrderIds((prev) => {
      const allSelected = visibleOrderIds.length > 0 && visibleOrderIds.every((id) => prev.includes(id));
      if (allSelected) return prev.filter((id) => !visibleOrderIds.includes(id));
      return [...new Set([...prev, ...visibleOrderIds])];
    });
  }

  async function handleOrderStatusChange(order, status, label) {
    const routeId = order?._route_id || getOrderRouteId(order);
    const orderNumber = getOrderNumber(order);

    if (!routeId) return;

    const ok = window.confirm(`Change Daraz order ${orderNumber} status to ${label}?`);
    if (!ok) return;

    const result = await orders.changeOrderStatus(routeId, status);
    if (result) setSelectedOrderIds((prev) => prev.filter((id) => id !== String(routeId)));
  }

  async function handleBulkStatusChange() {
    if (!bulkStatus) {
      window.alert("Please select status first.");
      return;
    }

    if (selectedOrderIds.length === 0) {
      window.alert("Please select at least one order.");
      return;
    }

    const label = DARAZ_STATUS_CHANGE_OPTIONS.find((option) => option.key === bulkStatus)?.label || bulkStatus;
    const ok = window.confirm(`Change ${selectedOrderIds.length} selected Daraz orders to ${label}?`);
    if (!ok) return;

    const result = await orders.bulkChangeOrderStatus(selectedOrderIds, bulkStatus);
    if (result) {
      setSelectedOrderIds([]);
      setBulkStatus("");
    }
  }

  function exportCsv() {
    const rows = buildCsvRows(orders.groupedOrders, orders.accountsByCode);
    downloadCsv(rows, `daraz-orders-${new Date().toISOString().slice(0, 10)}.csv`);
  }

  return (
    <div className="min-h-screen bg-[#070b12] text-slate-100">
      <div className="w-full space-y-3 p-3">
        <DarazOrderSearchFilter
          filters={orders.filters}
          loading={orders.loading}
          appliedFilterCount={orders.appliedFilterCount}
          selectedAccountLabel={orders.selectedAccountLabel}
          selectedAccountCount={orders.selectedAccountCodes.length}
          onChange={orders.updateFilter}
          onSearch={orders.runSearch}
          onOpenFilters={() => setShowFilters(true)}
          onClear={orders.clearFilters}
        />

        <Message type="error" text={orders.error} />
        <Message type="success" text={orders.successMessage} />

        <section className="overflow-hidden rounded-xl bg-[#0b1019] shadow-xl shadow-black/20 ring-1 ring-white/[0.06]">
          <DarazOrderTabs
            tabs={STATUS_TABS}
            counts={orders.tabCounts}
            activeStatus={orders.filters.status}
            onChange={orders.changeStatus}
          />

          <DarazOrderBulkActions
            selectedCount={selectedOrderIds.length}
            bulkStatus={bulkStatus}
            loading={orders.loading}
            onStatusChange={setBulkStatus}
            onApply={handleBulkStatusChange}
            onClearSelection={() => setSelectedOrderIds([])}
            onExportCsv={exportCsv}
          />

          {orders.loading && (
            <div className="border-b border-white/[0.06] px-5 py-2 text-[12px] font-semibold text-slate-400">
              <span className="inline-flex items-center gap-2">
                <RefreshCw size={13} className="animate-spin" /> Loading orders...
              </span>
            </div>
          )}

          <DarazOrderTable
            orders={orders.groupedOrders}
            accountsByCode={orders.accountsByCode}
            loading={orders.loading}
            selectedOrderIds={selectedOrderIds}
            onToggleOrder={toggleOrder}
            onToggleAll={toggleAllVisible}
            onOpenImage={setSelectedImage}
            onOpenDetail={openDetail}
            onChangeStatus={handleOrderStatusChange}
          />

          <DarazOrderPagination
            page={orders.filters.page}
            totalPages={orders.totalPages}
            loading={orders.loading}
            onChange={orders.changePage}
          />
        </section>
      </div>

      <DarazOrderFilterPopup
        open={showFilters}
        filters={orders.filters}
        statusTabs={STATUS_TABS}
        pageSizes={PAGE_SIZES}
        accountOptions={orders.accountOptions}
        accountLoading={orders.accountLoading}
        selectedAccountCodes={orders.selectedAccountCodes}
        onClose={() => setShowFilters(false)}
        onApply={(nextFilters, nextAccounts) => {
          setShowFilters(false);
          setSelectedOrderIds([]);
          orders.applyAdvancedFilters(nextFilters, nextAccounts);
        }}
        onClear={() => {
          setShowFilters(false);
          setSelectedOrderIds([]);
          orders.clearFilters();
        }}
      />

      <DarazImagePreview image={selectedImage} onClose={() => setSelectedImage(null)} />
    </div>
  );
}

function DarazOrderBulkActions({
  selectedCount,
  bulkStatus,
  loading,
  onStatusChange,
  onApply,
  onClearSelection,
  onExportCsv,
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/[0.06] bg-[#0d1420] px-4 py-2">
      <div className="text-[11px] font-bold text-slate-400">
        Selected: <span className="text-orange-300">{selectedCount}</span>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <select
          value={bulkStatus}
          onChange={(event) => onStatusChange(event.target.value)}
          className="h-8 rounded bg-[#172233] px-2 text-[11px] font-bold text-slate-100 outline-none ring-1 ring-white/10"
        >
          <option value="">Bulk Status</option>
          {DARAZ_STATUS_CHANGE_OPTIONS.map((option) => (
            <option key={option.key} value={option.key}>{option.label}</option>
          ))}
        </select>

        <button
          type="button"
          disabled={loading || selectedCount === 0 || !bulkStatus}
          onClick={onApply}
          className="inline-flex h-8 items-center justify-center rounded bg-orange-600 px-3 text-[10px] font-black text-white transition hover:bg-orange-500 disabled:cursor-not-allowed disabled:opacity-50"
        >
          CHANGE STATUS
        </button>

        <button
          type="button"
          disabled={selectedCount === 0}
          onClick={onClearSelection}
          className="inline-flex h-8 items-center justify-center rounded bg-[#172233] px-3 text-[10px] font-black text-slate-300 transition hover:bg-white/[0.06] disabled:cursor-not-allowed disabled:opacity-50"
        >
          CLEAR SELECTED
        </button>

        <button
          type="button"
          onClick={onExportCsv}
          className="inline-flex h-8 items-center justify-center gap-1 rounded bg-[#172233] px-3 text-[10px] font-black text-slate-200 transition hover:bg-white/[0.06]"
        >
          <Download size={12} /> CSV EXPORT
        </button>
      </div>
    </div>
  );
}

function Message({ type, text }) {
  if (!text) return null;

  const isError = type === "error";

  return (
    <div className={`flex items-start gap-2 rounded-xl p-3 text-[12px] font-bold ring-1 ${isError ? "bg-rose-500/10 text-rose-100 ring-rose-400/20" : "bg-orange-500/10 text-orange-100 ring-orange-400/20"}`}>
      {isError ? <AlertTriangle size={16} className="mt-0.5 shrink-0" /> : <Package size={16} className="mt-0.5 shrink-0" />}
      <span>{text}</span>
    </div>
  );
}

function csvEscape(value) {
  const text = String(value ?? "").replace(/\r?\n/g, " ");
  if (/[",]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
  return text;
}

function buildCsvRows(groupedOrders = [], accountsByCode = {}) {
  const header = [
    "Order ID",
    "Account Code",
    "Account Name",
    "Customer",
    "Phone",
    "City",
    "Status",
    "Total",
    "Shipping Method",
    "Shipping Provider",
    "Tracking Number",
    "Created Date",
    "SKUs",
    "Product Titles",
  ];

  const rows = groupedOrders.map((order) => {
    const items = order._items || [];

    return [
      getOrderNumber(order),
      getAccountCode(order),
      getAccountName(order, accountsByCode),
      getCustomerName(order),
      getCustomerPhone(order),
      getShippingCity(order),
      getOrderStatus(order),
      getOrderTotal(order),
      getShippingMethod(order),
      getShippingProvider(order),
      getTrackingNumber(order),
      formatDate(getCreatedDate(order)),
      items.map((item) => item.sku).filter(Boolean).join(" | "),
      items.map((item) => item.title).filter(Boolean).join(" | "),
    ];
  });

  return [header, ...rows];
}

function downloadCsv(rows, filename) {
  const csv = rows.map((row) => row.map(csvEscape).join(",")).join("\n");
  const blob = new Blob([`\ufeff${csv}`], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
