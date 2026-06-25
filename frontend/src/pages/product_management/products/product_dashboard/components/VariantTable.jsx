import { EMPTY_IMAGE } from "../constants/localProductsDashboardConstants";
import {
  getMainImageFromRows,
  getVariantImageRows,
} from "../utils/localProductsImageHelpers";
import {
  getStableVariantKey,
  getStockValue,
  getVariantId,
  getVariantName,
  getVariantSku,
} from "../utils/localProductsTableHelpers";

function pickFirstValue(...values) {
  return values.find(
    (value) => value !== undefined && value !== null && String(value).trim() !== ""
  );
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
}) {
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
            <col className="w-[38%]" />
            <col className="w-[26%]" />
            <col className="w-[110px]" />
            <col className="w-[130px]" />
            <col className="w-[130px]" />
          </colgroup>

          <thead className="border-b border-slate-600 bg-[#1b2a3a] text-left text-[10px] font-semibold uppercase tracking-wide text-yellow-300">
            <tr>
              <th className="px-3 py-3">Image</th>
              <th className="px-3 py-3">Variant Name</th>
              <th className="px-3 py-3">SKU</th>
              <th className="px-3 py-3 text-center">Stock</th>
              <th className="px-3 py-3 text-right">Price</th>
              <th className="px-3 py-3 text-center">Status</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-700/70 bg-[#111827]">
            {variants.map((variant, index) => {
              const variantId = getVariantId(variant);
              const variantName = getVariantName(variant);
              const variantSku = getVariantSku(variant);
              const stock = getStockValue(variant);
              const status = variant.status || variant.active_status || "-";

              const variantRows = getVariantImageRows(
                productImages,
                productId,
                variantId
              );

              const variantImage =
                getMainImageFromRows(variantRows) || EMPTY_IMAGE;

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
                      className="h-10 w-10 cursor-pointer overflow-hidden rounded bg-white ring-1 ring-slate-600 transition hover:ring-cyan-400"
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
                    <span
                      className="block truncate text-[11px] font-normal text-slate-200"
                      title={variantSku}
                    >
                      {variantSku}
                    </span>
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
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}