import { useEffect, useMemo, useState } from "react";
import { Plus, Save, Trash2 } from "lucide-react";
import { useParams } from "react-router-dom";
import localProductsApi from "../../../config/sub_api/product_management_api/local_products_api";
import ProductPageLayout from "./components/ProductPageLayout";
import { FormInput, FormSelect } from "./components/FormInput";
import { getErrorMessage, getName, normalizeList } from "./utils/productSku";

export default function LocalProductAttributesPage() {
  const { productId } = useParams();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [product, setProduct] = useState(null);
  const [attributes, setAttributes] = useState([]);
  const [attributeValues, setAttributeValues] = useState([]);
  const [rows, setRows] = useState([]);
  const [newAttributeName, setNewAttributeName] = useState("");
  const [newValue, setNewValue] = useState({ attribute_id: "", value: "" });

  async function loadData() {
    setLoading(true);
    try {
      const [productRes, attrRes, valueRes, productAttrRes] = await Promise.all([
        localProductsApi.getProductById(productId),
        localProductsApi.getAttributes().catch(() => []),
        localProductsApi.getAttributeValues().catch(() => []),
        localProductsApi.getProductAttributeValues().catch(() => ({ data: [] })),
      ]);
      const productData = productRes?.data?.data || productRes?.data || productRes;
      const attrRows = normalizeList(attrRes);
      const valueRows = normalizeList(valueRes);
      const productAttrRows = normalizeList(productAttrRes).filter((item) => String(item.product_id) === String(productId));

      setProduct(productData);
      setAttributes(attrRows);
      setAttributeValues(valueRows);
      setRows(productAttrRows.length ? productAttrRows : [{ attribute_id: "", attribute_value_id: "", custom_value: "" }]);
    } catch (error) {
      alert(getErrorMessage(error, "Unable to load product attributes."));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, [productId]);

  function updateRow(index, name, value) {
    setRows((prev) => prev.map((row, rowIndex) => rowIndex === index ? { ...row, [name]: value } : row));
  }

  async function addNewAttribute() {
    if (!newAttributeName.trim()) return alert("Enter attribute name.");
    try {
      const created = await localProductsApi.createAttribute({ name: newAttributeName, attribute_name: newAttributeName, created_by: 1, updated_by: 1 });
      const item = created?.data?.data || created?.data || created;
      setNewAttributeName("");
      await loadData();
      if (item?.id) setRows((prev) => [...prev, { attribute_id: item.id, attribute_value_id: "", custom_value: "" }]);
    } catch (error) {
      alert(getErrorMessage(error, "Unable to create attribute."));
    }
  }

  async function addNewAttributeValue() {
    if (!newValue.attribute_id || !newValue.value.trim()) return alert("Select attribute and enter value.");
    try {
      const payload = {
        attribute_id: newValue.attribute_id,
        value: newValue.value,
        attribute_value: newValue.value,
        name: newValue.value,
        created_by: 1,
        updated_by: 1,
      };
      const created = await localProductsApi.createAttributeValue(payload);
      const item = created?.data?.data || created?.data || created;
      setNewValue({ attribute_id: "", value: "" });
      await loadData();
      if (item?.id) setRows((prev) => [...prev, { attribute_id: payload.attribute_id, attribute_value_id: item.id, custom_value: "" }]);
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
          attribute_id: row.attribute_id,
          attribute_value_id: row.attribute_value_id || null,
          custom_value: row.custom_value || null,
          updated_by: 1,
          created_by: row.created_by || 1,
        };
        if (row.id) await localProductsApi.updateProductAttributeValue(row.id, payload);
        else await localProductsApi.createProductAttributeValue(payload);
      }
      alert("Attributes saved successfully.");
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
    if (!window.confirm("Delete this attribute row?")) return;
    try {
      await localProductsApi.deleteProductAttributeValue(row.id);
      await loadData();
    } catch (error) {
      alert(getErrorMessage(error, "Unable to delete attribute row."));
    }
  }

  return (
    <ProductPageLayout productId={productId} active="attributes" product={product} title="Product Attributes" description="Add product attributes. If no attribute exists, create it here first.">
      <div className="space-y-5">
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="mb-4 text-lg font-bold text-slate-950">Add New Attribute</h2>
            <div className="flex gap-2">
              <input value={newAttributeName} onChange={(e) => setNewAttributeName(e.target.value)} placeholder="Example: Wattage" className="flex-1 rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-slate-950" />
              <button type="button" onClick={addNewAttribute} className="inline-flex cursor-pointer items-center gap-2 rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white hover:bg-slate-800"><Plus size={16} /> Add</button>
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="mb-4 text-lg font-bold text-slate-950">Add New Attribute Value</h2>
            <div className="grid grid-cols-1 gap-3 lg:grid-cols-[1fr_1fr_auto]">
              <select value={newValue.attribute_id} onChange={(e) => setNewValue((prev) => ({ ...prev, attribute_id: e.target.value }))} className="rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-slate-950">
                <option value="">Select attribute</option>
                {attributes.map((item) => <option key={item.id} value={item.id}>{getName(item)}</option>)}
              </select>
              <input value={newValue.value} onChange={(e) => setNewValue((prev) => ({ ...prev, value: e.target.value }))} placeholder="Example: 10W" className="rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-slate-950" />
              <button type="button" onClick={addNewAttributeValue} className="inline-flex cursor-pointer items-center gap-2 rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white hover:bg-slate-800"><Plus size={16} /> Add</button>
            </div>
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-950">Assigned Attributes</h2>
            <button type="button" onClick={() => setRows((prev) => [...prev, { attribute_id: "", attribute_value_id: "", custom_value: "" }])} className="inline-flex cursor-pointer items-center gap-2 rounded-2xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"><Plus size={16} /> Add Row</button>
          </div>

          {loading ? <div className="py-10 text-center text-slate-500">Loading attributes...</div> : (
            <div className="space-y-3">
              {rows.map((row, index) => {
                const values = attributeValues.filter((item) => !row.attribute_id || String(item.attribute_id) === String(row.attribute_id));
                return (
                  <div key={index} className="grid grid-cols-1 gap-3 rounded-2xl border border-slate-100 bg-slate-50 p-3 lg:grid-cols-[1fr_1fr_1fr_auto]">
                    <FormSelect label="Attribute" value={row.attribute_id} onChange={(value) => updateRow(index, "attribute_id", value)}>
                      <option value="">Select attribute</option>
                      {attributes.map((item) => <option key={item.id} value={item.id}>{getName(item)}</option>)}
                    </FormSelect>
                    <FormSelect label="Value" value={row.attribute_value_id} onChange={(value) => updateRow(index, "attribute_value_id", value)}>
                      <option value="">Select value</option>
                      {values.map((item) => <option key={item.id} value={item.id}>{getName(item)}</option>)}
                    </FormSelect>
                    <FormInput label="Custom Value" value={row.custom_value || ""} onChange={(value) => updateRow(index, "custom_value", value)} />
                    <div className="flex items-end">
                      <button type="button" onClick={() => deleteRow(row, index)} className="inline-flex h-12 w-full cursor-pointer items-center justify-center rounded-2xl border border-rose-200 text-rose-600 hover:bg-rose-50 lg:w-12"><Trash2 size={16} /></button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <div className="mt-5 flex justify-end">
            <button type="button" disabled={saving} onClick={handleSave} className="inline-flex cursor-pointer items-center gap-2 rounded-2xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60"><Save size={16} /> {saving ? "Saving..." : "Save Attributes"}</button>
          </div>
        </div>
      </div>
    </ProductPageLayout>
  );
}
