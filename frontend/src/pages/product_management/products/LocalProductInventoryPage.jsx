import { useEffect, useMemo, useState } from "react";
import { Lock, RefreshCw, Save } from "lucide-react";
import { useParams } from "react-router-dom";
import localProductsApi from "../../../config/sub_api/product_management_api/local_products_api";
import { getStoredUser } from "../../../config/auth";
import ProductPageLayout from "./components/ProductPageLayout";
import { getErrorMessage, normalizeList } from "./utils/productSku";


function getCurrentUserId() {
  const user = getStoredUser?.();
  return user?.id || user?.user_id || user?.user_uid || 1;
}

const emptyInventory = {
  sku: "",
  current_stock: 0,
  reserved_stock: 0,
  available_stock: 0,
  reorder_level: 0,
  stock_qty: 0,
  reserved_qty: 0,
  available_qty: 0,
  low_stock_alert_qty: 0,
  updated_by: getCurrentUserId(),
};

function unwrapOne(response) {
  const data =
    response?.data?.data ??
    response?.data?.rows ??
    response?.data?.items ??
    response?.data ??
    response;

  if (Array.isArray(data)) {
    return data[0] || null;
  }

  return data || null;
}

function clean(value) {
  return String(value ?? "").trim();
}

function cleanNumber(value, fallback = 0) {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : fallback;
}

function safeText(value, fallback = "-") {
  if (value === null || value === undefined || value === "") {
    return fallback;
  }

  if (Array.isArray(value)) {
    return value.map((item) => safeText(item, fallback)).join(", ");
  }

  if (typeof value === "object") {
    return safeText(
      value.variant_sku ??
        value.product_sku ??
        value.local_sku ??
        value.seller_sku ??
        value.sku ??
        value.name ??
        value.title ??
        value.id,
      fallback
    );
  }

  return String(value);
}

function sameSku(left, right) {
  const leftValue = clean(left).toLowerCase();
  const rightValue = clean(right).toLowerCase();

  return Boolean(leftValue && rightValue && leftValue === rightValue);
}

function getInventoryRowId(row) {
  return (
    row?.id ??
    row?.inventory_id ??
    row?.product_inventory_id ??
    row?.stock_id ??
    ""
  );
}

function getProductSku(product = {}) {
  return clean(
    product?.sku ||
      product?.product_sku ||
      product?.local_sku ||
      product?.seller_sku ||
      product?.parent_sku ||
      product?.main_sku ||
      ""
  );
}

function getVariantSku(variant = {}) {
  return clean(
    variant?.sku ||
      variant?.variant_sku ||
      variant?.product_sku ||
      variant?.local_sku ||
      variant?.seller_sku ||
      ""
  );
}

function getInventorySku(row = {}) {
  return clean(
    row?.sku ||
      row?.variant_sku ||
      row?.product_sku ||
      row?.local_sku ||
      row?.seller_sku ||
      ""
  );
}

function getVariantRecordId(row) {
  return (
    row?.id ??
    row?.variant_id ??
    row?.product_variant_id ??
    row?.local_variant_id ??
    row?.variantId ??
    ""
  );
}

function rowBelongsToProduct(row, productId) {
  const possibleIds = [
    row?.product_id,
    row?.local_product_id,
    row?.parent_product_id,
    row?.productId,
  ].filter((value) => value !== undefined && value !== null && value !== "");

  if (!possibleIds.length) {
    return true;
  }

  return possibleIds.some((value) => String(value) === String(productId));
}

function getVariantLabel(variant) {
  if (!variant) {
    return "-";
  }

  return safeText(
    variant.variant_sku ??
      variant.sku ??
      variant.seller_sku ??
      variant.local_sku ??
      variant.variant_name ??
      variant.name ??
      variant.title ??
      `Variant #${getVariantRecordId(variant)}`
  );
}

function isVariableParent(product, variants) {
  const type = String(product?.product_type || product?.type || "").toLowerCase();

  return (
    type === "variable" ||
    Number(product?.has_variants || 0) === 1 ||
    Number(product?.variant_count || product?.variants_count || 0) > 0 ||
    variants.length > 0
  );
}

function findInventoryBySku(inventoryRows = [], sku = "") {
  return inventoryRows.find((row) => sameSku(getInventorySku(row), sku)) || null;
}

function buildInventoryFormBySku(sku, inventoryRows = []) {
  const inventory = findInventoryBySku(inventoryRows, sku);

  const currentStock = inventory?.stock_qty ?? 0;
  const reservedStock = inventory?.reserved_qty ?? 0;
  const availableStock =
    inventory?.available_qty ??
    Math.max(cleanNumber(currentStock) - cleanNumber(reservedStock), 0);

  return {
    ...emptyInventory,
    sku,
    current_stock: currentStock,
    reserved_stock: reservedStock,
    available_stock: availableStock,
    reorder_level: inventory?.low_stock_alert_qty ?? 0,
    stock_qty: currentStock,
    reserved_qty: reservedStock,
    available_qty: availableStock,
    low_stock_alert_qty: inventory?.low_stock_alert_qty ?? 0,
    id: getInventoryRowId(inventory),
  };
}

async function safeFetchInventoryBySku(sku) {
  if (!sku) return null;

  try {
    const response = await localProductsApi.getInventoryBySku(sku);
    return unwrapOne(response);
  } catch (error) {
    if (error?.response?.status === 404) {
      return null;
    }

    throw error;
  }
}

async function loadInventoryRowsForSkus(skus = []) {
  const cleanSkus = Array.from(
    new Set(
      skus
        .map((sku) => clean(sku))
        .filter(Boolean)
    )
  );

  if (!cleanSkus.length) return [];

  const rows = await Promise.all(
    cleanSkus.map((sku) => safeFetchInventoryBySku(sku))
  );

  return rows.filter(Boolean);
}

function FieldRow({ label, children, required = false, locked = false }) {
  return (
    <div className="grid grid-cols-1 gap-2 border-b border-slate-800 py-3 lg:grid-cols-[260px_1fr_34px] lg:items-center">
      <div className="flex items-center justify-start gap-2 lg:justify-end">
        {required ? <span className="text-slate-300">*</span> : null}
        <span className="text-sm font-bold text-slate-300">{label}</span>
      </div>

      <div>{children}</div>

      <div className="hidden lg:flex lg:justify-center">
        {locked ? <Lock size={15} className="text-slate-500" /> : null}
      </div>
    </div>
  );
}

function DarkInput({
  value,
  onChange,
  type = "text",
  step,
  readOnly = false,
  placeholder = "",
}) {
  return (
    <input
      type={type}
      step={step}
      value={value ?? ""}
      readOnly={readOnly}
      placeholder={placeholder}
      onChange={(event) => onChange(event.target.value)}
      className={`h-10 w-full max-w-[760px] border border-slate-700 bg-[#0a101d] px-3 text-sm font-semibold text-slate-100 outline-none transition placeholder:text-slate-600 focus:border-slate-400 ${
        readOnly ? "cursor-not-allowed bg-slate-800/60 text-slate-500" : ""
      }`}
    />
  );
}

function DarkSelect({ value, onChange, children, disabled = false }) {
  return (
    <select
      value={value ?? ""}
      disabled={disabled}
      onChange={(event) => onChange(event.target.value)}
      className="h-10 w-full max-w-[760px] cursor-pointer border border-slate-700 bg-[#0a101d] px-3 text-sm font-semibold text-slate-100 outline-none transition focus:border-slate-400 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {children}
    </select>
  );
}

export default function LocalProductPriceInventoryPage() {
  const { productId } = useParams();

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [product, setProduct] = useState(null);
  const [variants, setVariants] = useState([]);
  const [inventories, setInventories] = useState([]);
  const [selectedVariantId, setSelectedVariantId] = useState("");

  const [inventoryForm, setInventoryForm] = useState({
    ...emptyInventory,
  });

  const selectedVariant = useMemo(() => {
    return variants.find(
      (item) => String(getVariantRecordId(item)) === String(selectedVariantId)
    );
  }, [variants, selectedVariantId]);

  const parentProduct = useMemo(() => {
    return isVariableParent(product, variants);
  }, [product, variants]);

  const selectedSku = useMemo(() => {
    if (parentProduct) {
      return getVariantSku(selectedVariant);
    }

    return getProductSku(product);
  }, [parentProduct, selectedVariant, product]);

  const canEdit = Boolean(selectedSku) && (!parentProduct || Boolean(selectedVariantId));

  function setFormsForMain(productData = product, inventoryRows = inventories) {
    const sku = getProductSku(productData);
    setInventoryForm(buildInventoryFormBySku(sku, inventoryRows));
  }

  function setFormsForVariant(
    variantId,
    variantRows = variants,
    inventoryRows = inventories
  ) {
    const variant = variantRows.find(
      (item) => String(getVariantRecordId(item)) === String(variantId)
    );

    const sku = getVariantSku(variant);
    setInventoryForm(buildInventoryFormBySku(sku, inventoryRows));
  }

  async function loadData() {
    setLoading(true);

    try {
      const [productRes, variantRes] = await Promise.all([
        localProductsApi.getProductById(productId),
        localProductsApi.getVariants({ product_id: productId }).catch(() => ({
          data: [],
        })),
      ]);

      const productData = unwrapOne(productRes);

      const variantRows = normalizeList(variantRes).filter((item) =>
        rowBelongsToProduct(item, productId)
      );

      const isParent = isVariableParent(productData, variantRows);

      const skuList = isParent
        ? variantRows.map((variant) => getVariantSku(variant)).filter(Boolean)
        : [getProductSku(productData)].filter(Boolean);

      const inventoryRows = await loadInventoryRowsForSkus(skuList);

      setProduct(productData);
      setVariants(variantRows);
      setInventories(inventoryRows);

      const currentVariantStillExists = variantRows.some(
        (item) => String(getVariantRecordId(item)) === String(selectedVariantId)
      );

      if (isParent) {
        const autoVariantId =
          currentVariantStillExists && selectedVariantId
            ? selectedVariantId
            : variantRows[0]
            ? String(getVariantRecordId(variantRows[0]))
            : "";

        setSelectedVariantId(autoVariantId);

        if (autoVariantId) {
          setFormsForVariant(autoVariantId, variantRows, inventoryRows);
        } else {
          setInventoryForm({
            ...emptyInventory,
          });
        }

        return;
      }

      setSelectedVariantId("");
      setInventoryForm(buildInventoryFormBySku(getProductSku(productData), inventoryRows));
    } catch (error) {
      alert(getErrorMessage(error, "Unable to load inventory."));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, [productId]);

  useEffect(() => {
    const current = cleanNumber(inventoryForm.current_stock);
    const reserved = cleanNumber(inventoryForm.reserved_stock);
    const available = Math.max(current - reserved, 0);

    setInventoryForm((prev) => {
      if (
        Number(prev.available_stock) === available &&
        Number(prev.stock_qty) === current &&
        Number(prev.available_qty) === available &&
        Number(prev.reserved_qty) === reserved
      ) {
        return prev;
      }

      return {
        ...prev,
        available_stock: available,
        stock_qty: current,
        reserved_qty: reserved,
        available_qty: available,
      };
    });
  }, [inventoryForm.current_stock, inventoryForm.reserved_stock]);

  function handleVariantSelect(value) {
    setSelectedVariantId(value);

    if (!value) {
      setInventoryForm({
        ...emptyInventory,
      });

      return;
    }

    setFormsForVariant(value);
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (!selectedSku) {
      alert("SKU missing. Cannot save inventory.");
      return;
    }

    if (parentProduct && !selectedVariantId) {
      alert("Select a child variant first.");
      return;
    }

    setSaving(true);

    try {
      const currentStock = cleanNumber(inventoryForm.current_stock);
      const reservedStock = cleanNumber(inventoryForm.reserved_stock);
      const availableStock = Math.max(currentStock - reservedStock, 0);

      const inventoryPayload = {
        sku: selectedSku,
        stock_qty: currentStock,
        reserved_qty: reservedStock,
        available_qty: availableStock,
        low_stock_alert_qty: cleanNumber(inventoryForm.reorder_level),
        updated_by: getCurrentUserId(),
        created_by: getCurrentUserId(),
      };

      if (inventoryForm.id) {
        await localProductsApi.updateInventory(inventoryForm.id, inventoryPayload);
      } else {
        await localProductsApi.createInventory(inventoryPayload);
      }

      alert("Inventory saved successfully.");
      await loadData();
    } catch (error) {
      alert(getErrorMessage(error, "Unable to save inventory."));
    } finally {
      setSaving(false);
    }
  }

  return (
    <ProductPageLayout productId={productId} active="price-inventory" product={product}>
      <form
        onSubmit={handleSubmit}
        className="overflow-hidden border border-slate-800 bg-[#0b1220] text-slate-100"
      >
        <div className="border-b border-slate-800 bg-[#07101f] px-4 py-3">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-sm font-bold text-white">
                {parentProduct
                  ? "Child Variant Inventory"
                  : "Single Product Inventory"}
              </p>

              <p className="mt-1 text-xs font-semibold text-slate-500">
                Manage stock from product inventory table.
              </p>
            </div>

            <div className="min-w-[280px]">
              <DarkSelect
                value={selectedVariantId}
                onChange={handleVariantSelect}
                disabled={loading || (!parentProduct && !variants.length)}
              >
                {parentProduct ? (
                  <option value="">Select child variant</option>
                ) : (
                  <option value="">Main Product</option>
                )}

                {variants.map((variant) => {
                  const variantId = getVariantRecordId(variant);

                  return (
                    <option key={variantId} value={variantId}>
                      {getVariantLabel(variant)}
                    </option>
                  );
                })}
              </DarkSelect>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex min-h-[360px] flex-col items-center justify-center gap-3 text-slate-500">
            <RefreshCw size={24} className="animate-spin text-slate-300" />
            <span className="text-sm font-semibold">Loading inventory...</span>
          </div>
        ) : (
          <div className={`p-4 ${!canEdit ? "pointer-events-none opacity-50" : ""}`}>
            <FieldRow label="SKU / Apply To" locked>
              <DarkInput
                value={
                  parentProduct
                    ? selectedSku || getVariantLabel(selectedVariant)
                    : selectedSku || "Main Product"
                }
                readOnly
                onChange={() => {}}
              />
            </FieldRow>

            <FieldRow label="Product Type" locked>
              <DarkInput
                value={parentProduct ? "PARENT / VARIABLE" : "SINGLE PRODUCT"}
                readOnly
                onChange={() => {}}
              />
            </FieldRow>

            <FieldRow label="Current Stock" required>
              <DarkInput
                type="number"
                value={inventoryForm.current_stock}
                onChange={(value) =>
                  setInventoryForm((prev) => ({
                    ...prev,
                    current_stock: value,
                  }))
                }
              />
            </FieldRow>

            <FieldRow label="Reserved Stock">
              <DarkInput
                type="number"
                value={inventoryForm.reserved_stock}
                onChange={(value) =>
                  setInventoryForm((prev) => ({
                    ...prev,
                    reserved_stock: value,
                  }))
                }
              />
            </FieldRow>

            <FieldRow label="Available Stock" locked>
              <DarkInput
                type="number"
                value={inventoryForm.available_stock}
                readOnly
                onChange={() => {}}
              />
            </FieldRow>

            <FieldRow label="Reorder Level">
              <DarkInput
                type="number"
                value={inventoryForm.reorder_level}
                onChange={(value) =>
                  setInventoryForm((prev) => ({
                    ...prev,
                    reorder_level: value,
                  }))
                }
              />
            </FieldRow>

            <div className="mt-4 grid grid-cols-1 gap-3 border-t border-slate-800 pt-4 sm:grid-cols-2">
              <div className="border border-slate-800 bg-[#07101f] p-4">
                <p className="text-xs font-bold uppercase text-slate-500">
                  Selected SKU
                </p>
                <p className="mt-1 truncate text-sm font-black text-white">
                  {safeText(selectedSku, "-")}
                </p>
              </div>

              <div className="border border-slate-800 bg-[#07101f] p-4">
                <p className="text-xs font-bold uppercase text-slate-500">
                  Existing Stock
                </p>
                <p className="mt-1 text-sm font-black text-white">
                  {safeText(inventoryForm.stock_qty, "0")}
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="flex justify-end border-t border-slate-800 bg-[#07101f] px-4 py-3">
          <button
            disabled={saving || loading || !canEdit}
            type="submit"
            className="inline-flex cursor-pointer items-center gap-2 bg-slate-200 px-5 py-2.5 text-sm font-black text-slate-950 transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving ? (
              <RefreshCw size={16} className="animate-spin" />
            ) : (
              <Save size={16} />
            )}
            {saving ? "Saving..." : "Save Inventory"}
          </button>
        </div>
      </form>
    </ProductPageLayout>
  );
}