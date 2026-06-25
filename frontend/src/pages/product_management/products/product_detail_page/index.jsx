import { AlertTriangle, Loader2, PackageOpen } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import LocalProductDescriptionCard from "./components/LocalProductDescriptionCard";
import LocalProductOverviewCard from "./components/LocalProductOverviewCard";
import LocalProductViewHeader from "./components/LocalProductViewHeader";
import useLocalProductView from "./hooks/useLocalProductView";
import { getProductId } from "./utils/localProductViewHelpers";

export default function LocalProductViewPage() {
  const navigate = useNavigate();
  const { id, productId } = useParams();
  const resolvedProductId = id || productId;

  const { product, loading, errorMessage, reload } = useLocalProductView(resolvedProductId);
  const currentProductId = getProductId(product || {}) || resolvedProductId;

  return (
    <div className="min-h-screen bg-[#070b16] p-3 text-slate-100 lg:p-5">
      <div className="mx-auto max-w-7xl">
        <LocalProductViewHeader
          product={product}
          loading={loading}
          onBack={() => navigate("/product/local-products")}
          onRefresh={reload}
          onEdit={() => navigate(`/product/local-products/edit/${currentProductId}`)}
        />

        {loading && (
          <div className="flex min-h-[360px] flex-col items-center justify-center gap-3 rounded-2xl border border-slate-800 bg-[#0b1220] text-center">
            <Loader2 size={34} className="animate-spin text-orange-300" />
            <p className="text-sm font-black text-slate-300">Loading product details...</p>
          </div>
        )}

        {!loading && errorMessage && (
          <div className="flex min-h-[320px] flex-col items-center justify-center gap-3 rounded-2xl border border-red-500/30 bg-red-500/10 p-6 text-center">
            <AlertTriangle size={38} className="text-red-300" />
            <h2 className="text-lg font-black text-white">Unable to view product</h2>
            <p className="max-w-xl text-sm font-semibold text-red-100">{errorMessage}</p>
            <button
              type="button"
              onClick={reload}
              className="mt-2 rounded-xl bg-red-500 px-5 py-2.5 text-sm font-black text-white transition hover:bg-red-400"
            >
              Try Again
            </button>
          </div>
        )}

        {!loading && !errorMessage && !product && (
          <div className="flex min-h-[320px] flex-col items-center justify-center gap-3 rounded-2xl border border-slate-800 bg-[#0b1220] p-6 text-center">
            <PackageOpen size={42} className="text-slate-500" />
            <h2 className="text-lg font-black text-white">Product not found</h2>
            <p className="text-sm font-semibold text-slate-400">
              This product may have been deleted or the ID may be incorrect.
            </p>
          </div>
        )}

        {!loading && !errorMessage && product && (
          <div className="space-y-4">
            <LocalProductOverviewCard product={product} />
            <LocalProductDescriptionCard product={product} />
          </div>
        )}
      </div>
    </div>
  );
}
