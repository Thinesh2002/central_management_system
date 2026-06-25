import { useEffect, useMemo, useState } from "react";
import { Lock, RefreshCw, Save } from "lucide-react";
import { useParams } from "react-router-dom";
import localProductsApi from "../../../config/sub_api/product_management_api/local_products_api";
import ProductPageLayout from "./components/ProductPageLayout";
import { getErrorMessage, normalizeList } from "./utils/productSku";

const LKR = "LKR";

const emptyPrice = {
  product_id: "",
  variant_id: "",
  cost_price: 0,
  selling_price: 0,
  main_price: 0,
  sale_price: 0,
  currency: LKR,
  status: "active",
  created_by: 1,
  updated_by: 1,
};

const emptyInventory = {
  product_id: "",
  variant_id: "",
  current_stock: 0,
  reserved_stock: 0,
  available_stock: 0,
  reorder_level: 0,
  stock_qty: 0,
  status: "active",
  created_by: 1,
  updated_by: 1,
};

function unwrapOne(response) {
  const data = response?.data?.data ?? response?.data ?? response;
  if (Array.isArray(data)) return data[0] || null;
  return data || null;
}

function cleanNumber(value, fallback = 0) {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : fallback;
}

function getRowId(row) {
  return (
    row?.id ??
    row?.price_id ??
    row?.inventory_id ??
    row?.product_price_id ??
    row?.product_inventory_id
  );
}

function getVariantId(row) {
  return (
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

  if (!possibleIds.length) return true;

  return possibleIds.some((value) => String(value) === String(productId));
}

function isMainProductRow(row) {
  const variantId = getVariantId(row);

  return (
    variantId === undefined ||
    variantId === null ||
    variantId === "" ||
    String(variantId) === "0"
  );
}

function getVariantLabel(variant) {
  return (
    variant?.variant_sku ||
    variant?.sku ||
    variant?.seller_sku ||
    variant?.local_sku ||
    variant?.variant_name ||
    variant?.name ||
    variant?.title ||
    `Variant #${variant?.id || ""}`
  );
}

function getVariantPrice(variant) {
  return (
    variant?.price ??
    variant?.main_price ??
    variant?.selling_price ??
    variant?.sale_price ??
    0
  );
}

function getVariantStock(variant) {
  return (
    variant?.stock_qty ??
    variant?.current_stock ??
    variant?.quantity ??
    variant?.available_stock ??
    0
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

function buildMainPriceForm(productId, product, priceRows) {
  const productPrice = priceRows.find(isMainProductRow) || null;

  return {
    ...emptyPrice,
    product_id: productId,
    variant_id: "",
    cost_price: product?.cost_price ?? productPrice?.cost_price ?? 0,
    selling_price:
      product?.selling_price ??
      product?.main_price ??
      productPrice?.selling_price ??
      productPrice?.main_price ??
      0,
    main_price:
      product?.main_price ??
      product?.selling_price ??
      productPrice?.main_price ??
      productPrice?.selling_price ??
      0,
    sale_price: product?.sale_price ?? productPrice?.sale_price ?? 0,
    currency: LKR,
    status: productPrice?.status || "active",
    id: getRowId(productPrice),
  };
}

function buildMainInventoryForm(productId, inventoryRows) {
  const productInventory = inventoryRows.find(isMainProductRow) || null;

  const currentStock =
    productInventory?.current_stock ??
    productInventory?.stock_qty ??
    productInventory?.quantity ??
    0;

  const reservedStock = productInventory?.reserved_stock ?? 0;

  return {
    ...emptyInventory,
    product_id: productId,
    variant_id: "",
    current_stock: currentStock,
    reserved_stock: reservedStock,
    available_stock:
      productInventory?.available_stock ??
      Math.max(cleanNumber(currentStock) - cleanNumber(reservedStock), 0),
    reorder_level: productInventory?.reorder_level ?? 0,
    stock_qty: productInventory?.stock_qty ?? currentStock,
    status: productInventory?.status || "active",
    id: getRowId(productInventory),
  };
}

function buildVariantPriceForm(productId, product, variant, priceRows, variantId) {
  const price =
    priceRows.find((item) => String(getVariantId(item)) === String(variantId)) ||
    null;

  return {
    ...emptyPrice,
    product_id: productId,
    variant_id: variantId,
    cost_price: variant?.cost_price ?? price?.cost_price ?? 0,
    selling_price:
      variant?.selling_price ??
      variant?.price ??
      variant?.main_price ??
      price?.selling_price ??
      price?.main_price ??
      0,
    main_price:
      variant?.main_price ??
      variant?.selling_price ??
      variant?.price ??
      price?.main_price ??
      price?.selling_price ??
      0,
    sale_price: variant?.sale_price ?? price?.sale_price ?? 0,
    currency: LKR,
    status: price?.status || "active",
    id: getRowId(price),
  };
}

function buildVariantInventoryForm(productId, variant, inventoryRows, variantId) {
  const inventory =
    inventoryRows.find((item) => String(getVariantId(item)) === String(variantId)) ||
    null;

  const currentStock =
    variant?.stock_qty ??
    variant?.current_stock ??
    variant?.quantity ??
    inventory?.current_stock ??
    inventory?.stock_qty ??
    0;

  const reservedStock = inventory?.reserved_stock ?? 0;

  return {
    ...emptyInventory,
    product_id: productId,
    variant_id: variantId,
    current_stock: currentStock,
    reserved_stock: reservedStock,
    available_stock:
      inventory?.available_stock ??
      Math.max(cleanNumber(currentStock) - cleanNumber(reservedStock), 0),
    reorder_level: inventory?.reorder_level ?? 0,
    stock_qty: inventory?.stock_qty ?? currentStock,
    status: inventory?.status || "active",
    id: getRowId(inventory),
  };
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

function PriceInput({ value, onChange, placeholder = "0.00" }) {
  return (
    <div className="flex w-full max-w-[420px]">
      <div className="flex h-10 items-center border border-r-0 border-slate-700 bg-[#111827] px-3 text-sm font-black text-slate-300">
        LKR
      </div>
      <input
        type="number"
        step="0.01"
        value={value ?? ""}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        className="h-10 min-w-0 flex-1 border border-slate-700 bg-[#0a101d] px-3 text-sm font-semibold text-slate-100 outline-none transition placeholder:text-slate-600 focus:border-slate-400"
      />
    </div>
  );
}

export default function LocalProductPriceInventoryPage() {
  const { productId } = useParams();

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [product, setProduct] = useState(null);
  const [variants, setVariants] = useState([]);
  const [prices, setPrices] = useState([]);
  const [inventories, setInventories] = useState([]);
  const [selectedVariantId, setSelectedVariantId] = useState("");

  const [priceForm, setPriceForm] = useState({
    ...emptyPrice,
    product_id: productId,
  });

  const [inventoryForm, setInventoryForm] = useState({
    ...emptyInventory,
    product_id: productId,
  });

  const selectedVariant = useMemo(() => {
    return variants.find((item) => String(item.id) === String(selectedVariantId));
  }, [variants, selectedVariantId]);

  const parentProduct = useMemo(() => {
    return isVariableParent(product, variants);
  }, [product, variants]);

  const canEdit = !parentProduct || Boolean(selectedVariantId);

  function setFormsForMain(
    productData = product,
    priceRows = prices,
    inventoryRows = inventories
  ) {
    setPriceForm(buildMainPriceForm(productId, productData, priceRows));
    setInventoryForm(buildMainInventoryForm(productId, inventoryRows));
  }

  function setFormsForVariant(
    variantId,
    productData = product,
    variantRows = variants,
    priceRows = prices,
    inventoryRows = inventories
  ) {
    const variant = variantRows.find((item) => String(item.id) === String(variantId));

    setPriceForm(
      buildVariantPriceForm(productId, productData, variant, priceRows, variantId)
    );

    setInventoryForm(
      buildVariantInventoryForm(productId, variant, inventoryRows, variantId)
    );
  }

  async function loadData() {
    setLoading(true);

    try {
      const [productRes, variantRes, priceRes, inventoryRes] = await Promise.all([
        localProductsApi.getProductById(productId),
        localProductsApi.getVariants({ product_id: productId }).catch(() => ({
          data: [],
        })),
        localProductsApi.getPrices({ product_id: productId }).catch(() => ({
          data: [],
        })),
        localProductsApi.getInventory({ product_id: productId }).catch(() => ({
          data: [],
        })),
      ]);

      const productData = unwrapOne(productRes);

      const variantRows = normalizeList(variantRes).filter((item) =>
        rowBelongsToProduct(item, productId)
      );

      const priceRows = normalizeList(priceRes).filter((item) =>
        rowBelongsToProduct(item, productId)
      );

      const inventoryRows = normalizeList(inventoryRes).filter((item) =>
        rowBelongsToProduct(item, productId)
      );

      const isParent = isVariableParent(productData, variantRows);

      setProduct(productData);
      setVariants(variantRows);
      setPrices(priceRows);
      setInventories(inventoryRows);

      const currentVariantStillExists = variantRows.some(
        (item) => String(item.id) === String(selectedVariantId)
      );

      if (isParent) {
        const autoVariantId =
          currentVariantStillExists && selectedVariantId
            ? selectedVariantId
            : variantRows[0]?.id
            ? String(variantRows[0].id)
            : "";

        setSelectedVariantId(autoVariantId);

        if (autoVariantId) {
          setFormsForVariant(
            autoVariantId,
            productData,
            variantRows,
            priceRows,
            inventoryRows
          );
        } else {
          setPriceForm({ ...emptyPrice, product_id: productId });
          setInventoryForm({ ...emptyInventory, product_id: productId });
        }

        return;
      }

      setSelectedVariantId("");
      setPriceForm(buildMainPriceForm(productId, productData, priceRows));
      setInventoryForm(buildMainInventoryForm(productId, inventoryRows));
    } catch (error) {
      alert(getErrorMessage(error, "Unable to load price and inventory."));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productId]);

  useEffect(() => {
    const current = cleanNumber(inventoryForm.current_stock);
    const reserved = cleanNumber(inventoryForm.reserved_stock);
    const available = Math.max(current - reserved, 0);

    setInventoryForm((prev) => {
      if (
        Number(prev.available_stock) === available &&
        Number(prev.stock_qty) === current
      ) {
        return prev;
      }

      return {
        ...prev,
        available_stock: available,
        stock_qty: current,
      };
    });
  }, [inventoryForm.current_stock, inventoryForm.reserved_stock]);

  function handleVariantSelect(value) {
    setSelectedVariantId(value);

    if (!value) {
      if (parentProduct) {
        setPriceForm({ ...emptyPrice, product_id: productId });
        setInventoryForm({ ...emptyInventory, product_id: productId });
        return;
      }

      setFormsForMain();
      return;
    }

    setFormsForVariant(value);
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (parentProduct && !selectedVariantId) {
      alert("Select a child variant first.");
      return;
    }

    setSaving(true);

    try {
      const mainPrice = cleanNumber(priceForm.main_price || priceForm.selling_price);
      const costPrice = cleanNumber(priceForm.cost_price);
      const salePrice = cleanNumber(priceForm.sale_price);
      const currentStock = cleanNumber(inventoryForm.current_stock);
      const reservedStock = cleanNumber(inventoryForm.reserved_stock);
      const availableStock = Math.max(currentStock - reservedStock, 0);

      const pricePayload = {
        ...priceForm,
        product_id: productId,
        variant_id: parentProduct ? selectedVariantId : selectedVariantId || null,
        cost_price: costPrice,
        selling_price: mainPrice,
        main_price: mainPrice,
        sale_price: salePrice,
        currency: LKR,
        status: priceForm.status || "active",
        updated_by: 1,
      };

      const inventoryPayload = {
        ...inventoryForm,
        product_id: productId,
        variant_id: parentProduct ? selectedVariantId : selectedVariantId || null,
        current_stock: currentStock,
        reserved_stock: reservedStock,
        available_stock: availableStock,
        stock_qty: currentStock,
        reorder_level: cleanNumber(inventoryForm.reorder_level),
        status: inventoryForm.status || "active",
        updated_by: 1,
      };

      if (priceForm.id) {
        await localProductsApi.updatePrice(priceForm.id, pricePayload);
      } else {
        await localProductsApi.createPrice(pricePayload);
      }

      if (inventoryForm.id) {
        await localProductsApi.updateInventory(inventoryForm.id, inventoryPayload);
      } else {
        await localProductsApi.createInventory(inventoryPayload);
      }

      if (parentProduct) {
        await localProductsApi.updateVariant(selectedVariantId, {
          ...selectedVariant,
          price: pricePayload.main_price,
          main_price: pricePayload.main_price,
          selling_price: pricePayload.selling_price,
          cost_price: pricePayload.cost_price,
          sale_price: pricePayload.sale_price,
          stock_qty: inventoryPayload.stock_qty,
          current_stock: inventoryPayload.current_stock,
          updated_by: 1,
        });
      } else {
        await localProductsApi.updateProduct(productId, {
          ...product,
          main_price: pricePayload.main_price,
          selling_price: pricePayload.selling_price,
          cost_price: pricePayload.cost_price,
          sale_price: pricePayload.sale_price,
          currency: LKR,
          updated_by: 1,
        });
      }

      alert("Price and inventory saved successfully.");
      await loadData();
    } catch (error) {
      alert(getErrorMessage(error, "Unable to save price and inventory."));
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
                {parentProduct ? "Child Variant Price & Inventory" : "Single Product Price & Inventory"}
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

                {variants.map((variant) => (
                  <option key={variant.id} value={variant.id}>
                    {getVariantLabel(variant)}
                  </option>
                ))}
              </DarkSelect>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex min-h-[360px] flex-col items-center justify-center gap-3 text-slate-500">
            <RefreshCw size={24} className="animate-spin text-slate-300" />
            <span className="text-sm font-semibold">Loading price and inventory...</span>
          </div>
        ) : (
          <div className={`p-4 ${!canEdit ? "pointer-events-none opacity-50" : ""}`}>
            <FieldRow label="SKU / Apply To" locked>
              <DarkInput
                value={
                  parentProduct
                    ? getVariantLabel(selectedVariant)
                    : product?.sku || product?.product_sku || "Main Product"
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

            <FieldRow label="Current Price" required>
              <PriceInput
                value={priceForm.main_price || priceForm.selling_price}
                onChange={(value) =>
                  setPriceForm((prev) => ({
                    ...prev,
                    main_price: value,
                    selling_price: value,
                    currency: LKR,
                  }))
                }
              />
            </FieldRow>

            <FieldRow label="Cost Price">
              <PriceInput
                value={priceForm.cost_price}
                onChange={(value) =>
                  setPriceForm((prev) => ({
                    ...prev,
                    cost_price: value,
                    currency: LKR,
                  }))
                }
              />
            </FieldRow>

            <FieldRow label="Sale Price">
              <PriceInput
                value={priceForm.sale_price}
                onChange={(value) =>
                  setPriceForm((prev) => ({
                    ...prev,
                    sale_price: value,
                    currency: LKR,
                  }))
                }
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

            {parentProduct && selectedVariant ? (
              <div className="mt-4 grid grid-cols-1 gap-3 border-t border-slate-800 pt-4 sm:grid-cols-3">
                <div className="border border-slate-800 bg-[#07101f] p-4">
                  <p className="text-xs font-bold uppercase text-slate-500">Selected Variant</p>
                  <p className="mt-1 truncate text-sm font-black text-white">
                    {getVariantLabel(selectedVariant)}
                  </p>
                </div>

                <div className="border border-slate-800 bg-[#07101f] p-4">
                  <p className="text-xs font-bold uppercase text-slate-500">Existing Price</p>
                  <p className="mt-1 text-sm font-black text-white">
                    LKR {getVariantPrice(selectedVariant)}
                  </p>
                </div>

                <div className="border border-slate-800 bg-[#07101f] p-4">
                  <p className="text-xs font-bold uppercase text-slate-500">Existing Stock</p>
                  <p className="mt-1 text-sm font-black text-white">
                    {getVariantStock(selectedVariant)}
                  </p>
                </div>
              </div>
            ) : null}
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
            {saving ? "Saving..." : "Save Price & Inventory"}
          </button>
        </div>
      </form>
    </ProductPageLayout>
  );
}
