import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import useManualOrders from "./hooks/useManualOrders";

import ManualOrdersHeader from "./components/ManualOrdersHeader";
import ManualOrdersSearch from "./components/ManualOrdersSearch";
import ManualOrderFilterPopup from "./components/ManualOrderFilterPopup";
import ManualOrdersTabs from "./components/ManualOrdersTabs";
import ManualOrdersError from "./components/ManualOrdersError";
import ManualOrdersTable from "./components/ManualOrdersTable";
import ManualOrdersPagination from "./components/ManualOrdersPagination";

import { STATUS_TABS } from "./constants/manualOrdersConstants";

const EMPTY_FILTERS = {
  page: 1,
  limit: 25,
  order_status: "",
  status: "",
  payment_method: "",
  date_from: "",
  date_to: "",
  search: "",
  q: "",
};

export default function ManualOrdersDashboard() {
  const navigate = useNavigate();
  const [showFilters, setShowFilters] = useState(false);

  const {
    rows = [],
    filters = EMPTY_FILTERS,
    searchText = "",
    setSearchText,
    pagination = {},
    loading,
    deleteId,
    error,
    productMap,
    setFilters,
    handleDelete,
    openNewTab,
  } = useManualOrders();

  const safeRows = Array.isArray(rows) ? rows : [];

  const appliedFilterCount = useMemo(() => {
    return [
      filters.order_status,
      filters.payment_method,
      filters.date_from,
      filters.date_to,
    ].filter(Boolean).length;
  }, [
    filters.order_status,
    filters.payment_method,
    filters.date_from,
    filters.date_to,
  ]);

  const tabCounts = useMemo(() => {
    return (
      pagination?.tabCounts ||
      pagination?.tab_counts ||
      pagination?.counts || {
        all: pagination?.total || safeRows.length || 0,
      }
    );
  }, [pagination, safeRows.length]);

  function handleSearch(event) {
    event?.preventDefault?.();

    const value = String(searchText || "").trim();

    setFilters((prev) => ({
      ...prev,
      search: value,
      q: value,
      page: 1,
    }));
  }

  function handleTabChange(status) {
    const statusValue = status || "";

    setFilters((prev) => ({
      ...prev,
      order_status: statusValue,
      status: statusValue,
      page: 1,
    }));
  }

  function applyAdvancedFilters(nextFilters = {}) {
    const statusValue =
      nextFilters.order_status ?? nextFilters.status ?? "";

    setFilters((prev) => ({
      ...prev,
      order_status: statusValue,
      status: statusValue,
      payment_method: nextFilters.payment_method || "",
      date_from: nextFilters.date_from || "",
      date_to: nextFilters.date_to || "",
      limit: Number(nextFilters.limit || prev.limit || 25),
      page: 1,
    }));

    setShowFilters(false);
  }

  function clearAllFilters() {
    setSearchText("");

    setFilters((prev) => ({
      ...prev,
      ...EMPTY_FILTERS,
      limit: prev.limit || 25,
      page: 1,
    }));

    setShowFilters(false);
  }

  return (
    <div className="min-h-screen w-full bg-[#020617] text-slate-100">
      <ManualOrdersHeader onCreate={() => navigate("/orders/create")} />

      <main className="space-y-3 px-3 py-3">
        <section className="rounded-xl bg-[#0b1019] ring-1 ring-white/[0.06]">
          <ManualOrdersSearch
            searchText={searchText}
            setSearchText={setSearchText}
            onSearch={handleSearch}
            loading={loading}
            appliedFilterCount={appliedFilterCount}
            onOpenFilters={() => setShowFilters(true)}
            onClear={clearAllFilters}
          />
        </section>

        <section className="overflow-hidden rounded-xl bg-[#0b1019] ring-1 ring-white/[0.06]">
          <ManualOrdersTabs
            activeStatus={filters.order_status || ""}
            rowsCount={safeRows.length}
            total={tabCounts.all ?? pagination.total ?? safeRows.length}
            tabCounts={tabCounts}
            onChange={handleTabChange}
          />
        </section>

        <section className="overflow-hidden rounded-xl bg-[#0b1019] ring-1 ring-white/[0.06]">
          <ManualOrdersError error={error} />

          <ManualOrdersTable
            rows={safeRows}
            loading={loading}
            deleteId={deleteId}
            productMap={productMap}
            onView={openNewTab}
            onEdit={openNewTab}
            onDelete={handleDelete}
          />
        </section>

        <section className="overflow-hidden rounded-xl bg-[#0b1019] ring-1 ring-white/[0.06]">
          <ManualOrdersPagination
            filters={filters}
            setFilters={setFilters}
            pagination={pagination}
            loading={loading}
          />
        </section>
      </main>

      <ManualOrderFilterPopup
        open={showFilters}
        filters={filters}
        statusTabs={STATUS_TABS}
        pageSizes={[25, 50, 100, 200]}
        onClose={() => setShowFilters(false)}
        onApply={applyAdvancedFilters}
        onClear={clearAllFilters}
      />
    </div>
  );
}