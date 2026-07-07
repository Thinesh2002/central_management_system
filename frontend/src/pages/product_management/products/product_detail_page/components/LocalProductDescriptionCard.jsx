import {
  formatDateTime,
  formatNumber,
  normalizeArray,
  valueOf,
} from "../utils/localProductViewHelpers";
import { sanitizeHtml } from "../../../../../utils/sanitizeHtml";

function InfoRow({ label, value }) {
  return (
    <div className="grid grid-cols-[140px_1fr] gap-3 border-b border-slate-800/80 py-2 last:border-b-0">
      <p className="text-xs font-medium text-slate-500">{label}</p>
      <p className="break-words text-sm font-medium text-slate-200">
        {value || "-"}
      </p>
    </div>
  );
}

function StockBadge({ product }) {
  const availableQty = Number(valueOf(product, ["available_qty"], 0));
  const stockStatus = valueOf(product, ["stock_status"], "");

  const isOutOfStock =
    product?.is_out_of_stock === true ||
    availableQty <= 0 ||
    String(stockStatus).toLowerCase() === "out of stock";

  return (
    <span
      className={[
        "inline-flex w-fit items-center rounded-md px-2.5 py-1 text-xs font-semibold",
        isOutOfStock
          ? "bg-red-500/10 text-red-300 ring-1 ring-red-500/20"
          : "bg-emerald-500/10 text-emerald-300 ring-1 ring-emerald-500/20",
      ].join(" ")}
    >
      {isOutOfStock ? "Out of Stock" : "In Stock"}
    </span>
  );
}

function getSpecificationName(row = {}) {
  return valueOf(
    row,
    [
      "attribute_name",
      "attribute",
      "specification_name",
      "spec_name",
      "name",
      "label",
    ],
    "-"
  );
}

function getSpecificationValue(row = {}) {
  return valueOf(
    row,
    [
      "attribute_value",
      "value",
      "specification_value",
      "spec_value",
      "option_value",
      "text_value",
    ],
    "-"
  );
}

export default function LocalProductDescriptionCard({ product = {} }) {
  const specifications = normalizeArray(
    product?.specifications ||
      product?.attribute_values ||
      product?.product_attribute_values
  );

  const description = valueOf(
    product,
    ["description", "product_description", "short_description"],
    ""
  );

  return (
    <div className="space-y-4">
      <section className="rounded-xl border border-slate-800 bg-[#0b1019] p-4">
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-slate-100">
              Product Details
            </h2>
            <p className="mt-1 text-xs text-slate-500">
              Category, model, stock and basic product information
            </p>
          </div>

          <StockBadge product={product} />
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-lg border border-slate-800 bg-[#070b16] p-3">
            <InfoRow
              label="Product SKU"
              value={valueOf(
                product,
                ["sku", "product_sku", "local_sku", "seller_sku"],
                "-"
              )}
            />
            <InfoRow
              label="Category"
              value={valueOf(product, ["category_name", "category"], "-")}
            />
            <InfoRow
              label="Sub Category"
              value={valueOf(
                product,
                ["sub_category_name", "subcategory_name", "subCategoryName"],
                "-"
              )}
            />
            <InfoRow
              label="Product Model"
              value={valueOf(
                product,
                ["product_model_name", "model_name", "model"],
                "-"
              )}
            />
            <InfoRow
              label="Colour"
              value={valueOf(
                product,
                ["colour_name", "color_name", "colour", "color"],
                "-"
              )}
            />
          </div>

          <div className="rounded-lg border border-slate-800 bg-[#070b16] p-3">
            <InfoRow
              label="Stock Qty"
              value={formatNumber(valueOf(product, ["stock_qty"], 0))}
            />
            <InfoRow
              label="Reserved Qty"
              value={formatNumber(valueOf(product, ["reserved_qty"], 0))}
            />
            <InfoRow
              label="Available Qty"
              value={formatNumber(valueOf(product, ["available_qty"], 0))}
            />
            <InfoRow
              label="Status"
              value={valueOf(
                product,
                ["status", "active_status", "product_status"],
                "-"
              )}
            />
            <InfoRow
              label="Created"
              value={formatDateTime(
                valueOf(product, ["created_at", "createdAt"], "")
              )}
            />
            <InfoRow
              label="Updated"
              value={formatDateTime(
                valueOf(product, ["updated_at", "updatedAt"], "")
              )}
            />
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-slate-800 bg-[#0b1019] p-4">
        <h2 className="text-sm font-semibold text-slate-100">Description</h2>

        {description ? (
          <div
            className="mt-3 max-w-none text-sm leading-6 text-slate-300"
            dangerouslySetInnerHTML={{ __html: sanitizeHtml(description) }}
          />
        ) : (
          <p className="mt-3 text-sm text-slate-500">No description added.</p>
        )}
      </section>

      <section className="rounded-xl border border-slate-800 bg-[#0b1019] p-4">
        <h2 className="text-sm font-semibold text-slate-100">
          Specifications
        </h2>

        {specifications.length === 0 ? (
          <p className="mt-3 text-sm text-slate-500">
            No specifications added.
          </p>
        ) : (
          <div className="mt-3 overflow-hidden rounded-lg border border-slate-800">
            <table className="w-full text-left text-sm">
              <thead className="bg-[#070b16] text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-3 py-2 font-semibold">Specification</th>
                  <th className="px-3 py-2 font-semibold">Value</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-800">
                {specifications.map((row, index) => (
                  <tr key={row?.id || row?.attribute_id || index}>
                    <td className="px-3 py-2 text-slate-400">
                      {getSpecificationName(row)}
                    </td>
                    <td className="px-3 py-2 font-medium text-slate-200">
                      {getSpecificationValue(row)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}