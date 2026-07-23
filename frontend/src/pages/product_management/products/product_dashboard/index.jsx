import { useEffect, useMemo, useState } from "react";
import { Layers, Plus } from "lucide-react";
import localProductsApi from "../../../../config/sub_api/product_management_api/local_products_api";
import { usePageOverlay } from "../../../../components/common/page_overlay/PageOverlayProvider";
import { getErrorMessage, getName, normalizeList } from "./../utils/productSku";
import FilterModal from "./components/FilterModal";
import ImagePreviewModal from "./components/ImagePreviewModal";
import AddVariationModal from "./components/AddVariationModal";
import ProductFilterBar from "./components/ProductFilterBar";
import ProductsTable from "./components/ProductsTable";
import { EMPTY_FILTERS, VIEW_TABS } from "./constants/localProductsDashboardConstants";
import {
  applyTextAndPopupFilters,
  applyViewFilter,
  getStableProductKey,
  normalizeProductList,
} from "./utils/localProductsTableHelpers";
import { useToast } from "../../../../components/common/toast/ToastProvider";
import { useConfirm } from "../../../../components/common/confirm_modal/ConfirmProvider";
import ExportCsvModal from "../../../../components/common/export/ExportCsvModal";
import { exportRowsAsCsv } from "../../../../utils/csvExport";

function toNumber(value) {
  const number = Number(String(value ?? "").replace(/[^\d.-]/g, ""));
  return Number.isFinite(number) ? number : 0;
}

function clean(value) {
  return String(value ?? "").trim();
}

function normalizeRows(value) {
  if (Array.isArray(value)) return value;
  if (Array.isArray(value?.data)) return value.data;
  if (Array.isArray(value?.rows)) return value.rows;
  if (Array.isArray(value?.items)) return value.items;
  return [];
}

function sameSku(left, right) {
  const leftValue = clean(left).toLowerCase();
  const rightValue = clean(right).toLowerCase();
  return Boolean(leftValue && rightValue && leftValue === rightValue);
}

function getProductSku(product = {}) {
  return clean(
    product.sku ||
      product.product_sku ||
      product.local_sku ||
      product.seller_sku ||
      product.parent_sku ||
      product.main_sku ||
      ""
  );
}

function getVariantSku(row = {}) {
  return clean(
    row.sku ||
      row.variant_sku ||
      row.product_sku ||
      row.local_sku ||
      row.seller_sku ||
      ""
  );
}

function getInventorySku(row = {}) {
  return clean(
    row.sku ||
      row.product_sku ||
      row.local_sku ||
      row.seller_sku ||
      row.variant_sku ||
      ""
  );
}

function getProductVariants(product = {}) {
  return normalizeRows(
    product.variants ||
      product.product_variants ||
      product.variant_rows ||
      product.variations ||
      product.product_variations ||
      product.variation_rows
  );
}

function getProductInventorySkus(product = {}) {
  const skus = [
    getProductSku(product),
    ...getProductVariants(product).map((variant) => getVariantSku(variant)),
  ];

  return new Set(
    skus
      .map((sku) => clean(sku).toLowerCase())
      .filter(Boolean)
  );
}

function uniqueRows(rows = []) {
  const map = new Map();

  rows.forEach((row, index) => {
    const id = clean(row.id || row.inventory_id);
    const sku = getInventorySku(row).toLowerCase();
    const key = id || `${sku}-${index}`;

    if (!key) return;

    map.set(key, row);
  });

  return Array.from(map.values());
}

function getProductPrice(product = {}) {
  return toNumber(
    product.price_summary?.min_price ??
      product.main_price ??
      product.sale_price ??
      product.price ??
      0
  );
}

function getPriceSku(row = {}) {
  return clean(
    row.sku ||
      row.variant_sku ||
      row.product_sku ||
      row.local_sku ||
      row.seller_sku ||
      ""
  );
}

function getPriceValue(row = {}) {
  return toNumber(row.local_selling_price ?? row.sale_price ?? row.price ?? 0);
}

function money(value) {
  return Number(value).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function isVariableProduct(product = {}) {
  return (
    Number(product.has_variants) === 1 ||
    String(product.product_type || "").toLowerCase() === "variable" ||
    getProductVariants(product).length > 0
  );
}

function getPriceSummary(rows = [], currency = "LKR") {
  const prices = rows.map(getPriceValue).filter((value) => value > 0);

  if (!prices.length) {
    return {
      has_price: false,
      min_price: null,
      max_price: null,
      price_text: "-",
    };
  }

  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);

  return {
    has_price: true,
    min_price: minPrice,
    max_price: maxPrice,
    price_text:
      minPrice === maxPrice
        ? `${currency} ${money(minPrice)}`
        : `${currency} ${money(minPrice)} - ${money(maxPrice)}`,
  };
}

function uniquePriceRows(rows = []) {
  const map = new Map();

  rows.forEach((row, index) => {
    const sku = getPriceSku(row).toLowerCase();
    const key = row.id || `${sku}-${index}`;

    if (!key) return;

    map.set(key, row);
  });

  return Array.from(map.values());
}

function mergeProductsWithPrices(products = [], priceRows = []) {
  const cleanPriceRows = uniquePriceRows(priceRows);

  return products.map((product) => {
    const productSku = getProductSku(product);
    const currency = product.currency || product.currency_code || "LKR";
    const variants = getProductVariants(product);

    // Variable products carry no price of their own — only their variants
    // do, so the parent row shows a range across variant prices instead of
    // pretending the parent has a single price.
    const matchedRows = isVariableProduct(product)
      ? cleanPriceRows.filter((row) => {
          const variantSkus = new Set(
            variants.map((variant) => getVariantSku(variant).toLowerCase())
          );
          return variantSkus.has(getPriceSku(row).toLowerCase());
        })
      : cleanPriceRows.filter((row) => sameSku(getPriceSku(row), productSku));

    const priceSummary = getPriceSummary(matchedRows, currency);

    // The aggregate summary above only tells the parent row a min-max
    // range — each variant still needs its own matched price row attached
    // so a variant's own row can show its actual price, not the parent's.
    const variantsWithPrices = variants.map((variant) => {
      const variantSku = getVariantSku(variant).toLowerCase();
      const ownRow = matchedRows.find((row) => getPriceSku(row).toLowerCase() === variantSku);
      return ownRow ? { ...variant, price_summary: getPriceSummary([ownRow], currency) } : variant;
    });

    return {
      ...product,
      ...(variants.length ? { variants: variantsWithPrices } : {}),
      price_summary: priceSummary,
    };
  });
}

function getProductDateTime(product = {}) {
  const rawDate =
    product.created_at ||
    product.createdAt ||
    product.created_date ||
    product.createdDate ||
    product.product_created_at ||
    product.productCreatedAt ||
    product.local_created_at ||
    product.localCreatedAt ||
    product.updated_at ||
    product.updatedAt ||
    "";

  if (rawDate) {
    const time = new Date(rawDate).getTime();

    if (Number.isFinite(time) && time > 0) {
      return time;
    }
  }

  return 0;
}

function getLatestSortValue(product = {}) {
  const dateTime = getProductDateTime(product);

  if (dateTime) return dateTime;

  return Number(product.id || product.product_id || product.local_product_id || 0);
}

function getInventorySummary(rows = []) {
  const inventoryRows = uniqueRows(rows);
  const hasInventory = inventoryRows.length > 0;

  if (!hasInventory) {
    return {
      has_inventory: false,
      stock_qty: "-",
      reserved_qty: "-",
      available_qty: "-",
      low_stock_alert_qty: "-",
      stock_status: "-",
      is_out_of_stock: false,
      is_low_stock: false,
    };
  }

  const stockQty = inventoryRows.reduce(
    (sum, row) => sum + toNumber(row.stock_qty),
    0
  );

  const reservedQty = inventoryRows.reduce(
    (sum, row) => sum + toNumber(row.reserved_qty),
    0
  );

  const availableQty = inventoryRows.reduce((sum, row) => {
    if (row.available_qty !== undefined && row.available_qty !== null) {
      return sum + toNumber(row.available_qty);
    }

    return sum + Math.max(toNumber(row.stock_qty) - toNumber(row.reserved_qty), 0);
  }, 0);

  const lowStockAlertQty = inventoryRows.reduce((max, row) => {
    const value = toNumber(row.low_stock_alert_qty);
    return value > max ? value : max;
  }, 0);

  const isOutOfStock = stockQty <= 0;
  const isLowStock =
    !isOutOfStock && lowStockAlertQty > 0 && stockQty <= lowStockAlertQty;

  return {
    has_inventory: true,
    stock_qty: stockQty,
    reserved_qty: reservedQty,
    available_qty: availableQty,
    low_stock_alert_qty: lowStockAlertQty,
    stock_status: isOutOfStock ? "out_of_stock" : isLowStock ? "low_stock" : "in_stock",
    is_out_of_stock: isOutOfStock,
    is_low_stock: isLowStock,
  };
}

function mergeProductsWithInventory(products = [], inventoryRows = []) {
  const cleanInventoryRows = uniqueRows(inventoryRows);

  return products.map((product) => {
    const productSku = getProductSku(product);
    const productInventorySkus = getProductInventorySkus(product);

    const matchedInventoryRows = cleanInventoryRows.filter((row) => {
      const inventorySku = getInventorySku(row).toLowerCase();
      return inventorySku && productInventorySkus.has(inventorySku);
    });

    const productOnlyInventoryRows = cleanInventoryRows.filter((row) =>
      sameSku(getInventorySku(row), productSku)
    );

    const summaryRows =
      matchedInventoryRows.length > 0 ? matchedInventoryRows : productOnlyInventoryRows;

    const summary = getInventorySummary(summaryRows);

    return {
      ...product,
      sku: product.sku || productSku,
      all_inventory_rows: cleanInventoryRows,
      inventory_rows: matchedInventoryRows,
      product_inventory: cleanInventoryRows,
      matched_product_inventory: matchedInventoryRows,
      inventory_summary: summary,
      stock_qty: summary.stock_qty,
      reserved_qty: summary.reserved_qty,
      available_qty: summary.available_qty,
      low_stock_alert_qty: summary.low_stock_alert_qty,
      stock_status: summary.stock_status,
      is_out_of_stock: summary.is_out_of_stock,
      is_low_stock: summary.is_low_stock,
    };
  });
}

function isInsideDateRange(product = {}, dateRange = "all") {
  if (!dateRange || dateRange === "all") return true;

  const productTime = getProductDateTime(product);

  if (!productTime) return false;

  const now = new Date();
  const start = new Date();

  if (dateRange === "today") {
    start.setHours(0, 0, 0, 0);
    return productTime >= start.getTime() && productTime <= now.getTime();
  }

  const daysMap = {
    "7_days": 7,
    "30_days": 30,
    "90_days": 90,
  };

  const days = daysMap[dateRange];

  if (!days) return true;

  start.setDate(start.getDate() - days);
  start.setHours(0, 0, 0, 0);

  return productTime >= start.getTime() && productTime <= now.getTime();
}

function isInsideCustomDateRange(product = {}, start = "", end = "") {
  if (!start && !end) return true;

  const productTime = getProductDateTime(product);
  if (!productTime) return false;

  if (start) {
    const startTime = new Date(start).setHours(0, 0, 0, 0);
    if (productTime < startTime) return false;
  }

  if (end) {
    const endTime = new Date(end).setHours(23, 59, 59, 999);
    if (productTime > endTime) return false;
  }

  return true;
}

function getProductTitleForExport(product = {}) {
  return product.title || product.name || product.product_name || "Untitled Product";
}

function formatDateForExport(product = {}) {
  const time = getProductDateTime(product);
  if (!time) return "-";
  return new Date(time).toLocaleDateString();
}

const LOCAL_PRODUCT_EXPORT_COLUMNS = [
  { key: "sku", label: "SKU", value: (p) => getProductSku(p) },
  { key: "title", label: "Title", value: (p) => getProductTitleForExport(p) },
  { key: "price", label: "Price", value: (p) => p.price_summary?.price_text || "-" },
  { key: "stock", label: "Stock Qty", value: (p) => (p.stock_qty !== undefined ? p.stock_qty : "-") },
  { key: "stock_status", label: "Stock Status", value: (p) => p.stock_status || "-" },
  { key: "status", label: "Status", value: (p) => p.status || "-" },
  { key: "created", label: "Created Date", value: (p) => formatDateForExport(p) },
];

function buildQuickSearchText(product = {}) {
  return [
    product.sku,
    product.product_sku,
    product.local_sku,
    product.seller_sku,
    product.parent_sku,
    product.main_sku,
    product.title,
    product.name,
    product.product_name,
    product.model_name,
    product.product_model_name,
    product.slug,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function buildSkuText(product = {}) {
  return [
    product.sku,
    product.product_sku,
    product.local_sku,
    product.seller_sku,
    product.parent_sku,
    product.main_sku,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function applyLocalFilterBarFilters(list = [], filters = {}) {
  const search = String(filters.search || "").trim().toLowerCase();
  const sku = String(filters.sku || "").trim().toLowerCase();

  const minPrice =
    filters.min_price !== undefined && filters.min_price !== ""
      ? toNumber(filters.min_price)
      : null;

  const maxPrice =
    filters.max_price !== undefined && filters.max_price !== ""
      ? toNumber(filters.max_price)
      : null;

  return list.filter((product) => {
    const searchText = buildQuickSearchText(product);
    const skuText = buildSkuText(product);
    const price = getProductPrice(product);

    const searchOk = !search || searchText.includes(search);
    const skuOk = !sku || skuText.includes(sku);
    const minPriceOk = minPrice === null || price >= minPrice;
    const maxPriceOk = maxPrice === null || price <= maxPrice;
    const dateOk = isInsideDateRange(product, filters.date_range);

    return searchOk && skuOk && minPriceOk && maxPriceOk && dateOk;
  });
}

function sortLatestProductsFirst(list = []) {
  return [...list].sort((a, b) => getLatestSortValue(b) - getLatestSortValue(a));
}

export default function LocalProductsDashboard() {
  const showToast = useToast();
  const confirm = useConfirm();
  const { openOverlay } = usePageOverlay();

  const [loading, setLoading] = useState(false);
  const [products, setProducts] = useState([]);
  const [productImages, setProductImages] = useState([]);
  const [categories, setCategories] = useState([]);
  const [subCategories, setSubCategories] = useState([]);
  const [models, setModels] = useState([]);
  const [expandedRows, setExpandedRows] = useState({});
  const [selectedKeys, setSelectedKeys] = useState([]);
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [imagePreview, setImagePreview] = useState(null);
  const [filterModalOpen, setFilterModalOpen] = useState(false);
  const [activeView, setActiveView] = useState("all");
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [draftFilters, setDraftFilters] = useState(EMPTY_FILTERS);
  const [draftView, setDraftView] = useState("all");
  const [exportOpen, setExportOpen] = useState(false);
  const [addVariationOpen, setAddVariationOpen] = useState(false);

  function handleExportCsv(config) {
    const rows = filteredProducts.filter((product) => {
      const price = getProductPrice(product);

      const dateOk =
        config.datePreset === "custom"
          ? isInsideCustomDateRange(product, config.customStart, config.customEnd)
          : isInsideDateRange(product, config.datePreset);

      const minOk = config.minPrice === null || price >= config.minPrice;
      const maxOk = config.maxPrice === null || price <= config.maxPrice;

      return dateOk && minOk && maxOk;
    });

    const selectedColumns = LOCAL_PRODUCT_EXPORT_COLUMNS.filter((column) =>
      config.columnKeys.includes(column.key)
    );

    exportRowsAsCsv(rows, selectedColumns, `local-products-${Date.now()}.csv`);
    showToast(`Exported ${rows.length} product${rows.length === 1 ? "" : "s"} to CSV.`);
  }

  async function loadData() {
    setLoading(true);

    try {
      const [
        productRes,
        imageRes,
        inventoryRes,
        priceRes,
        categoryRes,
        subCategoryRes,
        modelRes,
      ] = await Promise.all([
        localProductsApi.getProducts(),
        localProductsApi.getImages().catch(() => ({ data: [] })),
        localProductsApi.getInventory({ limit: 500 }).catch(() => ({ data: [] })),
        localProductsApi.getPrices({ limit: 2000 }).catch(() => ({ data: [] })),
        localProductsApi.getCategories({ limit: 100 }).catch(() => []),
        localProductsApi.getSubCategories({ limit: 500 }).catch(() => []),
        localProductsApi.getProductModels({ limit: 1000 }).catch(() => []),
      ]);

      const productRows = normalizeProductList(productRes);
      const inventoryRows = normalizeList(inventoryRes);
      const priceRows = normalizeList(priceRes);
      const productsWithInventory = mergeProductsWithInventory(productRows, inventoryRows);
      const productsWithPrices = mergeProductsWithPrices(productsWithInventory, priceRows);

      setProducts(sortLatestProductsFirst(productsWithPrices));
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

  const popupFilteredProducts = useMemo(() => {
    return applyTextAndPopupFilters(products, filters, productImages);
  }, [products, filters, productImages]);

  const baseFilteredProducts = useMemo(() => {
    return applyLocalFilterBarFilters(popupFilteredProducts, filters);
  }, [popupFilteredProducts, filters]);

  const filteredProducts = useMemo(() => {
    return sortLatestProductsFirst(applyViewFilter(baseFilteredProducts, activeView));
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

  const filteredKeys = useMemo(
    () => filteredProducts.map((product, index) => getStableProductKey(product, index)),
    [filteredProducts]
  );

  const allSelected =
    filteredKeys.length > 0 && filteredKeys.every((key) => selectedKeys.includes(key));

  function toggleSelect(productKey) {
    setSelectedKeys((prev) =>
      prev.includes(productKey)
        ? prev.filter((key) => key !== productKey)
        : [...prev, productKey]
    );
  }

  function toggleSelectAll() {
    if (allSelected) {
      setSelectedKeys((prev) => prev.filter((key) => !filteredKeys.includes(key)));
      return;
    }

    setSelectedKeys((prev) => Array.from(new Set([...prev, ...filteredKeys])));
  }

  function clearSelection() {
    setSelectedKeys([]);
  }

  async function handleBulkDelete() {
    const selectedProducts = filteredProducts.filter((product, index) =>
      selectedKeys.includes(getStableProductKey(product, index))
    );

    const deletableIds = selectedProducts
      .map((product) => product.id || product.product_id || product.local_product_id)
      .filter(Boolean);

    if (!deletableIds.length) {
      alert("None of the selected products have a valid ID to delete.");
      return;
    }

    const confirmed = await confirm(
      `Delete ${deletableIds.length} selected product${deletableIds.length === 1 ? "" : "s"}? This cannot be undone.`
    );

    if (!confirmed) return;

    setBulkDeleting(true);

    try {
      await Promise.all(deletableIds.map((id) => localProductsApi.deleteProduct(id)));
      showToast(`${deletableIds.length} product${deletableIds.length === 1 ? "" : "s"} deleted successfully.`);
      clearSelection();
      await loadData();
    } catch (error) {
      alert(getErrorMessage(error, "Unable to delete selected products."));
    } finally {
      setBulkDeleting(false);
    }
  }

  async function handleDelete(product) {
    const productId = product.id || product.product_id || product.local_product_id;

    if (!productId) {
      alert("Product ID missing. Cannot delete this product.");
      return;
    }

    const confirmed = await confirm(
      `Delete product ${product.sku || product.product_sku || product.title || productId}?`
    );

    if (!confirmed) return;

    try {
      await localProductsApi.deleteProduct(productId);
      showToast("Product deleted successfully.");
      await loadData();
    } catch (error) {
      alert(getErrorMessage(error, "Unable to delete product."));
    }
  }

  async function handleDeleteVariant(variant) {
    const variantId =
      variant.id || variant.variant_id || variant.product_variant_id || variant.local_variant_id;

    if (!variantId) {
      alert("Variant ID missing. Cannot delete this variant.");
      return;
    }

    const confirmed = await confirm(
      `Delete variant ${variant.variant_sku || variant.sku || variantId}?`
    );

    if (!confirmed) return;

    try {
      await localProductsApi.deleteVariant(variantId);
      showToast("Variant deleted successfully.");
      await loadData();
    } catch (error) {
      alert(getErrorMessage(error, "Unable to delete variant."));
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

    openOverlay(`/product/local-products/edit/${productId}/${section}`);
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
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
          <h1 className="text-[15px] font-bold text-white">Manage All Inventory</h1>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setAddVariationOpen(true)}
              className="flex h-7 items-center gap-1.5 rounded-sm border border-slate-600 bg-[#334155] px-2.5 text-[11px] font-semibold text-slate-100 hover:bg-[#3f4d63]"
            >
              <Layers size={12} /> Add a variation
            </button>
            <button
              type="button"
              onClick={() => openOverlay("/product/local-products/create")}
              className="flex h-7 items-center gap-1.5 rounded-sm border border-slate-600 bg-[#334155] px-2.5 text-[11px] font-semibold text-slate-100 hover:bg-[#3f4d63]"
            >
              <Plus size={12} /> Add a product
            </button>
          </div>
        </div>

        <ProductFilterBar
          filters={filters}
          setFilters={setFilters}
          filteredCount={filteredProducts.length}
          totalCount={products.length}
          activePopupFilterCount={activePopupFilterCount}
          onOpenFilter={openFilterModal}
          onClear={clearAllFilters}
          onOpenExport={() => setExportOpen(true)}
          onOpenPriceDashboard={() => openOverlay("/price")}
          onOpenInventoryDashboard={() => openOverlay("/inventory")}
        />

        {selectedKeys.length > 0 && (
          <div className="flex items-center justify-between border border-orange-500/40 bg-orange-500/10 px-3 py-2">
            <p className="text-[11px] font-semibold text-orange-200">
              {selectedKeys.length} product{selectedKeys.length === 1 ? "" : "s"} selected
            </p>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={clearSelection}
                disabled={bulkDeleting}
                className="h-7 rounded-sm border border-slate-600 px-2.5 text-[11px] font-semibold text-slate-300 hover:bg-slate-800 disabled:opacity-60"
              >
                Clear
              </button>

              <button
                type="button"
                onClick={handleBulkDelete}
                disabled={bulkDeleting}
                className="h-7 rounded-sm border border-red-500/40 bg-red-950 px-2.5 text-[11px] font-semibold text-red-300 hover:bg-red-900 disabled:opacity-60"
              >
                {bulkDeleting ? "Deleting..." : `Delete Selected (${selectedKeys.length})`}
              </button>
            </div>
          </div>
        )}

        <ProductsTable
          loading={loading}
          filteredProducts={filteredProducts}
          categories={categories}
          subCategories={subCategories}
          models={models}
          productImages={productImages}
          expandedRows={expandedRows}
          selectedKeys={selectedKeys}
          allSelected={allSelected}
          onToggleSelect={toggleSelect}
          onToggleSelectAll={toggleSelectAll}
          getName={getName}
          toggleExpanded={toggleExpanded}
          goToProductSection={goToProductSection}
          handleDelete={handleDelete}
          handleDeleteVariant={handleDeleteVariant}
          setImagePreview={setImagePreview}
        />
      </div>

      <FilterModal
        open={filterModalOpen}
        draftFilters={draftFilters}
        setDraftFilters={setDraftFilters}
        draftView={draftView}
        setDraftView={setDraftView}
        tabCounts={tabCounts}
        categories={categories}
        visibleSubCategories={visibleSubCategories}
        models={models}
        getName={getName}
        onClose={() => setFilterModalOpen(false)}
        onApply={applyFilters}
      />

      <ImagePreviewModal
        imagePreview={imagePreview}
        onClose={() => setImagePreview(null)}
      />

      {addVariationOpen && (
        <AddVariationModal
          products={products}
          productImages={productImages}
          onClose={() => setAddVariationOpen(false)}
        />
      )}

      <ExportCsvModal
        open={exportOpen}
        onClose={() => setExportOpen(false)}
        title="Export Local Products CSV"
        columns={LOCAL_PRODUCT_EXPORT_COLUMNS}
        buttonColor="orange"
        onExport={handleExportCsv}
      />
    </div>
  );
}