import { useEffect, useState } from "react";
import { RefreshCw, Save } from "lucide-react";
import { useParams } from "react-router-dom";
import localProductsApi from "../../../../../config/sub_api/product_management_api/local_products_api";
import { getStoredUser } from "../../../../../config/auth";
import { useToast } from "../../../../../components/common/toast/ToastProvider";
import { useCanViewCostPrice } from "../../../../../components/common/permissions/PermissionsProvider";
import Loader from "../../../../../components/common/Loader";
import { getErrorMessage, normalizeList } from "../../utils/productSku";
import { money, calcProductSelling, calcDaraz } from "../../utils/priceCalc";
import { getRecordId } from "../utils/variantPageHelpers";
import VariantPageLayout from "./VariantPageLayout";

function getCurrentUserId() {
  const user = getStoredUser?.();
  return user?.id || user?.user_id || user?.user_uid || 1;
}

function unwrapOne(response) {
  const data = response?.data?.data ?? response?.data ?? response;
  if (Array.isArray(data)) return data[0] || null;
  return data || null;
}

async function safeFetch(fn) {
  try {
    const response = await fn();
    return unwrapOne(response);
  } catch (error) {
    if (error?.response?.status === 404) return null;
    throw error;
  }
}

const emptyPrice = {
  id: "",
  cost_price: 0,
  sale_price: 0,
  local_selling_price: 0,
  daraz_price: 0,
  woo_price: 0,
  packing_percent: 3,
  profit_percent: 50,
  daraz_fee_percent: 20,
  advertising_percent: 10,
  currency: "LKR",
};

const emptyInventory = {
  id: "",
  stock_qty: 0,
  reserved_qty: 0,
  available_qty: 0,
  low_stock_alert_qty: 0,
};

const AUTO_CALC_FIELDS = new Set([
  "cost_price",
  "profit_percent",
  "daraz_fee_percent",
  "advertising_percent",
  "packing_percent",
]);

function FieldBox({ label, children }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-400">
        {label}
      </span>
      {children}
    </label>
  );
}

function NumberInput({ value, onChange, readOnly = false }) {
  return (
    <input
      type="number"
      step="0.01"
      value={value ?? ""}
      readOnly={readOnly}
      onChange={(event) => onChange(event.target.value)}
      className={`h-11 w-full border border-slate-700 bg-[#0a101d] px-3 text-sm font-semibold text-slate-100 outline-none focus:border-orange-400 ${
        readOnly ? "cursor-not-allowed bg-slate-900/60 text-slate-500" : ""
      }`}
    />
  );
}

export default function VariantPriceInventoryPage() {
  const { productId, variantId } = useParams();
  const showToast = useToast();
  const canViewCostPrice = useCanViewCostPrice();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [product, setProduct] = useState(null);
  const [variant, setVariant] = useState(null);
  const [priceForm, setPriceForm] = useState(emptyPrice);
  const [inventoryForm, setInventoryForm] = useState(emptyInventory);

  const variantSku = variant?.variant_sku || variant?.sku || "";

  async function loadData() {
    setLoading(true);

    try {
      const [productRes, variantRes] = await Promise.all([
        localProductsApi.getProductById(productId),
        localProductsApi.getVariants({ product_id: productId }).catch(() => ({ data: [] })),
      ]);

      setProduct(unwrapOne(productRes));

      const variants = normalizeList(variantRes);
      const found = variants.find(
        (item) => String(getRecordId(item)) === String(variantId)
      );
      setVariant(found || null);

      const sku = found?.variant_sku || found?.sku || "";

      if (sku) {
        const [priceRow, inventoryRow] = await Promise.all([
          safeFetch(() => localProductsApi.getPriceBySku(sku)),
          safeFetch(() => localProductsApi.getInventoryBySku(sku)),
        ]);

        setPriceForm({
          id: priceRow?.id || "",
          cost_price: priceRow?.cost_price ?? 0,
          sale_price: priceRow?.sale_price ?? 0,
          local_selling_price: priceRow?.local_selling_price ?? priceRow?.sale_price ?? 0,
          daraz_price: priceRow?.daraz_price ?? 0,
          woo_price: priceRow?.woo_price ?? 0,
          packing_percent: priceRow?.packing_percent ?? 3,
          profit_percent: priceRow?.profit_percent ?? 50,
          daraz_fee_percent: priceRow?.daraz_fee_percent ?? 20,
          advertising_percent: priceRow?.advertising_percent ?? 10,
          currency: priceRow?.currency || "LKR",
        });

        const currentStock = inventoryRow?.stock_qty ?? 0;
        const reservedStock = inventoryRow?.reserved_qty ?? 0;

        setInventoryForm({
          id: inventoryRow?.id || "",
          stock_qty: currentStock,
          reserved_qty: reservedStock,
          available_qty:
            inventoryRow?.available_qty ?? Math.max(money(currentStock) - money(reservedStock), 0),
          low_stock_alert_qty: inventoryRow?.low_stock_alert_qty ?? 0,
        });
      } else {
        setPriceForm(emptyPrice);
        setInventoryForm(emptyInventory);
      }
    } catch (error) {
      alert(getErrorMessage(error, "Unable to load price & inventory."));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productId, variantId]);

  function setPriceField(name, value) {
    setPriceForm((prev) => {
      const next = { ...prev, [name]: value };

      if (AUTO_CALC_FIELDS.has(name)) {
        const productSelling = calcProductSelling(next.cost_price, next.profit_percent).toFixed(2);
        const daraz = calcDaraz(
          next.cost_price,
          next.profit_percent,
          next.daraz_fee_percent,
          next.advertising_percent,
          next.packing_percent
        ).toFixed(2);

        next.sale_price = productSelling;
        next.local_selling_price = productSelling;
        next.daraz_price = daraz;
        next.woo_price = productSelling;
      }

      return next;
    });
  }

  function setInventoryField(name, value) {
    setInventoryForm((prev) => {
      const next = { ...prev, [name]: value };
      const current = money(next.stock_qty);
      const reserved = money(next.reserved_qty);
      next.available_qty = Math.max(current - reserved, 0);
      return next;
    });
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (!variantSku) {
      alert("Variant SKU missing. Cannot save.");
      return;
    }

    setSaving(true);

    try {
      const pricePayload = {
        sku: variantSku,
        variant_sku: variantSku,
        product_id: productId,
        variant_id: variantId,
        cost_price: money(priceForm.cost_price),
        sale_price: money(priceForm.local_selling_price || priceForm.sale_price),
        local_selling_price: money(priceForm.local_selling_price || priceForm.sale_price),
        daraz_price: money(priceForm.daraz_price),
        woo_price: money(priceForm.woo_price),
        packing_percent: money(priceForm.packing_percent),
        profit_percent: money(priceForm.profit_percent),
        daraz_fee_percent: money(priceForm.daraz_fee_percent),
        advertising_percent: money(priceForm.advertising_percent),
        currency: priceForm.currency || "LKR",
        status: "active",
        created_by: getCurrentUserId(),
        updated_by: getCurrentUserId(),
      };

      if (priceForm.id) {
        await localProductsApi.patchPrice(priceForm.id, pricePayload);
      } else {
        await localProductsApi.createPrice(pricePayload);
      }

      const currentStock = money(inventoryForm.stock_qty);
      const reservedStock = money(inventoryForm.reserved_qty);

      const inventoryPayload = {
        sku: variantSku,
        stock_qty: currentStock,
        reserved_qty: reservedStock,
        available_qty: Math.max(currentStock - reservedStock, 0),
        low_stock_alert_qty: money(inventoryForm.low_stock_alert_qty),
        created_by: getCurrentUserId(),
        updated_by: getCurrentUserId(),
      };

      if (inventoryForm.id) {
        await localProductsApi.updateInventory(inventoryForm.id, inventoryPayload);
      } else {
        await localProductsApi.createInventory(inventoryPayload);
      }

      showToast("Price & inventory saved successfully.");
      await loadData();
    } catch (error) {
      alert(getErrorMessage(error, "Unable to save price & inventory."));
    } finally {
      setSaving(false);
    }
  }

  return (
    <VariantPageLayout
      productId={productId}
      variantId={variantId}
      active="price-inventory"
      product={product}
      variant={variant}
    >
      <form
        onSubmit={handleSubmit}
        className="border border-slate-800 bg-[#0b1220] text-slate-100"
      >
        <div className="border-b border-slate-800 bg-[#07101f] px-4 py-3">
          <p className="text-sm font-black text-white">Variant Price & Inventory</p>
          <p className="mt-1 text-xs font-semibold text-slate-500">
            SKU: {variantSku || "-"} — enter cost price to auto-calculate selling, Daraz and Woo prices.
          </p>
        </div>

        {loading ? (
          <Loader label="Loading..." minHeight="280px" />
        ) : (
          <div className="space-y-5 p-4">
            <div>
              <p className="mb-3 text-xs font-black uppercase text-orange-300">Price</p>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                {canViewCostPrice && (
                  <FieldBox label="Cost Price">
                    <NumberInput
                      value={priceForm.cost_price}
                      onChange={(value) => setPriceField("cost_price", value)}
                    />
                  </FieldBox>
                )}
                <FieldBox label="Profit %">
                  <NumberInput
                    value={priceForm.profit_percent}
                    onChange={(value) => setPriceField("profit_percent", value)}
                  />
                </FieldBox>
                <FieldBox label="Selling Price (auto)">
                  <NumberInput value={priceForm.local_selling_price} readOnly onChange={() => {}} />
                </FieldBox>
                <FieldBox label="Daraz Fee %">
                  <NumberInput
                    value={priceForm.daraz_fee_percent}
                    onChange={(value) => setPriceField("daraz_fee_percent", value)}
                  />
                </FieldBox>
                <FieldBox label="Advertising %">
                  <NumberInput
                    value={priceForm.advertising_percent}
                    onChange={(value) => setPriceField("advertising_percent", value)}
                  />
                </FieldBox>
                <FieldBox label="Packing %">
                  <NumberInput
                    value={priceForm.packing_percent}
                    onChange={(value) => setPriceField("packing_percent", value)}
                  />
                </FieldBox>
                <FieldBox label="Daraz Price (auto)">
                  <NumberInput value={priceForm.daraz_price} readOnly onChange={() => {}} />
                </FieldBox>
                <FieldBox label="Woo Price (auto = Selling Price)">
                  <NumberInput value={priceForm.woo_price} readOnly onChange={() => {}} />
                </FieldBox>
                <FieldBox label="Currency">
                  <select
                    value={priceForm.currency}
                    onChange={(event) => setPriceField("currency", event.target.value)}
                    className="h-11 w-full border border-slate-700 bg-[#0a101d] px-3 text-sm font-semibold text-slate-100 outline-none focus:border-orange-400"
                  >
                    <option value="LKR">LKR</option>
                    <option value="USD">USD</option>
                    <option value="GBP">GBP</option>
                  </select>
                </FieldBox>
              </div>
            </div>

            <div className="border-t border-slate-800 pt-5">
              <p className="mb-3 text-xs font-black uppercase text-orange-300">Inventory</p>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                <FieldBox label="Stock Qty">
                  <NumberInput
                    value={inventoryForm.stock_qty}
                    onChange={(value) => setInventoryField("stock_qty", value)}
                  />
                </FieldBox>
                <FieldBox label="Reserved Qty">
                  <NumberInput
                    value={inventoryForm.reserved_qty}
                    onChange={(value) => setInventoryField("reserved_qty", value)}
                  />
                </FieldBox>
                <FieldBox label="Available Qty (auto)">
                  <NumberInput value={inventoryForm.available_qty} readOnly onChange={() => {}} />
                </FieldBox>
                <FieldBox label="Low Stock Alert">
                  <NumberInput
                    value={inventoryForm.low_stock_alert_qty}
                    onChange={(value) => setInventoryField("low_stock_alert_qty", value)}
                  />
                </FieldBox>
              </div>
            </div>
          </div>
        )}

        <div className="flex justify-end border-t border-slate-800 bg-[#07101f] px-4 py-3">
          <button
            disabled={saving || loading}
            type="submit"
            className="inline-flex cursor-pointer items-center gap-2 bg-orange-500 px-5 py-2.5 text-sm font-black text-white transition hover:bg-orange-400 disabled:cursor-not-allowed disabled:opacity-60"
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
    </VariantPageLayout>
  );
}
