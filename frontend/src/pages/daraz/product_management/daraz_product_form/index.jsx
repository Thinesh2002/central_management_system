import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Loader2, Save } from "lucide-react";
import marketplaceApi from "../../../../config/sub_api/marketplace_management_api/marketplace_api";
import { darazProductsApi } from "../../../../config/sub_api/daraz_api/daraz_products_api";

function rows(value) {
  if (Array.isArray(value)) return value;
  if (Array.isArray(value?.data)) return value.data;
  if (Array.isArray(value?.rows)) return value.rows;
  if (Array.isArray(value?.data?.data)) return value.data.data;
  return [];
}

function clean(value) {
  return String(value ?? "").trim();
}

function Field({ label, children }) {
  return <label className="block text-[11px] font-semibold text-slate-300"><span className="mb-1 block">{label}</span>{children}</label>;
}

const inputClass = "w-full rounded-lg border border-slate-700 bg-[#080f1d] px-3 py-2 text-xs text-slate-100 outline-none transition focus:border-orange-400";

function attrKey(attribute = {}) {
  return clean(attribute.name || attribute.attribute_name || attribute.AttributeName || attribute.code || attribute.key || attribute.input_name);
}

function attrName(attribute = {}) {
  return clean(attribute.label || attribute.name || attribute.attribute_name || attribute.AttributeName || attribute.code || attribute.key);
}

function attrOptions(attribute = {}) {
  const options = attribute.options || attribute.values || attribute.attribute_values || attribute.OptionValues;
  return Array.isArray(options) ? options : [];
}

function isRequired(attribute = {}) {
  return Number(attribute.is_required ?? attribute.required ?? attribute.IsMandatory ?? 0) === 1 || String(attribute.required || "").toLowerCase() === "true";
}

function attrType(attribute = {}) {
  const type = clean(attribute.input_type || attribute.type || attribute.attribute_type).toLowerCase();
  if (type.includes("multi")) return "multi";
  if (type.includes("select") || attrOptions(attribute).length) return "select";
  if (type.includes("number") || type.includes("decimal") || type.includes("int")) return "number";
  return "text";
}

function unwrapAttributes(response) {
  const data = response?.data || response;
  const candidates = [data.attributes, data.data?.attributes, data.data?.data?.attributes, data.data?.Attributes, data.rows];
  for (const candidate of candidates) if (Array.isArray(candidate)) return candidate;
  return [];
}

export default function DarazProductFormPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const editMode = Boolean(id);
  const [accounts, setAccounts] = useState([]);
  const [accountId, setAccountId] = useState("");
  const [categories, setCategories] = useState([]);
  const [categoryId, setCategoryId] = useState("");
  const [attributes, setAttributes] = useState([]);
  const [values, setValues] = useState({ brand: "No Brand" });
  const [rawPayload, setRawPayload] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const requiredMissing = useMemo(() => attributes.filter(isRequired).filter((attribute) => !clean(values[attrKey(attribute)])), [attributes, values]);

  useEffect(() => {
    async function load() {
      try {
        const response = await marketplaceApi.getAccounts({ platform_code: "DARAZ" });
        setAccounts(rows(response?.data || response));
      } catch (error) {
        setMessage(error?.response?.data?.message || error.message || "Unable to load Daraz accounts.");
      }
    }
    load();
  }, []);

  useEffect(() => {
    if (!id) return;
    async function loadProduct() {
      try {
        const response = await darazProductsApi.view(id);
        const product = response?.data?.data?.product || response?.data?.product || response?.data?.data || {};
        setAccountId(String(product.account_id || ""));
        setCategoryId(String(product.primary_category_id || product.category_id || ""));
        setValues((prev) => ({
          ...prev,
          item_id: product.item_id || product.daraz_item_id || product.marketplace_item_id || "",
          seller_sku: product.seller_sku || product.sku || "",
          name: product.product_name || product.name || "",
          brand: product.brand || prev.brand,
          price: product.price || product.daraz_price || product.selling_price || "",
          quantity: product.quantity || product.stock_quantity || product.stock_qty || "",
        }));
        const raw = await darazProductsApi.raw(id).catch(() => null);
        const payload = raw?.data?.data || raw?.data || null;
        if (payload) setRawPayload(JSON.stringify(payload, null, 2));
      } catch (error) {
        setMessage(error?.response?.data?.message || error.message || "Unable to load Daraz product.");
      }
    }
    loadProduct();
  }, [id]);

  useEffect(() => {
    if (!accountId) return;
    async function loadCategories() {
      try {
        const response = await darazProductsApi.getCategories(accountId);
        setCategories(rows(response?.data?.data || response?.data || response));
      } catch {
        setCategories([]);
      }
    }
    loadCategories();
  }, [accountId]);

  useEffect(() => {
    if (!accountId || !categoryId) return;
    async function loadAttributes() {
      try {
        const response = await darazProductsApi.getCategoryAttributes(accountId, categoryId);
        setAttributes(unwrapAttributes(response));
      } catch {
        setAttributes([]);
      }
    }
    loadAttributes();
  }, [accountId, categoryId]);

  function setValue(key, value) {
    setValues((prev) => ({ ...prev, [key]: value }));
  }

  function buildPayload() {
    if (clean(rawPayload)) return JSON.parse(rawPayload);
    return {
      PrimaryCategory: categoryId,
      Attributes: values,
      Skus: [{
        SellerSku: values.seller_sku || values.sku,
        price: values.price,
        quantity: values.quantity,
        Images: clean(values.images).split("\n").map(clean).filter(Boolean),
      }],
    };
  }

  async function submit() {
    if (!accountId) return setMessage("Daraz account is required.");
    if (!categoryId) return setMessage("Daraz category is required.");
    if (requiredMissing.length) return setMessage(`${attrName(requiredMissing[0])} is required.`);

    setLoading(true);
    setMessage("");
    try {
      const payload = buildPayload();
      if (editMode) await darazProductsApi.updateProduct(accountId, { ...payload, item_id: values.item_id });
      else await darazProductsApi.createProduct(accountId, payload);
      setMessage(editMode ? "Daraz product updated." : "Daraz product created.");
    } catch (error) {
      setMessage(error?.response?.data?.message || error.message || "Daraz product save failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#070b16] p-3 text-slate-100 lg:p-5">
      <div className="mx-auto max-w-[1500px] space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-800 bg-[#0b1220] px-4 py-4 shadow-lg shadow-black/20">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-orange-300">Daraz Product</p>
            <h1 className="mt-1 text-xl font-semibold">{editMode ? "Edit Daraz Product" : "Create Daraz Product"}</h1>
          </div>
          <button type="button" onClick={() => navigate(-1)} className="inline-flex items-center gap-2 rounded-lg border border-slate-700 bg-[#111827] px-3 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-800"><ArrowLeft size={15} /> Back</button>
        </div>

        <section className="rounded-xl border border-slate-800 bg-[#0b1220] p-4">
          <div className="grid gap-3 lg:grid-cols-3">
            <Field label="Daraz Account">
              <select value={accountId} onChange={(event) => setAccountId(event.target.value)} className={inputClass}>
                <option value="">Select account</option>
                {accounts.map((account) => <option key={account.id || account.account_id} value={account.id || account.account_id}>{account.account_name || account.account_code}</option>)}
              </select>
            </Field>
            <Field label="Category">
              <select value={categoryId} onChange={(event) => setCategoryId(event.target.value)} className={inputClass}>
                <option value="">Select category</option>
                {categories.map((category) => {
                  const cid = category.category_id || category.id || category.CategoryId;
                  const name = category.name || category.category_name || category.Name || cid;
                  return <option key={cid} value={cid}>{name}</option>;
                })}
              </select>
            </Field>
            <Field label="Seller SKU">
              <input className={inputClass} value={values.seller_sku || ""} onChange={(event) => setValue("seller_sku", event.target.value)} />
            </Field>
          </div>

          <div className="mt-4 grid gap-3 lg:grid-cols-3">
            <Field label="Product Name">
              <input className={inputClass} value={values.name || ""} onChange={(event) => setValue("name", event.target.value)} />
            </Field>
            <Field label="Price">
              <input type="number" className={inputClass} value={values.price || ""} onChange={(event) => setValue("price", event.target.value)} />
            </Field>
            <Field label="Stock Quantity">
              <input type="number" className={inputClass} value={values.quantity || ""} onChange={(event) => setValue("quantity", event.target.value)} />
            </Field>
          </div>

          <div className="mt-4 grid gap-3 lg:grid-cols-3">
            {attributes.map((attribute) => {
              const key = attrKey(attribute);
              const type = attrType(attribute);
              const options = attrOptions(attribute);
              return (
                <Field key={key} label={`${attrName(attribute)}${isRequired(attribute) ? " *" : ""}`}>
                  {type === "select" || type === "multi" ? (
                    <select multiple={type === "multi"} className={inputClass} value={values[key] || (type === "multi" ? [] : "")} onChange={(event) => setValue(key, type === "multi" ? Array.from(event.target.selectedOptions).map((option) => option.value) : event.target.value)}>
                      <option value="">Select</option>
                      {options.map((option) => {
                        const value = option.value || option.id || option.name || option;
                        const label = option.name || option.label || option.value || option.id || option;
                        return <option key={String(value)} value={value}>{label}</option>;
                      })}
                    </select>
                  ) : <input type={type === "number" ? "number" : "text"} className={inputClass} value={values[key] || ""} onChange={(event) => setValue(key, event.target.value)} />}
                </Field>
              );
            })}
          </div>

          <div className="mt-4">
            <Field label="Image URLs - one per line">
              <textarea className={inputClass} rows={4} value={values.images || ""} onChange={(event) => setValue("images", event.target.value)} />
            </Field>
          </div>

          <div className="mt-4">
            <Field label="Raw Daraz Payload Editor">
              <textarea className={`${inputClass} font-mono`} rows={10} value={rawPayload} onChange={(event) => setRawPayload(event.target.value)} placeholder="Optional advanced JSON payload" />
            </Field>
          </div>

          {message && <p className="mt-4 rounded-lg border border-slate-700 bg-[#080f1d] px-3 py-2 text-xs text-slate-300">{message}</p>}

          <div className="mt-4 flex justify-end">
            <button type="button" onClick={submit} disabled={loading} className="inline-flex items-center gap-2 rounded-lg bg-orange-500 px-4 py-2 text-xs font-semibold text-white hover:bg-orange-600 disabled:opacity-60">
              {loading ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
              Save Daraz Product
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}
