import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Loader2, Save } from "lucide-react";
import wooProductApi from "../../../../config/sub_api/woo_api/woo_product_api";

const inputClass = "w-full rounded-lg border border-slate-700 bg-[#080f1d] px-3 py-2 text-xs text-slate-100 outline-none transition focus:border-blue-500";

function clean(value) {
  return String(value ?? "").trim();
}

function rows(response) {
  const payload = response?.data || response || {};
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload.data)) return payload.data;
  if (Array.isArray(payload.rows)) return payload.rows;
  if (Array.isArray(payload.data?.rows)) return payload.data.rows;
  if (Array.isArray(payload.data?.data)) return payload.data.data;
  return [];
}

function Field({ label, children }) {
  return <label className="block text-[11px] font-semibold text-slate-300"><span className="mb-1 block">{label}</span>{children}</label>;
}

function toImages(text) {
  return clean(text).split("\n").map(clean).filter(Boolean).map((src) => ({ src }));
}

function parseAttributes(text) {
  return clean(text).split("\n").map((line) => {
    const [name, valuesText = ""] = line.split(":");
    const options = valuesText.split(",").map(clean).filter(Boolean);
    if (!clean(name)) return null;
    return { name: clean(name), visible: true, variation: options.length > 1, options };
  }).filter(Boolean);
}

function parseVariations(text) {
  return clean(text).split("\n").map((line) => {
    const parts = line.split("|").map(clean);
    if (!parts[0]) return null;
    return {
      sku: parts[0],
      regular_price: parts[1] || "0",
      sale_price: parts[2] || undefined,
      stock_quantity: Number(parts[3] || 0),
      manage_stock: true,
      attributes: parts[4] ? parts[4].split(",").map((item) => {
        const [name, option] = item.split("=").map(clean);
        return name && option ? { name, option } : null;
      }).filter(Boolean) : [],
    };
  }).filter(Boolean);
}

function buildPayload(values, categoryId, productType, rawPayload) {
  if (clean(rawPayload)) return JSON.parse(rawPayload);
  const payload = {
    name: values.name,
    type: productType,
    status: values.status || "draft",
    sku: productType === "simple" ? values.sku : undefined,
    regular_price: productType === "simple" ? values.regular_price : undefined,
    sale_price: productType === "simple" ? values.sale_price || undefined : undefined,
    manage_stock: productType === "simple",
    stock_quantity: productType === "simple" ? Number(values.stock_quantity || 0) : undefined,
    description: values.description || "",
    short_description: values.short_description || "",
    categories: categoryId ? [{ id: Number(categoryId) }] : [],
    images: toImages(values.images),
    attributes: parseAttributes(values.attributes_text),
  };
  if (productType === "variable") payload.variations_payload = parseVariations(values.variations_text);
  return payload;
}

export default function WooProductFormPage() {
  const navigate = useNavigate();
  const { accountId: routeAccountId, wooProductId } = useParams();
  const editMode = Boolean(routeAccountId && wooProductId);
  const [accounts, setAccounts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [wooAttributes, setWooAttributes] = useState([]);
  const [accountId, setAccountId] = useState(routeAccountId || "");
  const [categoryId, setCategoryId] = useState("");
  const [productType, setProductType] = useState("simple");
  const [values, setValues] = useState({ status: "draft" });
  const [rawPayload, setRawPayload] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const variationPreview = useMemo(() => parseVariations(values.variations_text), [values.variations_text]);

  useEffect(() => {
    async function loadAccounts() {
      try {
        const response = await wooProductApi.getWooAccounts();
        setAccounts(rows(response));
      } catch (error) {
        setMessage(error?.response?.data?.message || error.message || "Unable to load Woo accounts.");
      }
    }
    loadAccounts();
  }, []);

  useEffect(() => {
    if (!accountId) return;
    async function loadMeta() {
      const categoryResponse = await wooProductApi.getWooCategories(accountId).catch(() => null);
      const attributeResponse = await wooProductApi.getWooAttributes(accountId).catch(() => null);
      setCategories(rows(categoryResponse));
      setWooAttributes(rows(attributeResponse));
    }
    loadMeta();
  }, [accountId]);

  useEffect(() => {
    if (!editMode) return;
    async function loadProduct() {
      try {
        const response = await wooProductApi.getSyncedWooProductDetail(routeAccountId, wooProductId);
        const product = response?.data?.data?.product || response?.data?.product || response?.data?.data || {};
        setProductType(product.type || "simple");
        setCategoryId(String(product.category_id || product.categories?.[0]?.id || ""));
        setValues({
          name: product.name || product.product_name || "",
          sku: product.sku || product.local_sku || "",
          regular_price: product.regular_price || product.price || "",
          sale_price: product.sale_price || "",
          stock_quantity: product.stock_quantity || product.quantity || "",
          status: product.status || "draft",
          description: product.description || "",
          short_description: product.short_description || "",
          images: (product.images || []).map((image) => image.src || image.url || image.image_url).filter(Boolean).join("\n"),
          attributes_text: (product.attributes || []).map((attribute) => `${attribute.name || attribute.slug}: ${(attribute.options || []).join(", ")}`).join("\n"),
          variations_text: "",
        });
      } catch (error) {
        setMessage(error?.response?.data?.message || error.message || "Unable to load Woo product.");
      }
    }
    loadProduct();
  }, [editMode, routeAccountId, wooProductId]);

  function setValue(key, value) {
    setValues((prev) => ({ ...prev, [key]: value }));
  }

  async function submit() {
    if (!accountId) return setMessage("Woo account is required.");
    if (!values.name) return setMessage("Product name is required.");
    if (productType === "simple" && !values.sku) return setMessage("SKU is required for simple product.");
    if (productType === "variable" && !variationPreview.length && !clean(rawPayload)) return setMessage("Add at least one variation or use raw payload.");

    setLoading(true);
    setMessage("");
    try {
      const payload = buildPayload(values, categoryId, productType, rawPayload);
      if (editMode) await wooProductApi.updateWooProduct(accountId, wooProductId, payload);
      else await wooProductApi.createWooProduct(accountId, payload);
      setMessage(editMode ? "Woo product updated." : "Woo product created.");
    } catch (error) {
      setMessage(error?.response?.data?.message || error.message || "Woo product save failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#070b16] p-3 text-slate-100 lg:p-5">
      <div className="mx-auto max-w-[1500px] space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-800 bg-[#0b1220] px-4 py-4 shadow-lg shadow-black/20">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-blue-300">WooCommerce Product</p>
            <h1 className="mt-1 text-xl font-semibold">{editMode ? "Edit Woo Product" : "Create Woo Product"}</h1>
          </div>
          <button type="button" onClick={() => navigate(-1)} className="inline-flex items-center gap-2 rounded-lg border border-slate-700 bg-[#111827] px-3 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-800"><ArrowLeft size={15} /> Back</button>
        </div>

        <section className="rounded-xl border border-slate-800 bg-[#0b1220] p-4">
          <div className="grid gap-3 lg:grid-cols-4">
            <Field label="Woo Account">
              <select value={accountId} onChange={(event) => setAccountId(event.target.value)} className={inputClass} disabled={editMode}>
                <option value="">Select account</option>
                {accounts.map((account) => <option key={account.id || account.account_id} value={account.id || account.account_id}>{account.account_name || account.account_code || account.store_url}</option>)}
              </select>
            </Field>
            <Field label="Category">
              <select value={categoryId} onChange={(event) => setCategoryId(event.target.value)} className={inputClass}>
                <option value="">Select category</option>
                {categories.map((category) => <option key={category.id || category.category_id} value={category.id || category.category_id}>{category.name || category.category_name}</option>)}
              </select>
            </Field>
            <Field label="Product Type">
              <select value={productType} onChange={(event) => setProductType(event.target.value)} className={inputClass}>
                <option value="simple">Simple product</option>
                <option value="variable">Variable product</option>
              </select>
            </Field>
            <Field label="Status">
              <select value={values.status || "draft"} onChange={(event) => setValue("status", event.target.value)} className={inputClass}>
                <option value="draft">Draft</option>
                <option value="publish">Publish</option>
                <option value="private">Private</option>
              </select>
            </Field>
          </div>

          <div className="mt-4 grid gap-3 lg:grid-cols-4">
            <Field label="Product Name"><input className={inputClass} value={values.name || ""} onChange={(event) => setValue("name", event.target.value)} /></Field>
            <Field label="SKU"><input className={inputClass} value={values.sku || ""} onChange={(event) => setValue("sku", event.target.value)} disabled={productType === "variable"} /></Field>
            <Field label="Regular Price"><input type="number" className={inputClass} value={values.regular_price || ""} onChange={(event) => setValue("regular_price", event.target.value)} disabled={productType === "variable"} /></Field>
            <Field label="Sale Price"><input type="number" className={inputClass} value={values.sale_price || ""} onChange={(event) => setValue("sale_price", event.target.value)} disabled={productType === "variable"} /></Field>
            <Field label="Stock Quantity"><input type="number" className={inputClass} value={values.stock_quantity || ""} onChange={(event) => setValue("stock_quantity", event.target.value)} disabled={productType === "variable"} /></Field>
          </div>

          <div className="mt-4 grid gap-3 lg:grid-cols-2">
            <Field label="Short Description"><textarea rows={5} className={inputClass} value={values.short_description || ""} onChange={(event) => setValue("short_description", event.target.value)} /></Field>
            <Field label="Description"><textarea rows={5} className={inputClass} value={values.description || ""} onChange={(event) => setValue("description", event.target.value)} /></Field>
          </div>

          <div className="mt-4 grid gap-3 lg:grid-cols-2">
            <Field label="Image URLs - one per line"><textarea rows={5} className={inputClass} value={values.images || ""} onChange={(event) => setValue("images", event.target.value)} /></Field>
            <Field label="Attributes - one per line, example: Color: Red, Blue">
              <textarea rows={5} className={inputClass} value={values.attributes_text || ""} onChange={(event) => setValue("attributes_text", event.target.value)} placeholder={wooAttributes.slice(0, 4).map((item) => item.name).filter(Boolean).join(" / ")} />
            </Field>
          </div>

          {productType === "variable" && (
            <div className="mt-4">
              <Field label="Variations - SKU | regular price | sale price | stock | Color=Red,Size=M">
                <textarea rows={6} className={`${inputClass} font-mono`} value={values.variations_text || ""} onChange={(event) => setValue("variations_text", event.target.value)} />
              </Field>
              <p className="mt-2 text-xs text-slate-500">Prepared variations: {variationPreview.length}</p>
            </div>
          )}

          <div className="mt-4">
            <Field label="Raw Woo Payload Editor">
              <textarea className={`${inputClass} font-mono`} rows={9} value={rawPayload} onChange={(event) => setRawPayload(event.target.value)} placeholder="Optional advanced JSON payload" />
            </Field>
          </div>

          {message && <p className="mt-4 rounded-lg border border-slate-700 bg-[#080f1d] px-3 py-2 text-xs text-slate-300">{message}</p>}

          <div className="mt-4 flex justify-end">
            <button type="button" onClick={submit} disabled={loading} className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-60">
              {loading ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
              Save Woo Product
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}
