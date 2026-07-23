import { useEffect, useMemo, useState } from "react";
import {
  Search,
  RefreshCw,
  Loader2,
  Package,
  PlayCircle,
  ChevronLeft,
  ChevronRight,
  X,
} from "lucide-react";
import { brighthubProductApi } from "../../../config/sub_api/brighthub_api/brighthub_product_api";
import Loader from "../../../components/common/Loader";

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

function getTotal(res) {
  return Number(res?.data?.total || 0);
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

function StatusBadge({ value }) {
  const status = String(value || "unknown").toLowerCase();

  const styles = {
    active: "border-emerald-400/25 bg-emerald-400/10 text-emerald-300",
    inactive: "border-red-400/25 bg-red-400/10 text-red-300",
    unknown: "border-slate-500/25 bg-slate-500/10 text-slate-300",
  };

  return (
    <span className={`inline-flex rounded-full border px-2 py-0.5 text-[11px] font-medium ${styles[status] || styles.unknown}`}>
      {status}
    </span>
  );
}

export default function BrightHubProductDashboardPage() {
  const [accounts, setAccounts] = useState([]);
  const [selectedAccountId, setSelectedAccountId] = useState("");

  const [products, setProducts] = useState([]);
  const [total, setTotal] = useState(0);

  const [search, setSearch] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");
  const [page, setPage] = useState(1);
  const [limit] = useState(50);

  const [loadingAccounts, setLoadingAccounts] = useState(true);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [syncing, setSyncing] = useState(false);

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [imagePreview, setImagePreview] = useState(null);

  const totalPages = useMemo(() => Math.max(Math.ceil(total / limit), 1), [total, limit]);

  async function loadAccounts() {
    try {
      setLoadingAccounts(true);
      setError("");

      const res = await brighthubProductApi.getBrightHubAccounts();
      const rows = extractAccounts(res);

      setAccounts(rows);

      if (rows.length) {
        setSelectedAccountId(String(rows[0].id || rows[0].account_id));
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
      setProducts([]);
      setTotal(0);
      return;
    }

    try {
      setLoadingProducts(true);
      setError("");

      const res = await brighthubProductApi.getSyncedBrightHubProducts(selectedAccountId, {
        page,
        limit,
        search: appliedSearch || undefined,
      });

      setProducts(extractProducts(res));
      setTotal(getTotal(res));
    } catch (err) {
      setProducts([]);
      setTotal(0);
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
      setMessage("");

      const res = await brighthubProductApi.syncBrightHubProducts(selectedAccountId);
      const data = res?.data?.data;

      setMessage(
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

  function handleSearchSubmit(e) {
    e.preventDefault();
    setAppliedSearch(search.trim());
    setPage(1);
  }

  useEffect(() => {
    loadAccounts();
  }, []);

  useEffect(() => {
    loadProducts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedAccountId, page, appliedSearch]);

  return (
    <div className="min-h-screen bg-[#070B14] px-4 py-4 text-slate-100 md:px-6">
      {message && (
        <div className="mb-4 rounded-lg border border-emerald-400/25 bg-emerald-400/10 px-3 py-2 text-xs text-emerald-200">
          {message}
        </div>
      )}

      {error && (
        <div className="mb-4 rounded-lg border border-red-400/25 bg-red-500/10 px-3 py-2 text-xs text-red-200">
          {error}
        </div>
      )}

      <div className="rounded-xl border border-white/10 bg-[#0D1322] shadow-lg shadow-black/20">
        <div className="flex flex-col gap-3 border-b border-white/10 p-3 md:flex-row md:items-center md:justify-between">
          <form onSubmit={handleSearchSubmit} className="relative w-full md:max-w-lg">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />

            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search product name, SKU, BHID..."
              className="w-full rounded-lg border border-white/10 bg-[#070B14] py-2 pl-9 pr-24 text-xs text-slate-100 outline-none placeholder:text-slate-600 transition focus:border-yellow-400/60"
            />

            <button
              type="submit"
              className="absolute right-1.5 top-1/2 -translate-y-1/2 cursor-pointer rounded-md bg-yellow-400 px-3 py-1.5 text-[11px] font-semibold text-slate-950 transition hover:bg-yellow-300"
            >
              Search
            </button>
          </form>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleSyncProducts}
              disabled={syncing || !selectedAccountId || loadingAccounts}
              className="inline-flex cursor-pointer items-center justify-center gap-1.5 rounded-lg bg-yellow-400 px-3 py-2 text-xs font-semibold text-slate-950 transition hover:bg-yellow-300 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {syncing ? <Loader2 size={14} className="animate-spin" /> : <PlayCircle size={14} />}
              Sync
            </button>

            <button
              type="button"
              onClick={loadProducts}
              disabled={loadingProducts || !selectedAccountId}
              className="inline-flex cursor-pointer items-center justify-center gap-1.5 rounded-lg border border-white/10 bg-[#070B14] px-3 py-2 text-xs font-medium text-slate-200 transition hover:border-yellow-400/40 hover:text-yellow-200 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <RefreshCw size={14} className={loadingProducts ? "animate-spin" : ""} />
              Refresh
            </button>
          </div>
        </div>

        {loadingProducts || loadingAccounts ? (
          <Loader label="Loading products..." minHeight="0" className="py-16" />
        ) : !accounts.length ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl border border-white/10 bg-[#070B14] text-slate-500">
              <Package size={26} />
            </div>
            <p className="text-sm font-semibold text-slate-200">No BrightHub account connected yet.</p>
            <p className="mt-1 max-w-md text-xs text-slate-500">
              Add one from Marketplace Accounts (Platform: BrightHub).
            </p>
          </div>
        ) : products.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl border border-white/10 bg-[#070B14] text-slate-500">
              <Package size={26} />
            </div>
            <p className="text-sm font-semibold text-slate-200">No synced BrightHub products found.</p>
            <p className="mt-1 max-w-md text-xs text-slate-500">Click Sync to load products from BrightHub.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-xs">
              <thead className="bg-[#070B14] text-[11px] uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-3 py-3">Product</th>
                  <th className="px-3 py-3">BHID</th>
                  <th className="px-3 py-3">Price</th>
                  <th className="px-3 py-3">Status</th>
                  <th className="px-3 py-3">Last Sync</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-white/10">
                {products.map((product) => {
                  const imageUrl = getFirstImage(product.images_json);

                  return (
                    <tr key={`${product.account_id}-${product.bhid}`} className="transition hover:bg-white/[0.03]">
                      <td className="px-3 py-3">
                        <div className="flex min-w-[390px] items-center gap-3">
                          <button
                            type="button"
                            onClick={() => imageUrl && setImagePreview({ image: imageUrl, title: product.name || "Product" })}
                            className="flex h-14 w-14 shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded-lg border border-white/10 bg-white"
                            title="View product image"
                          >
                            {imageUrl ? (
                              <img
                                src={imageUrl}
                                alt={product.name || "Product"}
                                referrerPolicy="no-referrer"
                                loading="lazy"
                                className="h-full w-full object-contain transition duration-200 hover:scale-105"
                              />
                            ) : (
                              <Package size={18} className="text-slate-500" />
                            )}
                          </button>

                          <div className="min-w-0">
                            <p className="line-clamp-2 text-[12px] font-medium leading-5 text-slate-100" title={product.name || "Unnamed Product"}>
                              {product.name || "Unnamed Product"}
                            </p>
                            <div className="mt-0.5 font-mono text-[11px] text-yellow-200/80">SKU: {product.sku || "-"}</div>
                          </div>
                        </div>
                      </td>

                      <td className="px-3 py-3 font-mono text-[12px] text-slate-300">{product.bhid || "-"}</td>
                      <td className="px-3 py-3 text-[12px] font-semibold text-slate-100">{money(product.price)}</td>
                      <td className="px-3 py-3"><StatusBadge value={product.status} /></td>
                      <td className="px-3 py-3 text-[12px] text-slate-400">{formatDate(product.last_synced_at)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        <div className="flex items-center justify-between border-t border-white/10 p-3">
          <button
            type="button"
            onClick={() => setPage((prev) => Math.max(prev - 1, 1))}
            disabled={page <= 1 || loadingProducts}
            className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-white/10 bg-[#070B14] px-3 py-2 text-xs text-slate-200 transition hover:border-yellow-400/40 hover:text-yellow-200 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <ChevronLeft size={15} />
            Previous
          </button>

          <p className="text-xs text-slate-500">
            Page {page} of {totalPages} · {total} products
          </p>

          <button
            type="button"
            onClick={() => setPage((prev) => Math.min(prev + 1, totalPages))}
            disabled={page >= totalPages || loadingProducts}
            className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-white/10 bg-[#070B14] px-3 py-2 text-xs text-slate-200 transition hover:border-yellow-400/40 hover:text-yellow-200 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Next
            <ChevronRight size={15} />
          </button>
        </div>
      </div>

      {imagePreview && (
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
          </div>
        </div>
      )}
    </div>
  );
}
