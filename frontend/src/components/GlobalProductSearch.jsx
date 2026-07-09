import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2, PackageSearch, Search, X } from "lucide-react";
import localProductsApi from "../config/sub_api/product_management_api/local_products_api";

const RAW_API_BASE_URL = String(
  import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api"
).replace(/\/$/, "");
const BACKEND_BASE_URL = RAW_API_BASE_URL.replace(/\/api$/, "");
const EMPTY_IMAGE =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="120" height="120" viewBox="0 0 120 120"><rect width="120" height="120" fill="#111827"/><path d="M32 82h56L72 58 60 72l-8-10z" fill="#475569"/><circle cx="46" cy="44" r="8" fill="#64748b"/><text x="60" y="106" text-anchor="middle" fill="#94a3b8" font-size="10" font-family="Arial">No Image</text></svg>`
  );

function normalizeRows(value) {
  const parsed = value?.data ?? value;
  if (Array.isArray(parsed)) return parsed;
  if (Array.isArray(parsed?.data)) return parsed.data;
  if (Array.isArray(parsed?.products)) return parsed.products;
  if (Array.isArray(parsed?.rows)) return parsed.rows;
  if (Array.isArray(parsed?.items)) return parsed.items;
  if (Array.isArray(parsed?.result)) return parsed.result;
  return [];
}

function parseMaybeJson(value) {
  if (!value || typeof value !== "string") return value;
  const trimmed = value.trim();
  if (!trimmed) return "";
  if (!(trimmed.startsWith("[") || trimmed.startsWith("{"))) return value;
  try {
    return JSON.parse(trimmed);
  } catch {
    return value;
  }
}

function normalizeArray(value) {
  const parsed = parseMaybeJson(value);
  if (!parsed) return [];
  if (Array.isArray(parsed)) return parsed;
  if (typeof parsed === "object") return [parsed];
  return [];
}

function buildImageUrl(value) {
  if (!value) return "";
  const url = String(value).trim();
  if (!url) return "";
  if (
    url.startsWith("http://") ||
    url.startsWith("https://") ||
    url.startsWith("data:") ||
    url.startsWith("blob:")
  ) {
    return url;
  }
  if (url.startsWith("//")) return `https:${url}`;
  if (url.startsWith("/uploads/")) return `${BACKEND_BASE_URL}${url}`;
  if (url.startsWith("uploads/")) return `${BACKEND_BASE_URL}/${url}`;
  if (url.startsWith("/")) return `${BACKEND_BASE_URL}${url}`;
  return `${BACKEND_BASE_URL}/${url.replace(/^\/+/, "")}`;
}

function pickImageUrl(row = {}) {
  const direct =
    row.main_image_url ||
    row.primary_image_url ||
    row.image_url ||
    row.image_path ||
    row.file_url ||
    row.file_path ||
    row.thumbnail_url ||
    row.product_image_url ||
    row.variant_image_url ||
    row.image ||
    row.url ||
    row.path ||
    "";

  if (direct) return buildImageUrl(direct);

  const images = normalizeArray(row.images || row.product_images || row.sub_images);
  const main =
    images.find((image) => Number(image.is_main || image.is_primary || 0) === 1) ||
    images[0];
  return buildImageUrl(
    main?.image_url || main?.url || main?.path || main?.file_url || ""
  );
}

function getProductId(product = {}) {
  return product.id || product.product_id || product.local_product_id || "";
}

function getProductTitle(product = {}) {
  return (
    product.title || product.name || product.product_name || product.product_title || "Untitled Product"
  );
}

function getProductSku(product = {}) {
  return (
    product.sku || product.product_sku || product.local_sku || product.parent_sku || "-"
  );
}

function getVariantTitle(variant = {}, product = {}) {
  return (
    variant.variant_title ||
    variant.variant_name ||
    variant.title ||
    variant.name ||
    variant.product_name ||
    variant.colour_name ||
    variant.color_name ||
    variant.colour ||
    variant.color ||
    getProductTitle(product)
  );
}

function getVariantSku(variant = {}) {
  return (
    variant.variant_sku ||
    variant.sku ||
    variant.child_sku ||
    variant.local_sku ||
    variant.seller_sku ||
    "-"
  );
}

function getVariantId(variant = {}) {
  return variant.id || variant.variant_id || variant.product_variant_id || "";
}

function getVariants(product = {}) {
  return normalizeArray(
    product.variants ||
      product.product_variants ||
      product.variations ||
      product.children ||
      product.items
  ).filter((row) => row && typeof row === "object");
}

function flattenSearchRows(products = []) {
  const rows = [];

  products.forEach((product) => {
    const productId = getProductId(product);
    rows.push({
      type: "Parent",
      productId,
      title: getProductTitle(product),
      sku: getProductSku(product),
      image: pickImageUrl(product),
      path: productId
        ? `/product/local-products/edit/${productId}/basic`
        : "/product/local-products",
    });

    getVariants(product).forEach((variant) => {
      const variantId = getVariantId(variant);
      rows.push({
        type: "Child Variant",
        productId,
        variantId,
        title: getVariantTitle(variant, product),
        sku: getVariantSku(variant),
        image: pickImageUrl(variant) || pickImageUrl(product),
        path: productId
          ? `/product/local-products/edit/${productId}/variants`
          : "/product/local-products",
      });
    });
  });

  return rows.slice(0, 12);
}

export default function GlobalProductSearch() {
  const navigate = useNavigate();
  const wrapperRef = useRef(null);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState([]);

  const cleanQuery = useMemo(() => query.trim(), [query]);

  useEffect(() => {
    if (!cleanQuery || cleanQuery.length < 2) {
      setRows([]);
      setLoading(false);
      return;
    }

    let cancelled = false;
    const timer = window.setTimeout(async () => {
      setLoading(true);
      try {
        const response = await localProductsApi.getProducts({
          search: cleanQuery,
          limit: 10,
        });
        const products = normalizeRows(response);
        if (!cancelled) {
          setRows(flattenSearchRows(products));
          setOpen(true);
        }
      } catch {
        if (!cancelled) setRows([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, 250);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [cleanQuery]);

  useEffect(() => {
    function handleOutside(event) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, []);

  function goTo(row) {
    setOpen(false);
    setQuery("");
    navigate(row.path);
  }

  function clearSearch() {
    setQuery("");
    setRows([]);
    setOpen(false);
  }

  return (
    <div ref={wrapperRef} className="relative w-full">
      <div className="flex h-10 items-center overflow-hidden rounded-xl border border-slate-700 bg-[#0b1220] shadow-inner shadow-black/20 focus-within:border-orange-400">
        <div className="flex h-full w-10 items-center justify-center text-slate-500">
          {loading ? <Loader2 size={15} className="animate-spin" /> : <Search size={15} />}
        </div>

        <input
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setOpen(true);
          }}
          onFocus={() => cleanQuery && setOpen(true)}
          placeholder="Search parent / child SKU, title, variant..."
          className="h-full min-w-0 flex-1 bg-transparent px-1 text-sm font-semibold text-slate-100 outline-none placeholder:text-slate-500"
        />

        {query ? (
          <button
            type="button"
            onClick={clearSearch}
            className="flex h-full w-9 items-center justify-center text-slate-500 transition hover:text-slate-200"
            title="Clear search"
          >
            <X size={15} />
          </button>
        ) : null}
      </div>

      {open && cleanQuery.length >= 2 ? (
        <div className="absolute left-0 right-0 top-12 z-[9998] overflow-hidden rounded-2xl border border-slate-700 bg-[#0f172a] shadow-2xl shadow-black/60">
          <div className="border-b border-slate-800 px-3 py-2 text-[11px] font-black uppercase tracking-wide text-orange-300">
            Local Product Search
          </div>

          {rows.length ? (
            <div className="max-h-[420px] overflow-y-auto py-1">
              {rows.map((row, index) => (
                <button
                  key={`${row.type}-${row.productId}-${row.variantId || "parent"}-${index}`}
                  type="button"
                  onClick={() => goTo(row)}
                  className="flex w-full items-center gap-3 px-3 py-2 text-left transition hover:bg-[#1b2a3a]"
                >
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-white ring-1 ring-slate-700">
                    <img
                      src={row.image || EMPTY_IMAGE}
                      alt={row.title}
                      className="h-full w-full object-contain"
                      onError={(event) => {
                        event.currentTarget.src = EMPTY_IMAGE;
                      }}
                    />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="rounded bg-orange-500/15 px-1.5 py-0.5 text-[10px] font-black text-orange-300">
                        {row.type}
                      </span>
                      <span className="truncate text-xs font-black text-slate-100">
                        {row.sku}
                      </span>
                    </div>
                    <p className="mt-0.5 line-clamp-1 text-xs font-semibold text-slate-400">
                      {row.title}
                    </p>
                  </div>

                  <PackageSearch size={15} className="text-slate-500" />
                </button>
              ))}
            </div>
          ) : (
            <div className="px-4 py-6 text-center text-xs font-semibold text-slate-500">
              {loading ? "Searching..." : "No parent or child products found."}
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}
