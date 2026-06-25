import { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  Eye,
  ImageOff,
  Loader2,
  Package,
  RefreshCw,
  Search,
  X,
  SlidersHorizontal,
} from "lucide-react";
import { darazProductsApi } from "../../../../config/sub_api/daraz_api/daraz_products_api";

function formatDate(value) {
  if (!value) return "-";

  try {
    return new Date(value).toLocaleString();
  } catch {
    return value;
  }
}

function money(value, currency = "LKR") {
  const amount = Number(value || 0);

  return `${currency || "LKR"} ${amount.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function normalizeStatus(status) {
  return String(status || "unknown").toLowerCase().trim();
}

function StatusBadge({ status }) {
  const text = status || "unknown";
  const lower = normalizeStatus(text);

  const className =
    lower === "active" || lower === "live"
      ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
      : lower === "inactive"
      ? "border-slate-500/40 bg-slate-500/10 text-slate-300"
      : lower === "deleted" || lower === "rejected"
      ? "border-red-500/30 bg-red-500/10 text-red-300"
      : lower === "pending" || lower === "draft"
      ? "border-blue-500/30 bg-blue-500/10 text-blue-300"
      : "border-yellow-500/30 bg-yellow-500/10 text-yellow-300";

  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium ${className}`}
    >
      {text}
    </span>
  );
}

function ProductImage({ src, title }) {
  const [failed, setFailed] = useState(false);

  if (!src || failed) {
    return (
      <div className="flex h-12 w-12 items-center justify-center rounded-lg border border-slate-700 bg-slate-900 text-slate-500">
        <ImageOff size={17} />
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={title || "Daraz product"}
      onError={() => setFailed(true)}
      className="h-12 w-12 rounded-lg border border-slate-700 object-cover"
    />
  );
}

const STATUS_TABS = [
  { key: "all", label: "All" },
  { key: "active", label: "Active" },
  { key: "inactive", label: "Inactive" },
  { key: "pending", label: "Pending" },
  { key: "rejected", label: "Rejected" },
  { key: "deleted", label: "Deleted" },
  { key: "others", label: "Others" },
];

export default function DarazProductsPreviewPage() {
  const [accountId, setAccountId] = useState("2");
  const [search, setSearch] = useState("");
  const [statusTab, setStatusTab] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [message, setMessage] = useState("");
  const [selectedProduct, setSelectedProduct] = useState(null);

  const filteredProducts = useMemo(() => {
    if (statusTab === "all") return products;

    if (statusTab === "others") {
      return products.filter((item) => {
        const status = normalizeStatus(item.status);
        return ![
          "active",
          "live",
          "inactive",
          "pending",
          "draft",
          "rejected",
          "deleted",
        ].includes(status);
      });
    }

    return products.filter((item) => {
      const status = normalizeStatus(item.status);

      if (statusTab === "active") {
        return status === "active" || status === "live";
      }

      if (statusTab === "pending") {
        return status === "pending" || status === "draft";
      }

      return status === statusTab;
    });
  }, [products, statusTab]);

  const tabCounts = useMemo(() => {
    const counts = {
      all: products.length,
      active: 0,
      inactive: 0,
      pending: 0,
      rejected: 0,
      deleted: 0,
      others: 0,
    };

    products.forEach((item) => {
      const status = normalizeStatus(item.status);

      if (status === "active" || status === "live") counts.active += 1;
      else if (status === "inactive") counts.inactive += 1;
      else if (status === "pending" || status === "draft") counts.pending += 1;
      else if (status === "rejected") counts.rejected += 1;
      else if (status === "deleted") counts.deleted += 1;
      else counts.others += 1;
    });

    return counts;
  }, [products]);

  async function loadProducts() {
    try {
      setLoading(true);
      setMessage("");

      const res = await darazProductsApi.preview({
        account_id: accountId || undefined,
        search: search || undefined,
        status: statusTab !== "all" && statusTab !== "others" ? statusTab : undefined,
        date_from: dateFrom || undefined,
        date_to: dateTo || undefined,
        limit: 200,
        offset: 0,
      });

      setProducts(res?.data?.data || []);
    } catch (error) {
      setMessage(
        error?.response?.data?.message ||
          error?.message ||
          "Failed to load Daraz products."
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleSyncNow() {
    if (!accountId) {
      setMessage("Daraz account ID is required.");
      return;
    }

    try {
      setSyncing(true);
      setMessage("");

      const res = await darazProductsApi.sync(accountId);
      const data = res?.data?.data;

      setMessage(
        `Sync completed. Found: ${data?.total_found || 0}, Saved: ${
          data?.total_saved || 0
        }, Failed: ${data?.total_failed || 0}`
      );

      await loadProducts();
    } catch (error) {
      setMessage(
        error?.response?.data?.error ||
          error?.response?.data?.message ||
          error?.message ||
          "Daraz sync failed."
      );
    } finally {
      setSyncing(false);
    }
  }

  function clearFilters() {
    setSearch("");
    setDateFrom("");
    setDateTo("");
    setStatusTab("all");
  }

  useEffect(() => {
    loadProducts();
  }, []);

  return (
    <div className="min-h-screen w-full bg-slate-950 p-4 text-slate-100">
      <div className="space-y-4">
        <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4 shadow-sm">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-yellow-500 text-slate-950">
                <Package size={19} />
              </div>

              <div>
                <h1 className="text-lg font-semibold text-white">
                  Daraz Products
                </h1>
                <p className="text-sm text-slate-400">
                  Product table with status tabs, search and date range filters.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <input
                value={accountId}
                onChange={(e) => setAccountId(e.target.value)}
                placeholder="Account ID"
                className="h-9 w-32 rounded-lg border border-slate-700 bg-slate-950 px-3 text-sm text-slate-100 outline-none placeholder:text-slate-500 focus:border-yellow-500"
              />

              <button
                onClick={handleSyncNow}
                disabled={syncing}
                className="inline-flex h-9 items-center gap-2 rounded-lg bg-yellow-500 px-4 text-sm font-semibold text-slate-950 hover:bg-yellow-400 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {syncing ? (
                  <Loader2 size={15} className="animate-spin" />
                ) : (
                  <RefreshCw size={15} />
                )}
                {syncing ? "Syncing..." : "Sync Now"}
              </button>
            </div>
          </div>

          {message && (
            <div className="mt-4 flex items-start gap-2 rounded-xl border border-yellow-500/30 bg-yellow-500/10 px-3 py-2 text-sm text-yellow-200">
              <AlertCircle size={17} className="mt-0.5 shrink-0" />
              <span>{message}</span>
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900/80 shadow-sm">
          <div className="border-b border-slate-800 p-4">
            <div className="flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <SlidersHorizontal size={16} className="text-yellow-400" />
                  <h2 className="text-sm font-semibold text-white">
                    Filter Options
                  </h2>
                </div>

                <p className="mt-1 text-xs text-slate-400">
                  Search by SKU, title, item ID and filter by synced date range.
                </p>
              </div>

              <div className="grid grid-cols-1 gap-2 md:grid-cols-5">
                <div className="flex h-9 min-w-[230px] items-center gap-2 rounded-lg border border-slate-700 bg-slate-950 px-3 md:col-span-2">
                  <Search size={15} className="text-slate-500" />
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") loadProducts();
                    }}
                    placeholder="Search SKU, title, item id..."
                    className="w-full bg-transparent text-sm text-slate-100 outline-none placeholder:text-slate-500"
                  />
                </div>

                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="h-9 rounded-lg border border-slate-700 bg-slate-950 px-3 text-sm text-slate-100 outline-none focus:border-yellow-500"
                />

                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="h-9 rounded-lg border border-slate-700 bg-slate-950 px-3 text-sm text-slate-100 outline-none focus:border-yellow-500"
                />

                <div className="flex gap-2">
                  <button
                    onClick={loadProducts}
                    disabled={loading}
                    className="inline-flex h-9 flex-1 items-center justify-center gap-2 rounded-lg bg-slate-800 px-4 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-60"
                  >
                    {loading ? (
                      <Loader2 size={15} className="animate-spin" />
                    ) : (
                      <Search size={15} />
                    )}
                    Search
                  </button>

                  <button
                    onClick={clearFilters}
                    className="h-9 rounded-lg border border-slate-700 bg-slate-950 px-3 text-sm font-medium text-slate-300 hover:border-red-400 hover:text-red-300"
                  >
                    Clear
                  </button>
                </div>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              {STATUS_TABS.map((tab) => {
                const active = statusTab === tab.key;

                return (
                  <button
                    key={tab.key}
                    onClick={() => setStatusTab(tab.key)}
                    className={`inline-flex h-9 items-center gap-2 rounded-lg border px-3 text-sm font-medium transition ${
                      active
                        ? "border-yellow-500 bg-yellow-500 text-slate-950"
                        : "border-slate-700 bg-slate-950 text-slate-300 hover:border-yellow-500 hover:text-yellow-300"
                    }`}
                  >
                    <span>{tab.label}</span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[11px] ${
                        active
                          ? "bg-slate-950/20 text-slate-950"
                          : "bg-slate-800 text-slate-400"
                      }`}
                    >
                      {tabCounts[tab.key] || 0}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[1200px] text-left text-sm">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-950/70 text-xs font-semibold uppercase tracking-wide text-slate-400">
                  <th className="px-3 py-3">Image</th>
                  <th className="px-3 py-3">Item ID</th>
                  <th className="px-3 py-3">SKU</th>
                  <th className="px-3 py-3">Title</th>
                  <th className="px-3 py-3">Status</th>
                  <th className="px-3 py-3">Price</th>
                  <th className="px-3 py-3">Sale Price</th>
                  <th className="px-3 py-3">Qty</th>
                  <th className="px-3 py-3">Synced</th>
                  <th className="px-3 py-3">Action</th>
                </tr>
              </thead>

              <tbody>
                {filteredProducts.map((item) => (
                  <tr
                    key={item.id}
                    className="border-b border-slate-800 text-slate-300 hover:bg-slate-800/40"
                  >
                    <td className="px-3 py-3">
                      <ProductImage src={item.main_image} title={item.name} />
                    </td>

                    <td className="px-3 py-3 font-medium text-slate-100">
                      {item.daraz_item_id || "-"}
                    </td>

                    <td className="max-w-[180px] px-3 py-3">
                      <span className="break-all text-xs text-slate-400">
                        {item.seller_sku || "-"}
                      </span>
                    </td>

                    <td className="max-w-[380px] px-3 py-3">
                      <div className="line-clamp-2 font-medium text-slate-100">
                        {item.name || "-"}
                      </div>
                      <div className="mt-1 text-xs text-slate-500">
                        Category: {item.primary_category || "-"}
                      </div>
                    </td>

                    <td className="px-3 py-3">
                      <StatusBadge status={item.status} />
                    </td>

                    <td className="px-3 py-3">
                      {money(item.price, item.currency)}
                    </td>

                    <td className="px-3 py-3">
                      {money(item.sale_price, item.currency)}
                    </td>

                    <td className="px-3 py-3">{item.quantity || 0}</td>

                    <td className="px-3 py-3 text-xs text-slate-500">
                      {formatDate(item.last_synced_at)}
                    </td>

                    <td className="px-3 py-3">
                      <button
                        onClick={() => setSelectedProduct(item)}
                        className="inline-flex h-8 items-center gap-1 rounded-lg border border-slate-700 bg-slate-950 px-3 text-xs font-medium text-slate-300 hover:border-yellow-500 hover:text-yellow-300"
                      >
                        <Eye size={14} />
                        View
                      </button>
                    </td>
                  </tr>
                ))}

                {!filteredProducts.length && (
                  <tr>
                    <td
                      className="px-3 py-8 text-center text-slate-500"
                      colSpan="10"
                    >
                      {loading
                        ? "Loading Daraz products..."
                        : "No Daraz products found for this filter."}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {selectedProduct && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
            <div className="max-h-[90vh] w-full max-w-3xl overflow-hidden rounded-2xl border border-slate-800 bg-slate-900 shadow-xl">
              <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3">
                <div>
                  <h3 className="text-base font-semibold text-white">
                    Product Details
                  </h3>
                  <p className="text-xs text-slate-400">
                    Item ID: {selectedProduct.daraz_item_id || "-"}
                  </p>
                </div>

                <button
                  onClick={() => setSelectedProduct(null)}
                  className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-700 bg-slate-950 text-slate-400 hover:border-red-400 hover:text-red-300"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="max-h-[75vh] overflow-y-auto p-4">
                <div className="flex gap-4">
                  <ProductImage
                    src={selectedProduct.main_image}
                    title={selectedProduct.name}
                  />

                  <div>
                    <h4 className="text-sm font-semibold text-white">
                      {selectedProduct.name || "-"}
                    </h4>
                    <p className="mt-1 text-xs text-slate-400">
                      SKU: {selectedProduct.seller_sku || "-"}
                    </p>
                    <div className="mt-2">
                      <StatusBadge status={selectedProduct.status} />
                    </div>
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
                  <div className="rounded-xl border border-slate-800 bg-slate-950 p-3">
                    <p className="text-xs text-slate-500">Price</p>
                    <p className="mt-1 text-sm font-semibold text-white">
                      {money(selectedProduct.price, selectedProduct.currency)}
                    </p>
                  </div>

                  <div className="rounded-xl border border-slate-800 bg-slate-950 p-3">
                    <p className="text-xs text-slate-500">Sale Price</p>
                    <p className="mt-1 text-sm font-semibold text-white">
                      {money(
                        selectedProduct.sale_price,
                        selectedProduct.currency
                      )}
                    </p>
                  </div>

                  <div className="rounded-xl border border-slate-800 bg-slate-950 p-3">
                    <p className="text-xs text-slate-500">Quantity</p>
                    <p className="mt-1 text-sm font-semibold text-white">
                      {selectedProduct.quantity || 0}
                    </p>
                  </div>

                  <div className="rounded-xl border border-slate-800 bg-slate-950 p-3">
                    <p className="text-xs text-slate-500">Last Synced</p>
                    <p className="mt-1 text-sm font-semibold text-white">
                      {formatDate(selectedProduct.last_synced_at)}
                    </p>
                  </div>
                </div>

                <div className="mt-4 rounded-xl border border-slate-800 bg-slate-950 p-3">
                  <p className="text-xs font-medium text-slate-500">
                    Main Image URL
                  </p>
                  <p className="mt-1 break-all text-xs text-slate-300">
                    {selectedProduct.main_image || "-"}
                  </p>
                </div>
              </div>

              <div className="flex justify-end border-t border-slate-800 px-4 py-3">
                <button
                  onClick={() => setSelectedProduct(null)}
                  className="inline-flex h-9 items-center gap-2 rounded-lg bg-yellow-500 px-4 text-sm font-semibold text-slate-950 hover:bg-yellow-400"
                >
                  <CheckCircle2 size={16} />
                  Done
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}