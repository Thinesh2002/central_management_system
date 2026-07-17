import { useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { Layers, Search, X } from "lucide-react";
import { usePageOverlay } from "../../../../../components/common/page_overlay/PageOverlayProvider";
import { EMPTY_IMAGE } from "../constants/localProductsDashboardConstants";
import { getMainImageFromRows, getProductImageRows, resolveImageUrl } from "../utils/localProductsImageHelpers";

function getProductId(product = {}) {
  return product.id || product.product_id || product.local_product_id || "";
}

function getProductSku(product = {}) {
  return product.sku || product.product_sku || product.local_sku || "-";
}

function getProductTitle(product = {}) {
  return product.title || product.name || product.product_name || "Untitled Product";
}

// Picking a product before jumping to its "add variant" page - the per-row
// entry point already existed (ProductRow's 3-dot menu), this is just a
// second way in from the toolbar, like Amazon's "Add a variation" button.
export default function AddVariationModal({ products = [], productImages, onClose }) {
  const { openOverlay } = usePageOverlay();
  const [query, setQuery] = useState("");

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return products.slice(0, 30);

    return products
      .filter((product) => {
        const haystack = `${getProductTitle(product)} ${getProductSku(product)}`.toLowerCase();
        return haystack.includes(q);
      })
      .slice(0, 30);
  }, [products, query]);

  function handlePick(product) {
    const productId = getProductId(product);
    onClose();
    openOverlay(`/product/local-products/edit/${productId}/variants/create`);
  }

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 backdrop-blur-sm">
      <div className="flex w-full max-w-[560px] flex-col overflow-hidden rounded-md border border-zinc-700 bg-[#172235] shadow-2xl">
        <div className="flex items-center justify-between border-b border-white/10 bg-linear-to-r from-purple-950 via-[#1a1033] to-purple-950 px-4 py-3">
          <div className="flex items-center gap-2.5">
            <Layers size={17} className="text-purple-200" />
            <div>
              <h3 className="text-[15px] font-semibold text-white">Add a Variation</h3>
              <p className="mt-0.5 text-[12px] text-purple-200/80">Pick a product to add a new variant to.</p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20"
          >
            <X size={17} />
          </button>
        </div>

        <div className="border-b border-white/10 p-3">
          <div className="flex h-9 items-center gap-2 rounded-sm border border-zinc-600 bg-[#2a3542] px-2.5">
            <Search size={14} className="shrink-0 text-zinc-500" />
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search product name or SKU..."
              className="h-full w-full bg-transparent text-[13px] text-zinc-100 outline-none placeholder:text-zinc-500"
            />
          </div>
        </div>

        <div className="max-h-[50vh] overflow-y-auto">
          {results.length ? (
            results.map((product) => {
              const productId = getProductId(product);
              const rows = getProductImageRows(productImages, productId);
              const image = getMainImageFromRows(rows) || EMPTY_IMAGE;

              return (
                <button
                  key={productId}
                  type="button"
                  onClick={() => handlePick(product)}
                  className="flex w-full items-center gap-3 border-b border-white/5 px-4 py-2.5 text-left hover:bg-white/5"
                >
                  <div className="h-9 w-9 shrink-0 overflow-hidden rounded bg-white ring-1 ring-zinc-700">
                    <img
                      src={resolveImageUrl(image)}
                      alt=""
                      className="h-full w-full object-contain"
                      onError={(event) => {
                        event.currentTarget.src = EMPTY_IMAGE;
                      }}
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-medium text-zinc-100">{getProductTitle(product)}</p>
                    <p className="mt-0.5 truncate text-[11px] text-zinc-500">{getProductSku(product)}</p>
                  </div>
                </button>
              );
            })
          ) : (
            <p className="py-8 text-center text-[13px] text-zinc-500">No products found.</p>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
