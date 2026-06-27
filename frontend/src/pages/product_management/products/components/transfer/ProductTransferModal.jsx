import { useEffect, useMemo, useState } from "react";
import { Loader2, X } from "lucide-react";
import marketplaceApi from "../../../../../config/sub_api/marketplace_management_api/marketplace_api";
import { darazProductsApi } from "../../../../../config/sub_api/daraz_api/daraz_products_api";
import wooProductApi from "../../../../../config/sub_api/woo_api/woo_product_api";
import skuMappingApi from "../../../../../config/sub_api/marketplace_api/sku_mapping_api";

function clean(value) {
  return String(value ?? "").trim();
}

function rows(value) {
  if (Array.isArray(value)) return value;
  if (Array.isArray(value?.data)) return value.data;
  if (Array.isArray(value?.rows)) return value.rows;
  if (Array.isArray(value?.data?.data)) return value.data.data;
  return [];
}

function getProductId(product = {}) {
  return product.id || product.product_id || product.local_product_id || "";
}

function getProductSku(product = {}) {
  return clean(product.sku || product.product_sku || product.local_sku || product.parent_sku || product.main_sku || "");
}

function getTitle(product = {}) {
  return clean(product.title || product.product_title || product.name || product.product_name || getProductSku(product) || "Local Product");
}

function getVariants(product = {}) {
  return rows(product.variants || product.product_variants || product.variations || product.variant_rows);
}

function getVariantSku(variant = {}) {
  return clean(variant.sku || variant.variant_sku || variant.product_sku || variant.local_sku || "");
}

function getVariantStock(variant = {}) {
  return variant.stock_qty ?? variant.quantity ?? variant.stock_quantity ?? variant.available_qty ?? "-";
}

function unwrapAttributes(response) {
  const data = response?.data || response;
  const candidates = [data.attributes, data.data?.attributes, data.data?.data?.attributes, data.data?.data?.Attributes, data.data?.Attributes, data.rows];
  for (const candidate of candidates) if (Array.isArray(candidate)) return candidate;
  return [];
}

function attrName(attribute = {}) {
  return clean(attribute.name || attribute.attribute_name || attribute.label || attribute.AttributeName || attribute.input_name || attribute.code || attribute.key);
}

function attrKey(attribute = {}) {
  return clean(attribute.name || attribute.attribute_name || attribute.AttributeName || attribute.code || attribute.key || attribute.input_name);
}

function isRequired(attribute = {}) {
  return Number(attribute.is_required ?? attribute.required ?? attribute.IsMandatory ?? attribute.mandatory ?? 0) === 1 || String(attribute.required || "").toLowerCase() === "true";
}

function attrOptions(attribute = {}) {
  const value = attribute.options || attribute.values || attribute.attribute_values || attribute.OptionValues || attribute.options_list;
  if (Array.isArray(value)) return value;
  return [];
}

function attrInputType(attribute = {}) {
  const type = clean(attribute.input_type || attribute.type || attribute.attribute_type || attribute.inputType).toLowerCase();
  if (type.includes("multi")) return "multi";
  if (type.includes("select") || attrOptions(attribute).length) return "select";
  if (type.includes("number") || type.includes("decimal") || type.includes("int")) return "number";
  return "text";
}

function Field({ label, children }) {
  return (
    <label className="block text-[11px] font-semibold text-slate-300">
      <span className="mb-1 block">{label}</span>
      {children}
    </label>
  );
}

function TextInput(props) {
  return (
    <input
      {...props}
      className="w-full rounded-lg border border-slate-700 bg-[#080f1d] px-3 py-2 text-xs text-slate-100 outline-none transition focus:border-orange-400"
    />
  );
}

function SelectInput(props) {
  return (
    <select
      {...props}
      className="w-full rounded-lg border border-slate-700 bg-[#080f1d] px-3 py-2 text-xs text-slate-100 outline-none transition focus:border-orange-400"
    />
  );
}

export default function ProductTransferModal({ open, product, defaultPlatform = "DARAZ", onClose, onSuccess }) {
  const [platform, setPlatform] = useState(defaultPlatform);
  const [mapPlatform, setMapPlatform] = useState("DARAZ");
  const [accounts, setAccounts] = useState([]);
  const [accountIds, setAccountIds] = useState([]);
  const [categories, setCategories] = useState([]);
  const [categoryId, setCategoryId] = useState("");
  const [attributes, setAttributes] = useState([]);
  const [attributeValues, setAttributeValues] = useState({});
  const [selectedVariants, setSelectedVariants] = useState([]);
  const [duplicateMethod, setDuplicateMethod] = useState("SKU_ACCOUNT");
  const [duplicateAction, setDuplicateAction] = useState("create_duplicate");
  const [productType, setProductType] = useState("simple");
  const [rawPayload, setRawPayload] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const variants = useMemo(() => getVariants(product || {}), [product]);
  const productId = getProductId(product || {});
  const productSku = getProductSku(product || {});
  const firstAccountId = accountIds[0] || "";

  useEffect(() => {
    if (!open) return;
    setPlatform(defaultPlatform);
    setMapPlatform("DARAZ");
    setAccountIds([]);
    setCategoryId("");
    setAttributes([]);
    setAttributeValues({});
    setSelectedVariants([]);
    setDuplicateMethod("SKU_ACCOUNT");
    setDuplicateAction("create_duplicate");
    setProductType(variants.length ? "variable" : "simple");
    setRawPayload("");
    setMessage("");
  }, [open, defaultPlatform, variants.length]);

  useEffect(() => {
    if (!open) return;

    async function loadAccounts() {
      try {
        const accountPlatform = platform === "MAP" ? mapPlatform : platform;
        const response = accountPlatform === "DARAZ"
          ? await marketplaceApi.getAccounts({ platform_code: "DARAZ" })
          : await wooProductApi.getWooAccounts();
        setAccounts(rows(response?.data || response));
      } catch (error) {
        setMessage(error?.response?.data?.message || error.message || "Unable to load accounts.");
      }
    }

    loadAccounts();
  }, [open, platform, mapPlatform]);

  useEffect(() => {
    if (!firstAccountId || !open) return;

    async function loadCategories() {
      try {
        const response = platform === "DARAZ"
          ? await darazProductsApi.getCategories(firstAccountId)
          : await wooProductApi.getWooCategories(firstAccountId, { per_page: 100 });
        const list = rows(response?.data?.data || response?.data || response);
        setCategories(list);
      } catch {
        setCategories([]);
      }
    }

    loadCategories();
  }, [firstAccountId, open, platform]);

  useEffect(() => {
    if (!firstAccountId || !categoryId || !open) return;

    async function loadAttributes() {
      try {
        const response = platform === "DARAZ"
          ? await darazProductsApi.getCategoryAttributes(firstAccountId, categoryId)
          : await wooProductApi.getWooAttributes(firstAccountId);
        setAttributes(unwrapAttributes(response));
      } catch {
        setAttributes([]);
      }
    }

    loadAttributes();
  }, [firstAccountId, categoryId, open, platform]);

  function toggleAccount(id) {
    setAccountIds((prev) => prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]);
  }

  function toggleVariant(id) {
    setSelectedVariants((prev) => prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]);
  }

  function generatedSku(account = {}) {
    if (duplicateMethod === "SAME_SKU") return productSku;
    if (duplicateMethod === "SKU_A") return `${productSku}_A`;
    if (duplicateMethod === "SKU_001") return `${productSku}_001`;
    return `${productSku}_${clean(account.account_code || account.code || account.id).toUpperCase()}`;
  }

  function validate() {
    if (!productId) return "Product ID missing.";
    if (!accountIds.length) return "Select at least one marketplace account.";
    if (platform === "DARAZ" && !categoryId) return "Daraz category is required.";

    const missing = attributes.filter((attribute) => isRequired(attribute)).find((attribute) => !clean(attributeValues[attrKey(attribute)]));
    if (missing) return `${attrName(missing)} is required.`;
    return "";
  }

  async function submit() {
    const validation = validate();
    if (validation) {
      setMessage(validation);
      return;
    }

    let parsedRaw = null;
    if (clean(rawPayload)) {
      try {
        parsedRaw = JSON.parse(rawPayload);
      } catch {
        setMessage("Raw payload must be valid JSON.");
        return;
      }
    }

    setLoading(true);
    setMessage("");

    try {
      const payload = {
        account_ids: accountIds,
        category_id: categoryId,
        attributes: attributeValues,
        variant_ids: selectedVariants,
        duplicate_method: duplicateMethod,
        duplicate_action: duplicateAction,
        product_type: productType,
        raw_payload: parsedRaw,
      };

      if (platform === "DARAZ") {
        await darazProductsApi.transferLocalProduct(productId, payload);
      } else if (platform === "WOO") {
        await wooProductApi.transferLocalProduct(productId, payload);
      } else {
        await skuMappingApi.save({
          platform: mapPlatform,
          local_product_id: productId,
          local_sku: productSku,
          marketplace_sku: clean(attributeValues.marketplace_sku),
          account_id: accountIds[0],
        });
      }

      setMessage("Transfer saved successfully.");
      onSuccess?.();
    } catch (error) {
      setMessage(error?.response?.data?.message || error.message || "Transfer failed.");
    } finally {
      setLoading(false);
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[9998] flex items-center justify-center bg-black/70 px-3 py-6">
      <div className="max-h-[92vh] w-full max-w-5xl overflow-hidden rounded-2xl border border-slate-700 bg-[#0b1220] shadow-2xl shadow-black/60">
        <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3">
          <div>
            <h2 className="text-sm font-semibold text-slate-100">Marketplace Transfer</h2>
            <p className="mt-0.5 text-[11px] text-slate-400">{getTitle(product || {})}</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-white">
            <X size={16} />
          </button>
        </div>

        <div className="max-h-[calc(92vh-130px)] overflow-y-auto p-4">
          <div className="grid gap-3 lg:grid-cols-3">
            <Field label="Transfer Type">
              <SelectInput value={platform} onChange={(event) => setPlatform(event.target.value)}>
                <option value="DARAZ">Transfer to Daraz</option>
                <option value="WOO">Transfer to Woo</option>
                <option value="MAP">Map existing marketplace SKU</option>
              </SelectInput>
            </Field>

            <Field label="Duplicate SKU Method">
              <SelectInput value={duplicateMethod} onChange={(event) => setDuplicateMethod(event.target.value)}>
                <option value="SAME_SKU">Same SKU</option>
                <option value="SKU_ACCOUNT">SKU_ACCOUNT</option>
                <option value="SKU_A">SKU_A, SKU_B</option>
                <option value="SKU_001">SKU_001</option>
              </SelectInput>
            </Field>

            <Field label="Duplicate Action">
              <SelectInput value={duplicateAction} onChange={(event) => setDuplicateAction(event.target.value)}>
                <option value="create_duplicate">Create duplicate with suffix</option>
                <option value="map_existing">Map existing SKU</option>
                <option value="skip">Skip duplicate</option>
                <option value="replace_update">Replace/update existing</option>
              </SelectInput>
            </Field>
          </div>

          {platform === "WOO" && (
            <div className="mt-3 max-w-xs">
              <Field label="Woo Product Type">
                <SelectInput value={productType} onChange={(event) => setProductType(event.target.value)}>
                  <option value="simple">Simple product</option>
                  <option value="variable">Variable product</option>
                </SelectInput>
              </Field>
            </div>
          )}

          <div className="mt-4 rounded-xl border border-slate-800 bg-[#070d19] p-3">
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-orange-300">Accounts</p>
            <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
              {accounts.map((account) => {
                const id = String(account.id || account.account_id);
                return (
                  <label key={id} className="flex cursor-pointer items-center gap-2 rounded-lg border border-slate-800 bg-[#0b1220] px-3 py-2 text-xs text-slate-200 hover:border-orange-400/60">
                    <input type="checkbox" className="accent-orange-500" checked={accountIds.includes(id)} onChange={() => toggleAccount(id)} />
                    <span className="truncate">{account.account_name || account.account_code || id}</span>
                    <span className="ml-auto text-[10px] text-slate-500">{account.account_code}</span>
                  </label>
                );
              })}
            </div>
          </div>

          {platform !== "MAP" && (
            <div className="mt-4 grid gap-3 lg:grid-cols-2">
              <Field label="Category">
                <SelectInput value={categoryId} onChange={(event) => setCategoryId(event.target.value)}>
                  <option value="">Select category</option>
                  {categories.map((category) => {
                    const id = category.category_id || category.id || category.CategoryId || category.term_id;
                    const name = category.name || category.category_name || category.Name || category.label || id;
                    return <option key={id} value={id}>{name}</option>;
                  })}
                </SelectInput>
              </Field>
            </div>
          )}

          {attributes.length > 0 && (
            <div className="mt-4 rounded-xl border border-slate-800 bg-[#070d19] p-3">
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-orange-300">Required Attributes</p>
              <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                {attributes.map((attribute) => {
                  const key = attrKey(attribute);
                  const type = attrInputType(attribute);
                  const options = attrOptions(attribute);
                  const required = isRequired(attribute);
                  return (
                    <Field key={key} label={`${attrName(attribute)}${required ? " *" : ""}`}>
                      {type === "select" || type === "multi" ? (
                        <SelectInput
                          multiple={type === "multi"}
                          value={attributeValues[key] || (type === "multi" ? [] : "")}
                          onChange={(event) => setAttributeValues((prev) => ({ ...prev, [key]: type === "multi" ? Array.from(event.target.selectedOptions).map((option) => option.value) : event.target.value }))}
                        >
                          <option value="">Select</option>
                          {options.map((option) => {
                            const value = option.value || option.id || option.name || option.label || option;
                            const label = option.name || option.label || option.value || option.id || option;
                            return <option key={String(value)} value={value}>{label}</option>;
                          })}
                        </SelectInput>
                      ) : (
                        <TextInput type={type === "number" ? "number" : "text"} value={attributeValues[key] || ""} onChange={(event) => setAttributeValues((prev) => ({ ...prev, [key]: event.target.value }))} />
                      )}
                    </Field>
                  );
                })}
              </div>
            </div>
          )}

          {platform === "MAP" && (
            <div className="mt-4 grid gap-3 lg:grid-cols-2">
              <Field label="Mapping Platform">
                <SelectInput value={mapPlatform} onChange={(event) => { setMapPlatform(event.target.value); setAccountIds([]); }}>
                  <option value="DARAZ">Daraz SKU</option>
                  <option value="WOO">Woo SKU</option>
                </SelectInput>
              </Field>
              <Field label="Marketplace SKU">
                <TextInput value={attributeValues.marketplace_sku || ""} onChange={(event) => setAttributeValues((prev) => ({ ...prev, marketplace_sku: event.target.value }))} placeholder="Enter Daraz/Woo SKU" />
              </Field>
            </div>
          )}

          <div className="mt-4 rounded-xl border border-slate-800 bg-[#070d19] p-3">
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-orange-300">Variants</p>
            {variants.length ? (
              <div className="grid gap-2 md:grid-cols-2">
                {variants.map((variant) => {
                  const id = String(variant.id || variant.variant_id || getVariantSku(variant));
                  return (
                    <label key={id} className="flex cursor-pointer items-center gap-2 rounded-lg border border-slate-800 bg-[#0b1220] px-3 py-2 text-xs text-slate-200 hover:border-orange-400/60">
                      <input type="checkbox" className="accent-orange-500" checked={selectedVariants.includes(id)} onChange={() => toggleVariant(id)} />
                      <span>{getVariantSku(variant) || id}</span>
                      <span className="ml-auto text-slate-400">Stock: {getVariantStock(variant)}</span>
                    </label>
                  );
                })}
              </div>
            ) : (
              <p className="text-xs text-slate-400">Single product SKU: {productSku || "-"}</p>
            )}
          </div>

          <div className="mt-4 rounded-xl border border-slate-800 bg-[#070d19] p-3">
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-orange-300">SKU Preview</p>
            <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
              {accounts.filter((account) => accountIds.includes(String(account.id || account.account_id))).map((account) => (
                <div key={account.id || account.account_id} className="rounded-lg border border-slate-800 bg-[#0b1220] px-3 py-2 text-xs text-slate-300">
                  <span className="text-slate-500">{account.account_code || account.id}</span>
                  <span className="ml-2 font-semibold text-orange-200">{generatedSku(account)}</span>
                </div>
              ))}
            </div>
          </div>

          {platform !== "MAP" && (
            <div className="mt-4">
              <Field label="Raw API Payload Editor">
                <textarea
                  value={rawPayload}
                  onChange={(event) => setRawPayload(event.target.value)}
                  rows={7}
                  placeholder="Optional advanced JSON payload"
                  className="w-full rounded-lg border border-slate-700 bg-[#080f1d] px-3 py-2 font-mono text-xs text-slate-100 outline-none transition focus:border-orange-400"
                />
              </Field>
            </div>
          )}

          {message && <p className="mt-4 rounded-lg border border-slate-700 bg-[#080f1d] px-3 py-2 text-xs text-slate-300">{message}</p>}
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-slate-800 px-4 py-3">
          <button type="button" onClick={onClose} className="rounded-lg border border-slate-700 bg-[#111827] px-4 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-800">Close</button>
          <button type="button" onClick={submit} disabled={loading} className="inline-flex items-center gap-2 rounded-lg bg-orange-500 px-4 py-2 text-xs font-semibold text-white hover:bg-orange-600 disabled:opacity-60">
            {loading && <Loader2 size={14} className="animate-spin" />}
            Submit Transfer
          </button>
        </div>
      </div>
    </div>
  );
}
