import { useEffect, useMemo, useState } from "react";
import { Search, RefreshCw, Package, ChevronLeft, ChevronRight, AlertTriangle } from "lucide-react";
import { brighthubProductApi } from "../../../config/sub_api/brighthub_api/brighthub_product_api";
import { brighthubOrderApi } from "../../../config/sub_api/brighthub_api/brighthub_order_api";
import Loader from "../../../components/common/Loader";
import { usePageOverlay } from "../../../components/common/page_overlay/PageOverlayProvider";

const STATUS_TABS = [
  { key: "", label: "All" },
  { key: "pending", label: "Pending" },
  { key: "confirmed", label: "Confirmed" },
  { key: "shipped", label: "Shipped" },
  { key: "delivered", label: "Delivered" },
  { key: "cancelled", label: "Cancelled" },
];

function cx(...classes) {
  return classes.filter(Boolean).join(" ");
}

function extractAccounts(res) {
  const payload = res?.data;

  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.accounts)) return payload.accounts;

  return [];
}

function money(value) {
  if (value === null || value === undefined || value === "") return "-";

  const number = Number(value);
  return Number.isFinite(number) ? number.toFixed(2) : "-";
}

function formatDate(value) {
  if (!value) return "-";

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "-" : date.toLocaleString();
}

function statusTone(status) {
  const key = String(status || "").toLowerCase();

  if (key === "delivered") return "border-emerald-400/25 bg-emerald-400/10 text-emerald-300";
  if (key === "cancelled") return "border-red-400/25 bg-red-400/10 text-red-300";
  if (key === "shipped") return "border-sky-400/25 bg-sky-400/10 text-sky-300";
  if (key === "confirmed") return "border-purple-400/25 bg-purple-400/10 text-purple-300";
  return "border-amber-400/25 bg-amber-400/10 text-amber-300";
}

export default function BrightHubOrderDashboardPage() {
  const { openOverlay } = usePageOverlay();

  const [accounts, setAccounts] = useState([]);
  const [selectedAccountId, setSelectedAccountId] = useState("");

  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  const [searchInput, setSearchInput] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [limit] = useState(20);

  const [loadingAccounts, setLoadingAccounts] = useState(true);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [error, setError] = useState("");

  async function loadAccounts() {
    try {
      setLoadingAccounts(true);
      setError("");

      const res = await brighthubProductApi.getBrightHubAccounts();
      const list = extractAccounts(res);

      setAccounts(list);

      if (list.length) {
        setSelectedAccountId(String(list[0].id || list[0].account_id));
      }
    } catch (err) {
      setAccounts([]);
      setError(err?.friendlyMessage || "Failed to load BrightHub accounts.");
    } finally {
      setLoadingAccounts(false);
    }
  }

  async function loadOrders() {
    if (!selectedAccountId) {
      setRows([]);
      return;
    }

    try {
      setLoadingOrders(true);
      setError("");

      const res = await brighthubOrderApi.getBrightHubOrders(selectedAccountId, { status, page, limit });
      const payload = res?.data || {};

      setRows(Array.isArray(payload.data) ? payload.data : []);
      setTotal(Number(payload.total || 0));
      setTotalPages(Math.max(1, Number(payload.total_pages || 1)));
    } catch (err) {
      setRows([]);
      setError(err?.friendlyMessage || "Failed to load BrightHub orders.");
    } finally {
      setLoadingOrders(false);
    }
  }

  useEffect(() => {
    loadAccounts();
  }, []);

  useEffect(() => {
    loadOrders();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedAccountId, status, page]);

  useEffect(() => {
    setPage(1);
  }, [selectedAccountId, status]);

  const filteredRows = useMemo(() => {
    const q = searchInput.trim().toLowerCase();
    if (!q) return rows;

    return rows.filter((row) =>
      [row.order_no, row.customer_name, row.phone].filter(Boolean).join(" ").toLowerCase().includes(q)
    );
  }, [rows, searchInput]);

  function openOrderDetail(row) {
    openOverlay(`/product/brighthub-orders/${selectedAccountId}/${row.id}`, loadOrders);
  }

  return (
    <div className="w-full overflow-hidden text-[13px] text-zinc-200">
      <div className="space-y-3">
        <div className="rounded-md border border-zinc-700/60 bg-[#1c2838] shadow-sm shadow-black/20">
          <div className="flex items-center justify-between border-b border-zinc-700/60 px-3 py-2">
            <div className="flex items-center gap-2">
              <Package size={15} className="text-orange-400" />
              <h2 className="text-[13px] font-semibold text-white">Website Orders</h2>
            </div>

            <div className="flex items-center gap-2">
              <select
                value={selectedAccountId}
                onChange={(event) => setSelectedAccountId(event.target.value)}
                disabled={loadingAccounts}
                className="h-7 rounded-sm border border-zinc-600 bg-[#2a3542] px-2 text-[11px] text-zinc-200 outline-none"
              >
                {accounts.map((account) => (
                  <option key={account.id || account.account_id} value={account.id || account.account_id}>
                    {account.account_name || account.account_code}
                  </option>
                ))}
              </select>

              <button
                type="button"
                onClick={loadOrders}
                disabled={loadingOrders || !selectedAccountId}
                className="h-7 rounded-sm border border-zinc-600 bg-[#44546b] px-3 text-[11px] font-semibold text-white hover:bg-[#52657f] disabled:opacity-40"
              >
                <RefreshCw size={12} className={cx("inline -mt-0.5 mr-1", loadingOrders && "animate-spin")} />
                REFRESH
              </button>
            </div>
          </div>

          <div className="flex flex-col gap-2 px-3 py-2 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-500" />
              <input
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
                placeholder="Search order no, customer, phone..."
                className="h-8 w-full rounded-sm border border-zinc-600 bg-[#2a3542] pl-7 pr-3 text-[12px] text-zinc-200 outline-none placeholder:text-zinc-500 focus:border-orange-400"
              />
            </div>
          </div>
        </div>

        {error ? (
          <div className="flex gap-2 rounded-sm border border-red-500/20 bg-red-500/5 p-2 text-red-400">
            <AlertTriangle size={15} />
            <p>{error}</p>
          </div>
        ) : null}

        <div className="flex flex-wrap items-center gap-2 border-b border-zinc-800/60 pb-3">
          {STATUS_TABS.map((tab) => (
            <button
              key={tab.key || "all"}
              type="button"
              onClick={() => setStatus(tab.key)}
              className={cx(
                "border-b-2 px-3 py-2 text-[13px] font-semibold transition",
                status === tab.key
                  ? "border-yellow-400 text-yellow-300"
                  : "border-transparent text-zinc-400 hover:text-zinc-200"
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex flex-col gap-2 border-b border-zinc-800/60 pb-3 text-[12px] text-zinc-400 md:flex-row md:items-center md:justify-between">
          <div>
            Total: <b className="text-zinc-100">{total}</b>
          </div>

          <div>
            Page <b className="text-zinc-100">{page}</b> of <b className="text-zinc-100">{totalPages}</b>
          </div>
        </div>

        <div className="w-full overflow-x-auto rounded-sm border border-zinc-800/40 bg-[#050817]">
          <table className="w-full min-w-[900px] table-fixed border-collapse text-[13px]">
            <thead>
              <tr className="border-b border-zinc-800/60 bg-white/[0.015]">
                <th className="w-[18%] px-2 py-2 text-center text-[12px] font-semibold uppercase text-zinc-500">Order No</th>
                <th className="w-[24%] px-2 py-2 text-center text-[12px] font-semibold uppercase text-zinc-500">Customer</th>
                <th className="w-[14%] px-2 py-2 text-center text-[12px] font-semibold uppercase text-zinc-500">Status</th>
                <th className="w-[12%] px-2 py-2 text-center text-[12px] font-semibold uppercase text-zinc-500">Total</th>
                <th className="w-[10%] px-2 py-2 text-center text-[12px] font-semibold uppercase text-zinc-500">Items</th>
                <th className="w-[16%] px-2 py-2 text-center text-[12px] font-semibold uppercase text-zinc-500">Placed</th>
                <th className="w-[6%] px-2 py-2 text-center text-[12px] font-semibold uppercase text-zinc-500">View</th>
              </tr>
            </thead>

            <tbody>
              {loadingOrders || loadingAccounts ? (
                <tr>
                  <td colSpan="7" className="px-2 py-10 text-center text-zinc-400">
                    Loading Website orders...
                  </td>
                </tr>
              ) : !accounts.length ? (
                <tr>
                  <td colSpan="7" className="px-2 py-10 text-center text-zinc-400">
                    No BrightHub account connected yet.
                  </td>
                </tr>
              ) : filteredRows.length === 0 ? (
                <tr>
                  <td colSpan="7" className="px-2 py-10 text-center text-zinc-400">
                    No Website orders found.
                  </td>
                </tr>
              ) : (
                filteredRows.map((row) => (
                  <tr key={row.id} className="border-b border-zinc-800/60 hover:bg-white/[0.04]">
                    <td className="px-2 py-2 text-center align-middle">
                      <button
                        type="button"
                        onClick={() => openOrderDetail(row)}
                        className="mx-auto block max-w-full cursor-pointer truncate text-center font-mono text-[12px] font-medium text-yellow-300 underline underline-offset-2 hover:text-yellow-200"
                      >
                        {row.order_no || `#${row.id}`}
                      </button>
                    </td>

                    <td className="px-2 py-2 text-center align-middle text-[11px] text-zinc-300">
                      <p className="truncate">{row.customer_name || "-"}</p>
                      <p className="truncate text-zinc-500">{row.phone || ""}</p>
                    </td>

                    <td className="px-2 py-2 text-center align-middle">
                      <span className={cx("inline-flex rounded-full border px-2 py-0.5 text-[11px] font-medium capitalize", statusTone(row.status))}>
                        {row.status || "unknown"}
                      </span>
                    </td>

                    <td className="px-2 py-2 text-center align-middle text-[12px] font-semibold text-zinc-100">
                      {money(row.total)}
                    </td>

                    <td className="px-2 py-2 text-center align-middle text-[12px] text-zinc-300">
                      {Array.isArray(row.items) ? row.items.length : "-"}
                    </td>

                    <td className="px-2 py-2 text-center align-middle text-[11px] text-zinc-400">
                      {formatDate(row.created_at)}
                    </td>

                    <td className="px-2 py-2 text-center align-middle">
                      <button
                        type="button"
                        onClick={() => openOrderDetail(row)}
                        className="mx-auto flex h-7 w-7 items-center justify-center rounded-sm border border-zinc-700 bg-zinc-900 text-zinc-300 hover:bg-zinc-800"
                        title="View order"
                      >
                        <Package size={12} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-zinc-800/60 pt-3">
          <button
            type="button"
            onClick={() => setPage((prev) => Math.max(prev - 1, 1))}
            disabled={page <= 1}
            className="flex h-8 items-center gap-1 rounded-sm border border-zinc-800/40 px-2.5 text-zinc-300 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <ChevronLeft size={14} />
            Prev
          </button>

          <span className="text-[12px] text-zinc-400">
            Page {page} of {totalPages}
          </span>

          <button
            type="button"
            onClick={() => setPage((prev) => Math.min(prev + 1, totalPages))}
            disabled={page >= totalPages}
            className="flex h-8 items-center gap-1 rounded-sm border border-zinc-800/40 px-2.5 text-zinc-300 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Next
            <ChevronRight size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}
