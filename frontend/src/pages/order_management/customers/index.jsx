import React, { useEffect, useMemo, useState } from "react";
import { Search, AlertCircle, RefreshCw, Users, UserPlus, Repeat, Wallet, ReceiptText } from "lucide-react";

import customersApi from "../../../config/sub_api/order_management_api/customers_api";
import { usePageOverlay } from "../../../components/common/page_overlay/PageOverlayProvider";

function getApiMessage(error, fallback = "Something went wrong") {
  return error?.response?.data?.message || error?.message || fallback;
}

function extractRows(res) {
  const payload = res?.data || res;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.rows)) return payload.rows;
  if (Array.isArray(payload)) return payload;
  return [];
}

function formatDate(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString("en-GB", { year: "numeric", month: "short", day: "2-digit" });
}

function money(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return "0.00";
  return number.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function statusClass(status) {
  if (status === "ACTIVE") return "border-emerald-900 bg-emerald-950 text-emerald-300";
  if (status === "BLOCKED") return "border-red-900 bg-red-950 text-red-300";
  return "border-slate-700 bg-slate-900 text-slate-400";
}

// total_orders is already computed live per customer (countable orders
// only, cancelled/returned excluded) by listWithLiveStats on the backend -
// "new" vs "repeated" here is purely derived from that count, no extra
// API calls needed.
function getCustomerStats(customers) {
  let newCustomers = 0;
  let repeatedCustomers = 0;
  let neverOrdered = 0;
  let totalRevenue = 0;
  let totalOrders = 0;

  customers.forEach((row) => {
    const orders = Number(row.total_orders || 0);
    totalOrders += orders;
    totalRevenue += Number(row.total_spent || 0);

    if (orders === 1) newCustomers += 1;
    else if (orders > 1) repeatedCustomers += 1;
    else neverOrdered += 1;
  });

  const buyers = newCustomers + repeatedCustomers;

  return {
    total: customers.length,
    newCustomers,
    repeatedCustomers,
    neverOrdered,
    totalRevenue,
    repeatRate: buyers ? (repeatedCustomers / buyers) * 100 : 0,
    avgOrderValue: totalOrders ? totalRevenue / totalOrders : 0,
  };
}

function StatCard({ label, value, note, icon: Icon, tone = "slate" }) {
  const toneClass = {
    orange: "bg-orange-500/10 text-orange-300 ring-orange-500/30",
    emerald: "bg-emerald-500/10 text-emerald-300 ring-emerald-500/30",
    sky: "bg-sky-500/10 text-sky-300 ring-sky-500/30",
    amber: "bg-amber-500/10 text-amber-300 ring-amber-500/30",
    slate: "bg-slate-500/10 text-slate-300 ring-slate-500/30",
  }[tone];

  return (
    <div className="rounded-lg border border-slate-800 bg-slate-950 p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">{label}</p>
          <p className="mt-1.5 truncate text-[18px] font-bold text-white">{value}</p>
          {note ? <p className="mt-1 text-[10px] text-slate-500">{note}</p> : null}
        </div>

        <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-md ring-1 ${toneClass}`}>
          <Icon size={15} />
        </div>
      </div>
    </div>
  );
}

export default function CustomersPage() {
  const { openOverlay } = usePageOverlay();
  const [customers, setCustomers] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadCustomers() {
    try {
      setLoading(true);
      setError("");

      const res = await customersApi.getAll({ page: 1, limit: 500, search });
      setCustomers(extractRows(res));
    } catch (err) {
      setError(getApiMessage(err, "Failed to load customers"));
      setCustomers([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadCustomers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filteredCustomers = useMemo(() => {
    const key = search.trim().toLowerCase();
    if (!key) return customers;

    return customers.filter((row) =>
      [row.customer_name, row.customer_code, row.phone, row.email, row.shipping_city]
        .join(" ")
        .toLowerCase()
        .includes(key)
    );
  }, [customers, search]);

  const stats = useMemo(() => getCustomerStats(customers), [customers]);

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-medium text-slate-100">
            <Users size={20} />
            Customers
          </h1>
          <p className="text-[13px] text-slate-500">
            Customer records synced from the order management pipeline.
          </p>
        </div>

        <button
          type="button"
          onClick={loadCustomers}
          disabled={loading}
          className="inline-flex h-7 cursor-pointer items-center gap-1.5 rounded-md border border-slate-700 bg-slate-900 px-2.5 text-[11px] font-semibold text-slate-200 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <RefreshCw size={12} />
          Refresh
        </button>
      </div>

      {!loading && (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-6">
          <StatCard label="Total Customers" value={stats.total.toLocaleString()} icon={Users} tone="slate" />
          <StatCard
            label="New Customers"
            value={stats.newCustomers.toLocaleString()}
            note="Exactly 1 order"
            icon={UserPlus}
            tone="sky"
          />
          <StatCard
            label="Repeated Customers"
            value={stats.repeatedCustomers.toLocaleString()}
            note="2+ orders"
            icon={Repeat}
            tone="emerald"
          />
          <StatCard
            label="Repeat Rate"
            value={`${stats.repeatRate.toFixed(1)}%`}
            note="Of customers who ever ordered"
            icon={Repeat}
            tone="amber"
          />
          <StatCard
            label="Total Revenue"
            value={money(stats.totalRevenue)}
            note="Across all countable orders"
            icon={Wallet}
            tone="orange"
          />
          <StatCard
            label="Avg Order Value"
            value={money(stats.avgOrderValue)}
            icon={ReceiptText}
            tone="slate"
          />
        </div>
      )}

      <div className="border border-slate-800 bg-slate-950 p-2">
        <div className="relative">
          <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name, customer code, phone, email, city..."
            className="h-8 w-full border border-slate-800 bg-slate-900 pl-8 pr-3 text-[12px] text-slate-300 outline-none placeholder:text-slate-600"
          />
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-1.5 rounded-md border border-red-900 bg-red-950 px-3 py-2 text-[13px] text-red-300">
          <AlertCircle size={14} />
          {error}
        </div>
      )}

      {loading ? (
        <div className="rounded-lg border border-slate-800 bg-slate-950 p-5 text-center text-[13px] text-slate-500">
          Loading customers...
        </div>
      ) : (
        <div className="overflow-visible rounded-lg border border-slate-800 bg-slate-950">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-800">
              <thead className="bg-slate-900">
                <tr>
                  {[
                    "NO",
                    "Name",
                    "Phone",
                    "Email",
                    "City",
                    "Source",
                    "Orders",
                    "Total Spent",
                    "Status",
                    "Joined",
                  ].map((header) => (
                    <th
                      key={header}
                      className="px-3 py-2 text-left text-xs font-normal uppercase tracking-wide text-slate-500"
                    >
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-800">
                {!filteredCustomers.length && (
                  <tr>
                    <td colSpan="10" className="px-3 py-5 text-center text-[13px] text-slate-500">
                      No customers found.
                    </td>
                  </tr>
                )}

                {filteredCustomers.map((row, index) => (
                  <tr
                    key={row.id}
                    onClick={() => openOverlay(`/order-management/customers/${row.id}`)}
                    className="cursor-pointer bg-slate-950 hover:bg-slate-900"
                  >
                    <td className="px-3 py-2 text-[13px] text-slate-500">{index + 1}</td>

                    <td className="px-3 py-2 text-[13px] font-medium text-orange-300 underline decoration-dotted">
                      {row.customer_name || "-"}
                    </td>

                    <td className="px-3 py-2 text-[13px] text-slate-300">{row.phone || "-"}</td>

                    <td className="px-3 py-2 text-[13px] text-slate-300">{row.email || "-"}</td>

                    <td className="px-3 py-2 text-[13px] text-slate-400">{row.shipping_city || "-"}</td>

                    <td className="px-3 py-2 text-[13px] text-slate-400">{row.source_type || "-"}</td>

                    <td className="px-3 py-2 text-right text-[13px] text-slate-300">
                      {row.total_orders ?? 0}
                    </td>

                    <td className="px-3 py-2 text-right text-[13px] font-semibold text-slate-100">
                      {money(row.total_spent)}
                    </td>

                    <td className="px-3 py-2">
                      <span
                        className={`inline-flex rounded-full border px-2 py-0.5 text-[11px] font-semibold ${statusClass(
                          row.status
                        )}`}
                      >
                        {row.status || "-"}
                      </span>
                    </td>

                    <td className="px-3 py-2 text-[13px] text-slate-400">
                      {formatDate(row.created_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {!loading && (
        <div className="flex justify-between text-[13px] text-slate-500">
          <p>
            Showing {filteredCustomers.length} of {customers.length} customers
          </p>
        </div>
      )}
    </div>
  );
}
