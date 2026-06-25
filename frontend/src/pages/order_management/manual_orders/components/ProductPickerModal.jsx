import { useEffect, useMemo, useState } from "react";
import { Loader2, PackageSearch, Search, X } from "lucide-react";

import localProductsApi from "../../../../config/sub_api/product_management_api/local_products_api";
import ProductImage from "./ProductImage";
import {
  imageFromProduct,
  money,
  normalizeError,
  normalizeProductForOrder,
  priceFromProduct,
  skuFromProduct,
  titleFromProduct,
  unwrapApiResponse,
} from "../utils/orderFrontendHelpers";

function normalizeProductList(response) {
  const unwrapped = unwrapApiResponse(response);
  const value = unwrapped?.data ?? response?.data ?? response;

  if (Array.isArray(value)) return value;
  if (Array.isArray(value?.data)) return value.data;
  if (Array.isArray(value?.rows)) return value.rows;
  if (Array.isArray(value?.products)) return value.products;
  if (Array.isArray(value?.items)) return value.items;

  if (Array.isArray(value?.data?.rows)) return value.data.rows;
  if (Array.isArray(value?.data?.products)) return value.data.products;
  if (Array.isArray(value?.data?.items)) return value.data.items;
  if (Array.isArray(value?.data?.data)) return value.data.data;

  // Single product object response support
  if (value && typeof value === "object") return [value];

  return [];
}

function textValue(value) {
  return String(value || "").trim().toLowerCase();
}

function isTrue(value) {
  return value === true || value === 1 || value === "1" || value === "true";
}

function hasParentLink(product = {}) {
  return Boolean(
    product.parent_id ||
      product.parent_product_id ||
      product.parentProductId ||
      product.parent_sku ||
      product.parentSku ||
      product.parent_product_sku ||
      product.parentProductSku
  );
}

function getChildren(product = {}) {
  const children = [];

  const possibleChildLists = [
    product.children,
    product.variants,
    product.variations,
    product.child_products,
    product.childProducts,
    product.product_variants,
    product.productVariants,
    product.variant_products,
    product.variantProducts,
  ];

  possibleChildLists.forEach((list) => {
    if (Array.isArray(list)) {
      list.forEach((item) => {
        if (item && typeof item === "object") {
          children.push(item);
        }
      });
    }
  });

  return children;
}

function hasChildrenList(product = {}) {
  return getChildren(product).length > 0;
}

function isDefinitelyParentProduct(product = {}) {
  if (hasParentLink(product)) return false;

  const productType = textValue(
    product.product_type ||
      product.type ||
      product.item_type ||
      product.variant_type ||
      product.sku_type ||
      product.product_level
  );

  const relationType = textValue(
    product.relation_type ||
      product.product_relation ||
      product.relationship ||
      product.parent_child_type
  );

  if (isTrue(product.is_parent) || isTrue(product.parent)) return true;

  if (
    productType === "parent" ||
    productType === "variable" ||
    productType === "configurable" ||
    productType === "main" ||
    productType === "master"
  ) {
    return true;
  }

  if (
    relationType === "parent" ||
    relationType === "main" ||
    relationType === "master"
  ) {
    return true;
  }

  if (hasChildrenList(product)) return true;

  return false;
}

function mergeChildWithParent(child = {}, parent = {}) {
  const parentSku =
    parent.sku ||
    parent.product_sku ||
    parent.parent_sku ||
    parent.product_code ||
    "";

  return {
    ...parent,
    ...child,

    // Keep parent info also
    parent_id: child.parent_id || child.parent_product_id || parent.id || parent.product_id,
    parent_product_id:
      child.parent_product_id || child.parent_id || parent.id || parent.product_id,
    parent_sku: child.parent_sku || child.parentSku || parentSku,

    // Important identity
    id: child.id || child.variant_id || child.product_variant_id || child.sku,
    product_id: child.product_id || parent.id || parent.product_id,
    variant_id: child.variant_id || child.product_variant_id || child.id || null,

    // Important display fields
    sku:
      child.sku ||
      child.variant_sku ||
      child.product_sku ||
      child.child_sku ||
      "",
    product_name:
      child.product_name ||
      child.product_title ||
      child.title ||
      child.name ||
      parent.product_name ||
      parent.product_title ||
      parent.title ||
      parent.name ||
      "",
    product_title:
      child.product_title ||
      child.product_name ||
      child.title ||
      child.name ||
      parent.product_title ||
      parent.product_name ||
      parent.title ||
      parent.name ||
      "",

    image_url:
      child.image_url ||
      child.image ||
      child.main_image ||
      child.thumbnail ||
      parent.image_url ||
      parent.image ||
      parent.main_image ||
      parent.thumbnail ||
      "",

    selling_price:
      child.selling_price ??
      child.unit_price ??
      child.price ??
      parent.selling_price ??
      parent.unit_price ??
      parent.price ??
      0,

    unit_price:
      child.unit_price ??
      child.selling_price ??
      child.price ??
      parent.unit_price ??
      parent.selling_price ??
      parent.price ??
      0,

    cost_price:
      child.cost_price ??
      parent.cost_price ??
      0,

    stock_quantity:
      child.stock_quantity ??
      child.stock ??
      child.qty ??
      parent.stock_quantity ??
      parent.stock ??
      parent.qty ??
      0,

    item_type: "CHILD",
    _picker_type: "CHILD",
  };
}

function hasSkuOrTitle(product = {}) {
  const sku = skuFromProduct(product);
  const title = titleFromProduct(product);
  return Boolean(sku || title);
}

function makeUniqueKey(product = {}, index = 0) {
  return String(
    product.variant_id ||
      product.product_variant_id ||
      product.id ||
      product.sku ||
      product.product_sku ||
      product.parent_sku ||
      `row-${index}`
  );
}

function buildPickerList(list = []) {
  const result = [];
  const seen = new Set();

  list.forEach((product, productIndex) => {
    if (!product || typeof product !== "object") return;

    const children = getChildren(product);

    // Parent has child products: do not show parent, show child products
    if (children.length > 0) {
      children.forEach((child, childIndex) => {
        const mergedChild = mergeChildWithParent(child, product);

        if (!hasSkuOrTitle(mergedChild)) return;

        const key = makeUniqueKey(mergedChild, `${productIndex}-${childIndex}`);
        if (seen.has(key)) return;

        seen.add(key);
        result.push(mergedChild);
      });

      return;
    }

    // Flat child product or single product
    if (!hasSkuOrTitle(product)) return;

    // Hide parent-only products
    if (isDefinitelyParentProduct(product)) return;

    const key = makeUniqueKey(product, productIndex);
    if (seen.has(key)) return;

    seen.add(key);
    result.push({
      ...product,
      item_type: hasParentLink(product) ? "CHILD" : product.item_type || "SINGLE",
      _picker_type: hasParentLink(product) ? "CHILD" : product._picker_type || "SINGLE",
    });
  });

  return result;
}

function matchesSearch(product = {}, keyword = "") {
  const search = textValue(keyword);
  if (!search) return true;

  const values = [
    product.sku,
    product.variant_sku,
    product.product_sku,
    product.child_sku,
    product.parent_sku,
    product.product_name,
    product.product_title,
    product.title,
    product.name,
    product.model,
    product.model_name,
    product.colour_name,
    product.color_name,
  ];

  return values.some((value) => textValue(value).includes(search));
}

async function fetchLocalProducts(params = {}) {
  const functionNames = [
    "getProducts",
    "getLocalProducts",
    "getAllProducts",
    "listProducts",
    "list",
    "getAll",
    "get",
  ];

  for (const name of functionNames) {
    if (typeof localProductsApi?.[name] === "function") {
      const response = await localProductsApi[name](params);
      return normalizeProductList(response);
    }
  }

  return [];
}

export default function ProductPickerModal({ open, onClose, onSelect }) {
  const [search, setSearch] = useState("");
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const productCount = useMemo(() => products.length, [products]);

  async function loadProducts(keyword = "") {
    try {
      setLoading(true);
      setError("");

      const list = await fetchLocalProducts({
        search: keyword,
        keyword,
        q: keyword,
        sku: keyword,
        page: 1,
        limit: 100,
      });

      let pickerList = buildPickerList(Array.isArray(list) ? list : []);

      // Frontend-side search for nested child products
      pickerList = pickerList.filter((product) => matchesSearch(product, keyword));

      setProducts(pickerList);
    } catch (err) {
      setError(normalizeError(err, "Products load panna mudiyala"));
      setProducts([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (open) {
      setSearch("");
      loadProducts("");
    }
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/75 px-4 py-6 backdrop-blur-sm">
      <div className="flex max-h-[90vh] w-full max-w-6xl flex-col overflow-hidden rounded-3xl border border-slate-800 bg-[#0B1120] shadow-2xl">
        <div className="flex flex-col gap-4 border-b border-slate-800 bg-[#111827] px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-orange-500/30 bg-orange-500/10 text-orange-300">
              <PackageSearch size={21} />
            </div>

            <div>
              <h2 className="text-lg font-bold text-white">
                Pick Product / Child SKU
              </h2>
              <p className="text-xs text-slate-400">
                Parent products are hidden. Single products and child products are shown.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-700 text-slate-300 transition hover:border-red-400 hover:bg-red-500/10 hover:text-red-300"
          >
            <X size={18} />
          </button>
        </div>

        <div className="border-b border-slate-800 bg-[#0B1120] p-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-center">
            <div className="relative flex-1">
              <Search
                size={17}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"
              />

              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") loadProducts(search);
                }}
                placeholder="Search SKU / child SKU / product name / model..."
                className="w-full rounded-2xl border border-slate-700 bg-slate-950 py-3 pl-10 pr-3 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-orange-500"
              />
            </div>

            <button
              type="button"
              onClick={() => loadProducts(search)}
              disabled={loading}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-orange-500 px-6 py-3 text-sm font-bold text-white transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? (
                <Loader2 size={17} className="animate-spin" />
              ) : (
                <Search size={17} />
              )}
              Search
            </button>
          </div>

          <div className="mt-3 text-xs text-slate-500">
            {loading
              ? "Searching products..."
              : `${productCount} sellable product(s) found`}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {error ? (
            <div className="mb-4 rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm font-semibold text-red-300">
              {error}
            </div>
          ) : null}

          {loading ? (
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {Array.from({ length: 6 }).map((_, index) => (
                <div
                  key={index}
                  className="animate-pulse rounded-2xl border border-slate-800 bg-[#111827] p-4"
                >
                  <div className="flex gap-3">
                    <div className="h-20 w-20 rounded-2xl bg-slate-800" />
                    <div className="flex-1 space-y-3">
                      <div className="h-4 w-3/4 rounded bg-slate-800" />
                      <div className="h-3 w-1/2 rounded bg-slate-800" />
                      <div className="h-8 w-24 rounded bg-slate-800" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : products.length === 0 ? (
            <div className="flex min-h-[300px] flex-col items-center justify-center rounded-2xl border border-dashed border-slate-700 bg-slate-950/60 text-center">
              <PackageSearch size={42} className="mb-3 text-slate-600" />
              <h3 className="text-sm font-bold text-slate-300">
                No sellable products found
              </h3>
              <p className="mt-1 text-xs text-slate-500">
                Search SKU, child SKU, or product name.
              </p>
            </div>
          ) : (
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {products.map((product, index) => {
                const sku = skuFromProduct(product);
                const productName = titleFromProduct(product);
                const imageUrl = imageFromProduct(product);
                const price = priceFromProduct(product);
                const pickerType = product._picker_type || product.item_type || "PRODUCT";

                return (
                  <div
                    key={`${makeUniqueKey(product, index)}-${index}`}
                    className="group overflow-hidden rounded-2xl border border-slate-800 bg-[#111827] p-4 transition hover:border-orange-500/70 hover:bg-slate-900"
                  >
                    <div className="flex gap-4">
                      <div className="relative">
                        <div className="h-24 w-24 overflow-hidden rounded-2xl border border-slate-700 bg-slate-950">
                          <ProductImage
                            src={imageUrl}
                            alt={productName}
                            size="lg"
                            className="h-full w-full rounded-none border-0 object-cover"
                          />
                        </div>

                        <div className="absolute -bottom-2 left-2 rounded-lg border border-slate-700 bg-slate-950 px-2 py-1 text-[10px] font-bold uppercase text-orange-300">
                          {pickerType === "CHILD" ? "CHILD" : "SKU"}
                        </div>
                      </div>

                      <div className="min-w-0 flex-1">
                        <h3 className="line-clamp-2 min-h-[40px] text-sm font-bold leading-5 text-white">
                          {productName || "Untitled Product"}
                        </h3>

                        <div className="mt-2 inline-flex max-w-full rounded-lg border border-orange-500/30 bg-orange-500/10 px-2 py-1">
                          <span className="truncate text-xs font-bold text-orange-300">
                            SKU: {sku || "-"}
                          </span>
                        </div>

                        {product.parent_sku ? (
                          <div className="mt-2 text-[11px] text-slate-500">
                            Parent SKU: {product.parent_sku}
                          </div>
                        ) : null}

                        <div className="mt-3 flex items-end justify-between gap-3">
                          <div>
                            <p className="text-xs text-slate-500">Unit Price</p>
                            <p className="text-base font-extrabold text-white">
                              Rs. {money(price)}
                            </p>
                          </div>

                          <button
                            type="button"
                            onClick={() => {
                              onSelect(normalizeProductForOrder(product));
                              onClose();
                            }}
                            className="rounded-xl bg-orange-500 px-4 py-2 text-xs font-bold text-white transition hover:bg-orange-600"
                          >
                            Select
                          </button>
                        </div>
                      </div>
                    </div>

                    {product.description || product.short_description ? (
                      <p className="mt-3 line-clamp-2 border-t border-slate-800 pt-3 text-xs leading-5 text-slate-400">
                        {product.description || product.short_description}
                      </p>
                    ) : null}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}