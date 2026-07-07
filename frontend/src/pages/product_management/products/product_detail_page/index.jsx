import { AlertTriangle, PackageOpen } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import Loader from "../../../../components/common/Loader";
import LocalProductDescriptionCard from "./components/LocalProductDescriptionCard";
import LocalProductDarazInfoCard from "./components/LocalProductDarazInfoCard";
import LocalProductOverviewCard from "./components/LocalProductOverviewCard";
import LocalProductStockCard from "./components/LocalProductStockCard";
import LocalProductVariationsCard from "./components/LocalProductVariationsCard";
import LocalProductViewHeader from "./components/LocalProductViewHeader";
import useLocalProductView from "./hooks/useLocalProductView";
import {
  getProductId,
  shouldShowProductStockCard,
  shouldShowProductVariations,
} from "./utils/localProductViewHelpers";

export default function LocalProductViewPage() {
  const navigate = useNavigate();
  const { id, productId } = useParams();

  const resolvedProductId = id || productId;

  const { product, loading, errorMessage, reload } =
    useLocalProductView(resolvedProductId);

  const currentProductId = getProductId(product || {}) || resolvedProductId;

  const showVariations = shouldShowProductVariations(product || {});
  const showProductStock = shouldShowProductStockCard(product || {});

  function handleBack() {
    navigate("/product/local-products");
  }

  function handleEdit() {
    if (!currentProductId) return;
    navigate(`/product/local-products/edit/${currentProductId}/basic`);
  }

  return (
    <div className="min-h-screen bg-[#070b16] p-3 text-slate-100 lg:p-5">
      <div className="mx-auto flex w-full max-w-[1500px] flex-col gap-4">
        <LocalProductViewHeader
          product={product}
          productId={currentProductId}
          loading={loading}
          onBack={handleBack}
          onEdit={handleEdit}
          onReload={reload}
        />

        {loading && (
          <section className="rounded-xl border border-slate-800 bg-[#0b1019] shadow-xl shadow-black/20">
            <Loader label="Loading product details..." minHeight="420px" />
          </section>
        )}

        {!loading && errorMessage && (
          <section className="flex min-h-[360px] flex-col items-center justify-center gap-4 rounded-xl border border-red-500/20 bg-[#0b1019] px-4 text-center shadow-xl shadow-black/20">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-red-500/10 text-red-300">
              <AlertTriangle size={28} />
            </div>

            <div>
              <h2 className="text-base font-semibold text-slate-100">
                Unable to load product
              </h2>
              <p className="mt-2 max-w-xl text-sm text-slate-400">
                {errorMessage}
              </p>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-2">
              <button
                type="button"
                onClick={reload}
                className="cursor-pointer rounded-lg bg-orange-500 px-4 py-2 text-xs font-semibold text-white transition hover:bg-orange-600"
              >
                Try Again
              </button>

              <button
                type="button"
                onClick={handleBack}
                className="cursor-pointer rounded-lg border border-slate-700 bg-[#111827] px-4 py-2 text-xs font-semibold text-slate-200 transition hover:border-slate-500 hover:bg-[#172033]"
              >
                Back to Products
              </button>
            </div>
          </section>
        )}

        {!loading && !errorMessage && !product && (
          <section className="flex min-h-[360px] flex-col items-center justify-center gap-4 rounded-xl border border-slate-800 bg-[#0b1019] px-4 text-center shadow-xl shadow-black/20">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-slate-800 text-slate-400">
              <PackageOpen size={28} />
            </div>

            <div>
              <h2 className="text-base font-semibold text-slate-100">
                Product not found
              </h2>
              <p className="mt-2 max-w-xl text-sm text-slate-400">
                This product may have been deleted or the product ID is invalid.
              </p>
            </div>

            <button
              type="button"
              onClick={handleBack}
              className="cursor-pointer rounded-lg border border-slate-700 bg-[#111827] px-4 py-2 text-xs font-semibold text-slate-200 transition hover:border-slate-500 hover:bg-[#172033]"
            >
              Back to Products
            </button>
          </section>
        )}

        {!loading && !errorMessage && product && (
          <div className="space-y-4">
            <LocalProductOverviewCard product={product} />
            <LocalProductDescriptionCard product={product} />
            <LocalProductDarazInfoCard product={product} />

            {/* Parent product only */}
            {showVariations && <LocalProductVariationsCard product={product} />}

            {/* Single product only */}
            {showProductStock && <LocalProductStockCard product={product} />}
          </div>
        )}
      </div>
    </div>
  );
}