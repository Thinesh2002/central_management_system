import { useNavigate } from "react-router-dom";
import { TrendingUp } from "lucide-react";
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
  const navigate = useNavigate();
  const mainImage = getMainVariantImage(variant);
  const variantSku = getVariantSku(variant);
  const hasSku = variantSku && variantSku !== "-";

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
                SKU:{" "}
                {hasSku ? (
                  <button
                    type="button"
                    onClick={() =>
                      navigate(`/order-management/sku-report/${encodeURIComponent(variantSku)}`)
                    }
                    className="cursor-pointer text-orange-300 underline decoration-dotted transition hover:text-orange-200"
                    title={`View SKU economics report for ${variantSku}`}
                  >
                    {variantSku}
                  </button>
                ) : (
                  variantSku
                )}
              </p>

              <p className="mt-1 text-xs text-slate-500">
                ID: {getVariantId(variant)}
              </p>
            </div>

            <div className="flex flex-col items-end gap-1.5">
              <StockBadge variant={variant} />

              {hasSku && (
                <button
                  type="button"
                  onClick={() =>
                    navigate(`/order-management/sku-report/${encodeURIComponent(variantSku)}`)
                  }
                  className="inline-flex items-center gap-1 rounded-md border border-orange-500/30 bg-orange-500/10 px-2 py-1 text-[10px] font-semibold text-orange-300 hover:bg-orange-500/20"
                >
                  <TrendingUp size={11} /> SKU Report
                </button>
              )}
            </div>
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

function ChildSkuQuickLinks({ variants }) {
  const navigate = useNavigate();

  const skus = variants
    .map((variant) => getVariantSku(variant))
    .filter((sku) => sku && sku !== "-");

  if (!skus.length) return null;

  return (
    <div className="mb-4 rounded-lg border border-slate-800 bg-[#070b16] p-3">
      <p className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase text-slate-500">
        <TrendingUp size={12} className="text-orange-400" />
        All Child SKU Economic Reports
      </p>

      <div className="flex flex-wrap gap-1.5">
        {skus.map((sku) => (
          <button
            key={sku}
            type="button"
            onClick={() => navigate(`/order-management/sku-report/${encodeURIComponent(sku)}`)}
            className="cursor-pointer rounded-md border border-orange-500/30 bg-orange-500/10 px-2 py-1 text-[11px] font-mono font-semibold text-orange-300 hover:bg-orange-500/20"
          >
            {sku}
          </button>
        ))}
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

      <ChildSkuQuickLinks variants={variants} />

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