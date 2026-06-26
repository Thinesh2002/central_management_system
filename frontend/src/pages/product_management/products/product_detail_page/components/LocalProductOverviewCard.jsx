import { ImageIcon } from "lucide-react";
import {
  formatNumber,
  getProductTitle,
  valueOf,
} from "../utils/localProductViewHelpers";
import {
  EMPTY_IMAGE,
  getMainProductImage,
  handleImageError,
} from "../utils/localProductViewImageHelpers";

function InfoItem({ label, value }) {
  return (
    <div className="rounded-lg border border-slate-800 bg-[#070b16] p-3">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </p>
      <p className="mt-1 break-words text-sm font-semibold text-slate-200">
        {value || "-"}
      </p>
    </div>
  );
}

export default function LocalProductOverviewCard({ product = {} }) {
  const mainImage = getMainProductImage(product);

  return (
    <section className="rounded-xl border border-slate-800 bg-[#0b1019] p-4 shadow-xl shadow-black/20">
      <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
        <div className="rounded-xl border border-slate-800 bg-[#070b16] p-3">
          <div className="relative flex aspect-square items-center justify-center overflow-hidden rounded-lg bg-[#111827]">
            <img
              src={mainImage}
              alt={getProductTitle(product)}
              onError={handleImageError}
              className="h-full w-full object-contain"
            />

            {mainImage === EMPTY_IMAGE && (
              <div className="absolute flex flex-col items-center gap-2 text-slate-500">
                <ImageIcon size={28} />
                <span className="text-xs font-semibold">No Image</span>
              </div>
            )}
          </div>

          <p className="mt-3 text-center text-xs font-medium text-slate-500">
            Parent product main image only
          </p>
        </div>

        <div className="space-y-4">
          <div>
            <h1 className="line-clamp-2 text-lg font-semibold text-slate-100">
              {getProductTitle(product)}
            </h1>
            <p className="mt-1 text-xs font-medium text-slate-500">
              SKU:{" "}
              {valueOf(
                product,
                ["sku", "product_sku", "local_sku", "seller_sku"],
                "-"
              )}
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            <InfoItem
              label="Category"
              value={valueOf(product, ["category_name", "category"], "-")}
            />

            <InfoItem
              label="Sub Category"
              value={valueOf(
                product,
                ["sub_category_name", "subcategory_name", "subCategoryName"],
                "-"
              )}
            />

            <InfoItem
              label="Product Model"
              value={valueOf(
                product,
                ["product_model_name", "model_name", "model"],
                "-"
              )}
            />

            <InfoItem
              label="Colour"
              value={valueOf(
                product,
                ["colour_name", "color_name", "colour", "color"],
                "-"
              )}
            />

            <InfoItem
              label="Available Stock"
              value={formatNumber(valueOf(product, ["available_qty"], 0))}
            />

            <InfoItem
              label="Stock Status"
              value={valueOf(product, ["stock_status"], "-")}
            />
          </div>
        </div>
      </div>
    </section>
  );
}