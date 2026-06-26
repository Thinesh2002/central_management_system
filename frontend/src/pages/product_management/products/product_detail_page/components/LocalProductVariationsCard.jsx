import {
  formatNumber,
  getProductVariants,
  shouldShowProductVariations,
  valueOf,
} from "../utils/localProductViewHelpers";
import {
  getMainVariantImage,
  getVariantSubImageRows,
  handleImageError,
  resolveImageUrl,
} from "../utils/localProductViewImageHelpers";

function getVariantTitle(variant = {}, index) {
  return valueOf(
    variant,
    [
      "variant_name",
      "name",
      "title",
      "colour_name",
      "color_name",
      "colour",
      "color",
    ],
    `Variation ${index + 1}`
  );
}

function getVariantSku(variant = {}) {
  return valueOf(
    variant,
    ["variant_sku", "sku", "product_sku", "seller_sku", "item_sku"],
    "-"
  );
}

function getVariantId(variant = {}) {
  return valueOf(
    variant,
    [
      "product_variant_id",
      "variant_id",
      "local_variant_id",
      "productVariantId",
      "variantId",
      "id",
    ],
    "-"
  );
}

function StockBadge({ variant }) {
  const availableQty = Number(valueOf(variant, ["available_qty"], 0));
  const stockStatus = String(
    valueOf(variant, ["stock_status"], "")
  ).toLowerCase();

  const outOfStock =
    variant?.is_out_of_stock === true ||
    availableQty <= 0 ||
    stockStatus === "out of stock";

  return (
    <span
      className={[
        "inline-flex w-fit rounded-md px-2 py-1 text-[11px] font-semibold",
        outOfStock
          ? "bg-red-500/10 text-red-300 ring-1 ring-red-500/20"
          : "bg-emerald-500/10 text-emerald-300 ring-1 ring-emerald-500/20",
      ].join(" ")}
    >
      {outOfStock ? "Out of Stock" : "In Stock"}
    </span>
  );
}

function VariantSubImages({ variant }) {
  const subImages = getVariantSubImageRows(variant);

  if (subImages.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-slate-800 bg-[#070b16] px-3 py-4 text-center">
        <p className="text-xs font-medium text-slate-500">No sub images</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-4 gap-2 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-8 xl:grid-cols-10">
      {subImages.map((image, index) => (
        <div
          key={
            image?.id || image?.image_id || `${resolveImageUrl(image)}-${index}`
          }
          className="aspect-square overflow-hidden rounded-lg border border-slate-800 bg-[#070b16]"
        >
          <img
            src={resolveImageUrl(image)}
            alt={`Variant sub image ${index + 1}`}
            onError={handleImageError}
            className="h-full w-full object-cover"
          />
        </div>
      ))}
    </div>
  );
}

function VariationCard({ variant, index }) {
  const mainImage = getMainVariantImage(variant);

  return (
    <div className="rounded-xl border border-slate-800 bg-[#070b16] p-3">
      <div className="grid gap-4 lg:grid-cols-[160px_1fr]">
        <div>
          <div className="aspect-square overflow-hidden rounded-lg border border-slate-800 bg-[#0b1019]">
            <img
              src={mainImage}
              alt={getVariantTitle(variant, index)}
              onError={handleImageError}
              className="h-full w-full object-contain"
            />
          </div>

          <p className="mt-2 text-center text-[11px] font-semibold text-slate-500">
            Variant Main Image
          </p>
        </div>

        <div className="min-w-0 space-y-3">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h3 className="text-sm font-semibold text-slate-100">
                {getVariantTitle(variant, index)}
              </h3>

              <p className="mt-1 text-xs text-slate-500">
                SKU: {getVariantSku(variant)}
              </p>

              <p className="mt-1 text-xs text-slate-500">
                ID: {getVariantId(variant)}
              </p>
            </div>

            <StockBadge variant={variant} />
          </div>

          <div className="grid gap-2 sm:grid-cols-3">
            <div className="rounded-lg border border-slate-800 bg-[#0b1019] p-2">
              <p className="text-[11px] font-semibold uppercase text-slate-500">
                Stock
              </p>
              <p className="mt-1 text-sm font-semibold text-slate-200">
                {formatNumber(valueOf(variant, ["stock_qty"], 0))}
              </p>
            </div>

            <div className="rounded-lg border border-slate-800 bg-[#0b1019] p-2">
              <p className="text-[11px] font-semibold uppercase text-slate-500">
                Reserved
              </p>
              <p className="mt-1 text-sm font-semibold text-slate-200">
                {formatNumber(valueOf(variant, ["reserved_qty"], 0))}
              </p>
            </div>

            <div className="rounded-lg border border-slate-800 bg-[#0b1019] p-2">
              <p className="text-[11px] font-semibold uppercase text-slate-500">
                Available
              </p>
              <p className="mt-1 text-sm font-semibold text-slate-100">
                {formatNumber(valueOf(variant, ["available_qty"], 0))}
              </p>
            </div>
          </div>

          <div>
            <p className="mb-2 text-xs font-semibold text-slate-400">
              Variant Sub Images
            </p>
            <VariantSubImages variant={variant} />
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LocalProductVariationsCard({ product = {} }) {
  if (!shouldShowProductVariations(product)) return null;

  const variants = getProductVariants(product);

  return (
    <section className="rounded-xl border border-slate-800 bg-[#0b1019] p-4 shadow-xl shadow-black/20">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-slate-100">
            Product Variations
          </h2>
          <p className="mt-1 text-xs text-slate-500">
            Parent product stock is managed by variations only
          </p>
        </div>

        <span className="rounded-md bg-slate-800 px-2.5 py-1 text-xs font-semibold text-slate-300">
          {variants.length} variations
        </span>
      </div>

      <div className="space-y-3">
        {variants.map((variant, index) => (
          <VariationCard
            key={getVariantId(variant) || getVariantSku(variant) || index}
            variant={variant}
            index={index}
          />
        ))}
      </div>
    </section>
  );
}