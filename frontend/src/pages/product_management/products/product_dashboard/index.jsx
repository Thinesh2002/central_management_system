import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import localProductsApi from "../../../../config/sub_api/product_management_api/local_products_api";
import erpApi from "../../../../config/sub_api/erp_api/erpApi";
import { getErrorMessage, getName, normalizeList } from "./../utils/productSku";
import FilterModal from "./components/FilterModal";
import ImagePreviewModal from "./components/ImagePreviewModal";
import ProductFilterBar from "./components/ProductFilterBar";
import ProductsTable from "./components/ProductsTable";
import { EMPTY_FILTERS, VIEW_TABS } from "./constants/localProductsDashboardConstants";
import {
  applyTextAndPopupFilters,
  applyViewFilter,
  normalizeProductList,
} from "./utils/localProductsTableHelpers";

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
    product.main_price ??
      product.sale_price ??
      product.price ??
      product.regular_price ??
      product.selling_price ??
      product.variant_price ??
      product.unit_price ??
      0
  );
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

function mergeProductsWithMetrics(products = [], metricsBySku = {}) {
  return products.map((product) => {
    const sku = getProductSku(product).toUpperCase();
    const metrics = metricsBySku[sku] || {};
    return {
      ...product,
      metrics,
      total_inventory: metrics.available_stock ?? product.available_qty ?? product.stock_qty ?? 0,
      sales_30_days: metrics.sales_30_days ?? 0,
      sales_90_days: metrics.sales_90_days ?? 0,
      pending_orders: metrics.pending_orders ?? 0,
    };
  });
}

export default function LocalProductsDashboard() {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(false);
  const [products, setProducts] = useState([]);
  const [productImages, setProductImages] = useState([]);
  const [categories, setCategories] = useState([]);
  const [subCategories, setSubCategories] = useState([]);
  const [models, setModels] = useState([]);
  const [productMetrics, setProductMetrics] = useState({});
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
      const [
        productRes,
        imageRes,
        inventoryRes,
        categoryRes,
        subCategoryRes,
        modelRes,
        metricsRes,
      ] = await Promise.all([
        localProductsApi.getProducts(),
        localProductsApi.getImages().catch(() => ({ data: [] })),
        localProductsApi.getInventory({ limit: 500 }).catch(() => ({ data: [] })),
        localProductsApi.getCategories().catch(() => []),
        localProductsApi.getSubCategories().catch(() => []),
        localProductsApi.getProductModels().catch(() => []),
        erpApi.productMetrics().catch(() => ({ data: { by_sku: {} } })),
      ]);

      const productRows = normalizeProductList(productRes);
      const inventoryRows = normalizeList(inventoryRes);
      const productsWithInventory = mergeProductsWithInventory(productRows, inventoryRows);
      const metricsBySku = metricsRes?.data?.by_sku || {};
      const productsWithMetrics = mergeProductsWithMetrics(productsWithInventory, metricsBySku);

      setProductMetrics(metricsBySku);
      setProducts(sortLatestProductsFirst(productsWithMetrics));
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
        <ProductFilterBar
          filters={filters}
          setFilters={setFilters}
          filteredCount={filteredProducts.length}
          totalCount={products.length}
          activePopupFilterCount={activePopupFilterCount}
          onOpenFilter={openFilterModal}
          onClear={clearAllFilters}
        />

        <ProductsTable
          loading={loading}
          filteredProducts={filteredProducts}
          categories={categories}
          subCategories={subCategories}
          models={models}
          productImages={productImages}
          expandedRows={expandedRows}
          getName={getName}
          toggleExpanded={toggleExpanded}
          goToProductSection={goToProductSection}
          handleDelete={handleDelete}
          setImagePreview={setImagePreview}
          onReload={loadData}
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
    </div>
  );
}