// Dashboard image source fixed: uses product_images table latest main image only.
// Sub images are not used in dashboard.
import { Fragment, useEffect, useMemo, useState } from "react";
import {
  ChevronDown,
  ChevronRight,
  Edit,
  Filter,
  Image as ImageIcon,
  Layers,
  Loader2,
  PackagePlus,
  Search,
  SlidersHorizontal,
  Trash2,
  X,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import localProductsApi from "../../../config/sub_api/product_management_api/local_products_api";
import { getErrorMessage, getName, normalizeList } from "./utils/productSku";

const RAW_API_BASE_URL = String(
  import.meta.env.VITE_API_BASE_URL || "http://localhost:5000"
).replace(/\/$/, "");

const BACKEND_BASE_URL = RAW_API_BASE_URL.replace(/\/api$/, "");

const EMPTY_IMAGE = `data:image/svg+xml;utf8,${encodeURIComponent(`
  <svg xmlns="http://www.w3.org/2000/svg" width="160" height="160" viewBox="0 0 160 160">
    <rect width="160" height="160" rx="20" fill="#111827"/>
    <rect x="34" y="42" width="92" height="76" rx="10" fill="#1f2937" stroke="#334155"/>
    <circle cx="61" cy="66" r="9" fill="#64748b"/>
    <path d="M43 106l28-28 18 18 14-14 22 24" fill="none" stroke="#94a3b8" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"/>
  </svg>
`)}`;

const EMPTY_FILTERS = {
  search: "",
  category_id: "",
  sub_category_id: "",
  model_id: "",
  image_status: "",
  status: "",
};

const VIEW_TABS = [
  { key: "all", label: "All Products" },
  { key: "single", label: "Single Products" },
  { key: "variant", label: "Variant Products" },
  { key: "current", label: "Current Products" },
];

function parseMaybeJson(value) {
  if (value === undefined || value === null || value === "") return value;
  if (typeof value !== "string") return value;

  const trimmed = value.trim();
  if (!trimmed) return "";

  const looksJson =
    (trimmed.startsWith("[") && trimmed.endsWith("]")) ||
    (trimmed.startsWith("{") && trimmed.endsWith("}"));

  if (!looksJson) return value;

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

  if (typeof parsed === "string") {
    const trimmed = parsed.trim();
    if (!trimmed) return [];

    if (trimmed.includes(",") && !trimmed.startsWith("http")) {
      return trimmed
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);
    }

    return [trimmed];
  }

  return [];
}

function normalizeProductList(response) {
  const parsed = response?.data ?? response;

  if (Array.isArray(parsed)) return parsed;

  if (Array.isArray(parsed?.data)) return parsed.data;
  if (Array.isArray(parsed?.products)) return parsed.products;
  if (Array.isArray(parsed?.rows)) return parsed.rows;
  if (Array.isArray(parsed?.items)) return parsed.items;
  if (Array.isArray(parsed?.result)) return parsed.result;

  if (Array.isArray(parsed?.data?.products)) return parsed.data.products;
  if (Array.isArray(parsed?.data?.rows)) return parsed.data.rows;
  if (Array.isArray(parsed?.data?.items)) return parsed.data.items;
  if (Array.isArray(parsed?.data?.result)) return parsed.data.result;

  if (Array.isArray(parsed?.result?.products)) return parsed.result.products;
  if (Array.isArray(parsed?.result?.rows)) return parsed.result.rows;
  if (Array.isArray(parsed?.result?.items)) return parsed.result.items;

  return [];
}

function resolveImageUrl(url) {
  if (!url) return "";

  const cleanUrl = String(url).trim();
  if (!cleanUrl) return "";

  if (
    cleanUrl.startsWith("http://") ||
    cleanUrl.startsWith("https://") ||
    cleanUrl.startsWith("data:") ||
    cleanUrl.startsWith("blob:")
  ) {
    return cleanUrl;
  }

  if (cleanUrl.startsWith("//")) return `https:${cleanUrl}`;

  if (cleanUrl.startsWith("/uploads/")) return `${BACKEND_BASE_URL}${cleanUrl}`;
  if (cleanUrl.startsWith("uploads/")) return `${BACKEND_BASE_URL}/${cleanUrl}`;
  if (cleanUrl.startsWith("/")) return `${BACKEND_BASE_URL}${cleanUrl}`;

  return `${BACKEND_BASE_URL}/${cleanUrl.replace(/^\/+/, "")}`;
}

function addImageCache(url, cacheKey) {
  if (!url || !cacheKey) return url;
  if (url.startsWith("data:") || url.startsWith("blob:")) return url;

  return `${url}${url.includes("?") ? "&" : "?"}v=${encodeURIComponent(cacheKey)}`;
}

function pickImageUrl(value) {
  if (!value) return "";

  const parsed = parseMaybeJson(value);

  if (typeof parsed === "string") {
    return resolveImageUrl(parsed);
  }

  if (!parsed || typeof parsed !== "object") return "";

  const keys = [
    "url",
    "src",
    "image",
    "image_url",
    "imageUrl",
    "image_path",
    "imagePath",
    "path",
    "file_path",
    "filePath",
    "file_url",
    "fileUrl",
    "cdn_url",
    "cdnUrl",
    "thumbnail",
    "thumbnail_url",
    "thumbnailUrl",
    "main_image",
    "main_image_url",
    "mainImageUrl",
    "primary_image",
    "primary_image_url",
    "primaryImageUrl",
    "featured_image",
    "featured_image_url",
    "product_image",
    "product_image_url",
    "first_image_url",
  ];

  for (const key of keys) {
    if (parsed[key]) {
      if (typeof parsed[key] === "object") return pickImageUrl(parsed[key]);
      return resolveImageUrl(parsed[key]);
    }
  }

  return "";
}

function getImageRowUrl(row = {}) {
  const url = pickImageUrl(row);
  const cacheKey =
    row.updated_at ||
    row.updatedAt ||
    row.created_at ||
    row.createdAt ||
    row.id ||
    row.image_id ||
    "";

  return addImageCache(url, cacheKey);
}

function getImageVariantId(row = {}) {
  return row.variant_id ?? row.product_variant_id ?? row.sku_id ?? "";
}

function imageBelongsToParent(row = {}) {
  const variantId = getImageVariantId(row);
  return !variantId || Number(variantId) === 0;
}

function imageBelongsToVariant(row = {}, variantId) {
  return String(getImageVariantId(row)) === String(variantId);
}

function isMainImage(row = {}) {
  const type = String(row.image_type || row.type || "").toLowerCase();

  return (
    Number(row.is_main || row.is_primary || row.is_featured || 0) === 1 ||
    type === "main" ||
    type === "primary"
  );
}

function sortImageRows(images = []) {
  return [...images].sort((a, b) => {
    const mainA = isMainImage(a) ? 0 : 1;
    const mainB = isMainImage(b) ? 0 : 1;

    if (mainA !== mainB) return mainA - mainB;

    const sortA = Number(a.sort_order ?? a.position ?? a.display_order ?? 0);
    const sortB = Number(b.sort_order ?? b.position ?? b.display_order ?? 0);

    if (sortA !== sortB) return sortA - sortB;

    return Number(b.id || 0) - Number(a.id || 0);
  });
}

function getProductImageRows(productImages, productId) {
  return sortImageRows(
    productImages.filter(
      (row) => String(row.product_id) === String(productId) && imageBelongsToParent(row)
    )
  );
}

function getVariantImageRows(productImages, productId, variantId) {
  return sortImageRows(
    productImages.filter(
      (row) =>
        String(row.product_id) === String(productId) &&
        imageBelongsToVariant(row, variantId)
    )
  );
}

function getMainImageFromRows(rows = []) {
  const mainRow = rows.find(isMainImage) || rows[0] || null;
  return mainRow ? getImageRowUrl(mainRow) : "";
}

function getProductVariants(product = {}) {
  const variantSources = [
    product.variants,
    product.variant,
    product.variation,
    product.variations,
    product.product_variants,
    product.productVariants,
    product.variant_list,
    product.variantList,
    product.skus,
    product.sku_list,
    product.skuList,
    product.sku_variants,
    product.skuVariants,
    product.children,
    product.items,
    product.options,
  ];

  for (const source of variantSources) {
    const list = normalizeArray(source).filter(
      (item) => item && typeof item === "object"
    );

    if (list.length) return list;
  }

  return [];
}

function hasProductVariants(product = {}) {
  const variants = getProductVariants(product);

  const variantCount = Number(
    product.variant_count ??
      product.variants_count ??
      product.sku_count ??
      product.variation_count ??
      product.variations_count ??
      product.option_count ??
      0
  );

  const hasVariantValue = Number(
    product.has_variants ?? product.has_variant ?? product.is_variable ?? 0
  );

  const typeText = String(
    product.product_type ||
      product.type ||
      product.product_kind ||
      product.variant_type ||
      ""
  ).toLowerCase();

  return (
    variants.length > 0 ||
    variantCount > 0 ||
    hasVariantValue === 1 ||
    typeText.includes("variant") ||
    typeText.includes("variation") ||
    typeText.includes("variable") ||
    typeText.includes("multiple")
  );
}

function formatPrice(record = {}) {
  const currency = record.currency || "LKR";

  const price =
    record.main_price ??
    record.sale_price ??
    record.price ??
    record.regular_price ??
    record.variant_price ??
    record.selling_price ??
    "0.00";

  return `${currency} ${price}`;
}

function getVariantName(variant = {}) {
  return (
    variant.variant_name ||
    variant.name ||
    variant.title ||
    variant.colour_name ||
    variant.color_name ||
    variant.colour ||
    variant.color ||
    variant.size ||
    variant.option_name ||
    "Variant"
  );
}

function getVariantSku(variant = {}) {
  return (
    variant.sku ||
    variant.seller_sku ||
    variant.variant_sku ||
    variant.local_sku ||
    "-"
  );
}

function getVariantId(variant = {}) {
  return (
    variant.id ||
    variant.variant_id ||
    variant.product_variant_id ||
    variant.local_variant_id ||
    variant.sku_id ||
    ""
  );
}

function getStockValue(record = {}) {
  return (
    record.stock_qty ??
    record.quantity ??
    record.qty ??
    record.stock ??
    record.available_stock ??
    "-"
  );
}

function getProductStatus(product = {}) {
  const rawStatus = String(
    product.status ??
      product.active_status ??
      product.product_status ??
      product.is_active ??
      product.enabled ??
      "current"
  ).toLowerCase();

  if (["0", "false", "inactive", "disabled", "deleted", "draft"].includes(rawStatus)) {
    return "inactive";
  }

  return "current";
}

function getStableProductKey(product = {}, index = 0) {
  return (
    product.id ||
    product.product_id ||
    product.local_product_id ||
    product.sku ||
    product.product_sku ||
    product.slug ||
    `local-product-${index}`
  );
}

function getStableVariantKey(variant = {}, productKey = "product", index = 0) {
  return (
    variant.id ||
    variant.variant_id ||
    variant.product_variant_id ||
    variant.sku ||
    variant.seller_sku ||
    variant.variant_sku ||
    `${productKey}-variant-${index}`
  );
}

function applyTextAndPopupFilters(list, filters, imageRows) {
  const search = filters.search.trim().toLowerCase();

  return list.filter((product) => {
    const productId = product.id || product.product_id || product.local_product_id;
    const variants = getProductVariants(product);
    const mainImage = getMainImageFromRows(getProductImageRows(imageRows, productId));
    const productStatus = getProductStatus(product);

    const text = [
      product.sku,
      product.product_sku,
      product.local_sku,
      product.title,
      product.name,
      ...variants.flatMap((variant) => [
        variant.sku,
        variant.seller_sku,
        variant.variant_sku,
        variant.local_sku,
        variant.title,
        variant.name,
      ]),
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    const categoryOk =
      !filters.category_id ||
      String(product.category_id) === String(filters.category_id);

    const subCategoryOk =
      !filters.sub_category_id ||
      String(product.sub_category_id) === String(filters.sub_category_id);

    const modelOk =
      !filters.model_id || String(product.model_id) === String(filters.model_id);

    const imageOk =
      !filters.image_status ||
      (filters.image_status === "with_image" && Boolean(mainImage)) ||
      (filters.image_status === "no_image" && !mainImage);

    const statusOk = !filters.status || filters.status === productStatus;

    return (
      (!search || text.includes(search)) &&
      categoryOk &&
      subCategoryOk &&
      modelOk &&
      imageOk &&
      statusOk
    );
  });
}

function applyViewFilter(list, view) {
  if (view === "single") return list.filter((product) => !hasProductVariants(product));
  if (view === "variant") return list.filter((product) => hasProductVariants(product));
  if (view === "current") return list.filter((product) => getProductStatus(product) === "current");
  return list;
}

export default function LocalProductsDashboard() {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(false);
  const [products, setProducts] = useState([]);
  const [productImages, setProductImages] = useState([]);
  const [categories, setCategories] = useState([]);
  const [subCategories, setSubCategories] = useState([]);
  const [models, setModels] = useState([]);
  const [expandedRows, setExpandedRows] = useState({});
  const [imagePreview, setImagePreview] = useState(null);
  const [filterModalOpen, setFilterModalOpen] = useState(false);
  const [activeView, setActiveView] = useState("all");
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [draftFilters, setDraftFilters] = useState(EMPTY_FILTERS);
  const [draftView, setDraftView] = useState("all");

  async function loadData() {
    setLoading(true);

    try {
      const [productRes, imageRes, categoryRes, subCategoryRes, modelRes] =
        await Promise.all([
          localProductsApi.getProducts(),
          localProductsApi.getImages().catch(() => ({ data: [] })),
          localProductsApi.getCategories().catch(() => []),
          localProductsApi.getSubCategories().catch(() => []),
          localProductsApi.getProductModels().catch(() => []),
        ]);

      setProducts(normalizeProductList(productRes));
      setProductImages(normalizeList(imageRes));
      setCategories(normalizeList(categoryRes));
      setSubCategories(normalizeList(subCategoryRes));
      setModels(normalizeList(modelRes));
    } catch (error) {
      alert(getErrorMessage(error, "Unable to load local products."));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  const baseFilteredProducts = useMemo(() => {
    return applyTextAndPopupFilters(products, filters, productImages);
  }, [products, filters, productImages]);

  const filteredProducts = useMemo(() => {
    return applyViewFilter(baseFilteredProducts, activeView);
  }, [baseFilteredProducts, activeView]);

  const tabCounts = useMemo(() => {
    return VIEW_TABS.reduce((counts, tab) => {
      counts[tab.key] = applyViewFilter(baseFilteredProducts, tab.key).length;
      return counts;
    }, {});
  }, [baseFilteredProducts]);

  const activePopupFilterCount = useMemo(() => {
    return [
      filters.category_id,
      filters.sub_category_id,
      filters.model_id,
      filters.image_status,
      filters.status,
    ].filter(Boolean).length;
  }, [filters]);

  const visibleSubCategories = useMemo(() => {
    return subCategories.filter(
      (item) =>
        !draftFilters.category_id ||
        String(item.category_id) === String(draftFilters.category_id)
    );
  }, [subCategories, draftFilters.category_id]);

  async function handleDelete(product) {
    const productId = product.id || product.product_id || product.local_product_id;

    if (!productId) {
      alert("Product ID missing. Cannot delete this product.");
      return;
    }

    const confirmed = window.confirm(
      `Delete product ${product.sku || product.product_sku || product.title || productId}?`
    );

    if (!confirmed) return;

    try {
      await localProductsApi.deleteProduct(productId);
      await loadData();
    } catch (error) {
      alert(getErrorMessage(error, "Unable to delete product."));
    }
  }

  function toggleExpanded(productKey) {
    setExpandedRows((prev) => ({
      ...prev,
      [productKey]: !prev[productKey],
    }));
  }

  function goToProductSection(productId, section) {
    if (!productId) {
      alert("Product ID missing. Cannot open this page.");
      return;
    }

    navigate(`/product/local-products/edit/${productId}/${section}`);
  }

  function openFilterModal() {
    setDraftFilters(filters);
    setDraftView(activeView);
    setFilterModalOpen(true);
  }

  function applyFilters() {
    setFilters(draftFilters);
    setActiveView(draftView);
    setFilterModalOpen(false);
  }

  function clearAllFilters() {
    setFilters(EMPTY_FILTERS);
    setDraftFilters(EMPTY_FILTERS);
    setActiveView("all");
    setDraftView("all");
  }

  return (
    <div className="min-h-screen bg-[#070b16] p-2 text-slate-100 lg:p-3">
      <div className="mx-auto max-w-[1680px] space-y-3">
        <div className="flex items-center justify-end rounded-xl border border-slate-800 bg-[#101827] px-3 py-2 shadow-lg shadow-black/10">
          <button
            onClick={() => navigate("/product/local-products/create")}
            className="inline-flex h-9 cursor-pointer items-center justify-center gap-2 rounded-lg bg-orange-500 px-4 text-sm font-black text-white transition hover:bg-orange-400"
          >
            <PackagePlus size={16} />
            Add Product
          </button>
        </div>

        <div className="overflow-hidden rounded-xl border border-slate-800 bg-[#101827] shadow-lg shadow-black/10">
          <div className="border-b border-orange-500/20 bg-orange-500/10 px-3 py-2">
            <h3 className="text-sm font-black text-orange-300">Filter Products</h3>
          </div>

          <div className="px-3 py-3">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500">
                Showing <b className="text-white">{filteredProducts.length}</b> of{" "}
                <b className="text-white">{products.length}</b>
              </span>
            </div>

            <div className="grid grid-cols-1 gap-2 lg:grid-cols-[1fr_auto_auto] lg:items-center">
              <label className="relative block">
                <Search
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-orange-400"
                  size={17}
                />
                <input
                  value={filters.search}
                  onChange={(event) =>
                    setFilters((prev) => ({ ...prev, search: event.target.value }))
                  }
                  placeholder="Filter by title or SKU"
                  className="h-10 w-full rounded-lg border border-slate-800 bg-[#0a101c] py-2 pl-10 pr-3 text-[13px] font-semibold text-slate-100 outline-none placeholder:text-slate-500 focus:border-orange-400"
                />
              </label>

              <button
                type="button"
                onClick={openFilterModal}
                className="inline-flex h-10 cursor-pointer items-center justify-center gap-2 rounded-lg bg-orange-500 px-4 text-sm font-black text-white transition hover:bg-orange-400"
              >
                <Filter size={16} />
                Filters
                {activePopupFilterCount > 0 && (
                  <span className="rounded-full bg-white/20 px-2 py-0.5 text-[11px]">
                    {activePopupFilterCount}
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={clearAllFilters}
                className="inline-flex h-10 cursor-pointer items-center justify-center rounded-lg bg-slate-900 px-4 text-sm font-bold text-slate-300 transition hover:bg-slate-800 hover:text-white"
              >
                Clear
              </button>
            </div>
          </div>
        </div>

        <div className="overflow-hidden rounded-xl border border-slate-800 bg-[#0b1220] shadow-lg shadow-black/10">
          <div className="border-b border-slate-800 bg-[#111827] px-3 py-2">
            <h3 className="text-sm font-black text-slate-100">Product Tabs</h3>
          </div>

          <div className="flex flex-col gap-2 px-3 pt-2 sm:flex-row sm:items-end sm:justify-between">
            <div className="flex flex-wrap items-end gap-6">
              {VIEW_TABS.map((tab) => {
                const isActive = activeView === tab.key;

                return (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => setActiveView(tab.key)}
                    className={`group inline-flex h-11 cursor-pointer items-center gap-2 border-b-2 px-1 text-[13px] font-bold transition ${
                      isActive
                        ? "border-orange-400 text-orange-300"
                        : "border-transparent text-slate-400 hover:border-slate-500 hover:text-white"
                    }`}
                  >
                    <span>{tab.label}</span>
                    <span
                      className={`text-[11px] font-black transition ${
                        isActive
                          ? "text-orange-200"
                          : "text-slate-500 group-hover:text-slate-300"
                      }`}
                    >
                      {tabCounts[tab.key] || 0}
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="flex items-center justify-between gap-3 pb-2 text-xs font-semibold text-slate-400 sm:justify-end">
              {loading && (
                <span className="inline-flex items-center gap-2 text-orange-300">
                  <Loader2 size={14} className="animate-spin" />
                  Loading products...
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="overflow-hidden rounded-xl border border-slate-800 bg-[#101827] shadow-2xl shadow-black/20">
          <div className="overflow-x-auto">
            <table className="min-w-full text-[13px]">
              <thead className="border-b border-slate-800 bg-[#111827] text-left text-[11px] font-black uppercase tracking-wide text-slate-400">
                <tr>
                  <th className="w-[54px] px-3 py-3">&gt;</th>
                  <th className="min-w-[360px] px-3 py-3">Image / Details</th>
                  <th className="min-w-[500px] px-3 py-3">Product Title</th>
                  <th className="min-w-[210px] px-3 py-3">SKU</th>
                  <th className="w-[140px] px-3 py-3">Type</th>
                  <th className="w-[150px] px-3 py-3 text-right">Actions</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-800 bg-[#0b1220]">
                {loading ? (
                  <tr>
                    <td colSpan="6" className="px-3 py-14 text-center text-slate-400">
                      <div className="flex flex-col items-center justify-center gap-3">
                        <Loader2 size={26} className="animate-spin text-orange-400" />
                        <span className="font-bold">Loading products...</span>
                      </div>
                    </td>
                  </tr>
                ) : filteredProducts.length ? (
                  filteredProducts.map((product, productIndex) => {
                    const productKey = getStableProductKey(product, productIndex);
                    const productId =
                      product.id || product.product_id || product.local_product_id;

                    const category = categories.find(
                      (item) => String(item.id) === String(product.category_id)
                    );

                    const subCategory = subCategories.find(
                      (item) => String(item.id) === String(product.sub_category_id)
                    );

                    const model = models.find(
                      (item) => String(item.id) === String(product.model_id)
                    );

                    const parentImageRows = getProductImageRows(productImages, productId);
                    const primaryImage = getMainImageFromRows(parentImageRows) || EMPTY_IMAGE;
                    const variants = getProductVariants(product);
                    const hasVariants = hasProductVariants(product);
                    const isExpanded = Boolean(expandedRows[productKey]);
                    const status = getProductStatus(product);

                    return (
                      <Fragment key={productKey}>
                        <tr className="transition hover:bg-[#111b2b]">
                          <td className="px-3 py-3 align-top">
                            <button
                              type="button"
                              onClick={() => hasVariants && toggleExpanded(productKey)}
                              disabled={!hasVariants}
                              className={`mt-4 inline-flex h-8 w-8 items-center justify-center transition ${
                                hasVariants
                                  ? "cursor-pointer text-orange-300 hover:text-orange-200"
                                  : "cursor-default text-slate-700"
                              }`}
                              title={hasVariants ? "Show variants" : "No variants"}
                            >
                              {hasVariants ? (
                                isExpanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />
                              ) : (
                                <span className="text-slate-700">•</span>
                              )}
                            </button>
                          </td>

                          <td className="min-w-[360px] px-3 py-3 align-top">
                            <div className="flex items-start gap-3">
                              <button
                                type="button"
                                onClick={() =>
                                  setImagePreview({
                                    title:
                                      product.title ||
                                      product.name ||
                                      product.sku ||
                                      "Product Image",
                                    image: primaryImage,
                                  })
                                }
                                className="group relative h-20 w-20 shrink-0 cursor-pointer overflow-hidden rounded-xl bg-transparent transition duration-300 hover:shadow-[0_0_24px_rgba(249,115,22,0.42)]"
                                title="View product main image"
                              >
                                <img
                                  src={primaryImage}
                                  alt={product.title || product.name || product.sku || "Product"}
                                  className="h-full w-full object-contain transition duration-300 group-hover:scale-110"
                                  onError={(event) => {
                                    event.currentTarget.src = EMPTY_IMAGE;
                                  }}
                                />
                              </button>

                              <div className="min-w-0 flex-1 space-y-1 text-xs">
                                <p>
                                  <span className="font-semibold text-slate-500">ID:</span>{" "}
                                  <span className="text-slate-300">{productId || "-"}</span>
                                </p>
                                <p className="truncate">
                                  <span className="font-semibold text-slate-500">Slug:</span>{" "}
                                  <span className="text-slate-400">{product.slug || "-"}</span>
                                </p>
                                <p className="truncate">
                                  <span className="font-semibold text-slate-500">Category:</span>{" "}
                                  <span className="font-bold text-slate-200">
                                    {getName(category) || "-"}
                                  </span>
                                </p>
                                <p className="truncate">
                                  <span className="font-semibold text-slate-500">Sub Category:</span>{" "}
                                  <span className="text-slate-300">
                                    {getName(subCategory) || "-"}
                                  </span>
                                </p>
                                <p className="truncate">
                                  <span className="font-semibold text-slate-500">Model:</span>{" "}
                                  <span className="text-slate-300">
                                    {getName(model) || "-"}
                                  </span>
                                </p>
                              </div>
                            </div>
                          </td>

                          <td className="min-w-[500px] px-3 py-3 align-top">
                            <button
                              onClick={() => goToProductSection(productId, "basic")}
                              className="line-clamp-2 cursor-pointer text-left text-[13px] font-bold leading-5 text-slate-100 underline-offset-4 hover:text-orange-300 hover:underline"
                            >
                              {product.title || product.name || "Untitled Product"}
                            </button>
                          </td>

                          <td className="min-w-[210px] px-3 py-3 align-top">
                            <p className="font-black text-slate-100">
                              {product.sku || product.product_sku || "-"}
                            </p>
                          </td>

                          <td className="px-3 py-3 align-top">
                            <span
                              className={`inline-flex rounded-full px-3 py-1 text-xs font-black ring-1 ${
                                hasVariants
                                  ? "bg-violet-500/15 text-violet-200 ring-violet-400/20"
                                  : "bg-slate-800 text-slate-200 ring-slate-700"
                              }`}
                            >
                              {hasVariants ? `Variant (${variants.length || "-"})` : "Single"}
                            </span>
                          </td>

                          <td className="px-3 py-3 align-top">
                            <div className="flex justify-end gap-3">
                              <button
                                onClick={() => goToProductSection(productId, "basic")}
                                className="inline-flex h-8 w-8 cursor-pointer items-center justify-center text-orange-300 transition hover:text-orange-200"
                                title="Edit product"
                              >
                                <Edit size={17} />
                              </button>

                              <button
                                onClick={() => goToProductSection(productId, "variants")}
                                className="inline-flex h-8 w-8 cursor-pointer items-center justify-center text-violet-300 transition hover:text-violet-200"
                                title="Variant setup"
                              >
                                <Layers size={17} />
                              </button>

                              <button
                                onClick={() => handleDelete(product)}
                                className="inline-flex h-8 w-8 cursor-pointer items-center justify-center text-rose-300 transition hover:text-rose-200"
                                title="Delete product"
                              >
                                <Trash2 size={17} />
                              </button>
                            </div>
                          </td>
                        </tr>

                        {isExpanded && hasVariants && (
                          <tr>
                            <td colSpan="6" className="bg-[#070d18] px-3 py-3">
                              {variants.length ? (
                                <div className="ml-0 overflow-hidden rounded-xl border border-slate-800 bg-[#0b1220] lg:ml-12">
                                  <div className="flex items-center gap-2 border-b border-slate-800 bg-[#111827] px-3 py-2 text-xs font-black uppercase tracking-wide text-slate-400">
                                    <Layers size={14} className="text-violet-300" />
                                    Child SKU Variants
                                  </div>

                                  <div className="overflow-x-auto">
                                    <table className="min-w-full text-[12px]">
                                      <thead className="bg-slate-950/70 text-left text-[10px] uppercase tracking-wide text-slate-500">
                                        <tr>
                                          <th className="px-3 py-2">Image</th>
                                          <th className="px-3 py-2">Variant</th>
                                          <th className="px-3 py-2">SKU</th>
                                          <th className="px-3 py-2">Stock</th>
                                          <th className="px-3 py-2">Price</th>
                                          <th className="px-3 py-2">Status</th>
                                        </tr>
                                      </thead>

                                      <tbody className="divide-y divide-slate-800">
                                        {variants.map((variant, index) => {
                                          const variantId = getVariantId(variant);
                                          const variantRows = getVariantImageRows(
                                            productImages,
                                            productId,
                                            variantId
                                          );

                                          // Dashboard child row uses only child main image.
                                          // No sub images and no parent fallback.
                                          const variantImage =
                                            getMainImageFromRows(variantRows) || EMPTY_IMAGE;

                                          return (
                                            <tr
                                              key={getStableVariantKey(variant, productKey, index)}
                                              className="hover:bg-slate-900/70"
                                            >
                                              <td className="px-3 py-2">
                                                <button
                                                  type="button"
                                                  onClick={() =>
                                                    setImagePreview({
                                                      title: getVariantName(variant),
                                                      image: variantImage,
                                                    })
                                                  }
                                                  className="group h-14 w-14 cursor-pointer overflow-hidden rounded-lg border border-slate-700 bg-slate-950 transition duration-300 hover:border-orange-400 hover:shadow-[0_0_18px_rgba(249,115,22,0.38)]"
                                                  title="View child SKU main image"
                                                >
                                                  <img
                                                    src={variantImage}
                                                    alt={getVariantName(variant)}
                                                    className="h-full w-full object-contain p-1 transition duration-300 group-hover:scale-110"
                                                    onError={(event) => {
                                                      event.currentTarget.src = EMPTY_IMAGE;
                                                    }}
                                                  />
                                                </button>
                                              </td>
                                              <td className="max-w-[320px] px-3 py-2 font-bold text-slate-100">
                                                <span className="line-clamp-2">{getVariantName(variant)}</span>
                                              </td>
                                              <td className="px-3 py-2 font-bold text-slate-300">
                                                {getVariantSku(variant)}
                                              </td>
                                              <td className="px-3 py-2 text-slate-300">
                                                {getStockValue(variant)}
                                              </td>
                                              <td className="px-3 py-2 font-black text-orange-300">
                                                {formatPrice({ ...product, ...variant })}
                                              </td>
                                              <td className="px-3 py-2 text-slate-300">
                                                {variant.status || variant.active_status || "-"}
                                              </td>
                                            </tr>
                                          );
                                        })}
                                      </tbody>
                                    </table>
                                  </div>
                                </div>
                              ) : (
                                <div className="ml-0 rounded-xl border border-dashed border-slate-700 bg-[#0b1220] p-5 text-sm text-slate-400 lg:ml-12">
                                  Variant details are not included in this product response.
                                </div>
                              )}
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan="6" className="px-3 py-14 text-center text-slate-500">
                      <div className="flex flex-col items-center justify-center gap-3">
                        <ImageIcon size={30} className="text-slate-700" />
                        <div>
                          <p className="font-bold text-slate-400">No products found.</p>
                          <p className="text-xs text-slate-600">
                            Change search, tab or filter options.
                          </p>
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {filterModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm"
          onClick={() => setFilterModalOpen(false)}
        >
          <div
            className="w-full max-w-4xl overflow-hidden rounded-2xl border border-slate-700 bg-[#1b2b42] shadow-2xl shadow-black/40"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between bg-orange-500 px-5 py-4 text-white">
              <div className="flex items-center gap-3">
                <SlidersHorizontal size={20} />
                <div>
                  <h3 className="text-base font-black">Product Filters</h3>
                  <p className="text-xs font-semibold text-orange-50/80">
                    Category, product type, model, image and status filters
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setFilterModalOpen(false)}
                className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-full bg-white/20 text-white transition hover:bg-white/30"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-5 p-5">
              <div>
                <p className="mb-2 text-xs font-black uppercase tracking-wide text-slate-300">
                  Product Type
                </p>
                <div className="flex flex-wrap items-end gap-6 border-b border-slate-700">
                  {VIEW_TABS.map((tab) => {
                    const isActive = draftView === tab.key;

                    return (
                      <button
                        key={tab.key}
                        type="button"
                        onClick={() => setDraftView(tab.key)}
                        className={`group inline-flex h-10 cursor-pointer items-center gap-2 border-b-2 px-1 text-sm font-black transition ${
                          isActive
                            ? "border-orange-400 text-orange-300"
                            : "border-transparent text-slate-400 hover:border-slate-500 hover:text-white"
                        }`}
                      >
                        <span>{tab.label}</span>
                        <span
                          className={`text-[11px] font-black transition ${
                            isActive
                              ? "text-orange-200"
                              : "text-slate-500 group-hover:text-slate-300"
                          }`}
                        >
                          {tabCounts[tab.key] || 0}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
                <label className="block">
                  <span className="mb-1 block text-xs font-black uppercase tracking-wide text-slate-300">
                    Category
                  </span>
                  <select
                    value={draftFilters.category_id}
                    onChange={(event) =>
                      setDraftFilters((prev) => ({
                        ...prev,
                        category_id: event.target.value,
                        sub_category_id: "",
                      }))
                    }
                    className="h-11 w-full rounded-xl border border-slate-600 bg-[#0b1220] px-3 text-sm font-semibold text-slate-100 outline-none focus:border-orange-400"
                  >
                    <option value="">All categories</option>
                    {categories.map((item, index) => (
                      <option key={item.id || `category-${index}`} value={item.id}>
                        {getName(item)}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block">
                  <span className="mb-1 block text-xs font-black uppercase tracking-wide text-slate-300">
                    Sub Category
                  </span>
                  <select
                    value={draftFilters.sub_category_id}
                    onChange={(event) =>
                      setDraftFilters((prev) => ({
                        ...prev,
                        sub_category_id: event.target.value,
                      }))
                    }
                    className="h-11 w-full rounded-xl border border-slate-600 bg-[#0b1220] px-3 text-sm font-semibold text-slate-100 outline-none focus:border-orange-400"
                  >
                    <option value="">All sub categories</option>
                    {visibleSubCategories.map((item, index) => (
                      <option key={item.id || `sub-category-${index}`} value={item.id}>
                        {getName(item)}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block">
                  <span className="mb-1 block text-xs font-black uppercase tracking-wide text-slate-300">
                    Model
                  </span>
                  <select
                    value={draftFilters.model_id}
                    onChange={(event) =>
                      setDraftFilters((prev) => ({
                        ...prev,
                        model_id: event.target.value,
                      }))
                    }
                    className="h-11 w-full rounded-xl border border-slate-600 bg-[#0b1220] px-3 text-sm font-semibold text-slate-100 outline-none focus:border-orange-400"
                  >
                    <option value="">All models</option>
                    {models.map((item, index) => (
                      <option key={item.id || `model-${index}`} value={item.id}>
                        {getName(item)}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block">
                  <span className="mb-1 block text-xs font-black uppercase tracking-wide text-slate-300">
                    Image Status
                  </span>
                  <select
                    value={draftFilters.image_status}
                    onChange={(event) =>
                      setDraftFilters((prev) => ({
                        ...prev,
                        image_status: event.target.value,
                      }))
                    }
                    className="h-11 w-full rounded-xl border border-slate-600 bg-[#0b1220] px-3 text-sm font-semibold text-slate-100 outline-none focus:border-orange-400"
                  >
                    <option value="">All image status</option>
                    <option value="with_image">With image</option>
                    <option value="no_image">No image</option>
                  </select>
                </label>

                <label className="block">
                  <span className="mb-1 block text-xs font-black uppercase tracking-wide text-slate-300">
                    Product Status
                  </span>
                  <select
                    value={draftFilters.status}
                    onChange={(event) =>
                      setDraftFilters((prev) => ({
                        ...prev,
                        status: event.target.value,
                      }))
                    }
                    className="h-11 w-full rounded-xl border border-slate-600 bg-[#0b1220] px-3 text-sm font-semibold text-slate-100 outline-none focus:border-orange-400"
                  >
                    <option value="">All status</option>
                    <option value="current">Current</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </label>
              </div>
            </div>

            <div className="flex flex-col gap-2 border-t border-slate-700 bg-[#17253a] px-5 py-4 sm:flex-row sm:items-center sm:justify-end">
              <button
                type="button"
                onClick={() => {
                  setDraftFilters(EMPTY_FILTERS);
                  setDraftView("all");
                }}
                className="inline-flex h-10 cursor-pointer items-center justify-center rounded-xl border border-slate-600 bg-[#0b1220] px-5 text-sm font-black text-slate-300 transition hover:text-white"
              >
                Clear Filters
              </button>

              <button
                type="button"
                onClick={() => setFilterModalOpen(false)}
                className="inline-flex h-10 cursor-pointer items-center justify-center rounded-xl border border-slate-600 bg-[#22344d] px-5 text-sm font-black text-white transition hover:bg-[#2a405d]"
              >
                Close
              </button>

              <button
                type="button"
                onClick={applyFilters}
                className="inline-flex h-10 cursor-pointer items-center justify-center rounded-xl bg-orange-500 px-6 text-sm font-black text-white transition hover:bg-orange-400"
              >
                Apply Filters
              </button>
            </div>
          </div>
        </div>
      )}

      {imagePreview && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
          onClick={() => setImagePreview(null)}
        >
          <div
            className="flex aspect-square w-[min(92vw,680px)] max-h-[90vh] max-w-[90vh] flex-col overflow-hidden rounded-2xl border border-slate-700 bg-[#1b2b42] shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex shrink-0 items-center justify-between bg-violet-600 px-5 py-4 text-white">
              <div className="flex items-center gap-3">
                <ImageIcon size={20} />
                <div>
                  <h3 className="text-base font-black">Product Image</h3>
                  <p className="text-xs font-semibold text-violet-50/80">
                    Main image only
                  </p>
                </div>
              </div>

              <button
                onClick={() => setImagePreview(null)}
                className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-full bg-white/20 text-white transition hover:bg-white/30"
              >
                <X size={18} />
              </button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto p-4">
              <div className="aspect-square overflow-hidden rounded-xl border border-slate-700 bg-white">
                <img
                  src={imagePreview.image || EMPTY_IMAGE}
                  alt={imagePreview.title || "Product"}
                  className="h-full w-full object-contain p-3"
                  onError={(event) => {
                    event.currentTarget.src = EMPTY_IMAGE;
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
