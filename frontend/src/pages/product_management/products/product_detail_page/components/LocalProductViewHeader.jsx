import { ArrowLeft, Edit, RefreshCcw } from "lucide-react";
import { getProductId } from "../utils/localProductViewHelpers";

export default function LocalProductViewHeader({ product, loading, onBack, onEdit, onRefresh }) {
  const productId = getProductId(product || {});

  return (
    <div className="mb-3 flex flex-col gap-3 border-b border-slate-800 pb-3 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="text-[12px] font-black uppercase tracking-[0.22em] text-orange-300">
          Local Product
        </p>
        <h1 className="mt-1 text-xl font-black text-white">Product Details</h1>
        {productId && <p className="mt-1 text-xs font-semibold text-slate-500">ID: {productId}</p>}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-slate-700 bg-[#0b1220] px-4 py-2 text-sm font-bold text-slate-200 transition hover:border-orange-400 hover:text-orange-300"
        >
          <ArrowLeft size={16} /> Back
        </button>

        <button
          type="button"
          onClick={onRefresh}
          disabled={loading}
          className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-slate-700 bg-[#0b1220] px-4 py-2 text-sm font-bold text-slate-200 transition hover:border-violet-400 hover:text-violet-300 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <RefreshCcw size={16} className={loading ? "animate-spin" : ""} /> Refresh
        </button>

        {productId && (
          <button
            type="button"
            onClick={onEdit}
            className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-orange-500 px-4 py-2 text-sm font-black text-white transition hover:bg-orange-400"
          >
            <Edit size={16} /> Edit
          </button>
        )}
      </div>
    </div>
  );
}
