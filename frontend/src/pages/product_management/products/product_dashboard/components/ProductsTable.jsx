import { Image as ImageIcon, Loader2 } from "lucide-react";
import { getStableProductKey } from "../utils/localProductsTableHelpers";
import ProductRow from "./ProductRow";

const TABLE_COL_SPAN = 8;

function EmptyProductsRow() {
  return (
    <tr>
      <td colSpan={TABLE_COL_SPAN} className="px-3 py-14 text-center text-slate-500">
        <div className="flex flex-col items-center justify-center gap-3">
          <ImageIcon size={28} className="text-orange-400/70" />
          <div>
            <p className="text-[12px] font-medium text-orange-200">No products found.</p>
            <p className="text-[11px] text-slate-500">Change search, tab or filter options.</p>
          </div>
        </div>
      </td>
    </tr>
  );
}

function LoadingProductsRow() {
  return (
    <tr>
      <td colSpan={TABLE_COL_SPAN} className="px-3 py-14 text-center text-slate-400">
        <div className="flex flex-col items-center justify-center gap-3">
          <Loader2 size={24} className="animate-spin text-orange-400" />
          <span className="text-[12px] font-medium text-orange-200">Loading products...</span>
        </div>
      </td>
    </tr>
  );
}

export default function ProductsTable({
  loading,
  filteredProducts = [],
  categories,
  subCategories,
  models,
  productImages,
  expandedRows,
  getName,
  toggleExpanded,
  goToProductSection,
  handleDelete,
  setImagePreview,
  onReload,
}) {
  return (
    <section className="w-full overflow-hidden rounded-lg border border-slate-700/40 bg-[#050917] shadow-lg shadow-black/10">
      <div className="w-full overflow-x-auto">
        <table className="w-full min-w-[1180px] table-fixed border-collapse text-[11px]">
          <colgroup>
            <col className="w-[44px]" />
            <col className="w-[42px]" />
            <col className="w-[90px]" />
            <col className="w-[34%]" />
            <col className="w-[20%]" />
            <col className="w-[130px]" />
            <col className="w-[150px]" />
            <col className="w-[120px]" />
          </colgroup>

          <thead className="border-b border-slate-700/40 bg-[#111827] text-left text-[10px] font-semibold uppercase tracking-wide text-orange-300">
            <tr>
              <th className="px-3 py-3"><input type="checkbox" className="h-3.5 w-3.5 cursor-pointer rounded border-slate-600 bg-slate-900 accent-orange-500" /></th>
              <th className="px-2 py-3 text-center">&gt;</th>
              <th className="px-3 py-3">Image</th>
              <th className="px-3 py-3">Product Details</th>
              <th className="px-3 py-3">SKU</th>
              <th className="px-3 py-3 text-right">Inventory</th>
              <th className="px-3 py-3 text-right">Sales</th>
              <th className="px-3 py-3 text-center">Actions</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-800/45 bg-[#111827]">
            {loading ? (
              <LoadingProductsRow />
            ) : filteredProducts.length ? (
              filteredProducts.map((product, productIndex) => {
                const productKey = getStableProductKey(product, productIndex);
                return (
                  <ProductRow
                    key={productKey}
                    product={product}
                    productIndex={productIndex}
                    productKey={productKey}
                    categories={categories}
                    subCategories={subCategories}
                    models={models}
                    productImages={productImages}
                    expandedRows={expandedRows}
                    getName={getName}
                    toggleExpanded={toggleExpanded}
                    goToProductSection={goToProductSection}
                    handleDelete={handleDelete}
                    setImagePreview={setImagePreview}
                    onReload={onReload}
                  />
                );
              })
            ) : (
              <EmptyProductsRow />
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
