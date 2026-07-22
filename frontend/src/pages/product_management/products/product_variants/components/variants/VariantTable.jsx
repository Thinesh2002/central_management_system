import { Edit, Eye, Trash2 } from "lucide-react";
import { usePagePermission } from "../../../../../../components/common/permissions/PermissionsProvider";
import Loader from "../../../../../../components/common/Loader";
import {
  getRecordId,
  getVariantName,
  getVariantSku,
  getVariantStock,
} from "../../utils/variantPageHelpers";

function safeText(value, fallback = "-") {
  if (value === null || value === undefined || value === "") {
    return fallback;
  }

  if (Array.isArray(value)) {
    return value.map((item) => safeText(item, fallback)).join(", ");
  }

  if (typeof value === "object") {
    return safeText(
      value.variant_sku ??
        value.sku ??
        value.product_sku ??
        value.name ??
        value.title ??
        value.id,
      fallback
    );
  }

  return String(value);
}

function getSellingPrice(variant = {}) {
  const value =
    variant.selling_price ??
    variant.sale_price ??
    variant.product_selling_price ??
    variant.variant_selling_price ??
    0;

  const numberValue = Number(value);

  if (!Number.isFinite(numberValue)) {
    return "0.00";
  }

  return numberValue.toFixed(2);
}

export default function VariantTable({ loading, variants, onView, onEdit, onDelete }) {
  const { canEdit, canDelete } = usePagePermission("local_products");

  if (loading) {
    return <Loader label="Loading variations..." minHeight="320px" />;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[900px] text-sm">
        <thead className="border-b border-slate-800 bg-[#0a101d] text-left text-xs font-black uppercase tracking-wide text-slate-400">
          <tr>
            <th className="w-[150px] px-3 py-3">Colour</th>
            <th className="w-[220px] px-3 py-3">SKU</th>
            <th className="w-[260px] px-3 py-3">Title</th>
            <th className="w-[150px] px-3 py-3">Selling Price</th>
            <th className="w-[110px] px-3 py-3">Stock</th>
            <th className="w-[160px] px-3 py-3 text-right">Actions</th>
          </tr>
        </thead>

        <tbody className="divide-y divide-slate-800">
          {variants.length ? (
            variants.map((variant, index) => {
              const variantId = getRecordId(variant) || `variant-${index}`;

              return (
                <tr key={variantId} className="hover:bg-slate-900/40">
                  <td className="px-3 py-3">
                    <span className="border border-slate-700 bg-slate-800/60 px-2 py-1 text-xs font-bold text-slate-300">
                      {safeText(getVariantName(variant))}
                    </span>
                  </td>

                  <td className="px-3 py-3">
                    <p className="font-bold text-slate-100">
                      {safeText(getVariantSku(variant))}
                    </p>
                  </td>

                  <td className="px-3 py-3">
                    <p className="max-w-[250px] truncate font-semibold text-slate-300">
                      {safeText(variant.variant_name, "-")}
                    </p>
                  </td>

                  <td className="px-3 py-3 font-bold text-emerald-300">
                    LKR {getSellingPrice(variant)}
                  </td>

                  <td className="px-3 py-3 font-bold text-slate-300">
                    {safeText(getVariantStock(variant), "0")}
                  </td>

                  <td className="px-3 py-3">
                    <div className="flex justify-end gap-1.5">
                      <button
                        type="button"
                        onClick={() => onView(variant)}
                        className="inline-flex h-7 w-7 cursor-pointer items-center justify-center border border-slate-700 text-slate-300 transition hover:border-orange-400 hover:text-orange-300"
                        title="View variant"
                      >
                        <Eye size={14} />
                      </button>

                      {canEdit && (
                        <button
                          type="button"
                          onClick={() => onEdit(variant)}
                          className="inline-flex h-7 w-7 cursor-pointer items-center justify-center border border-sky-500/40 bg-sky-500/10 text-sky-300 transition hover:bg-sky-500/20 hover:text-sky-200"
                          title="Edit variant"
                        >
                          <Edit size={14} />
                        </button>
                      )}

                      {canDelete && (
                        <button
                          type="button"
                          onClick={() => onDelete(variant)}
                          className="inline-flex h-7 w-7 cursor-pointer items-center justify-center border border-rose-500/40 bg-rose-500/10 text-rose-300 transition hover:bg-rose-500/20 hover:text-rose-200"
                          title="Delete variant"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })
          ) : (
            <tr>
              <td colSpan="6" className="px-3 py-10 text-center text-slate-500">
                No variants yet. Click Add Variant to create child SKU.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
