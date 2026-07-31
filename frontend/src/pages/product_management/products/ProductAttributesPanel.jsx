import { useEffect, useState } from "react";
import { Plus, Save, Trash2 } from "lucide-react";
import localProductsApi from "../../../config/sub_api/product_management_api/local_products_api";
import { getStoredUser } from "../../../config/auth";
import { FormInput, FormSelect } from "./components/FormInput";
import { getErrorMessage, getName, normalizeList } from "./utils/productSku";
import { useToast } from "../../../components/common/toast/ToastProvider";
import { useConfirm } from "../../../components/common/confirm_modal/ConfirmProvider";

function getCurrentUserId() {
  const user = getStoredUser?.();
  return user?.id || user?.user_id || user?.user_uid || 1;
}

function rowMatchesScope(row, productId, variantId) {
  if (String(row.product_id) !== String(productId)) return false;

  const rowVariantId = row.variant_id ? String(row.variant_id) : "";
  const scopeVariantId = variantId ? String(variantId) : "";

  return rowVariantId === scopeVariantId;
}

/**
 * Attribute assignment editor, scoped to either a product (variantId=null)
 * or one of its variants (variantId set). Shared by LocalProductAttributesPage
 * and VariantAttributesPage since product_attribute_values already supports
 * both scopes via its nullable variant_id column.
 *
 * Only Attribute + Custom Value per row — staff pick from the standard,
 * pre-seeded attribute list (Colour, Material, Brand, Manufacturer,
 * Warranty, ...) and type the value directly, rather than also picking
 * from a separate attribute_value picklist.
 */
export default function ProductAttributesPanel({ productId, variantId = null }) {
  const showToast = useToast();
  const confirm = useConfirm();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [attributes, setAttributes] = useState([]);
  const [rows, setRows] = useState([]);

  async function loadData() {
    setLoading(true);

    try {
      const [attrRes, productAttrRes] = await Promise.all([
        localProductsApi.getAttributes().catch(() => []),
        localProductsApi.getProductAttributeValues().catch(() => ({ data: [] })),
      ]);

      const attrRows = normalizeList(attrRes);
      const scopedRows = normalizeList(productAttrRes).filter((item) =>
        rowMatchesScope(item, productId, variantId)
      );

      setAttributes(attrRows);
      setRows(scopedRows.length ? scopedRows : [{ attribute_id: "", custom_value: "" }]);
    } catch (error) {
      alert(getErrorMessage(error, "Unable to load attributes."));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productId, variantId]);

  function updateRow(index, name, value) {
    setRows((prev) =>
      prev.map((row, rowIndex) => (rowIndex === index ? { ...row, [name]: value } : row))
    );
  }

  async function handleSave() {
    setSaving(true);

    try {
      for (const row of rows) {
        if (!row.attribute_id) continue;

        const payload = {
          ...row,
          product_id: productId,
          variant_id: variantId || null,
          attribute_id: row.attribute_id,
          attribute_value_id: row.attribute_value_id || null,
          custom_value: row.custom_value || null,
          updated_by: getCurrentUserId(),
          created_by: row.created_by || getCurrentUserId(),
        };

        if (row.id) await localProductsApi.updateProductAttributeValue(row.id, payload);
        else await localProductsApi.createProductAttributeValue(payload);
      }

      showToast("Attributes saved successfully.");
      await loadData();
    } catch (error) {
      alert(getErrorMessage(error, "Unable to save attributes."));
    } finally {
      setSaving(false);
    }
  }

  async function deleteRow(row, index) {
    if (!row.id) {
      setRows((prev) => prev.filter((_, rowIndex) => rowIndex !== index));
      return;
    }

    if (!(await confirm("Delete this attribute row?"))) return;

    try {
      await localProductsApi.deleteProductAttributeValue(row.id);
      await loadData();
    } catch (error) {
      alert(getErrorMessage(error, "Unable to delete attribute row."));
    }
  }

  return (
    <div className="space-y-4">
      <div className="border border-slate-800 bg-[#0b1220] p-4">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-[12px] font-black text-white">Assigned Attributes</h2>
          <button
            type="button"
            onClick={() => setRows((prev) => [...prev, { attribute_id: "", custom_value: "" }])}
            className="inline-flex cursor-pointer items-center gap-2 border border-slate-700 px-4 py-2 text-xs font-bold text-slate-300 hover:bg-slate-800"
          >
            <Plus size={14} /> Add Row
          </button>
        </div>

        {loading ? (
          <div className="py-10 text-center text-slate-500">Loading attributes...</div>
        ) : (
          <div className="space-y-3">
            {rows.map((row, index) => (
              <div
                key={index}
                className="grid grid-cols-1 gap-3 border border-slate-800 bg-[#07101f] p-3 lg:grid-cols-[1fr_1fr_auto]"
              >
                <FormSelect
                  label="Attribute"
                  value={row.attribute_id}
                  onChange={(value) => updateRow(index, "attribute_id", value)}
                >
                  <option value="">Select attribute</option>
                  {attributes.map((item) => (
                    <option key={item.id} value={item.id}>
                      {getName(item)}
                    </option>
                  ))}
                </FormSelect>
                <FormInput
                  label="Custom Value"
                  value={row.custom_value || ""}
                  onChange={(value) => updateRow(index, "custom_value", value)}
                />
                <div className="flex items-end">
                  <button
                    type="button"
                    onClick={() => deleteRow(row, index)}
                    className="inline-flex h-12 w-full cursor-pointer items-center justify-center border border-rose-500/40 text-rose-300 hover:bg-rose-500/10 lg:w-12"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="mt-5 flex justify-end">
          <button
            type="button"
            disabled={saving}
            onClick={handleSave}
            className="inline-flex h-9 cursor-pointer items-center gap-1.5 bg-orange-500 px-4 text-[12px] font-semibold text-white hover:bg-orange-400 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Save size={14} /> {saving ? "Saving..." : "Save Attributes"}
          </button>
        </div>
      </div>
    </div>
  );
}
