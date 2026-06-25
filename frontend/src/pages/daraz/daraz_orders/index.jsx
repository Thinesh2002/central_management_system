import { useState } from "react";
import { AlertTriangle, Package, RefreshCw } from "lucide-react";
import { useNavigate } from "react-router-dom";
import DarazOrderFilterPopup from "./components/daraz_order_filter";
import DarazImagePreview from "./components/daraz_image_preview";
import DarazOrderPagination from "./components/daraz_order_pagination";
import DarazOrderSearchFilter from "./components/daraz_order_search";
import DarazOrderTable from "./components/daraz_order_table";
import DarazOrderTabs from "./components/daraz_order_tabs";
import { PAGE_SIZES, STATUS_TABS } from "./constants/daraz_order_constants";
import useDarazOrders from "./hooks/use_daraz_orders";
import { getOrderRouteId } from "./utils/daraz_order_utils";

export default function DarazOrdersDashboard() {
  const navigate = useNavigate();
  const [showFilters, setShowFilters] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);

  const orders = useDarazOrders();

  function openDetail(order) {
    const routeId = order?._route_id || getOrderRouteId(order);
    if (routeId) navigate(`/daraz/orders/${encodeURIComponent(String(routeId))}`);
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
            onOpenImage={setSelectedImage}
            onOpenDetail={openDetail}
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
          orders.applyAdvancedFilters(nextFilters, nextAccounts);
        }}
        onClear={() => {
          setShowFilters(false);
          orders.clearFilters();
        }}
      />

      <DarazImagePreview image={selectedImage} onClose={() => setSelectedImage(null)} />
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
