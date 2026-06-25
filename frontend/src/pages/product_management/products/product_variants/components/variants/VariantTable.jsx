import { Edit, RefreshCw, Trash2 } from "lucide-react";
import {
  getRecordId,
  getVariantName,
  getVariantPrice,
  getVariantSku,
  getVariantStock,
} from "../../utils/variantPageHelpers";
import RowImagePreview from "./RowImagePreview";
import SubImagesCell from "./SubImagesCell";

export default function VariantTable({
  loading,
  variants,
  getVariantImageSet,
  onEdit,
  onDelete,
  onOpenImagePopup,
}) {
  if (loading) {
    return (
      <div className="flex min-h-[320px] flex-col items-center justify-center gap-3 text-slate-500">
        <RefreshCw size={24} className="animate-spin text-slate-300" />
        <span className="text-sm font-semibold">Loading variations...</span>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[1280px] text-sm">
        <thead className="border-b border-slate-800 bg-[#0a101d] text-left text-xs font-black uppercase tracking-wide text-slate-400">
          <tr>
            <th className="w-[70px] px-3 py-3">Edit</th>
            <th className="w-[150px] px-3 py-3">Colour</th>
            <th className="w-[220px] px-3 py-3">SKU</th>
            <th className="w-[190px] px-3 py-3">Main Image</th>
            <th className="w-[270px] px-3 py-3">Sub Images</th>
            <th className="w-[130px] px-3 py-3">Price</th>
            <th className="w-[110px] px-3 py-3">Stock</th>
            <th className="w-[160px] px-3 py-3 text-right">Actions</th>
          </tr>
        </thead>

        <tbody className="divide-y divide-slate-800">
          {variants.length ? (
            variants.map((variant, index) => {
              const variantId = getRecordId(variant) || `variant-${index}`;
              const imageSet = getVariantImageSet(variant);

              return (
                <tr key={variantId} className="hover:bg-slate-900/40">
                  <td className="px-3 py-3">
                    <button
                      type="button"
                      onClick={() => onEdit(variant)}
                      className="cursor-pointer text-orange-300 transition hover:text-orange-200"
                      title="Edit variant"
                    >
                      <Edit size={17} />
                    </button>
                  </td>

                  <td className="px-3 py-3">
                    <span className="border border-slate-700 bg-slate-800/60 px-2 py-1 text-xs font-bold text-slate-300">
                      {getVariantName(variant)}
                    </span>
                  </td>

                  <td className="px-3 py-3">
                    <p className="font-bold text-slate-100">
                      {getVariantSku(variant)}
                    </p>

                    {variant.size || variant.material ? (
                      <p className="mt-1 text-xs font-semibold text-slate-500">
                        {[variant.size, variant.material].filter(Boolean).join(" • ")}
                      </p>
                    ) : null}
                  </td>

                  <td className="px-3 py-3">
                    <RowImagePreview
                      image={imageSet.main}
                      onOpen={() =>
                        onOpenImagePopup({
                          mode: "main",
                          title: getVariantSku(variant),
                          variantId,
                          imageSet,
                        })
                      }
                    />
                  </td>

                  <td className="px-3 py-3">
                    <SubImagesCell
                      images={imageSet.extras}
                      onOpen={() =>
                        onOpenImagePopup({
                          mode: "sub",
                          title: getVariantSku(variant),
                          variantId,
                          imageSet,
                        })
                      }
                    />
                  </td>

                  <td className="px-3 py-3 font-bold text-slate-200">
                    LKR {getVariantPrice(variant)}
                  </td>

                  <td className="px-3 py-3 font-bold text-slate-300">
                    {getVariantStock(variant)}
                  </td>

                  <td className="px-3 py-3">
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => onEdit(variant)}
                        className="inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-md border border-sky-500/40 bg-sky-500/10 text-sky-300 transition hover:bg-sky-500/20 hover:text-sky-200"
                        title="Edit variant"
                      >
                        <Edit size={15} />
                      </button>

                      <button
                        type="button"
                        onClick={() => onDelete(variant)}
                        className="inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-md border border-rose-500/40 bg-rose-500/10 text-rose-300 transition hover:bg-rose-500/20 hover:text-rose-200"
                        title="Delete variant"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })
          ) : (
            <tr>
              <td colSpan="8" className="px-3 py-10 text-center text-slate-500">
                No variants yet. Click Add Variant to create child SKU.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
