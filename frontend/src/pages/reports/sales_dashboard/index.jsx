import { useEffect, useMemo, useState } from "react";
import {
  BarChart3,
  LayoutGrid,
  ListChecks,
  RefreshCw,
  Table as TableIcon,
} from "lucide-react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import ordersApi from "../../../config/sub_api/order_management_api/orders_api";
import { getApiError } from "../../../config/api";
import Loader from "../../../components/common/Loader";

const DATE_PRESETS = [
  { value: "today", label: "Today" },
  { value: "yesterday", label: "Yesterday" },
  { value: "7_days", label: "Last 7 Days" },
  { value: "30_days", label: "Last 30 Days" },
  { value: "custom", label: "Custom Range" },
];

const MARKETPLACES = [
  { value: "all", label: "Marketplace total" },
  { value: "daraz", label: "Daraz" },
  { value: "woo", label: "WooCommerce" },
  { value: "local", label: "Manual / Local" },
];

function getItemQty(item = {}) {
  return Number(item.qty || item.quantity || 1) || 1;
}

function getItemLineTotal(item = {}) {
  const lineTotal = Number(item.line_total || item.total_price || 0);
  if (lineTotal) return lineTotal;

  const unit = Number(item.unit_price || item.price || 0);
  return unit * getItemQty(item);
}

function money(value, currency = "LKR") {
  return `${currency} ${Number(value || 0).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function startOfDay(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function endOfDay(date) {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
}

function resolveDateRange(preset, customFrom, customTo) {
  const now = new Date();

  if (preset === "today") return { from: startOfDay(now), to: endOfDay(now) };

  if (preset === "yesterday") {
    const y = new Date(now);
    y.setDate(y.getDate() - 1);
    return { from: startOfDay(y), to: endOfDay(y) };
  }

  if (preset === "7_days") {
    const from = new Date(now);
    from.setDate(from.getDate() - 6);
    return { from: startOfDay(from), to: endOfDay(now) };
  }

  if (preset === "30_days") {
    const from = new Date(now);
    from.setDate(from.getDate() - 29);
    return { from: startOfDay(from), to: endOfDay(now) };
  }

  if (preset === "custom") {
    return {
      from: customFrom ? startOfDay(customFrom) : null,
      to: customTo ? endOfDay(customTo) : null,
    };
  }

  return { from: null, to: null };
}

function dayKey(date) {
  const d = new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function chartLabel(key) {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-GB", { month: "short", day: "2-digit" });
}

function SnapshotCard({ label, value }) {
  return (
    <div className="border border-slate-800 bg-[#0a101d] px-4 py-3">
      <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 text-xl font-black text-white">{value}</p>
    </div>
  );
}

export default function SalesDashboardPage() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [datePreset, setDatePreset] = useState("7_days");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [marketplace, setMarketplace] = useState("all");
  const [viewMode, setViewMode] = useState("graph");

  async function load() {
    setLoading(true);
    setError("");

    try {
      const res = await ordersApi.listOrders({ limit: 2000 });
      setOrders(res?.orders || []);
    } catch (err) {
      setError(getApiError(err, "Failed to load orders."));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const range = useMemo(
    () => resolveDateRange(datePreset, customFrom, customTo),
    [datePreset, customFrom, customTo]
  );

  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      if (marketplace !== "all" && String(order.source || "").toLowerCase() !== marketplace) return false;
      if (!order.order_date) return false;

      const orderDate = new Date(order.order_date);
      if (range.from && orderDate < range.from) return false;
      if (range.to && orderDate > range.to) return false;

      return true;
    });
  }, [orders, marketplace, range]);

  const snapshot = useMemo(() => {
    let totalItems = 0;
    let units = 0;
    let sales = 0;

    filteredOrders.forEach((order) => {
      const items = order.items || [];
      totalItems += items.length;
      items.forEach((item) => {
        units += getItemQty(item);
        sales += getItemLineTotal(item);
      });
    });

    const orderCount = filteredOrders.length || 1;

    return {
      totalItems,
      units,
      sales,
      avgUnitsPerOrder: (units / orderCount).toFixed(2),
      avgSalesPerOrder: sales / orderCount,
      orderCount: filteredOrders.length,
    };
  }, [filteredOrders]);

  const dailySeries = useMemo(() => {
    const byDay = new Map();

    filteredOrders.forEach((order) => {
      const key = dayKey(order.order_date);
      const entry = byDay.get(key) || { key, units: 0, sales: 0, orders: 0 };
      entry.orders += 1;

      (order.items || []).forEach((item) => {
        entry.units += getItemQty(item);
        entry.sales += getItemLineTotal(item);
      });

      byDay.set(key, entry);
    });

    return Array.from(byDay.values())
      .sort((a, b) => (a.key < b.key ? -1 : 1))
      .map((entry) => ({ ...entry, label: chartLabel(entry.key) }));
  }, [filteredOrders]);

  return (
    <div className="w-full text-slate-100">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <BarChart3 size={18} className="text-orange-300" />
          <h1 className="text-lg font-semibold text-white">Sales Dashboard</h1>
        </div>

        <button
          type="button"
          onClick={load}
          disabled={loading}
          className="flex h-8 items-center gap-1.5 border border-slate-600 bg-[#2b3441] px-3 text-[11px] font-semibold text-slate-200 hover:border-orange-400 disabled:opacity-60"
        >
          <RefreshCw size={12} className={loading ? "animate-spin" : ""} />
          Refresh
        </button>
      </div>

      <div className="flex flex-wrap items-end gap-3 border border-slate-800 bg-[#1b2a3a] px-3 py-2.5">
        <label className="block">
          <span className="mb-1 block text-[9px] font-bold uppercase tracking-wide text-slate-300">Date</span>
          <select
            value={datePreset}
            onChange={(e) => setDatePreset(e.target.value)}
            className="h-7 border border-slate-600 bg-[#2b3441] px-2.5 text-[11px] font-medium text-white outline-none focus:border-orange-400"
          >
            {DATE_PRESETS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        {datePreset === "custom" && (
          <>
            <label className="block">
              <span className="mb-1 block text-[9px] font-bold uppercase tracking-wide text-slate-300">From</span>
              <input
                type="date"
                value={customFrom}
                onChange={(e) => setCustomFrom(e.target.value)}
                className="h-7 border border-slate-600 bg-[#2b3441] px-2.5 text-[11px] font-medium text-slate-100 outline-none focus:border-orange-400"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-[9px] font-bold uppercase tracking-wide text-slate-300">To</span>
              <input
                type="date"
                value={customTo}
                onChange={(e) => setCustomTo(e.target.value)}
                className="h-7 border border-slate-600 bg-[#2b3441] px-2.5 text-[11px] font-medium text-slate-100 outline-none focus:border-orange-400"
              />
            </label>
          </>
        )}

        <label className="block">
          <span className="mb-1 block text-[9px] font-bold uppercase tracking-wide text-slate-300">Sales breakdown</span>
          <select
            value={marketplace}
            onChange={(e) => setMarketplace(e.target.value)}
            className="h-7 border border-slate-600 bg-[#2b3441] px-2.5 text-[11px] font-medium text-white outline-none focus:border-orange-400"
          >
            {MARKETPLACES.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <span className="ml-auto text-[11px] text-slate-500">
          {snapshot.orderCount} order{snapshot.orderCount === 1 ? "" : "s"} in range
        </span>
      </div>

      {error && (
        <div className="mt-3 border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-300">{error}</div>
      )}

      {loading ? (
        <Loader label="Loading sales data..." minHeight="200px" />
      ) : (
        <>
          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
            <SnapshotCard label="Total Order Items" value={snapshot.totalItems} />
            <SnapshotCard label="Units Ordered" value={snapshot.units} />
            <SnapshotCard label="Ordered Product Sales" value={money(snapshot.sales)} />
            <SnapshotCard label="Avg. Units / Order" value={snapshot.avgUnitsPerOrder} />
            <SnapshotCard label="Avg. Sales / Order" value={money(snapshot.avgSalesPerOrder)} />
          </div>

          <div className="mt-3 border border-slate-800 bg-[#0a101d]">
            <div className="flex items-center justify-between border-b border-slate-800 px-3 py-2">
              <div className="flex items-center gap-2">
                <ListChecks size={14} className="text-orange-300" />
                <h2 className="text-sm font-semibold text-white">Compare Sales</h2>
              </div>

              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setViewMode("graph")}
                  className={`flex h-7 items-center gap-1 px-2.5 text-[11px] font-semibold ${
                    viewMode === "graph" ? "bg-orange-500 text-slate-950" : "border border-slate-700 text-slate-300"
                  }`}
                >
                  <LayoutGrid size={12} />
                  Graph view
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode("table")}
                  className={`flex h-7 items-center gap-1 px-2.5 text-[11px] font-semibold ${
                    viewMode === "table" ? "bg-orange-500 text-slate-950" : "border border-slate-700 text-slate-300"
                  }`}
                >
                  <TableIcon size={12} />
                  Table view
                </button>
              </div>
            </div>

            {!dailySeries.length ? (
              <p className="py-12 text-center text-[12px] text-slate-500">No sales in this date range.</p>
            ) : viewMode === "graph" ? (
              <div className="h-72 w-full p-3">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={dailySeries} margin={{ top: 5, right: 20, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis dataKey="label" stroke="#64748b" tick={{ fontSize: 11 }} />
                    <YAxis yAxisId="sales" stroke="#fb923c" tick={{ fontSize: 11 }} />
                    <YAxis yAxisId="units" orientation="right" stroke="#22d3ee" tick={{ fontSize: 11 }} />
                    <Tooltip
                      contentStyle={{ background: "#0b1220", border: "1px solid #1e293b", fontSize: 12 }}
                      labelStyle={{ color: "#e2e8f0" }}
                    />
                    <Line
                      yAxisId="sales"
                      type="monotone"
                      dataKey="sales"
                      name="Ordered Product Sales"
                      stroke="#fb923c"
                      strokeWidth={2}
                      dot={false}
                    />
                    <Line
                      yAxisId="units"
                      type="monotone"
                      dataKey="units"
                      name="Units Ordered"
                      stroke="#22d3ee"
                      strokeWidth={2}
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-800">
                  <thead className="bg-[#111827]">
                    <tr>
                      {["Date", "Orders", "Units Ordered", "Ordered Product Sales"].map((header) => (
                        <th
                          key={header}
                          className="px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-orange-300"
                        >
                          {header}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {dailySeries.map((entry) => (
                      <tr key={entry.key}>
                        <td className="px-3 py-2 text-[12px] text-slate-200">{entry.label}</td>
                        <td className="px-3 py-2 text-[12px] text-slate-200">{entry.orders}</td>
                        <td className="px-3 py-2 text-[12px] text-slate-200">{entry.units}</td>
                        <td className="px-3 py-2 text-[12px] text-slate-200">{money(entry.sales)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
