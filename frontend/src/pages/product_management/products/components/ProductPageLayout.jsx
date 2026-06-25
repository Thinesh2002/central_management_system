import { ChevronRight } from "lucide-react";
import { useNavigate } from "react-router-dom";

const PRODUCT_TABS = [
  {
    key: "basic",
    label: "Basic Details",
    path: (productId) => `/product/local-products/edit/${productId}/basic`,
  },
  {
    key: "price-inventory",
    label: "Price & Inventory",
    path: (productId) =>
      `/product/local-products/edit/${productId}/price-inventory`,
  },
  {
    key: "variants",
    label: "Variations",
    path: (productId) => `/product/local-products/edit/${productId}/variants`,
  },
  {
    key: "images",
    label: "Images",
    path: (productId) => `/product/local-products/edit/${productId}/images`,
  },
  {
    key: "attributes",
    label: "Attributes",
    path: (productId) => `/product/local-products/edit/${productId}/attributes`,
  },
  {
    key: "logs",
    label: "Logs",
    path: (productId) => `/product/local-products/edit/${productId}/logs`,
  },
];

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

export default function ProductPageLayout({
  productId,
  active,
  product,
  children,
  actions,
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

                <span className="max-w-[460px] truncate text-slate-400">
                  {getProductTitle(product)}
                </span>

                {getProductSku(product) ? (
                  <>
                    <ChevronRight size={13} className="text-slate-600" />
                    <span className="max-w-[340px] truncate text-slate-500">
                      {getProductSku(product)}
                    </span>
                  </>
                ) : null}
              </div>
            </div>

            {actions ? (
              <div className="flex shrink-0 flex-wrap gap-2 pb-2 lg:pb-0">
                {actions}
              </div>
            ) : null}
          </div>

          <div className="overflow-x-auto px-4">
            <div className="flex min-w-max items-center gap-7">
              {PRODUCT_TABS.map((tab) => {
                const isActive = active === tab.key;

                return (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => productId && navigate(tab.path(productId))}
                    disabled={!productId}
                    className={`h-12 cursor-pointer whitespace-nowrap border-b-2 px-1 text-sm font-bold transition disabled:cursor-not-allowed disabled:opacity-50 ${
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