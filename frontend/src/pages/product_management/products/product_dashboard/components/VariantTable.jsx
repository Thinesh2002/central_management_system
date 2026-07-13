import { Edit, Eye, Trash2 } from "lucide-react";
import { usePagePermission } from "../../../../../components/common/permissions/PermissionsProvider";
import { usePageOverlay } from "../../../../../components/common/page_overlay/PageOverlayProvider";
import { EMPTY_IMAGE } from "../constants/localProductsDashboardConstants";
import {
  getMainImageFromRows,
  getVariantImageRows,
} from "../utils/localProductsImageHelpers";
import {
  getStableVariantKey,
  getVariantId,
  getVariantName,
  getVariantSku,
} from "../utils/localProductsTableHelpers";


function getVariantOwnImage(variant = {}) {
  return (
    variant.main_image_url ||
    variant.primary_image_url ||
    variant.image_url ||
    variant.variant_image_url ||
    variant.product_image_url ||
    variant.thumbnail_url ||
    ""
  );
}

function pickFirstValue(...values) {
  return values.find(
    (value) => value !== undefined && value !== null && String(value).trim() !== ""
  );
}

function clean(value) {
  return String(value ?? "").trim();
}

function sameSku(left, right) {
  const leftValue = clean(left).toLowerCase();
  const rightValue = clean(right).toLowerCase();
  return Boolean(leftValue && rightValue && leftValue === rightValue);
}

function toNumber(value) {
  const number = Number(String(value ?? "").replace(/[^\d.-]/g, ""));
  return Number.isFinite(number) ? number : 0;
}

function toArray(value) {
  if (Array.isArray(value)) return value;
  if (Array.isArray(value?.data)) return value.data;
  if (Array.isArray(value?.rows)) return value.rows;
  if (Array.isArray(value?.items)) return value.items;
  return [];
}

function getInventorySku(row = {}) {
  return clean(
    row.sku ||
      row.variant_sku ||
      row.product_sku ||
      row.local_sku ||
      row.seller_sku ||
      ""
  );
}

function getInventoryRows(product = {}, variant = {}) {
  const variantSku = getVariantSku(variant);

  const rows = [
    ...toArray(product.inventory_rows),
    ...toArray(product.product_inventory),
    ...toArray(product.inventory),
    ...toArray(product.inventoryRows),
    ...toArray(variant.inventory_rows),
    ...toArray(variant.product_inventory),
    ...toArray(variant.inventory),
    ...toArray(variant.inventoryRows),
  ];

  const matchedRows = rows.filter((row) =>
    sameSku(getInventorySku(row), variantSku)
  );

  const uniqueMap = new Map();

  matchedRows.forEach((row, index) => {
    const key = row.id || row.inventory_id || `${getInventorySku(row)}-${index}`;
    uniqueMap.set(String(key), row);
  });

  return Array.from(uniqueMap.values());
}

function getStockText(product = {}, variant = {}) {
  const inventoryRows = getInventoryRows(product, variant);

  if (inventoryRows.length > 0) {
    const stockQty = inventoryRows.reduce(
      (sum, row) => sum + toNumber(row.stock_qty),
      0
    );

    return stockQty;
  }

  const fallbackStock = pickFirstValue(
    variant.stock_qty,
    variant.stock,
    variant.quantity,
    variant.qty,
    variant.available_qty,
    product.stock_qty,
    product.stock,
    product.quantity,
    product.qty,
    product.available_qty
  );

  if (fallbackStock === undefined || fallbackStock === null || String(fallbackStock).trim() === "") {
    return "-";
  }

  return fallbackStock;
}

function getStockStatus(product = {}, variant = {}) {
  const inventoryRows = getInventoryRows(product, variant);

  if (inventoryRows.length > 0) {
    const stockQty = inventoryRows.reduce(
      (sum, row) => sum + toNumber(row.stock_qty),
      0
    );

    if (stockQty <= 0) return "Out of Stock";
    return "In Stock";
  }

  return variant.status || variant.active_status || product.status || "-";
}

function getPriceText(record = {}) {
  const currency = record.currency || record.currency_code || "LKR";

  const price = pickFirstValue(
    record.main_price,
    record.sale_price,
    record.selling_price,
    record.regular_price,
    record.price,
    record.variant_price,
    record.variant_sale_price,
    record.variant_selling_price,
    record.unit_price,
    record.unit_selling_price,
    record.product_price,
    record.local_price,
    record.amount
  );

  if (price === undefined || price === null || String(price).trim() === "") {
    return "-";
  }

  return `${currency} ${price}`;
}

export default function VariantTable({
  variants = [],
  product,
  productId,
  productKey,
  productImages,
  setImagePreview,
  onDeleteVariant,
}) {
  const { canEdit, canDelete } = usePagePermission("local_products");
  const { openOverlay } = usePageOverlay();

  if (!variants.length) {
    return (
      <div className="border border-dashed border-slate-700 bg-[#111827] px-4 py-4 text-[12px] text-slate-400">
        Variant details are not included in this product response.
      </div>
    );
  }

  return (
    <div className="w-full overflow-hidden border border-slate-700 bg-[#050917] shadow-xl shadow-black/20">
      <div className="w-full overflow-x-auto">
        <table className="w-full min-w-full table-fixed border-collapse text-[11px]">
          <colgroup>
            <col className="w-[90px]" />
            <col className="w-[32%]" />
            <col className="w-[22%]" />
            <col className="w-[110px]" />
            <col className="w-[130px]" />
            <col className="w-[110px]" />
            <col className="w-[120px]" />
          </colgroup>

          <thead className="border-b border-slate-600 bg-[#1b2a3a] text-left text-[10px] font-semibold uppercase tracking-wide text-yellow-300">
            <tr>
              <th className="px-3 py-3">Image</th>
              <th className="px-3 py-3">Variant Name</th>
              <th className="px-3 py-3">SKU</th>
              <th className="px-3 py-3 text-center">Stock</th>
              <th className="px-3 py-3 text-right">Price</th>
              <th className="px-3 py-3 text-center">Status</th>
              <th className="px-3 py-3 text-right">Actions</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-700/70 bg-[#111827]">
            {variants.map((variant, index) => {
              const variantId = getVariantId(variant);
              const variantName = getVariantName(variant);
              const variantSku = getVariantSku(variant);
              const stock = getStockText(product, variant);
              const status = getStockStatus(product, variant);

              const variantRows = getVariantImageRows(
                productImages,
                productId,
                variantId
              );

              const variantImage =
                getMainImageFromRows(variantRows) || getVariantOwnImage(variant) || EMPTY_IMAGE;

              const priceText = getPriceText({
                ...product,
                ...variant,
              });

              return (
                <tr
                  key={getStableVariantKey(variant, productKey, index)}
                  className="bg-[#1b2a3a] text-[11px] text-slate-200 transition hover:bg-[#21344a]"
                >
                  <td className="px-3 py-3 align-middle">
                    <button
                      type="button"
                      onClick={() =>
                        setImagePreview({
                          title: variantName,
                          image: variantImage,
                        })
                      }
                      className="relative z-0 h-9 w-9 shrink-0 cursor-pointer overflow-hidden rounded bg-white ring-1 ring-slate-600 transition-transform duration-150 ease-out hover:z-20 hover:scale-[2.4] hover:shadow-xl hover:ring-cyan-400"
                      title="View variant image"
                    >
                      <img
                        src={variantImage}
                        alt={variantName}
                        className="h-full w-full object-contain"
                        onError={(event) => {
                          event.currentTarget.src = EMPTY_IMAGE;
                        }}
                      />
                    </button>
                  </td>

                  <td className="px-3 py-3 align-middle">
                    <span
                      className="line-clamp-2 text-[11px] font-normal leading-4 text-slate-100"
                      title={variantName}
                    >
                      {variantName}
                    </span>
                  </td>

                  <td className="px-3 py-3 align-middle">
                    {variantSku ? (
                      <button
                        type="button"
                        onClick={() => openOverlay(`/order-management/sku-report/${encodeURIComponent(variantSku)}`)}
                        className="block w-full cursor-pointer truncate text-left text-[11px] font-normal text-orange-300 underline decoration-dotted transition hover:text-orange-200"
                        title={`View SKU report for ${variantSku}`}
                      >
                        {variantSku}
                      </button>
                    ) : (
                      <span className="block truncate text-[11px] font-normal text-slate-200">-</span>
                    )}
                  </td>

                  <td className="px-3 py-3 text-center align-middle">
                    <span className="text-[11px] font-normal text-slate-100">
                      {stock}
                    </span>
                  </td>

                  <td className="px-3 py-3 text-right align-middle">
                    <span className="text-[11px] font-normal text-slate-100">
                      {priceText}
                    </span>
                  </td>

                  <td className="px-3 py-3 text-center align-middle">
                    <span className="text-[11px] font-normal text-slate-200">
                      {status}
                    </span>
                  </td>

                  <td className="px-3 py-3 align-middle">
                    <div className="flex justify-end gap-2.5">
                      <button
                        type="button"
                        onClick={() =>
                          openOverlay(`/product/local-products/edit/${productId}/variants/${variantId}/view`)
                        }
                        className="inline-flex h-7 w-7 cursor-pointer items-center justify-center text-sky-300 transition hover:text-sky-200"
                        title="View variant"
                      >
                        <Eye size={14} />
                      </button>

                      {canEdit && (
                        <button
                          type="button"
                          onClick={() =>
                            openOverlay(`/product/local-products/edit/${productId}/variants/${variantId}/edit/basic`)
                          }
                          className="inline-flex h-7 w-7 cursor-pointer items-center justify-center text-amber-300 transition hover:text-amber-200"
                          title="Edit variant"
                        >
                          <Edit size={14} />
                        </button>
                      )}

                      {canDelete && (
                        <button
                          type="button"
                          onClick={() => onDeleteVariant && onDeleteVariant(variant)}
                          className="inline-flex h-7 w-7 cursor-pointer items-center justify-center text-rose-300 transition hover:text-rose-200"
                          title="Delete variant"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}