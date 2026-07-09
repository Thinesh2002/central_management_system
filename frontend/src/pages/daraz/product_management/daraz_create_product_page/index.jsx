import { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  Loader2,
  Plus,
  RefreshCw,
  Save,
  Trash2,
} from "lucide-react";
import { Link } from "react-router-dom";
import { marketplaceApi } from "../../../../config/sub_api/marketplace_management_api/marketplace_api";
import { darazCatalogApi } from "../../../../config/sub_api/daraz_api/daraz_catalog_api";

const inputClass =
  "w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 focus:border-yellow-500 focus:outline-none";
const labelClass = "mb-1 block text-xs font-medium text-slate-400";

function clean(value) {
  return String(value ?? "").trim();
}

function normalizeArray(payload) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.data?.data)) return payload.data.data;
  if (Array.isArray(payload?.data?.module)) return payload.data.module;
  if (Array.isArray(payload?.data?.data?.module)) return payload.data.data.module;
  if (Array.isArray(payload?.module)) return payload.module;
  return [];
}

function unwrapData(response) {
  return response?.data?.data?.data || response?.data?.data || response?.data || response || {};
}

function emptySku() {
  return {
    sellerSku: "",
    colorFamily: "",
    size: "",
    price: "",
    salePrice: "",
    quantity: "0",
    packageLength: "1",
    packageHeight: "1",
    packageWeight: "0.1",
    packageWidth: "1",
    packageContent: "",
    images: "",
  };
}

function flattenCategories(nodes = [], parent = "") {
  const list = [];

  nodes.forEach((node) => {
    const name = clean(node.name || node.label || node.category_name || node.categoryName || node.id);
    const id = clean(node.category_id || node.categoryId || node.id);
    const path = parent ? `${parent} / ${name}` : name;
    const children = Array.isArray(node.children) ? node.children : [];

    if (id) {
      list.push({ id, name, path, leaf: Boolean(node.leaf) || children.length === 0 });
    }

    if (children.length) {
      list.push(...flattenCategories(children, path));
    }
  });

  return list;
}

function getAttributeName(attribute) {
  return clean(attribute.name || attribute.attribute_name || attribute.code || attribute.id);
}

function getAttributeLabel(attribute) {
  return clean(attribute.label || attribute.name || attribute.attribute_name || attribute.code || attribute.id);
}

function isMandatory(attribute) {
  return String(attribute.is_mandatory ?? attribute.mandatory ?? "0") === "1";
}

function getOptions(attribute) {
  const options = Array.isArray(attribute.options) ? attribute.options : [];
  return options.map((option) => clean(option.name || option.label || option.value)).filter(Boolean);
}

export default function DarazCreateProductPage() {
  const [accounts, setAccounts] = useState([]);
  const [accountId, setAccountId] = useState("");
  const [categories, setCategories] = useState([]);
  const [categorySearch, setCategorySearch] = useState("");
  const [attributes, setAttributes] = useState([]);
  const [attributeValues, setAttributeValues] = useState({});
  const [brands, setBrands] = useState([]);

  const [primaryCategory, setPrimaryCategory] = useState("");
  const [name, setName] = useState("");
  const [shortDescription, setShortDescription] = useState("");
  const [brand, setBrand] = useState("No Brand");
  const [model, setModel] = useState("");
  const [images, setImages] = useState("");
  const [skus, setSkus] = useState([emptySku()]);

  const [loadingCatalog, setLoadingCatalog] = useState(false);
  const [loadingAttributes, setLoadingAttributes] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(null);

  useEffect(() => {
    marketplaceApi
      .getAccounts({ platform_code: "DARAZ" })
      .then((res) => {
        const list = res?.data?.data || res?.data || [];
        setAccounts(list);
        if (list[0]?.id) setAccountId(String(list[0].id));
      })
      .catch(() => setAccounts([]));
  }, []);

  useEffect(() => {
    if (accountId) loadCatalogOptions(accountId);
  }, [accountId]);

  useEffect(() => {
    if (accountId && primaryCategory) loadCategoryAttributes();
  }, [accountId, primaryCategory]);

  const filteredCategories = useMemo(() => {
    const q = categorySearch.toLowerCase().trim();
    const leafCategories = categories.filter((category) => category.leaf);
    if (!q) return leafCategories.slice(0, 250);
    return leafCategories
      .filter((category) => `${category.id} ${category.path}`.toLowerCase().includes(q))
      .slice(0, 250);
  }, [categories, categorySearch]);

  async function loadCatalogOptions(selectedAccountId = accountId) {
    if (!selectedAccountId) return;

    setLoadingCatalog(true);
    setError("");

    try {
      const [categoryRes, brandRes] = await Promise.allSettled([
        darazCatalogApi.categoryTree(selectedAccountId),
        darazCatalogApi.brands(selectedAccountId, { startRow: 0, pageSize: 200 }),
      ]);

      if (categoryRes.status === "fulfilled") {
        const categoryData = unwrapData(categoryRes.value);
        setCategories(flattenCategories(normalizeArray(categoryData)));
      }

      if (brandRes.status === "fulfilled") {
        const brandData = unwrapData(brandRes.value);
        const brandList = normalizeArray(brandData).map((item) => clean(item.name || item.name_en)).filter(Boolean);
        setBrands(Array.from(new Set(["No Brand", ...brandList])).slice(0, 250));
      }
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || "Failed to load Daraz category/brand options.");
    } finally {
      setLoadingCatalog(false);
    }
  }

  async function loadCategoryAttributes() {
    setLoadingAttributes(true);
    setAttributes([]);
    setAttributeValues({});

    try {
      const res = await darazCatalogApi.categoryAttributes(accountId, {
        primary_category_id: primaryCategory,
        language_code: "en_US",
      });

      const list = normalizeArray(unwrapData(res));
      setAttributes(list);

      const defaults = {};
      list.forEach((attribute) => {
        const attributeName = getAttributeName(attribute);
        if (!attributeName) return;
        defaults[attributeName] = attributeValues[attributeName] || "";
      });
      setAttributeValues(defaults);
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || "Failed to load Daraz category attributes.");
    } finally {
      setLoadingAttributes(false);
    }
  }

  function updateSku(index, field, value) {
    setSkus((prev) => prev.map((sku, i) => (i === index ? { ...sku, [field]: value } : sku)));
  }

  function addSku() {
    setSkus((prev) => [...prev, emptySku()]);
  }

  function removeSku(index) {
    setSkus((prev) => prev.filter((_, i) => i !== index));
  }

  function validateMandatoryAttributes() {
    const missing = attributes
      .filter(isMandatory)
      .map((attribute) => ({ name: getAttributeName(attribute), label: getAttributeLabel(attribute) }))
      .filter((attribute) => attribute.name && !clean(attributeValues[attribute.name]));

    if (missing.length) {
      setError(`Mandatory Daraz attributes missing: ${missing.map((item) => item.label).join(", ")}`);
      return false;
    }

    return true;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setSuccess(null);

    if (!accountId) return setError("Select a Daraz account.");
    if (!primaryCategory) return setError("Select Daraz primary category.");
    if (!name.trim()) return setError("Product name is required.");
    if (!validateMandatoryAttributes()) return;

    const payload = {
      primaryCategory,
      name: name.trim(),
      shortDescription,
      brand: brand || "No Brand",
      model,
      attributes: attributeValues,
      images: images.split(",").map((s) => s.trim()).filter(Boolean).slice(0, 8),
      skus: skus
        .filter((s) => s.sellerSku.trim())
        .map((s) => ({
          sellerSku: s.sellerSku.trim(),
          colorFamily: s.colorFamily.trim(),
          size: s.size.trim(),
          price: Number(s.price || 0),
          salePrice: s.salePrice === "" ? null : Number(s.salePrice || 0),
          quantity: Number(s.quantity || 0),
          packageLength: Number(s.packageLength || 1),
          packageHeight: Number(s.packageHeight || 1),
          packageWeight: Number(s.packageWeight || 0.1),
          packageWidth: Number(s.packageWidth || 1),
          packageContent: s.packageContent || name.trim(),
          images: s.images.split(",").map((x) => x.trim()).filter(Boolean).slice(0, 8),
        })),
    };

    if (payload.skus.length === 0) return setError("At least one SKU is required.");

    try {
      setSaving(true);
      const res = await darazCatalogApi.createProduct(accountId, payload);
      const created = res?.data?.data?.data || res?.data?.data || res?.data;
      setSuccess(created);
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || "Failed to create product on Daraz.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="min-h-full bg-slate-950 p-4 text-slate-200 md:p-6">
      <div className="mx-auto max-w-6xl">
        <Link to="/product/daraz-products" className="mb-4 inline-flex items-center gap-2 text-sm text-slate-400 hover:text-yellow-300">
          <ArrowLeft size={16} />
          Back to Daraz Products
        </Link>

        <form onSubmit={handleSubmit} className="space-y-5 rounded-2xl border border-slate-800 bg-slate-900 p-5 shadow-xl">
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div>
              <h1 className="text-lg font-semibold text-white">Create Daraz Product</h1>
              <p className="mt-1 text-xs text-slate-400">Category, brand and attribute options load from the selected Daraz account.</p>
            </div>
            <button type="button" onClick={() => loadCatalogOptions()} disabled={loadingCatalog || !accountId} className="inline-flex h-9 items-center gap-2 rounded-lg border border-slate-700 px-3 text-xs font-semibold text-slate-300 hover:border-yellow-500 hover:text-yellow-300 disabled:opacity-60">
              <RefreshCw size={14} className={loadingCatalog ? "animate-spin" : ""} />
              Reload Options
            </button>
          </div>

          {error && <div className="flex items-start gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-300"><AlertCircle size={14} className="mt-0.5 shrink-0" /><span>{error}</span></div>}
          {success && <div className="flex items-start gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-300"><CheckCircle2 size={14} className="mt-0.5 shrink-0" /><span>Created. Daraz item_id: {success?.item_id || success?.data?.item_id || "-"}</span></div>}

          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <label className={labelClass}>Daraz Account</label>
              <select value={accountId} onChange={(e) => setAccountId(e.target.value)} className={inputClass}>
                <option value="">Select account</option>
                {accounts.map((acc) => <option key={acc.id} value={acc.id}>{acc.account_name || acc.account_code || `#${acc.id}`}</option>)}
              </select>
            </div>
            <div>
              <label className={labelClass}>Category Search</label>
              <input value={categorySearch} onChange={(e) => setCategorySearch(e.target.value)} className={inputClass} placeholder="Search category name or ID" />
            </div>
          </div>

          <div>
            <label className={labelClass}>Daraz Primary Category</label>
            <select value={primaryCategory} onChange={(e) => setPrimaryCategory(e.target.value)} className={inputClass}>
              <option value="">Select Daraz category</option>
              {filteredCategories.map((category) => <option key={`${category.id}-${category.path}`} value={category.id}>{category.id} — {category.path}</option>)}
            </select>
            <p className="mt-1 text-[11px] text-slate-500">Showing leaf categories only. Search if the list is long.</p>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <label className={labelClass}>Product Name</label>
              <input value={name} onChange={(e) => setName(e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Brand</label>
              {brands.length ? (
                <select value={brand} onChange={(e) => setBrand(e.target.value)} className={inputClass}>
                  {brands.map((item) => <option key={item} value={item}>{item}</option>)}
                </select>
              ) : (
                <input value={brand} onChange={(e) => setBrand(e.target.value)} className={inputClass} />
              )}
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <label className={labelClass}>Model</label>
              <input value={model} onChange={(e) => setModel(e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Product Images</label>
              <input value={images} onChange={(e) => setImages(e.target.value)} className={inputClass} placeholder="Max 8 Daraz image URLs, comma separated" />
            </div>
          </div>

          <div>
            <label className={labelClass}>Short Description</label>
            <textarea value={shortDescription} onChange={(e) => setShortDescription(e.target.value)} className={`${inputClass} min-h-[90px]`} />
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-950/50 p-4">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-white">Daraz Category Attributes</h2>
              {loadingAttributes && <Loader2 size={15} className="animate-spin text-yellow-300" />}
            </div>
            {!primaryCategory ? (
              <p className="text-xs text-slate-500">Select a Daraz category to load required attributes.</p>
            ) : attributes.length === 0 ? (
              <p className="text-xs text-slate-500">No attributes loaded for this category.</p>
            ) : (
              <div className="grid gap-3 md:grid-cols-3">
                {attributes.slice(0, 36).map((attribute) => {
                  const attrName = getAttributeName(attribute);
                  const options = getOptions(attribute);
                  const label = `${getAttributeLabel(attribute)}${isMandatory(attribute) ? " *" : ""}`;
                  if (!attrName) return null;
                  return (
                    <div key={attrName}>
                      <label className={labelClass}>{label}</label>
                      {options.length ? (
                        <select value={attributeValues[attrName] || ""} onChange={(e) => setAttributeValues((prev) => ({ ...prev, [attrName]: e.target.value }))} className={inputClass}>
                          <option value="">Select</option>
                          {options.map((option) => <option key={option} value={option}>{option}</option>)}
                        </select>
                      ) : (
                        <input value={attributeValues[attrName] || ""} onChange={(e) => setAttributeValues((prev) => ({ ...prev, [attrName]: e.target.value }))} className={inputClass} />
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="space-y-3 border-t border-slate-800 pt-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-white">SKUs</h2>
              <button type="button" onClick={addSku} className="inline-flex items-center gap-1 rounded-lg border border-slate-700 px-3 py-1 text-xs text-slate-300 hover:border-yellow-500 hover:text-yellow-300"><Plus size={14} /> Add SKU</button>
            </div>

            {skus.map((sku, index) => (
              <div key={index} className="rounded-xl border border-slate-800 bg-slate-950/60 p-3">
                <div className="grid gap-2 md:grid-cols-4">
                  <input value={sku.sellerSku} onChange={(e) => updateSku(index, "sellerSku", e.target.value)} placeholder="Seller SKU" className={inputClass} />
                  <input value={sku.colorFamily} onChange={(e) => updateSku(index, "colorFamily", e.target.value)} placeholder="Color Family" className={inputClass} />
                  <input value={sku.size} onChange={(e) => updateSku(index, "size", e.target.value)} placeholder="Size" className={inputClass} />
                  <input value={sku.quantity} onChange={(e) => updateSku(index, "quantity", e.target.value)} placeholder="Quantity" type="number" className={inputClass} />
                </div>
                <div className="mt-2 grid gap-2 md:grid-cols-5">
                  <input value={sku.price} onChange={(e) => updateSku(index, "price", e.target.value)} placeholder="Price" type="number" step="0.01" className={inputClass} />
                  <input value={sku.salePrice} onChange={(e) => updateSku(index, "salePrice", e.target.value)} placeholder="Sale Price" type="number" step="0.01" className={inputClass} />
                  <input value={sku.packageLength} onChange={(e) => updateSku(index, "packageLength", e.target.value)} placeholder="Length" type="number" step="0.01" className={inputClass} />
                  <input value={sku.packageWidth} onChange={(e) => updateSku(index, "packageWidth", e.target.value)} placeholder="Width" type="number" step="0.01" className={inputClass} />
                  <input value={sku.packageHeight} onChange={(e) => updateSku(index, "packageHeight", e.target.value)} placeholder="Height" type="number" step="0.01" className={inputClass} />
                </div>
                <div className="mt-2 flex items-center gap-2">
                  <input value={sku.packageWeight} onChange={(e) => updateSku(index, "packageWeight", e.target.value)} placeholder="Weight" type="number" step="0.01" className={`${inputClass} max-w-[130px]`} />
                  <input value={sku.packageContent} onChange={(e) => updateSku(index, "packageContent", e.target.value)} placeholder="Package content" className={inputClass} />
                  <input value={sku.images} onChange={(e) => updateSku(index, "images", e.target.value)} placeholder="SKU images, comma separated" className={inputClass} />
                  {skus.length > 1 && <button type="button" onClick={() => removeSku(index)} className="shrink-0 rounded-lg border border-slate-700 p-2 text-slate-400 hover:border-red-500 hover:text-red-300"><Trash2 size={14} /></button>}
                </div>
              </div>
            ))}
          </div>

          <div className="flex justify-end gap-2 border-t border-slate-800 pt-4">
            <Link to="/product/daraz-products" className="inline-flex h-9 items-center gap-2 rounded-lg border border-slate-700 bg-slate-950 px-4 text-sm font-medium text-slate-300 hover:border-slate-500">Cancel</Link>
            <button type="submit" disabled={saving} className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-yellow-500 px-3 text-[12px] font-semibold text-slate-950 hover:bg-yellow-400 disabled:cursor-not-allowed disabled:opacity-60">
              {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
              Create on Daraz
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
