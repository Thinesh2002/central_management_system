import { ChevronRight } from "lucide-react";
import { useNavigate } from "react-router-dom";

const VARIANT_TABS = [
  {
    key: "basic",
    label: "Basic Details",
    path: (productId, variantId) =>
      `/product/local-products/edit/${productId}/variants/${variantId}/edit/basic`,
  },
  {
    key: "price-inventory",
    label: "Price & Inventory",
    path: (productId, variantId) =>
      `/product/local-products/edit/${productId}/variants/${variantId}/edit/price-inventory`,
  },
  {
    key: "images",
    label: "Images",
    path: (productId, variantId) =>
      `/product/local-products/edit/${productId}/variants/${variantId}/edit/images`,
  },
  {
    key: "attributes",
    label: "Attributes",
    path: (productId, variantId) =>
      `/product/local-products/edit/${productId}/variants/${variantId}/edit/attributes`,
  },
];

function getVariantSku(variant) {
  return variant?.variant_sku || variant?.sku || "";
}

function getProductTitle(product) {
  return (
    product?.title ||
    product?.name ||
    product?.product_name ||
    product?.sku ||
    product?.product_sku ||
    "Local Product"
  );
}

function getProductSku(product) {
  return product?.sku || product?.product_sku || product?.local_sku || "";
}

export default function VariantPageLayout({
  productId,
  variantId,
  active,
  product,
  variant,
  children,
}) {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#080d16] text-slate-100">
      <div className="w-full">
        <div className="border-b border-slate-800 bg-[#0b111d]">
          <div className="flex min-h-[48px] flex-col gap-2 px-4 pt-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-slate-500">
                <button
                  type="button"
                  onClick={() => navigate("/product/local-products")}
                  className="cursor-pointer text-slate-400 transition hover:text-white"
                >
                  Local Products
                </button>

                <ChevronRight size={13} className="text-slate-600" />

                <button
                  type="button"
                  onClick={() =>
                    navigate(`/product/local-products/edit/${productId}/variants`)
                  }
                  className="cursor-pointer text-slate-400 transition hover:text-white"
                >
                  {getProductSku(product) || getProductTitle(product)}
                </button>

                <ChevronRight size={13} className="text-slate-600" />

                <span className="max-w-[300px] truncate text-slate-300">
                  Variant: {getVariantSku(variant) || "New Variant"}
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={() =>
                navigate(`/product/local-products/edit/${productId}/variants`)
              }
              className="inline-flex h-7 shrink-0 cursor-pointer items-center gap-1.5 border border-slate-700 px-2.5 text-[11px] font-semibold text-slate-300 hover:border-orange-400 hover:text-orange-300"
            >
              Back to Variations
            </button>
          </div>

          <div className="overflow-x-auto px-4">
            <div className="flex min-w-max items-center gap-7">
              {VARIANT_TABS.map((tab) => {
                const isActive = active === tab.key;
                const disabled = !variantId && tab.key !== "basic";

                return (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() =>
                      !disabled && navigate(tab.path(productId, variantId))
                    }
                    disabled={disabled}
                    className={`h-10 cursor-pointer whitespace-nowrap border-b-2 px-1 text-[12px] font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 ${
                      isActive
                        ? "border-white text-white"
                        : "border-transparent text-slate-500 hover:border-slate-500 hover:text-slate-200"
                    }`}
                  >
                    {tab.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <main className="w-full overflow-x-hidden p-4">{children}</main>
      </div>
    </div>
  );
}
