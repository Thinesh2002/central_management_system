import { useEffect, useMemo, useState } from "react";
import {
  Search,
  RefreshCw,
  Loader2,
  Package,
  PlayCircle,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  CheckCircle,
  X,
} from "lucide-react";
import { brighthubProductApi } from "../../../config/sub_api/brighthub_api/brighthub_product_api";
import Loader from "../../../components/common/Loader";
import { usePageOverlay } from "../../../components/common/page_overlay/PageOverlayProvider";

const PAGE_SIZES = [25, 50, 100, 200];

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

function extractProducts(res) {
  const payload = res?.data;

  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;

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

function parseJsonSafe(value) {
  if (!value) return value;
  if (typeof value !== "string") return value;

  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}

function getFirstImage(imagesJson) {
  const images = parseJsonSafe(imagesJson);
  if (!Array.isArray(images) || !images.length) return "";

  const first = images[0];
  if (typeof first === "string") return first;

  return first?.url || first?.src || first?.image_url || "";
}

function formatInputDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function getDatePresetRange(preset, customStartDate, customEndDate) {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  if (preset === "all") return { start: "", end: "" };

  if (preset === "today") {
    const date = formatInputDate(today);
    return { start: date, end: date };
  }

  if (preset === "yesterday") {
    const date = new Date(today);
    date.setDate(date.getDate() - 1);
    const formatted = formatInputDate(date);
    return { start: formatted, end: formatted };
  }

  if (preset === "last_7_days") {
    const start = new Date(today);
    start.setDate(start.getDate() - 6);
    return { start: formatInputDate(start), end: formatInputDate(today) };
  }

  if (preset === "last_30_days") {
    const start = new Date(today);
    start.setDate(start.getDate() - 29);
    return { start: formatInputDate(start), end: formatInputDate(today) };
  }

  if (preset === "last_60_days") {
    const start = new Date(today);
    start.setDate(start.getDate() - 59);
    return { start: formatInputDate(start), end: formatInputDate(today) };
  }

  if (preset === "last_90_days") {
    const start = new Date(today);
    start.setDate(start.getDate() - 89);
    return { start: formatInputDate(start), end: formatInputDate(today) };
  }

  return { start: customStartDate, end: customEndDate };
}

function isDateInRange(dateKey, range) {
  if (!range.start && !range.end) return true;
  if (!dateKey) return false;
  if (range.start && dateKey < range.start) return false;
  if (range.end && dateKey > range.end) return false;
  return true;
}

export default function BrightHubProductDashboardPage() {
  const { openOverlay } = usePageOverlay();
  const [accounts, setAccounts] = useState([]);
  const [selectedAccountId, setSelectedAccountId] = useState("");

  const [rows, setRows] = useState([]);

  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [idSearch, setIdSearch] = useState("");
  const [skuSearch, setSkuSearch] = useState("");
  const [datePreset, setDatePreset] = useState("all");
  const [customStartDate, setCustomStartDate] = useState("");
  const [customEndDate, setCustomEndDate] = useState("");
  const [activeTab, setActiveTab] = useState("all");

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);

  const [loadingAccounts, setLoadingAccounts] = useState(true);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [syncing, setSyncing] = useState(false);

  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");
  const [imagePreview, setImagePreview] = useState(null);

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

  async function loadProducts() {
    if (!selectedAccountId) {
      setRows([]);
      return;
    }

    try {
      setLoadingProducts(true);
      setError("");

      const res = await brighthubProductApi.getSyncedBrightHubProducts(selectedAccountId, {
        limit: 5000,
      });

      setRows(extractProducts(res));
    } catch (err) {
      setRows([]);
      setError(err?.friendlyMessage || "Failed to load synced BrightHub products.");
    } finally {
      setLoadingProducts(false);
    }
  }

  async function handleSyncProducts() {
    if (!selectedAccountId) {
      setError("No BrightHub account found.");
      return;
    }

    try {
      setSyncing(true);
      setError("");
      setSuccess("");

      const res = await brighthubProductApi.syncBrightHubProducts(selectedAccountId);
      const data = res?.data?.data;

      setSuccess(
        data
          ? `Product sync completed. Total: ${data.total_records || 0}, Success: ${data.success_records || 0}, Failed: ${data.failed_records || 0}`
          : "BrightHub product sync completed."
      );

      await loadProducts();
    } catch (err) {
      setError(err?.friendlyMessage || "BrightHub product sync failed.");
    } finally {
      setSyncing(false);
    }
  }

  useEffect(() => {
    loadAccounts();
  }, []);

  useEffect(() => {
    loadProducts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedAccountId]);

  useEffect(() => {
    const handle = setTimeout(() => setSearch(searchInput), 300);
    return () => clearTimeout(handle);
  }, [searchInput]);

  useEffect(() => {
    setPage(1);
  }, [search, idSearch, skuSearch, datePreset, customStartDate, customEndDate, activeTab]);

  const statusTabs = useMemo(() => {
    const counts = new Map();

    rows.forEach((row) => {
      const label = String(row.status || "unknown").toLowerCase();
      counts.set(label, (counts.get(label) || 0) + 1);
    });

    const dynamicTabs = Array.from(counts.entries()).map(([key, count]) => ({
      key,
      label: key.charAt(0).toUpperCase() + key.slice(1),
      count,
    }));

    return [{ key: "all", label: "All", count: rows.length }, ...dynamicTabs];
  }, [rows]);

  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    const idQ = idSearch.trim().toLowerCase();
    const skuQ = skuSearch.trim().toLowerCase();
    const dateRange = getDatePresetRange(datePreset, customStartDate, customEndDate);

    return rows.filter((row) => {
      const searchOk = !q || String(row.name || "").toLowerCase().includes(q);
      const idOk = !idQ || String(row.bhid || "").toLowerCase().includes(idQ);
      const skuOk = !skuQ || String(row.sku || "").toLowerCase().includes(skuQ);

      const dateKey = row.last_synced_at ? String(row.last_synced_at).slice(0, 10) : "";
      const dateOk = isDateInRange(dateKey, dateRange);

      const tabOk = activeTab === "all" || String(row.status || "unknown").toLowerCase() === activeTab;

      return searchOk && idOk && skuOk && dateOk && tabOk;
    });
  }, [rows, search, idSearch, skuSearch, datePreset, customStartDate, customEndDate, activeTab]);

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const pageRows = filteredRows.slice((safePage - 1) * pageSize, safePage * pageSize);
  const startIndex = filteredRows.length ? (safePage - 1) * pageSize + 1 : 0;
  const endIndex = Math.min(safePage * pageSize, filteredRows.length);

  function goToPage(nextPage) {
    setPage(Math.min(Math.max(Number(nextPage), 1), totalPages));
  }

  function clearFilters() {
    setSearchInput("");
    setSearch("");
    setIdSearch("");
    setSkuSearch("");
    setDatePreset("all");
    setCustomStartDate("");
    setCustomEndDate("");
    setActiveTab("all");
  }

  const buttonClass =
    "rounded-sm border border-zinc-800/40 transition hover:-translate-y-[1px] hover:border-[#D0E7E6]/50 disabled:cursor-not-allowed disabled:opacity-40";

  return (
    <div className="w-full overflow-hidden text-[13px] text-zinc-200">
      <div className="space-y-3">
        <div className="rounded-md border border-zinc-700/60 bg-[#1c2838] shadow-sm shadow-black/20">
          <div className="flex items-center justify-between border-b border-zinc-700/60 px-3 py-2">
            <div className="flex items-center gap-2">
              <Search size={15} className="text-orange-400" />
              <h2 className="text-[13px] font-semibold text-white">Search & Filter Website Products</h2>
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
                onClick={handleSyncProducts}
                disabled={syncing || !selectedAccountId || loadingAccounts}
                className="flex h-7 items-center gap-1 rounded-sm border border-emerald-500/40 bg-emerald-600 px-3 text-[11px] font-semibold text-white hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {syncing ? <Loader2 size={13} className="animate-spin" /> : <PlayCircle size={13} />}
                SYNC
              </button>

              <button
                type="button"
                onClick={loadProducts}
                disabled={loadingProducts || !selectedAccountId}
                className="h-7 rounded-sm border border-zinc-600 bg-[#44546b] px-3 text-[11px] font-semibold text-white hover:bg-[#52657f] disabled:opacity-40"
              >
                ⟳ REFRESH
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-2 px-3 py-2 xl:grid-cols-12">
            <div className="xl:col-span-2">
              <label className="mb-1 flex items-center gap-1 text-[11px] font-semibold uppercase text-zinc-300">
                <span className="text-orange-400">▦</span>
                Date Range
              </label>

              <select
                value={datePreset}
                onChange={(event) => setDatePreset(event.target.value)}
                className="h-8 w-full rounded-sm border border-zinc-600 bg-[#2a3542] px-2 text-[12px] text-zinc-200 outline-none focus:border-orange-400"
              >
                <option value="all">All Dates</option>
                <option value="today">Today</option>
                <option value="yesterday">Yesterday</option>
                <option value="last_7_days">Last 7 Days</option>
                <option value="last_30_days">Last 30 Days</option>
                <option value="last_60_days">Last 60 Days</option>
                <option value="last_90_days">Last 90 Days</option>
                <option value="custom">Custom Date Range</option>
              </select>
            </div>

            {datePreset === "custom" ? (
              <>
                <div className="xl:col-span-1">
                  <label className="mb-1 block text-[11px] font-semibold uppercase text-zinc-300">From</label>
                  <input
                    type="date"
                    value={customStartDate}
                    onChange={(event) => setCustomStartDate(event.target.value)}
                    className="h-8 w-full rounded-sm border border-zinc-600 bg-[#2a3542] px-2 text-[12px] text-zinc-200 outline-none focus:border-orange-400"
                  />
                </div>

                <div className="xl:col-span-1">
                  <label className="mb-1 block text-[11px] font-semibold uppercase text-zinc-300">To</label>
                  <input
                    type="date"
                    value={customEndDate}
                    onChange={(event) => setCustomEndDate(event.target.value)}
                    className="h-8 w-full rounded-sm border border-zinc-600 bg-[#2a3542] px-2 text-[12px] text-zinc-200 outline-none focus:border-orange-400"
                  />
                </div>
              </>
            ) : null}

            <div className="xl:col-span-2">
              <label className="mb-1 flex items-center gap-1 text-[11px] font-semibold uppercase text-zinc-300">
                <span className="text-orange-400">▥</span>
                BHID
              </label>
              <input
                value={idSearch}
                onChange={(event) => setIdSearch(event.target.value)}
                placeholder="Enter BHID"
                className="h-8 w-full rounded-sm border border-zinc-600 bg-[#2a3542] px-2 text-[12px] text-zinc-200 outline-none placeholder:text-zinc-500 focus:border-orange-400"
              />
            </div>

            <div className="xl:col-span-2">
              <label className="mb-1 flex items-center gap-1 text-[11px] font-semibold uppercase text-zinc-300">
                <span className="text-orange-400">▥</span>
                SKU
              </label>
              <input
                value={skuSearch}
                onChange={(event) => setSkuSearch(event.target.value)}
                placeholder="Enter SKU"
                className="h-8 w-full rounded-sm border border-zinc-600 bg-[#2a3542] px-2 text-[12px] text-zinc-200 outline-none placeholder:text-zinc-500 focus:border-orange-400"
              />
            </div>

            <div className={datePreset === "custom" ? "xl:col-span-2" : "xl:col-span-3"}>
              <label className="mb-1 flex items-center gap-1 text-[11px] font-semibold uppercase text-zinc-300">
                <span className="text-orange-400">⌕</span>
                Search
              </label>
              <input
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
                placeholder="Search Website Products"
                className="h-8 w-full rounded-sm border border-zinc-600 bg-[#2a3542] px-2 text-[12px] text-zinc-200 outline-none placeholder:text-zinc-500 focus:border-orange-400"
              />
            </div>

            <div className={datePreset === "custom" ? "flex items-end gap-2 xl:col-span-2" : "flex items-end gap-2 xl:col-span-3"}>
              <button
                type="button"
                onClick={() => setSearch(searchInput)}
                className="h-8 rounded-sm bg-orange-500 px-3 text-[12px] font-bold text-white hover:bg-orange-400"
              >
                SEARCH
              </button>

              <button
                type="button"
                onClick={clearFilters}
                className="h-8 rounded-sm bg-white px-3 text-[12px] font-bold text-slate-700 hover:bg-zinc-100"
              >
                CLEAR
              </button>
            </div>
          </div>
        </div>

        {error ? (
          <div className="flex gap-2 rounded-sm border border-red-500/20 bg-red-500/5 p-2 text-red-400">
            <AlertTriangle size={15} />
            <p>{error}</p>
          </div>
        ) : null}

        {success ? (
          <div className="flex gap-2 rounded-sm border border-emerald-500/20 bg-emerald-500/5 p-2 text-emerald-400">
            <CheckCircle size={15} />
            <p>{success}</p>
          </div>
        ) : null}

        <div className="flex flex-wrap items-center gap-2 border-b border-zinc-800/60 pb-3">
          {statusTabs.map((tab) => {
            const active = activeTab === tab.key;

            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                className={cx(
                  "border-b-2 px-3 py-2 text-[13px] font-semibold transition",
                  active
                    ? "border-yellow-400 text-yellow-300"
                    : "border-transparent text-zinc-400 hover:text-zinc-200"
                )}
              >
                {tab.label}
                <span className="ml-2 rounded-sm bg-white/5 px-1.5 py-0.5 text-[11px] text-zinc-400">
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>

        <div className="flex flex-col gap-2 border-b border-zinc-800/60 pb-3 text-[12px] text-zinc-400 md:flex-row md:items-center md:justify-between">
          <div>
            Total: <b className="text-zinc-100">{rows.length}</b>
            <span className="mx-2 text-zinc-700">|</span>
            Filtered: <b className="text-zinc-100">{filteredRows.length}</b>
          </div>

          <div>
            Showing <b className="text-zinc-100">{startIndex}</b>-<b className="text-zinc-100">{endIndex}</b> of <b className="text-zinc-100">{filteredRows.length}</b>
            <span className="mx-2 text-zinc-700">|</span>
            Page <b className="text-zinc-100">{safePage}</b> of <b className="text-zinc-100">{totalPages}</b>
          </div>
        </div>

        <div className="w-full overflow-x-auto rounded-sm border border-zinc-800/40 bg-[#050817]">
          <table className="w-full min-w-[1100px] table-fixed border-collapse text-[13px]">
            <thead>
              <tr className="border-b border-zinc-800/60 bg-white/[0.015]">
                <th className="w-[8%] px-2 py-2 text-center text-[12px] font-semibold uppercase text-zinc-500">Image</th>
                <th className="w-[12%] px-2 py-2 text-center text-[12px] font-semibold uppercase text-zinc-500">BHID</th>
                <th className="w-[34%] px-2 py-2 text-center text-[12px] font-semibold uppercase text-zinc-500">Product Title</th>
                <th className="w-[14%] px-2 py-2 text-center text-[12px] font-semibold uppercase text-zinc-500">SKU</th>
                <th className="w-[10%] px-2 py-2 text-center text-[12px] font-semibold uppercase text-zinc-500">Price</th>
                <th className="w-[10%] px-2 py-2 text-center text-[12px] font-semibold uppercase text-zinc-500">Status</th>
                <th className="w-[12%] px-2 py-2 text-center text-[12px] font-semibold uppercase text-zinc-500">Last Synced</th>
              </tr>
            </thead>

            <tbody>
              {loadingProducts || loadingAccounts ? (
                <tr>
                  <td colSpan="7" className="px-2 py-10 text-center text-zinc-400">
                    Loading Website products...
                  </td>
                </tr>
              ) : !accounts.length ? (
                <tr>
                  <td colSpan="7" className="px-2 py-10 text-center text-zinc-400">
                    No BrightHub account connected yet.
                  </td>
                </tr>
              ) : pageRows.length === 0 ? (
                <tr>
                  <td colSpan="7" className="px-2 py-10 text-center text-zinc-400">
                    No Website products found.
                  </td>
                </tr>
              ) : (
                pageRows.map((row) => {
                  const imageUrl = getFirstImage(row.images_json);

                  return (
                    <tr key={`${row.account_id}-${row.bhid}`} className="border-b border-zinc-800/60 hover:bg-white/[0.04]">
                      <td className="px-2 py-2 text-center align-middle">
                        <button
                          type="button"
                          onClick={() => imageUrl && setImagePreview({ image: imageUrl, title: row.name })}
                          className="mx-auto flex h-14 w-14 cursor-pointer items-center justify-center overflow-hidden rounded-sm border border-zinc-800/40 bg-zinc-950 hover:border-[#D0E7E6]/50"
                        >
                          {imageUrl ? (
                            <img
                              src={imageUrl}
                              alt={row.name}
                              className="h-full w-full object-cover"
                              onError={(event) => {
                                event.currentTarget.style.display = "none";
                              }}
                            />
                          ) : (
                            <Package size={14} className="text-zinc-600" />
                          )}
                        </button>
                      </td>

                      <td className="px-2 py-2 text-center align-middle">
                        <button
                          type="button"
                          onClick={() => openOverlay(`/product/brighthub-products/${row.account_id}/${row.bhid}`)}
                          title={row.bhid}
                          className="mx-auto block max-w-full cursor-pointer truncate text-center font-mono text-[12px] font-medium text-yellow-300 underline underline-offset-2 hover:text-yellow-200"
                        >
                          {row.bhid || "-"}
                        </button>
                      </td>

                      <td className="px-2 py-2 text-center align-middle">
                        <button
                          type="button"
                          onClick={() => openOverlay(`/product/brighthub-products/${row.account_id}/${row.bhid}`)}
                          title={row.name}
                          className="cursor-pointer whitespace-normal break-words text-center text-[11px] font-normal leading-[1.3] text-zinc-300 hover:text-[#D0E7E6]"
                        >
                          {row.name || "Unnamed Product"}
                        </button>
                      </td>

                      <td className="px-2 py-2 text-center align-middle text-[11px] text-zinc-400">
                        <span className="block truncate">{row.sku || "-"}</span>
                      </td>

                      <td className="px-2 py-2 text-center align-middle text-[12px] font-semibold text-zinc-100">
                        {money(row.price)}
                      </td>

                      <td className="px-2 py-2 text-center align-middle">
                        <span
                          className={cx(
                            "inline-flex rounded-full border px-2 py-0.5 text-[11px] font-medium",
                            String(row.status || "").toLowerCase() === "active"
                              ? "border-emerald-400/25 bg-emerald-400/10 text-emerald-300"
                              : "border-red-400/25 bg-red-400/10 text-red-300"
                          )}
                        >
                          {row.status || "unknown"}
                        </span>
                      </td>

                      <td className="px-2 py-2 text-center align-middle text-[11px] text-zinc-400">
                        {formatDate(row.last_synced_at)}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <div className="flex flex-col gap-3 border-t border-zinc-800/60 pt-3 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-2 text-zinc-400">
            <span>Rows per page</span>

            <select
              value={pageSize}
              onChange={(event) => {
                setPageSize(Number(event.target.value));
                setPage(1);
              }}
              className={cx("h-8 bg-[#050817] px-2 text-zinc-200 outline-none", buttonClass)}
            >
              {PAGE_SIZES.map((size) => (
                <option key={size} value={size}>{size}</option>
              ))}
            </select>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => goToPage(safePage - 1)}
              disabled={safePage <= 1}
              className={cx("flex h-8 items-center gap-1 px-2.5 text-zinc-300", buttonClass)}
            >
              <ChevronLeft size={14} />
              Prev
            </button>

            {Array.from({ length: Math.min(totalPages, 5) }, (_, index) => {
              const pageNumber =
                totalPages <= 5
                  ? index + 1
                  : safePage <= 3
                    ? index + 1
                    : safePage >= totalPages - 2
                      ? totalPages - 4 + index
                      : safePage - 2 + index;

              return (
                <button
                  key={pageNumber}
                  type="button"
                  onClick={() => goToPage(pageNumber)}
                  className={cx(
                    "h-8 min-w-8 rounded-sm border-b-2 px-1.5 font-semibold hover:-translate-y-[1px]",
                    safePage === pageNumber
                      ? "border-yellow-400 text-yellow-300"
                      : "border-transparent text-zinc-400 hover:text-zinc-200"
                  )}
                >
                  {pageNumber}
                </button>
              );
            })}

            <button
              type="button"
              onClick={() => goToPage(safePage + 1)}
              disabled={safePage >= totalPages}
              className={cx("flex h-8 items-center gap-1 px-2.5 text-zinc-300", buttonClass)}
            >
              Next
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      </div>

      {imagePreview ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
          onClick={() => setImagePreview(null)}
        >
          <div
            className="flex w-full max-w-155 flex-col overflow-hidden border border-slate-700 bg-[#111827] shadow-2xl shadow-black/50"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex shrink-0 items-center justify-between bg-linear-to-r from-purple-950 via-[#1a1033] to-purple-950 px-4 py-3">
              <h3 className="truncate text-[15px] font-semibold text-white">Product Image</h3>

              <button
                type="button"
                onClick={() => setImagePreview(null)}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20"
              >
                <X size={17} />
              </button>
            </div>

            <div className="flex justify-center bg-[#0b1220] px-4 py-4">
              <div className="flex max-h-[65vh] w-full items-center justify-center overflow-hidden border border-purple-500/40 bg-white p-3">
                <img src={imagePreview.image} alt={imagePreview.title} className="max-h-[60vh] max-w-full object-contain" />
              </div>
            </div>

            <div className="px-4 pb-4">
              <p className="mb-1 text-[11px] font-bold uppercase tracking-wide text-slate-500">Image URL</p>
              <p title={imagePreview.image} className="break-all text-xs font-medium leading-5 text-slate-400">
                {imagePreview.image}
              </p>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
