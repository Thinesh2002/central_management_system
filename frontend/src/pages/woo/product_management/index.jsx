import { useEffect, useMemo, useState } from "react";
import {
  Search,
  RefreshCw,
  Loader2,
  Package,
  Eye,
  PlayCircle,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { wooProductApi } from "../../../config/sub_api/woo_api/woo_product_api";
import Loader from "../../../components/common/Loader";

const DETAIL_BASE_PATH = "/product/woo-products";

function extractAccounts(res) {
  const payload = res?.data;

  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.accounts)) return payload.accounts;
  if (Array.isArray(payload?.rows)) return payload.rows;
  if (Array.isArray(payload?.data?.accounts)) return payload.data.accounts;
  if (Array.isArray(payload?.data?.rows)) return payload.data.rows;

  return [];
}

function extractProducts(res) {
  const payload = res?.data;

  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.rows)) return payload.rows;
  if (Array.isArray(payload?.products)) return payload.products;

  return [];
}

function getTotal(res) {
  return Number(res?.data?.total || res?.data?.count || 0);
}

function money(value) {
  if (value === null || value === undefined || value === "") return "-";

  const number = Number(value);

  if (!Number.isFinite(number)) return "-";

  return number.toFixed(2);
}

function formatDate(value) {
  if (!value) return "-";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "-";

  return date.toLocaleString();
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

function cleanImageUrl(value) {
  if (!value || typeof value !== "string") return "";

  let url = value.trim();

  if (!url) return "";

  url = url.replaceAll("\\/", "/");

  if (url.startsWith("//")) return `https:${url}`;

  if (
    url.startsWith("http://") ||
    url.startsWith("https://") ||
    url.startsWith("data:image")
  ) {
    return url;
  }

  return "";
}

function findImageUrl(value, depth = 0) {
  if (!value || depth > 5) return "";

  const parsed = parseJsonSafe(value);

  if (typeof parsed === "string") {
    const direct = cleanImageUrl(parsed);
    if (direct) return direct;

    const parsedAgain = parseJsonSafe(parsed);
    if (parsedAgain !== parsed) return findImageUrl(parsedAgain, depth + 1);

    return "";
  }

  if (Array.isArray(parsed)) {
    for (const item of parsed) {
      const found = findImageUrl(item, depth + 1);
      if (found) return found;
    }

    return "";
  }

  if (typeof parsed === "object") {
    const keys = [
      "image_src",
      "src",
      "url",
      "image",
      "image_url",
      "main_image",
      "main_image_url",
      "featured_image",
      "featured_image_url",
      "thumbnail",
      "thumbnail_url",
      "product_image",
      "product_image_url",
      "images",
      "image_data",
      "image_json",
      "images_json",
      "product_images",
      "woo_images",
    ];

    for (const key of keys) {
      const found = findImageUrl(parsed[key], depth + 1);
      if (found) return found;
    }

    for (const item of Object.values(parsed)) {
      const found = findImageUrl(item, depth + 1);
      if (found) return found;
    }
  }

  return "";
}

function getProductId(product) {
  return (
    product.woo_product_id ||
    product.product_id ||
    product.id ||
    product.local_product_id
  );
}

function getProductImage(product) {
  return findImageUrl({
    dashboard_image: product._dashboard_image_src,
    image_src: product.image_src,
    main_image: product.main_image,
    main_image_url: product.main_image_url,
    featured_image: product.featured_image,
    featured_image_url: product.featured_image_url,
    product_image: product.product_image,
    product_image_url: product.product_image_url,
    image: product.image,
    image_url: product.image_url,
    thumbnail: product.thumbnail,
    thumbnail_url: product.thumbnail_url,
    images: product.images,
    image_data: product.image_data,
    image_json: product.image_json,
    images_json: product.images_json,
    product_images: product.product_images,
    woo_images: product.woo_images,
  });
}

function getProductPrice(product) {
  return money(
    product.price ||
      product.sale_price ||
      product.regular_price ||
      product.current_price ||
      product.woo_price
  );
}

function StockBadge({ value }) {
  const status = String(value || "unknown").toLowerCase();

  const styles = {
    instock: "border-emerald-400/25 bg-emerald-400/10 text-emerald-300",
    outofstock: "border-red-400/25 bg-red-400/10 text-red-300",
    onbackorder: "border-yellow-400/25 bg-yellow-400/10 text-yellow-300",
    unknown: "border-slate-500/25 bg-slate-500/10 text-slate-300",
  };

  return (
    <span
      className={`inline-flex rounded-full border px-2 py-0.5 text-[11px] font-medium ${
        styles[status] || styles.unknown
      }`}
    >
      {status.replaceAll("_", " ")}
    </span>
  );
}

export default function WooProductDashboardPage() {
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

  const totalPages = useMemo(() => {
    return Math.max(Math.ceil(total / limit), 1);
  }, [total, limit]);

  function getDetailLink(product) {
    const accountId = product.account_id || selectedAccountId;
    const productId = getProductId(product);

    if (!accountId || !productId) return "#";

    return `${DETAIL_BASE_PATH}/${accountId}/${productId}`;
  }

  async function loadAccounts() {
    try {
      setLoadingAccounts(true);
      setError("");

      const res = await wooProductApi.getWooAccounts();
      const rows = extractAccounts(res);

      setAccounts(rows);

      if (rows.length) {
        setSelectedAccountId(String(rows[0].id || rows[0].account_id));
      }
    } catch (err) {
      setAccounts([]);
      setError(err?.friendlyMessage || "Failed to load WooCommerce accounts.");
    } finally {
      setLoadingAccounts(false);
    }
  }

  async function hydrateProductImages(rows) {
    const imageResults = await Promise.allSettled(
      rows.map(async (product) => {
        const accountId = product.account_id || selectedAccountId;
        const productId = getProductId(product);

        if (!accountId || !productId) return "";

        const existingImage = getProductImage(product);
        if (existingImage) return existingImage;

        const res = await wooProductApi.getSyncedWooProductDetail(
          accountId,
          productId
        );

        const data = res?.data?.data || {};
        const images = Array.isArray(data.images) ? data.images : [];

        return images?.[0]?.image_src || "";
      })
    );

    return rows.map((product, index) => ({
      ...product,
      _dashboard_image_src:
        imageResults[index]?.status === "fulfilled"
          ? imageResults[index].value
          : "",
    }));
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

      const res = await wooProductApi.getSyncedWooProducts(selectedAccountId, {
        page,
        limit,
        search: appliedSearch || undefined,
      });

      const rows = extractProducts(res);
      const rowsWithImages = await hydrateProductImages(rows);

      setProducts(rowsWithImages);
      setTotal(getTotal(res));
    } catch (err) {
      setProducts([]);
      setTotal(0);
      setError(
        err?.friendlyMessage || "Failed to load synced WooCommerce products."
      );
    } finally {
      setLoadingProducts(false);
    }
  }

  async function handleSyncProducts() {
    if (!selectedAccountId) {
      setError("No WooCommerce account found.");
      return;
    }

    try {
      setSyncing(true);
      setError("");
      setMessage("");

      const res = await wooProductApi.syncWooProducts(selectedAccountId);
      const data = res?.data?.data;

      setMessage(
        data
          ? `Product sync completed. Total: ${
              data.total_records || 0
            }, Success: ${data.success_records || 0}, Failed: ${
              data.failed_records || 0
            }`
          : "WooCommerce product sync completed."
      );

      await loadProducts();
    } catch (err) {
      setError(err?.friendlyMessage || "WooCommerce product sync failed.");
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
          <form
            onSubmit={handleSearchSubmit}
            className="relative w-full md:max-w-lg"
          >
            <Search
              size={15}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"
            />

            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search product title, SKU, Woo ID..."
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
              {syncing ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <PlayCircle size={14} />
              )}
              Sync
            </button>

            <button
              type="button"
              onClick={loadProducts}
              disabled={loadingProducts || !selectedAccountId}
              className="inline-flex cursor-pointer items-center justify-center gap-1.5 rounded-lg border border-white/10 bg-[#070B14] px-3 py-2 text-xs font-medium text-slate-200 transition hover:border-yellow-400/40 hover:text-yellow-200 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <RefreshCw
                size={14}
                className={loadingProducts ? "animate-spin" : ""}
              />
              Refresh
            </button>
          </div>
        </div>

        {loadingProducts || loadingAccounts ? (
          <Loader label="Loading products..." minHeight="0" className="py-16" />
        ) : products.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl border border-white/10 bg-[#070B14] text-slate-500">
              <Package size={26} />
            </div>

            <p className="text-sm font-semibold text-slate-200">
              No synced Woo products found.
            </p>

            <p className="mt-1 max-w-md text-xs text-slate-500">
              Click Sync to load products from WooCommerce.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-xs">
              <thead className="bg-[#070B14] text-[11px] uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-3 py-3">Product</th>
                  <th className="px-3 py-3">Woo ID</th>
                  <th className="px-3 py-3">Type</th>
                  <th className="px-3 py-3">Price</th>
                  <th className="px-3 py-3">Stock</th>
                  <th className="px-3 py-3">Last Sync</th>
                  <th className="px-3 py-3 text-right">Action</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-white/10">
                {products.map((product) => {
                  const imageUrl = getProductImage(product);
                  const detailLink = getDetailLink(product);
                  const productId = getProductId(product);

                  return (
                    <tr
                      key={`${product.account_id || selectedAccountId}-${
                        productId || product.sku
                      }`}
                      className="transition hover:bg-white/[0.03]"
                    >
                      <td className="px-3 py-3">
                        <div className="flex min-w-[390px] items-center gap-3">
                          <a
                            href={detailLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex h-14 w-14 shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded-lg border border-white/10 bg-white"
                            title="Open product detail"
                          >
                            {imageUrl ? (
                              <img
                                src={imageUrl}
                                alt={product.name || "Product"}
                                referrerPolicy="no-referrer"
                                loading="lazy"
                                className="h-full w-full object-contain transition duration-200 hover:scale-105"
                                onError={(e) => {
                                  e.currentTarget.style.display = "none";
                                  const fallback =
                                    e.currentTarget.nextElementSibling;
                                  if (fallback) fallback.style.display = "flex";
                                }}
                              />
                            ) : null}

                            <div
                              className="hidden h-full w-full items-center justify-center bg-[#070B14] text-slate-500"
                              style={{ display: imageUrl ? "none" : "flex" }}
                            >
                              <Package size={18} />
                            </div>
                          </a>

                          <div className="min-w-0">
                            <a
                              href={detailLink}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="line-clamp-2 cursor-pointer text-[12px] font-medium leading-5 text-slate-100 underline-offset-2 transition hover:text-yellow-200 hover:underline"
                              title={product.name || "Unnamed Product"}
                            >
                              {product.name || "Unnamed Product"}
                            </a>

                            <div className="mt-0.5 font-mono text-[11px] text-yellow-200/80">
                              SKU:{" "}
                              {product.sku ? (
                                <a
                                  href={`/order-management/sku-report/${encodeURIComponent(product.sku)}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="cursor-pointer underline decoration-dotted hover:text-yellow-100"
                                  title={`View SKU report for ${product.sku}`}
                                >
                                  {product.sku}
                                </a>
                              ) : (
                                "-"
                              )}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="px-3 py-3 font-mono text-[12px] text-slate-300">
                        {product.woo_product_id || "-"}
                      </td>

                      <td className="px-3 py-3 text-[12px] text-slate-300">
                        {product.product_type || "-"}
                      </td>

                      <td className="px-3 py-3 text-[12px] font-semibold text-slate-100">
                        {getProductPrice(product)}
                      </td>

                      <td className="px-3 py-3">
                        <div className="space-y-1">
                          <StockBadge value={product.stock_status} />
                          <div className="text-[11px] text-slate-500">
                            Qty: {product.stock_quantity ?? "-"}
                          </div>
                        </div>
                      </td>

                      <td className="px-3 py-3 text-[12px] text-slate-400">
                        {formatDate(product.last_synced_at)}
                      </td>

                      <td className="px-3 py-3 text-right">
                        <a
                          href={detailLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-white/10 bg-[#070B14] px-3 py-1.5 text-[11px] font-medium text-slate-200 transition hover:border-yellow-400/40 hover:text-yellow-200"
                        >
                          <Eye size={13} />
                          View
                        </a>
                      </td>
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
    </div>
  );
}