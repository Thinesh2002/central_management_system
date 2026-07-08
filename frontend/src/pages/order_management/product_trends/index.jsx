import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AlertCircle, ImageOff, RefreshCw, Search, TrendingUp } from "lucide-react";

import productTrendsApi from "../../../config/sub_api/order_management_api/product_trends_api";
import { resolveImageUrl } from "../../product_management/products/product_dashboard/utils/localProductsImageHelpers";

function getApiMessage(error, fallback = "Something went wrong") {
  return error?.response?.data?.message || error?.message || fallback;
}

const SORT_OPTIONS = [
  { value: "qty_7d", label: "7-Day Qty" },
  { value: "qty_30d", label: "30-Day Qty" },
  { value: "qty_90d", label: "90-Day Qty" },
  { value: "stock_qty", label: "Stock" },
  { value: "restock_qty", label: "Restock Qty" },
];

const DATE_RANGE_OPTIONS = [
  { value: "all", label: "All Movement" },
  { value: "qty_7d", label: "Moved in Last 7 Days" },
  { value: "qty_30d", label: "Moved in Last 30 Days" },
  { value: "qty_90d", label: "Moved in Last 90 Days" },
];

function FieldLabel({ children }) {
  return (
    <span className="mb-1 flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide text-slate-300">
      <span className="h-2 w-2 bg-orange-500" />
      {children}
    </span>
  );
}

function ProductImage({ src, name }) {
  const url = resolveImageUrl(src || "");

  return (
    <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded border border-slate-700 bg-white">
      {url ? (
        <img src={url} alt={name || "Product"} className="h-full w-full object-contain" />
      ) : (
        <ImageOff size={14} className="text-slate-400" />
      )}
    </div>
  );
}

export default function ProductTrendsPage() {
  const navigate = useNavigate();

  const [rows, setRows] = useState([]);
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState("qty_30d");
  const [dateRange, setDateRange] = useState("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadTrends() {
    try {
      setLoading(true);
      setError("");

      const res = await productTrendsApi.getAll();
      const list = res?.data?.data || res?.data || [];
      setRows(Array.isArray(list) ? list : []);
    } catch (err) {
      setError(getApiMessage(err, "Failed to load product trends"));
      setRows([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadTrends();
  }, []);

  // Top 10% by 30-day velocity (among products that actually sold
  // something) counts as a fast mover — everything else is judged on its
  // own numbers, not against an arbitrary fixed threshold.
  const fastMoverThreshold = useMemo(() => {
    const sold = rows.map((r) => r.qty_30d).filter((v) => v > 0).sort((a, b) => b - a);
    if (!sold.length) return Infinity;
    const cutoffIndex = Math.max(0, Math.ceil(sold.length * 0.1) - 1);
    return sold[cutoffIndex];
  }, [rows]);

  const filteredRows = useMemo(() => {
    const key = search.trim().toLowerCase();

    let base = key
      ? rows.filter((row) => [row.sku, row.product_name].join(" ").toLowerCase().includes(key))
      : rows;

    if (dateRange !== "all") {
      base = base.filter((row) => (row[dateRange] || 0) > 0);
    }

    return [...base].sort((a, b) => (b[sortKey] ?? 0) - (a[sortKey] ?? 0));
  }, [rows, search, dateRange, sortKey]);

  function clearFilters() {
    setSearch("");
    setDateRange("all");
    setSortKey("qty_30d");
  }

  return (
    <div className="space-y-3">
      <section className="overflow-hidden border border-slate-700 bg-[#1b2a3a] shadow-lg shadow-black/20">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-700 px-4 py-2.5">
          <h3 className="flex items-center gap-2 text-[12px] font-semibold text-white">
            <TrendingUp size={14} className="text-orange-400" />
            Product Trend Report
          </h3>

          <button
            type="button"
            onClick={loadTrends}
            disabled={loading}
            title="Recalculate"
            className="inline-flex h-7 w-7 items-center justify-center rounded-sm border border-slate-600 bg-[#44546b] text-white hover:bg-[#52657f] disabled:opacity-60"
          >
            <RefreshCw size={12} className={loading ? "animate-spin" : ""} />
          </button>
        </div>

        <div className="grid grid-cols-1 gap-2 px-4 py-3 md:grid-cols-2 xl:grid-cols-[1fr_200px_170px_auto]">
          <label className="block">
            <FieldLabel>Search</FieldLabel>
            <div className="flex h-8 items-center border border-slate-600 bg-[#2b3441] px-2.5 focus-within:border-orange-400">
              <Search size={13} className="text-slate-500" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search SKU or product name..."
                className="h-full min-w-0 flex-1 bg-transparent px-2 text-[11px] font-medium text-slate-100 outline-none placeholder:text-slate-500"
              />
            </div>
          </label>

          <label className="block">
            <FieldLabel>Date Range</FieldLabel>
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
              className="h-8 w-full cursor-pointer border border-slate-600 bg-[#2b3441] px-2.5 text-[11px] font-medium text-white outline-none focus:border-orange-400"
            >
              {DATE_RANGE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <FieldLabel>Sort By</FieldLabel>
            <select
              value={sortKey}
              onChange={(e) => setSortKey(e.target.value)}
              className="h-8 w-full cursor-pointer border border-slate-600 bg-[#2b3441] px-2.5 text-[11px] font-medium text-white outline-none focus:border-orange-400"
            >
              {SORT_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <div className="flex items-end">
            <button
              type="button"
              onClick={clearFilters}
              className="inline-flex h-8 w-full cursor-pointer items-center justify-center bg-white px-4 text-[11px] font-semibold text-slate-700 transition hover:bg-slate-100 xl:w-auto"
            >
              CLEAR
            </button>
          </div>
        </div>
      </section>

      {error && (
        <div className="flex items-center gap-1.5 rounded-md border border-red-900 bg-red-950 px-3 py-2 text-[12px] text-red-300">
          <AlertCircle size={13} />
          {error}
        </div>
      )}

      {loading ? (
        <div className="rounded-lg border border-slate-800 bg-slate-950 p-5 text-center text-[12px] text-slate-500">
          Calculating product trends...
        </div>
      ) : (
        <div className="overflow-visible border border-slate-800 bg-slate-950">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-800">
              <thead className="bg-slate-900">
                <tr>
                  {["Product", "SKU", "7-Day Qty", "30-Day Qty", "90-Day Qty", "Stock", "Restock Qty", ""].map(
                    (header) => (
                      <th
                        key={header}
                        className={`px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500 ${
                          header === "Product" || header === "SKU" ? "text-left" : "text-right"
                        }`}
                      >
                        {header}
                      </th>
                    )
                  )}
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-800">
                {!filteredRows.length && (
                  <tr>
                    <td colSpan="8" className="px-3 py-5 text-center text-[12px] text-slate-500">
                      No product movement data found.
                    </td>
                  </tr>
                )}

                {filteredRows.map((row) => {
                  const isFastMover = row.qty_30d > 0 && row.qty_30d >= fastMoverThreshold;
                  const isDeadStock = row.qty_90d === 0 && (row.stock_qty || 0) > 0;

                  return (
                    <tr key={row.sku} className="bg-slate-950">
                      <td className="px-3 py-2 text-[12px] text-slate-200">
                        <div className="flex items-center gap-2.5">
                          <ProductImage src={row.image_url} name={row.product_name} />
                          <span className="min-w-0 truncate">
                            {row.product_name || <span className="text-slate-600">Unlisted SKU</span>}
                          </span>
                        </div>
                      </td>
                      <td className="px-3 py-2 font-mono text-[12px]">
                        <button
                          type="button"
                          onClick={() =>
                            navigate(`/order-management/sku-report/${encodeURIComponent(row.sku)}`)
                          }
                          className="cursor-pointer text-orange-300 underline decoration-dotted transition hover:text-orange-200"
                          title={`View SKU report for ${row.sku}`}
                        >
                          {row.sku}
                        </button>
                      </td>
                      <td className="px-3 py-2 text-right text-[12px] text-slate-300">{row.qty_7d}</td>
                      <td className="px-3 py-2 text-right text-[12px] font-semibold text-slate-100">
                        {row.qty_30d}
                      </td>
                      <td className="px-3 py-2 text-right text-[12px] text-slate-300">{row.qty_90d}</td>
                      <td className="px-3 py-2 text-right text-[12px] text-slate-300">
                        {row.stock_qty === null ? "-" : row.stock_qty}
                      </td>
                      <td className="px-3 py-2 text-right text-[12px] font-semibold text-orange-300">
                        {row.restock_qty || "-"}
                      </td>
                      <td className="px-3 py-2 text-right">
                        {isFastMover && (
                          <span className="inline-flex rounded-full border border-emerald-900 bg-emerald-950 px-2 py-0.5 text-[10px] font-semibold text-emerald-300">
                            Fast Mover
                          </span>
                        )}
                        {isDeadStock && (
                          <span className="inline-flex rounded-full border border-slate-700 bg-slate-900 px-2 py-0.5 text-[10px] font-semibold text-slate-400">
                            No Movement
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {!loading && (
        <p className="text-[11px] text-slate-500">
          Showing {filteredRows.length} of {rows.length} SKUs. Restock Qty = last 30 days' demand minus
          current stock (0 if already covered). Cancelled/returned orders aren't counted as movement.
        </p>
      )}
    </div>
  );
}
