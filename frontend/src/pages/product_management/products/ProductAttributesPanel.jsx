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
 */
export default function ProductAttributesPanel({ productId, variantId = null }) {
  const showToast = useToast();
  const confirm = useConfirm();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [attributes, setAttributes] = useState([]);
  const [attributeValues, setAttributeValues] = useState([]);
  const [rows, setRows] = useState([]);
  const [newAttributeName, setNewAttributeName] = useState("");
  const [newValue, setNewValue] = useState({ attribute_id: "", value: "" });

  async function loadData() {
    setLoading(true);

    try {
      const [attrRes, valueRes, productAttrRes] = await Promise.all([
        localProductsApi.getAttributes().catch(() => []),
        localProductsApi.getAttributeValues().catch(() => []),
        localProductsApi.getProductAttributeValues().catch(() => ({ data: [] })),
      ]);

      const attrRows = normalizeList(attrRes);
      const valueRows = normalizeList(valueRes);
      const scopedRows = normalizeList(productAttrRes).filter((item) =>
        rowMatchesScope(item, productId, variantId)
      );

      setAttributes(attrRows);
      setAttributeValues(valueRows);
      setRows(
        scopedRows.length
          ? scopedRows
          : [{ attribute_id: "", attribute_value_id: "", custom_value: "" }]
      );
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

  async function addNewAttribute() {
    if (!newAttributeName.trim()) return alert("Enter attribute name.");

    try {
      const created = await localProductsApi.createAttribute({
        name: newAttributeName,
        attribute_name: newAttributeName,
        created_by: getCurrentUserId(),
        updated_by: getCurrentUserId(),
      });

      const item = created?.data?.data || created?.data || created;
      setNewAttributeName("");
      await loadData();

      if (item?.id) {
        setRows((prev) => [...prev, { attribute_id: item.id, attribute_value_id: "", custom_value: "" }]);
      }
    } catch (error) {
      alert(getErrorMessage(error, "Unable to create attribute."));
    }
  }

  async function addNewAttributeValue() {
    if (!newValue.attribute_id || !newValue.value.trim()) {
      return alert("Select attribute and enter value.");
    }

    try {
      const payload = {
        attribute_id: newValue.attribute_id,
        value: newValue.value,
        attribute_value: newValue.value,
        name: newValue.value,
        created_by: getCurrentUserId(),
        updated_by: getCurrentUserId(),
      };

      const created = await localProductsApi.createAttributeValue(payload);
      const item = created?.data?.data || created?.data || created;
      setNewValue({ attribute_id: "", value: "" });
      await loadData();

      if (item?.id) {
        setRows((prev) => [
          ...prev,
          { attribute_id: payload.attribute_id, attribute_value_id: item.id, custom_value: "" },
        ]);
      }
    } catch (error) {
      alert(getErrorMessage(error, "Unable to create attribute value."));
    }
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
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="border border-slate-800 bg-[#0b1220] p-4">
          <h2 className="mb-3 text-[12px] font-black text-white">Add New Attribute</h2>
          <div className="flex gap-2">
            <input
              value={newAttributeName}
              onChange={(e) => setNewAttributeName(e.target.value)}
              placeholder="Example: Wattage"
              className="h-9 flex-1 border border-slate-700 bg-[#0a101d] px-3 text-[12px] text-slate-100 outline-none placeholder:text-slate-600 focus:border-yellow-500"
            />
            <button
              type="button"
              onClick={addNewAttribute}
              className="inline-flex h-9 cursor-pointer items-center gap-1.5 bg-orange-500 px-3 text-[12px] font-semibold text-white hover:bg-orange-400"
            >
              <Plus size={14} /> Add
            </button>
          </div>
        </div>

        <div className="border border-slate-800 bg-[#0b1220] p-4">
          <h2 className="mb-3 text-[12px] font-black text-white">Add New Attribute Value</h2>
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-[1fr_1fr_auto]">
            <select
              value={newValue.attribute_id}
              onChange={(e) => setNewValue((prev) => ({ ...prev, attribute_id: e.target.value }))}
              className="h-9 border border-slate-700 bg-[#0a101d] px-3 text-[12px] text-slate-100 outline-none focus:border-yellow-500"
            >
              <option value="">Select attribute</option>
              {attributes.map((item) => (
                <option key={item.id} value={item.id}>
                  {getName(item)}
                </option>
              ))}
            </select>
            <input
              value={newValue.value}
              onChange={(e) => setNewValue((prev) => ({ ...prev, value: e.target.value }))}
              placeholder="Example: 10W"
              className="h-9 border border-slate-700 bg-[#0a101d] px-3 text-[12px] text-slate-100 outline-none placeholder:text-slate-600 focus:border-yellow-500"
            />
            <button
              type="button"
              onClick={addNewAttributeValue}
              className="inline-flex h-9 cursor-pointer items-center gap-1.5 bg-orange-500 px-3 text-[12px] font-semibold text-white hover:bg-orange-400"
            >
              <Plus size={14} /> Add
            </button>
          </div>
        </div>
      </div>

      <div className="border border-slate-800 bg-[#0b1220] p-4">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-[12px] font-black text-white">Assigned Attributes</h2>
          <button
            type="button"
            onClick={() => setRows((prev) => [...prev, { attribute_id: "", attribute_value_id: "", custom_value: "" }])}
            className="inline-flex cursor-pointer items-center gap-2 border border-slate-700 px-4 py-2 text-xs font-bold text-slate-300 hover:bg-slate-800"
          >
            <Plus size={14} /> Add Row
          </button>
        </div>

        {loading ? (
          <div className="py-10 text-center text-slate-500">Loading attributes...</div>
        ) : (
          <div className="space-y-3">
            {rows.map((row, index) => {
              const values = attributeValues.filter(
                (item) => !row.attribute_id || String(item.attribute_id) === String(row.attribute_id)
              );

              return (
                <div
                  key={index}
                  className="grid grid-cols-1 gap-3 border border-slate-800 bg-[#07101f] p-3 lg:grid-cols-[1fr_1fr_1fr_auto]"
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
                  <FormSelect
                    label="Value"
                    value={row.attribute_value_id}
                    onChange={(value) => updateRow(index, "attribute_value_id", value)}
                  >
                    <option value="">Select value</option>
                    {values.map((item) => (
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
              );
            })}
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
