import { Plus, RefreshCw, Save, X } from "lucide-react";
import { getName } from "../../../utils/productSku";
import { getColourCode } from "../../utils/variantPageHelpers";
import DarkInput from "./DarkInput";
import DarkSelect from "./DarkSelect";

export default function VariantModal({
  open,
  form,
  saving,
  loading,
  colours,
  onClose,
  onSubmit,
  onChange,
  onColourChange,
  onGenerateSku,
}) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center bg-black/85 p-4"
      onClick={() => {
        if (!saving) onClose();
      }}
    >
      <form
        onSubmit={onSubmit}
        className="w-full max-w-[980px] overflow-hidden rounded-xl border border-slate-700 bg-[#243b57] text-slate-100 shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between bg-violet-700 px-5 py-4 text-white">
          <div className="flex items-center gap-3">
            <Plus size={20} />
            <p className="text-base font-black">
              {form.id ? "Edit Variant" : "Add Variant"}
            </p>
          </div>

          <button
            type="button"
            disabled={saving}
            onClick={onClose}
            className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-full bg-white/15 text-white hover:bg-white/25 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <X size={18} />
          </button>
        </div>

        <div className="max-h-[72vh] overflow-y-auto px-5 py-5">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <DarkSelect
              label="Colour Code"
              value={form.colour_id || ""}
              onChange={onColourChange}
              disabled={loading || saving}
            >
              <option value="">Select colour</option>

              {colours.map((item) => (
                <option key={item.id} value={item.id}>
                  {getName(item)}
                  {getColourCode(item) ? ` (${getColourCode(item)})` : ""}
                </option>
              ))}
            </DarkSelect>

            <div className="grid grid-cols-[1fr_auto] gap-2">
              <DarkInput
                label="Variant SKU"
                value={form.variant_sku || ""}
                onChange={(value) => onChange("variant_sku", value)}
                required
                placeholder="Auto SKU"
              />

              <div className="flex items-end">
                <button
                  type="button"
                  disabled={saving}
                  onClick={onGenerateSku}
                  className="h-10 cursor-pointer rounded-lg border border-slate-500/60 bg-slate-700/50 px-4 text-sm font-bold text-slate-200 hover:bg-slate-700 hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
                >
                  SKU
                </button>
              </div>
            </div>

            <DarkInput
              label="Colour Name"
              value={form.colour || ""}
              onChange={(value) => onChange("colour", value)}
            />

            <DarkInput
              label="Size"
              value={form.size || ""}
              onChange={(value) => onChange("size", value)}
            />

            <DarkInput
              label="Model Text"
              value={form.model || ""}
              onChange={(value) => onChange("model", value)}
            />

            <DarkInput
              label="Material"
              value={form.material || ""}
              onChange={(value) => onChange("material", value)}
            />

            <DarkInput
              label="Selling Price"
              type="number"
              step="0.01"
              value={form.selling_price ?? ""}
              onChange={(value) => onChange("selling_price", value)}
              placeholder="0.00"
            />

            <DarkInput
              label="Stock Qty"
              type="number"
              value={form.stock_qty ?? 0}
              onChange={(value) => onChange("stock_qty", value)}
            />
          </div>
        </div>

        <div className="flex justify-end gap-3 border-t border-slate-700 bg-[#1c3048] px-5 py-4">
          <button
            type="button"
            disabled={saving}
            onClick={onClose}
            className="cursor-pointer rounded-lg border border-slate-500 px-5 py-2 text-sm font-bold text-slate-200 hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Cancel
          </button>

          <button
            disabled={saving}
            type="submit"
            className="inline-flex cursor-pointer items-center gap-2 rounded-lg bg-white px-5 py-2 text-sm font-black text-slate-950 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving ? (
              <RefreshCw size={16} className="animate-spin" />
            ) : (
              <Save size={16} />
            )}

            {saving ? "Saving..." : "Save Variant"}
          </button>
        </div>
      </form>
    </div>
  );
}