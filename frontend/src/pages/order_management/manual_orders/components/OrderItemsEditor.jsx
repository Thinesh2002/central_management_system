import { Plus, Search, Trash2 } from "lucide-react";
import ProductImage from "./ProductImage";
import { money, moneyNumber, recalcItem } from "../utils/orderFrontendHelpers";

function firstText(...values) {
  for (const value of values) {
    if (value === undefined || value === null) continue;

    if (typeof value === "string" || typeof value === "number") {
      const text = String(value).trim();

      if (
        text &&
        text !== "null" &&
        text !== "undefined" &&
        text !== "[object Object]" &&
        text !== "Object"
      ) {
        return text;
      }
    }
  }

  return "";
}

function imageText(value) {
  if (!value) return "";

  if (typeof value === "string") {
    const text = value.trim();

    if (
      text &&
      text !== "null" &&
      text !== "undefined" &&
      text !== "[object Object]" &&
      text !== "Object"
    ) {
      return text;
    }

    return "";
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      const result = imageText(item);
      if (result) return result;
    }

    return "";
  }

  if (typeof value === "object") {
    return imageText(
      value.image_url ||
        value.imageUrl ||
        value.product_image ||
        value.productImage ||
        value.product_image_url ||
        value.productImageUrl ||
        value.main_image ||
        value.mainImage ||
        value.thumbnail ||
        value.thumbnail_url ||
        value.thumbnailUrl ||
        value.url ||
        value.src ||
        value.path ||
        value.file_path ||
        value.filePath ||
        value.image_path ||
        value.imagePath ||
        value.filename ||
        value.file_name ||
        value.fileName
    );
  }

  return "";
}

function getProductTitle(item = {}) {
  return firstText(
    item.product_name,
    item.productName,
    item.product_title,
    item.productTitle,
    item.title,
    item.name,
    item.local_product_name,
    item.localProductName,
    item.product?.product_name,
    item.product?.productName,
    item.product?.product_title,
    item.product?.productTitle,
    item.product?.title,
    item.product?.name,
    item.local_product?.product_name,
    item.local_product?.productName,
    item.local_product?.product_title,
    item.local_product?.productTitle,
    item.local_product?.title,
    item.local_product?.name
  );
}

function getProductSku(item = {}) {
  return firstText(
    item.sku,
    item.SKU,
    item.product_sku,
    item.productSku,
    item.seller_sku,
    item.sellerSku,
    item.local_sku,
    item.localSku,
    item.variant_sku,
    item.variantSku,
    item.child_sku,
    item.childSku,
    item.product?.sku,
    item.product?.SKU,
    item.product?.product_sku,
    item.product?.productSku,
    item.product?.seller_sku,
    item.product?.sellerSku,
    item.product?.variant_sku,
    item.product?.variantSku,
    item.local_product?.sku,
    item.local_product?.SKU,
    item.local_product?.product_sku,
    item.local_product?.productSku,
    item.local_product?.seller_sku,
    item.local_product?.sellerSku,
    item.local_product?.variant_sku,
    item.local_product?.variantSku
  );
}

function getProductImage(item = {}) {
  return imageText(
    item.image_url ||
      item.imageUrl ||
      item.image_path ||
      item.imagePath ||
      item.product_image ||
      item.productImage ||
      item.product_image_url ||
      item.productImageUrl ||
      item.main_image ||
      item.mainImage ||
      item.thumbnail ||
      item.thumbnail_url ||
      item.thumbnailUrl ||
      item.image ||
      item.images ||
      item.product?.image_url ||
      item.product?.imageUrl ||
      item.product?.image_path ||
      item.product?.imagePath ||
      item.product?.product_image ||
      item.product?.productImage ||
      item.product?.product_image_url ||
      item.product?.productImageUrl ||
      item.product?.main_image ||
      item.product?.mainImage ||
      item.product?.thumbnail ||
      item.product?.thumbnail_url ||
      item.product?.thumbnailUrl ||
      item.product?.image ||
      item.product?.images ||
      item.local_product?.image_url ||
      item.local_product?.imageUrl ||
      item.local_product?.image_path ||
      item.local_product?.imagePath ||
      item.local_product?.product_image ||
      item.local_product?.productImage ||
      item.local_product?.product_image_url ||
      item.local_product?.productImageUrl ||
      item.local_product?.main_image ||
      item.local_product?.mainImage ||
      item.local_product?.thumbnail ||
      item.local_product?.thumbnail_url ||
      item.local_product?.thumbnailUrl ||
      item.local_product?.image ||
      item.local_product?.images
  );
}

function cleanItem(item = {}) {
  const sku = getProductSku(item);
  const productName = getProductTitle(item);
  const imageUrl = getProductImage(item);

  return recalcItem({
    ...item,
    sku,
    product_name: productName,
    image_url: imageUrl,
    quantity: Number(item.quantity || item.qty || 1),
    unit_price: Number(
      item.unit_price ||
        item.unitPrice ||
        item.selling_price ||
        item.sellingPrice ||
        item.price ||
        0
    ),
    item_status: item.item_status || item.itemStatus || "Active",
  });
}

export default function OrderItemsEditor({
  items = [],
  onChange,
  onOpenProductPicker,
  onDeleteExistingItem,
}) {
  function updateItem(index, patch) {
    const next = items.map((item, itemIndex) => {
      if (itemIndex !== index) return item;

      return cleanItem({
        ...item,
        ...patch,
      });
    });

    onChange(next);
  }

  function addManualItem() {
    onChange([
      ...items,
      cleanItem({
        temp_id: `manual-${Date.now()}`,
        sku: "",
        product_name: "",
        description: "",
        image_url: "",
        quantity: 1,
        unit_price: 0,
        item_total: 0,
        item_status: "Active",
      }),
    ]);
  }

  async function removeItem(index) {
    const item = items[index];

    if (item?.id && typeof onDeleteExistingItem === "function") {
      const ok = window.confirm("Remove this order item?");
      if (!ok) return;

      await onDeleteExistingItem(item);
    }

    onChange(items.filter((_, itemIndex) => itemIndex !== index));
  }

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-950/80">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 px-5 py-4">
        <div>
          <h3 className="text-base font-semibold text-slate-100">
            Order Items
          </h3>
          <p className="text-sm text-slate-400">
            Product image, title and SKU only show.
          </p>
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={onOpenProductPicker}
            className="inline-flex items-center gap-2 rounded-xl bg-orange-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-orange-600"
          >
            <Search size={16} />
            Select Product
          </button>

          <button
            type="button"
            onClick={addManualItem}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-700 px-4 py-2.5 text-sm font-semibold text-slate-200 hover:border-orange-500 hover:text-orange-300"
          >
            <Plus size={16} />
            Manual Item
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[920px] text-left text-sm">
          <thead className="bg-slate-900/80 text-xs uppercase tracking-wide text-slate-400">
            <tr>
              <th className="px-4 py-3">Product</th>
              <th className="px-4 py-3">SKU</th>
              <th className="px-4 py-3">Qty</th>
              <th className="px-4 py-3">Unit Price</th>
              <th className="px-4 py-3">Total</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Action</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-800">
            {items.length ? (
              items.map((item, index) => {
                const row = cleanItem(item);
                const productTitle = row.product_name;
                const productSku = row.sku;
                const productImage = row.image_url;

                return (
                  <tr
                    key={item.id || item.temp_id || index}
                    className="align-top hover:bg-slate-900/50"
                  >
                    <td className="px-4 py-4">
                      <div className="flex min-w-[320px] items-center gap-3">
                        <ProductImage
                          src={productImage}
                          alt={productTitle || "Product"}
                          size="md"
                        />

                        <div className="min-w-0 flex-1">
                          <input
                            value={productTitle}
                            onChange={(event) =>
                              updateItem(index, {
                                product_name: event.target.value,
                              })
                            }
                            placeholder="Product name"
                            className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm font-medium text-slate-100 outline-none focus:border-orange-500"
                          />
                        </div>
                      </div>
                    </td>

                    <td className="px-4 py-4">
                      <input
                        value={productSku}
                        onChange={(event) =>
                          updateItem(index, {
                            sku: event.target.value,
                          })
                        }
                        placeholder="SKU"
                        className="w-40 rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs font-semibold text-orange-200 outline-none focus:border-orange-500"
                      />
                    </td>

                    <td className="px-4 py-4">
                      <input
                        type="number"
                        min="1"
                        value={row.quantity || 1}
                        onChange={(event) =>
                          updateItem(index, {
                            quantity: event.target.value,
                          })
                        }
                        className="w-20 rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none focus:border-orange-500"
                      />
                    </td>

                    <td className="px-4 py-4">
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={row.unit_price || 0}
                        onChange={(event) =>
                          updateItem(index, {
                            unit_price: event.target.value,
                          })
                        }
                        className="w-28 rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none focus:border-orange-500"
                      />
                    </td>

                    <td className="px-4 py-4 font-semibold text-slate-100">
                      Rs. {money(row.item_total)}
                    </td>

                    <td className="px-4 py-4">
                      <select
                        value={row.item_status || "Active"}
                        onChange={(event) =>
                          updateItem(index, {
                            item_status: event.target.value,
                          })
                        }
                        className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none focus:border-orange-500"
                      >
                        <option value="Active">Active</option>
                        <option value="Cancelled">Cancelled</option>
                        <option value="Returned">Returned</option>
                        <option value="Deleted">Deleted</option>
                      </select>
                    </td>

                    <td className="px-4 py-4 text-right">
                      <button
                        type="button"
                        onClick={() => removeItem(index)}
                        className="inline-flex items-center justify-center rounded-lg border border-rose-500/40 p-2 text-rose-300 hover:bg-rose-500/10"
                        title="Remove item"
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td
                  colSpan="7"
                  className="px-4 py-12 text-center text-slate-400"
                >
                  No order items added yet. Select product or add manual item.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="flex justify-end border-t border-slate-800 px-5 py-4 text-sm text-slate-400">
        {items.length} item(s) • Items total Rs.{" "}
        {money(
          items.reduce((total, item) => {
            const row = cleanItem(item);
            return total + moneyNumber(row.item_total);
          }, 0)
        )}
      </div>
    </div>
  );
}