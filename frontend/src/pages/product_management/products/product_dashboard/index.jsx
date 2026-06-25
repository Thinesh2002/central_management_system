import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import localProductsApi from "../../../../config/sub_api/product_management_api/local_products_api";
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

      setProducts(sortLatestProductsFirst(normalizeProductList(productRes)));
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