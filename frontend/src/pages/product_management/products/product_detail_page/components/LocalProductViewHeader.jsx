import { ArrowLeft, Edit3, RefreshCcw } from "lucide-react";
import { getProductId } from "../utils/localProductViewHelpers";

function getProductTitle(product = {}) {
  return (
    product.title ||
    product.product_title ||
    product.name ||
    product.product_name ||
    "Product Details"
  );
}

function ActionButton({
  children,
  onClick,
  disabled = false,
  variant = "secondary",
}) {
  const styles = {
    secondary:
      "border-slate-700/70 bg-slate-900/70 text-slate-300 hover:border-slate-500 hover:bg-slate-800 hover:text-white",
    primary:
      "border-orange-500/70 bg-orange-500 text-white hover:border-orange-400 hover:bg-orange-400",
  };

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex cursor-pointer items-center gap-2 rounded-lg border px-3.5 py-2 text-sm font-medium shadow-sm transition disabled:cursor-not-allowed disabled:opacity-60 ${styles[variant]}`}
    >
      {children}
    </button>
  );
}

export default function LocalProductViewHeader({
  product,
  loading,
  onBack,
  onEdit,
  onRefresh,
}) {
  const productId = getProductId(product || {});
  const title = getProductTitle(product || {});

  return (
    <header className="mb-5 rounded-2xl border border-slate-800/80 bg-[#0b1220] px-4 py-4 shadow-lg shadow-black/20">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <div className="mb-2 flex flex-wrap items-center gap-2 text-xs text-slate-500">
            <span className="font-medium text-slate-400">Product Management</span>
            <span>/</span>
            <span>Local Product</span>

            {productId && (
              <>
                <span>/</span>
                <span className="rounded-full bg-slate-800 px-2 py-0.5 text-slate-300">
                  ID: {productId}
                </span>
              </>
            )}
          </div>

          <h1 className="truncate text-xl font-semibold text-slate-100 md:text-2xl">
            {title}
          </h1>

          <p className="mt-1 text-sm text-slate-500">
            View product images, variants, specifications and inventory details.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <ActionButton onClick={onBack}>
            <ArrowLeft size={16} />
            Back
          </ActionButton>

          <ActionButton onClick={onRefresh} disabled={loading}>
            <RefreshCcw size={16} className={loading ? "animate-spin" : ""} />
            Refresh
          </ActionButton>

          {productId && (
            <ActionButton onClick={onEdit} variant="primary">
              <Edit3 size={16} />
              Edit
            </ActionButton>
          )}
        </div>
      </div>
    </header>
  );
}