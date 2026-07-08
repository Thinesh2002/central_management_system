import React, { useEffect, useMemo, useState } from "react";
import { AlertCircle, RefreshCw, Search, TrendingUp } from "lucide-react";

import productTrendsApi from "../../../config/sub_api/order_management_api/product_trends_api";

function getApiMessage(error, fallback = "Something went wrong") {
  return error?.response?.data?.message || error?.message || fallback;
}

const SORT_OPTIONS = [
  { key: "qty_7d", label: "7-Day Qty" },
  { key: "qty_30d", label: "30-Day Qty" },
  { key: "qty_90d", label: "90-Day Qty" },
  { key: "stock_qty", label: "Stock" },
  { key: "restock_qty", label: "Restock Qty" },
];

export default function ProductTrendsPage() {
  const [rows, setRows] = useState([]);
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState("qty_30d");
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
    const base = key
      ? rows.filter((row) => [row.sku, row.product_name].join(" ").toLowerCase().includes(key))
      : rows;

    return [...base].sort((a, b) => (b[sortKey] ?? 0) - (a[sortKey] ?? 0));
  }, [rows, search, sortKey]);

  return (
    <div className="space-y-3">
      <section className="overflow-hidden border border-slate-700 bg-[#1b2a3a] shadow-lg shadow-black/20">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-700 px-4 py-3">
          <h3 className="flex items-center gap-2 text-[13px] font-semibold text-white">
            <TrendingUp size={15} className="text-orange-400" />
            Product Trend Report
          </h3>

          <button
            type="button"
            onClick={loadTrends}
            disabled={loading}
            title="Recalculate"
            className="inline-flex h-7 w-7 items-center justify-center rounded-sm border border-slate-600 bg-[#44546b] text-white hover:bg-[#52657f] disabled:opacity-60"
          >
            <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2 px-4 py-3">
          <label className="flex h-9 w-full max-w-md items-center border border-slate-600 bg-[#2b3441] px-3 focus-within:border-orange-400">
            <Search size={15} className="text-slate-500" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search SKU or product name..."
              className="h-full min-w-0 flex-1 bg-transparent px-2 text-[12px] font-medium text-slate-100 outline-none placeholder:text-slate-500"
            />
          </label>

          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] font-semibold uppercase text-slate-500">Sort by:</span>
            {SORT_OPTIONS.map((option) => (
              <button
                key={option.key}
                type="button"
                onClick={() => setSortKey(option.key)}
                className={`h-7 rounded-sm border px-2.5 text-[11px] font-semibold ${
                  sortKey === option.key
                    ? "border-orange-400 bg-orange-500/10 text-orange-300"
                    : "border-slate-700 bg-transparent text-slate-400 hover:text-slate-200"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      </section>

      {error && (
        <div className="flex items-center gap-1.5 rounded-md border border-red-900 bg-red-950 px-3 py-2 text-[13px] text-red-300">
          <AlertCircle size={14} />
          {error}
        </div>
      )}

      {loading ? (
        <div className="rounded-lg border border-slate-800 bg-slate-950 p-5 text-center text-[13px] text-slate-500">
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
                        className={`px-3 py-2 text-xs font-semibold uppercase tracking-wide text-slate-500 ${
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
                    <td colSpan="8" className="px-3 py-5 text-center text-[13px] text-slate-500">
                      No product movement data found.
                    </td>
                  </tr>
                )}

                {filteredRows.map((row) => {
                  const isFastMover = row.qty_30d > 0 && row.qty_30d >= fastMoverThreshold;
                  const isDeadStock = row.qty_90d === 0 && (row.stock_qty || 0) > 0;

                  return (
                    <tr key={row.sku} className="bg-slate-950">
                      <td className="px-3 py-2 text-[13px] text-slate-200">
                        {row.product_name || <span className="text-slate-600">Unlisted SKU</span>}
                      </td>
                      <td className="px-3 py-2 font-mono text-[13px] text-slate-300">{row.sku}</td>
                      <td className="px-3 py-2 text-right text-[13px] text-slate-300">{row.qty_7d}</td>
                      <td className="px-3 py-2 text-right text-[13px] font-semibold text-slate-100">
                        {row.qty_30d}
                      </td>
                      <td className="px-3 py-2 text-right text-[13px] text-slate-300">{row.qty_90d}</td>
                      <td className="px-3 py-2 text-right text-[13px] text-slate-300">
                        {row.stock_qty === null ? "-" : row.stock_qty}
                      </td>
                      <td className="px-3 py-2 text-right text-[13px] font-semibold text-orange-300">
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
        <p className="text-[12px] text-slate-500">
          Showing {filteredRows.length} of {rows.length} SKUs. Restock Qty = last 30 days' demand minus
          current stock (0 if already covered). Cancelled/returned orders aren't counted as movement.
        </p>
      )}
    </div>
  );
}
