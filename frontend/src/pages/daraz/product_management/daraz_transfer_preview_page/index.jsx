import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import {
  AlertCircle,
  CheckCircle2,
  Image as ImageIcon,
  ImagePlus,
  ListChecks,
  Loader2,
  Package,
  Send,
  Sparkles,
  XCircle,
} from "lucide-react";
import { localProductsApi } from "../../../../config/sub_api/product_management_api/local_products_api";
import { marketplaceApi } from "../../../../config/sub_api/marketplace_management_api/marketplace_api";
import { darazCatalogApi } from "../../../../config/sub_api/daraz_api/daraz_catalog_api";
import { darazTransferApi } from "../../../../config/sub_api/daraz_api/daraz_transfer_api";
import { resolveImageUrl } from "../../../product_management/products/product_dashboard/utils/localProductsImageHelpers";
import Loader from "../../../../components/common/Loader";
import RichTextEditor, { RichTextField } from "../../../../components/common/rich_text_editor/RichTextEditor";

const inputClass =
  "w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 focus:border-orange-500 focus:outline-none";
const labelClass = "mb-1 block text-xs font-medium text-slate-400";

function unwrapDarazData(res) {
  return res?.data?.data?.data || res?.data?.data || res?.data;
}

function getChildren(node) {
  return node?.children || node?.child || node?.Children || [];
}

function getCategoryId(node) {
  return node?.category_id ?? node?.id;
}

function getCategoryName(node) {
  return node?.name ?? node?.category_name ?? node?.label ?? String(getCategoryId(node) ?? "");
}

function isLeafNode(node) {
  if (!node) return false;
  const children = getChildren(node);
  if (Array.isArray(children) && children.length) return false;
  if (node?.leaf === true || node?.is_leaf === true) return true;
  return true;
}

function findPathToCategory(nodes = [], targetId, trail = []) {
  for (const node of nodes) {
    const nextTrail = [...trail, node];
    if (String(getCategoryId(node)) === String(targetId)) return nextTrail;

    const children = getChildren(node);
    if (Array.isArray(children) && children.length) {
      const found = findPathToCategory(children, targetId, nextTrail);
      if (found) return found;
    }
  }
  return null;
}

function flattenLeafCategories(nodes = [], trail = []) {
  let result = [];

  for (const node of nodes) {
    const nextTrail = [...trail, node];
    const children = getChildren(node);

    if (Array.isArray(children) && children.length) {
      result = result.concat(flattenLeafCategories(children, nextTrail));
    } else {
      result.push({
        path: nextTrail,
        breadcrumb: nextTrail.map(getCategoryName).join(" > "),
        id: getCategoryId(node),
      });
    }
  }

  return result;
}

function getAttrKey(attr = {}) {
  return attr.name ?? attr.attribute_name ?? attr.key ?? attr.attribute_key ?? "";
}

function getAttrLabel(attr = {}) {
  return attr.label ?? attr.display_name ?? attr.attribute_name ?? getAttrKey(attr);
}

function getAttrType(attr = {}) {
  return String(attr.type ?? attr.input_type ?? attr.attribute_type ?? "text").toLowerCase();
}

function getAttrOptions(attr = {}) {
  const raw = attr.options ?? attr.values ?? attr.select_option ?? attr.attribute_values ?? [];
  return (Array.isArray(raw) ? raw : []).map((opt) =>
    typeof opt === "string" || typeof opt === "number"
      ? String(opt)
      : opt?.name ?? opt?.value ?? opt?.label ?? String(opt)
  );
}

// Daraz returns is_mandatory/is_sale_prop as the STRING "1"/"0", not a real
// boolean — Boolean("0") is true in JS, so a naive truthy check would treat
// every attribute as mandatory/sale-prop. Compare against known truthy forms.
function isTruthyFlag(value) {
  return value === true || value === 1 || value === "1";
}

function isAttrMandatory(attr = {}) {
  return isTruthyFlag(attr.is_mandatory ?? attr.mandatory ?? attr.required);
}

// Real Daraz category-attribute responses mark per-SKU fields two ways:
// is_sale_prop (a true variation property like color/size) and
// attribute_type === "sku" (any field filled in per SKU, e.g. package
// content or a per-colour thumbnail, even if it isn't itself a variation).
// Both need to render once per SKU, not once for the whole product.
function isSaleProp(attr = {}) {
  return (
    isTruthyFlag(attr.is_sale_prop ?? attr.sale_prop ?? attr.is_sku_attribute) ||
    String(attr.attribute_type ?? "").toLowerCase() === "sku"
  );
}

// These attribute names duplicate fields this page already collects through
// a dedicated, purpose-built input: product-level name/short_description/
// brand/model are dropped by createDarazProduct's XML builder if sent as
// generic attributes, and seller_sku/price/quantity are per-SKU fields this
// page already has real inputs for (the SKU row itself) — showing a second,
// disconnected copy of any of these would just confuse the user.
const SYSTEM_ATTRIBUTE_NAMES = new Set([
  "name",
  "brand",
  "model",
  "short_description",
  "description",
  "seller_sku",
  "sellersku",
  "price",
  "quantity",
  "qty",
]);

function isSystemField(attr = {}) {
  const key = String(getAttrKey(attr)).toLowerCase();
  return SYSTEM_ATTRIBUTE_NAMES.has(key) || /^__.*__$/.test(key);
}

function isSelectType(type) {
  return type.includes("select") || type.includes("enum") || type.includes("option");
}

function isImageType(type) {
  return type.includes("img") || type.includes("image");
}

function isRichTextType(type) {
  return type.includes("rich") || type.includes("textarea") || type.includes("longtext");
}

const TABS = [
  { key: "images", label: "Images", icon: ImageIcon },
  { key: "details", label: "Basic Details", icon: Package },
  { key: "attributes", label: "Attributes", icon: ListChecks },
];

function AttributeField({ attr, value, onChange, uploading, onUploadFile, onUploadImage }) {
  const type = getAttrType(attr);
  const options = getAttrOptions(attr);

  if (isImageType(type)) {
    return (
      <div className="flex items-center gap-2">
        {value ? (
          <div className="h-10 w-10 shrink-0 overflow-hidden rounded border border-slate-700 bg-white">
            <img src={value} alt="" className="h-full w-full object-contain" />
          </div>
        ) : null}

        <label
          className={`flex h-9 flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-lg border border-dashed text-xs ${
            uploading
              ? "cursor-not-allowed border-slate-700 text-slate-500"
              : "border-slate-700 text-slate-400 hover:border-orange-500 hover:text-orange-300"
          }`}
        >
          {uploading ? <Loader2 size={13} className="animate-spin" /> : <ImagePlus size={13} />}
          {uploading ? "Uploading..." : value ? "Replace" : "Upload image"}
          <input
            type="file"
            accept="image/*"
            className="hidden"
            disabled={uploading}
            onChange={(e) => {
              const file = e.target.files?.[0];
              e.target.value = "";
              if (file) onUploadFile(file);
            }}
          />
        </label>
      </div>
    );
  }

  if (isRichTextType(type)) {
    return (
      <RichTextEditor
        value={value}
        onChange={onChange}
        minHeight={140}
        onUploadImage={onUploadImage}
      />
    );
  }

  if (isSelectType(type) && options.length) {
    return (
      <select value={value} onChange={(e) => onChange(e.target.value)} className={inputClass}>
        <option value="">Select...</option>
        {options.map((opt) => (
          <option key={opt} value={opt}>
            {opt}
          </option>
        ))}
      </select>
    );
  }

  const nativeType = type.includes("date")
    ? "date"
    : type.includes("num") // matches Daraz's both "number" and "numeric"
      ? "number"
      : "text";

  return (
    <input
      type={nativeType}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={inputClass}
    />
  );
}

export default function DarazTransferPreviewPage() {
  const { productId } = useParams();
  const [searchParams] = useSearchParams();

  const accountIds = useMemo(
    () => (searchParams.get("accounts") || "").split(",").filter(Boolean),
    [searchParams]
  );

  const [product, setProduct] = useState(null);
  const [loadingProduct, setLoadingProduct] = useState(true);
  const [skuRows, setSkuRows] = useState([]);
  const [accounts, setAccounts] = useState([]);

  const [categoryTree, setCategoryTree] = useState([]);
  const [loadingTree, setLoadingTree] = useState(false);
  const [selectedChain, setSelectedChain] = useState([]);
  const [categorySearch, setCategorySearch] = useState("");
  const [categorySearchFocused, setCategorySearchFocused] = useState(false);
  const categorySearchContainerRef = useRef(null);

  const [attributeSchema, setAttributeSchema] = useState([]);
  const [loadingAttributes, setLoadingAttributes] = useState(false);
  const [attributeValues, setAttributeValues] = useState({});
  const [skuAttributeValues, setSkuAttributeValues] = useState({});

  const [title, setTitle] = useState("");
  const [brand, setBrand] = useState("No Brand");
  const [model, setModel] = useState("");
  const [shortDescription, setShortDescription] = useState("");
  const [accountContent, setAccountContent] = useState({});
  const [aiFilling, setAiFilling] = useState(false);
  const [uploadingKey, setUploadingKey] = useState("");

  const [sending, setSending] = useState(false);
  const [results, setResults] = useState(null);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState("images");

  const primaryAccountId = accountIds[0];

  const selectedAccounts = accounts.filter((account) =>
    accountIds.includes(String(account.id || account.account_id))
  );

  const levels = useMemo(() => {
    const result = [categoryTree];
    for (const node of selectedChain) {
      const children = getChildren(node);
      if (Array.isArray(children) && children.length) result.push(children);
    }
    return result;
  }, [categoryTree, selectedChain]);

  const leafNode =
    selectedChain.length && isLeafNode(selectedChain[selectedChain.length - 1])
      ? selectedChain[selectedChain.length - 1]
      : null;

  const categoryId = leafNode ? getCategoryId(leafNode) : null;
  const categoryName = leafNode ? getCategoryName(leafNode) : "";

  // The search box only holds free-typed query text while the user is
  // actively searching — once a category is picked (via search, the
  // cascading dropdowns, or a prior-transfer prefill) it shows the chosen
  // breadcrumb instead, so there's always a visible confirmation of what's
  // selected rather than the box just going blank.
  const selectedBreadcrumb = selectedChain.length ? selectedChain.map(getCategoryName).join(" > ") : "";
  const categorySearchDisplayValue = categorySearchFocused ? categorySearch : selectedBreadcrumb || categorySearch;

  const flatLeafCategories = useMemo(() => flattenLeafCategories(categoryTree), [categoryTree]);

  const categorySearchResults = useMemo(() => {
    if (!categorySearchFocused) return [];

    const query = categorySearch.trim().toLowerCase();
    const pool = query
      ? flatLeafCategories.filter((item) => item.breadcrumb.toLowerCase().includes(query))
      : flatLeafCategories;

    return pool.slice(0, 100);
  }, [categorySearchFocused, categorySearch, flatLeafCategories]);

  const productAttributes = useMemo(
    () => attributeSchema.filter((attr) => !isSaleProp(attr) && !isSystemField(attr)),
    [attributeSchema]
  );

  const saleAttributes = useMemo(
    () => attributeSchema.filter((attr) => isSaleProp(attr) && !isSystemField(attr)),
    [attributeSchema]
  );

  const modelSchema = attributeSchema.find((attr) => getAttrKey(attr) === "model");
  const shortDescriptionSchema = attributeSchema.find(
    (attr) => getAttrKey(attr) === "short_description"
  );
  const descriptionSchema = attributeSchema.find((attr) => getAttrKey(attr) === "description");

  // Load product + accounts
  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoadingProduct(true);
      setError("");

      try {
        const [productRes, accountsRes] = await Promise.all([
          localProductsApi.getProductById(productId),
          marketplaceApi.getAccounts({ platform_code: "DARAZ" }),
        ]);

        if (cancelled) return;

        const productData = productRes?.data?.data || productRes?.data;
        setProduct(productData);

        const accountList =
          accountsRes?.data?.data || accountsRes?.data?.accounts || accountsRes?.data || [];
        setAccounts(Array.isArray(accountList) ? accountList : []);

        if (productData?.daraz_brand) setBrand(productData.daraz_brand);
        setTitle(productData?.product_name || productData?.title || productData?.name || "");
        setShortDescription(productData?.description || "");

        const variants = productData?.variants?.length
          ? productData.variants
          : [{ variant_sku: productData?.sku, colour_name: null, image_url: null }];

        const rows = await Promise.all(
          variants.map(async (variant) => {
            const sku = variant.variant_sku || productData?.sku;
            let price = 0;
            let quantity = 0;

            try {
              const priceRes = await localProductsApi.getPriceBySku(sku);
              const priceData = priceRes?.data?.data || priceRes?.data;
              price = priceData?.daraz_price || priceData?.sale_price || 0;
            } catch {
              /* no price record yet */
            }

            try {
              const invRes = await localProductsApi.getInventoryBySku(sku);
              const invData = invRes?.data?.data || invRes?.data;
              quantity = invData?.available_qty ?? invData?.stock_qty ?? 0;
            } catch {
              /* no inventory record yet */
            }

            return {
              sellerSku: sku,
              price,
              quantity,
              colourName: variant.colour_name || variant.color_name || "",
              images: variant.image_url ? [resolveImageUrl(variant.image_url)] : [],
            };
          })
        );

        if (!cancelled) setSkuRows(rows);
      } catch (err) {
        if (!cancelled) {
          setError(err?.response?.data?.message || "Failed to load product details.");
        }
      } finally {
        if (!cancelled) setLoadingProduct(false);
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [productId]);

  // Load category tree once we know the primary account
  useEffect(() => {
    if (!primaryAccountId) return;

    let cancelled = false;
    setLoadingTree(true);

    darazCatalogApi
      .categoryTree(primaryAccountId)
      .then((res) => {
        if (cancelled) return;
        const data = unwrapDarazData(res);
        setCategoryTree(Array.isArray(data) ? data : []);
      })
      .catch(() => {
        if (!cancelled) setCategoryTree([]);
      })
      .finally(() => {
        if (!cancelled) setLoadingTree(false);
      });

    return () => {
      cancelled = true;
    };
  }, [primaryAccountId]);

  // Closing the search dropdown on the input's blur event races against the
  // click on a result — on touch devices the on-screen keyboard closing can
  // shift the layout between touchstart and click, making the tap land on
  // nothing. A document-level outside-click check (same pattern used for the
  // action menus elsewhere in this app) closes the dropdown only when the
  // user actually clicks away from it, so a tap on a result always lands.
  useEffect(() => {
    if (!categorySearchFocused) return;

    function handleOutsideClick(event) {
      if (categorySearchContainerRef.current && !categorySearchContainerRef.current.contains(event.target)) {
        setCategorySearchFocused(false);
      }
    }

    document.addEventListener("mousedown", handleOutsideClick);
    document.addEventListener("touchstart", handleOutsideClick);

    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
      document.removeEventListener("touchstart", handleOutsideClick);
    };
  }, [categorySearchFocused]);

  // Prefill category path + attributes from a prior transfer, once the tree is loaded
  useEffect(() => {
    if (!product?.daraz_category_id || !categoryTree.length) return;

    const path = findPathToCategory(categoryTree, product.daraz_category_id);
    if (path) setSelectedChain(path);

    if (product?.daraz_attributes_json) {
      try {
        const parsed =
          typeof product.daraz_attributes_json === "string"
            ? JSON.parse(product.daraz_attributes_json)
            : product.daraz_attributes_json;
        setAttributeValues(parsed || {});
      } catch {
        /* ignore malformed saved attributes */
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [product, categoryTree]);

  // Load attribute schema for the chosen leaf category
  useEffect(() => {
    if (!categoryId || !primaryAccountId) {
      setAttributeSchema([]);
      return;
    }

    let cancelled = false;
    setLoadingAttributes(true);

    darazCatalogApi
      .categoryAttributes(primaryAccountId, { primary_category_id: categoryId })
      .then((res) => {
        if (cancelled) return;
        const data = unwrapDarazData(res);
        setAttributeSchema(Array.isArray(data) ? data : []);
      })
      .catch(() => {
        if (!cancelled) setAttributeSchema([]);
      })
      .finally(() => {
        if (!cancelled) setLoadingAttributes(false);
      });

    return () => {
      cancelled = true;
    };
  }, [categoryId, primaryAccountId]);

  // Default sale-prop attributes (e.g. color_family) from each variant's own
  // colour, without overwriting a value the user already typed in.
  useEffect(() => {
    if (!saleAttributes.length || !skuRows.length) return;

    setSkuAttributeValues((prev) => {
      const next = { ...prev };

      skuRows.forEach((row) => {
        const existing = { ...(next[row.sellerSku] || {}) };

        saleAttributes.forEach((attr) => {
          const key = getAttrKey(attr);
          const label = getAttrLabel(attr).toLowerCase();
          if (existing[key] || !row.colourName) return;

          if (key === "color_family" || label.includes("colour") || label.includes("color")) {
            existing[key] = row.colourName;
          }
        });

        next[row.sellerSku] = existing;
      });

      return next;
    });
  }, [saleAttributes, skuRows]);

  function handleLevelChange(levelIndex, id) {
    const options = levels[levelIndex] || [];
    const node = options.find((opt) => String(getCategoryId(opt)) === String(id));
    if (!node) return;
    setSelectedChain((prev) => [...prev.slice(0, levelIndex), node]);
    setCategorySearch("");
  }

  function handleCategorySearchSelect(item) {
    setSelectedChain(item.path);
    setCategorySearch("");
    setCategorySearchFocused(false);
  }

  function handleAttributeChange(key, value) {
    setAttributeValues((prev) => ({ ...prev, [key]: value }));
  }

  function handleSkuAttributeChange(sellerSku, key, value) {
    setSkuAttributeValues((prev) => ({
      ...prev,
      [sellerSku]: { ...(prev[sellerSku] || {}), [key]: value },
    }));
  }

  function handleAccountContentChange(accountId, field, value) {
    setAccountContent((prev) => ({
      ...prev,
      [accountId]: { ...(prev[accountId] || {}), [field]: value },
    }));
  }

  // Generates a title + description (unique per account when more than one
  // account is selected, so the same product doesn't read as duplicate
  // content across the seller's own storefronts) plus best-guess values for
  // the loaded category attributes — all from the product's existing data.
  async function handleAiFill() {
    if (!product) return;

    setError("");
    setAiFilling(true);

    try {
      const accountNames = accountIds.map((id) => {
        const account = accounts.find((a) => String(a.id || a.account_id) === String(id));
        return account?.account_name || account?.account_code || `Account #${id}`;
      });

      const attributeFields = productAttributes
        .filter((attr) => !isImageType(getAttrType(attr)))
        .map((attr) => ({
          key: getAttrKey(attr),
          label: getAttrLabel(attr),
          existingValue: attributeValues[getAttrKey(attr)] || "",
        }));

      const res = await darazTransferApi.aiFill({
        productId,
        accountNames,
        categoryName,
        brand,
        attributeFields,
        existingDescription: shortDescription || product.description || "",
      });

      const data = res?.data?.data || {};
      const variants = data.variants || [];
      const attrs = data.attributes || {};

      if (variants[0]) {
        setTitle(variants[0].title || title);
        setShortDescription(variants[0].descriptionHtml || shortDescription);
      }

      if (accountIds.length > 1) {
        setAccountContent((prev) => {
          const next = { ...prev };
          accountIds.forEach((id, index) => {
            const variant = variants[index];
            if (variant) next[id] = { title: variant.title, shortDescription: variant.descriptionHtml };
          });
          return next;
        });
      }

      if (Object.keys(attrs).length) {
        setAttributeValues((prev) => {
          const next = { ...prev };
          Object.entries(attrs).forEach(([key, value]) => {
            const isKnownField = productAttributes.some((attr) => getAttrKey(attr) === key);
            if (isKnownField) next[key] = value;
          });
          return next;
        });
      }
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || "AI content generation failed.");
    } finally {
      setAiFilling(false);
    }
  }

  // Image-type attributes (e.g. a per-colour thumbnail) need an actual
  // Daraz-hosted URL as their value, so the file goes through Daraz's own
  // /image/upload API immediately on selection rather than being deferred
  // to submit time.
  async function handleImageAttributeUpload(sellerSku, key, file) {
    if (!file || !primaryAccountId) return;

    const uploadKey = `${sellerSku || "product"}:${key}`;
    setUploadingKey(uploadKey);
    setError("");

    try {
      const res = await darazCatalogApi.uploadImage(primaryAccountId, file);
      const hostedUrl = unwrapDarazData(res)?.image?.url;

      if (!hostedUrl) throw new Error("Daraz did not return a hosted image URL.");

      if (sellerSku) {
        handleSkuAttributeChange(sellerSku, key, hostedUrl);
      } else {
        handleAttributeChange(key, hostedUrl);
      }
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || "Image upload to Daraz failed.");
    } finally {
      setUploadingKey("");
    }
  }

  // Images embedded inside a rich-text field (Description/Highlights) need
  // a Daraz-hosted URL too, same as the standalone image-type attributes —
  // matches RichTextEditor's onUploadImage contract: async (file) => url.
  async function handleRichTextImageUpload(file) {
    if (!primaryAccountId) throw new Error("No Daraz account selected.");

    const res = await darazCatalogApi.uploadImage(primaryAccountId, file);
    const hostedUrl = unwrapDarazData(res)?.image?.url;

    if (!hostedUrl) throw new Error("Daraz did not return a hosted image URL.");
    return hostedUrl;
  }

  async function handleTransfer() {
    setError("");
    setResults(null);

    if (!accountIds.length) return setError("No Daraz accounts selected.");
    if (!categoryId) return setError("Select a Daraz category first.");

    if (shortDescriptionSchema && isAttrMandatory(shortDescriptionSchema) && !shortDescription.trim()) {
      return setError(`"${getAttrLabel(shortDescriptionSchema)}" is required.`);
    }

    if (modelSchema && isAttrMandatory(modelSchema) && !model.trim()) {
      return setError(`"${getAttrLabel(modelSchema)}" is required.`);
    }

    const missingProductAttr = productAttributes.find(
      (attr) => isAttrMandatory(attr) && !String(attributeValues[getAttrKey(attr)] || "").trim()
    );
    if (missingProductAttr) {
      return setError(`"${getAttrLabel(missingProductAttr)}" is required.`);
    }

    const missingSaleAttr = saleAttributes.find(
      (attr) =>
        isAttrMandatory(attr) &&
        skuRows.some(
          (row) => !String((skuAttributeValues[row.sellerSku] || {})[getAttrKey(attr)] || "").trim()
        )
    );
    if (missingSaleAttr) {
      return setError(`"${getAttrLabel(missingSaleAttr)}" is required for every SKU.`);
    }

    try {
      setSending(true);
      const res = await darazTransferApi.transfer({
        productId,
        accountIds,
        categoryId,
        categoryName,
        title,
        brand,
        model,
        shortDescription,
        attributes: attributeValues,
        skuAttributes: skuAttributeValues,
        accountContent: accountIds.length > 1 ? accountContent : undefined,
      });
      setResults(res?.data?.data || []);
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || "Transfer to Daraz failed.");
    } finally {
      setSending(false);
    }
  }

  const productImages = (product?.images || [])
    .map((img) => resolveImageUrl(img.image_url))
    .filter(Boolean);
  const productTitle = product?.product_name || product?.title || product?.name || "";

  return (
    <div className="min-h-full bg-slate-950 text-slate-200">
      <div className="w-full space-y-3">
        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-3 shadow-xl">
          <h1 className="text-lg font-semibold text-white">Transfer Preview — Daraz</h1>
          <p className="mt-1 text-xs text-slate-400">
            Reviewing "{productTitle}" for {selectedAccounts.length || accountIds.length} Daraz
            account(s).
          </p>

          <div className="mt-3 flex flex-wrap gap-2">
            {selectedAccounts.map((account) => (
              <span
                key={account.id || account.account_id}
                className="rounded-full bg-orange-500/10 px-3 py-1 text-[11px] font-semibold text-orange-300 ring-1 ring-orange-500/30"
              >
                {account.account_name || account.account_code || `#${account.id}`}
              </span>
            ))}
          </div>

          {error && (
            <div className="mt-3 flex items-start gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-300">
              <AlertCircle size={14} className="mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}
        </div>

        {loadingProduct ? (
          <Loader label="Loading product..." minHeight="240px" />
        ) : !product ? (
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6 text-center text-sm text-slate-500">
            Product not found.
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex gap-1 overflow-x-auto border-b border-slate-800">
              {TABS.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.key;

                return (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => setActiveTab(tab.key)}
                    className={`flex h-9 shrink-0 items-center gap-1.5 border-b-2 px-3 text-[12px] font-semibold transition ${
                      isActive
                        ? "border-orange-400 text-white"
                        : "border-transparent text-slate-500 hover:text-slate-300"
                    }`}
                  >
                    <Icon size={13} />
                    {tab.label}
                  </button>
                );
              })}
            </div>

            {activeTab === "images" && (
              <div className="rounded-2xl border border-slate-800 bg-slate-900 p-3">
                <h2 className="text-sm font-semibold text-white">{productTitle}</h2>
                <p className="mt-1 text-xs text-slate-500">{product.description}</p>

                <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4 xl:grid-cols-6">
                  {productImages.length ? (
                    productImages.map((url, index) => (
                      <div
                        key={url + index}
                        className="aspect-square overflow-hidden rounded-lg border border-slate-700 bg-white"
                      >
                        <img src={url} alt="" className="h-full w-full object-contain" />
                      </div>
                    ))
                  ) : (
                    <p className="col-span-full py-4 text-center text-xs text-slate-500">
                      No images found for this product.
                    </p>
                  )}
                </div>
              </div>
            )}

            {activeTab === "details" && (
              <div className="space-y-3">
                <div className="rounded-2xl border border-slate-800 bg-slate-900 p-3">
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <p className="text-xs font-medium text-slate-400">Product Title</p>
                    <button
                      type="button"
                      onClick={handleAiFill}
                      disabled={aiFilling || !product || !accountIds.length}
                      title="Generate title, description, and attribute values from this product's existing data"
                      className="inline-flex h-7 shrink-0 items-center gap-1.5 rounded-lg bg-purple-500/10 px-2.5 text-[11px] font-semibold text-purple-300 ring-1 ring-purple-500/30 hover:bg-purple-500/20 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {aiFilling ? <Loader2 size={13} className="animate-spin" /> : <Sparkles size={13} />}
                      AI Fill
                    </button>
                  </div>
                  <input value={title} onChange={(e) => setTitle(e.target.value)} className={inputClass} />
                  {accountIds.length > 1 && (
                    <p className="mt-1 text-[11px] text-slate-500">
                      Shared fallback title — each account below can have its own unique title/description.
                    </p>
                  )}
                </div>

                {accountIds.length > 1 && (
                  <div className="rounded-2xl border border-slate-800 bg-slate-900 p-3">
                    <p className="mb-2 text-xs font-medium text-slate-400">
                      Per-Account Title &amp; Description
                      <span className="ml-2 text-[11px] font-normal text-slate-500">
                        Blank fields fall back to the shared title/description.
                      </span>
                    </p>
                    <div className="space-y-3">
                      {selectedAccounts.map((account) => {
                        const accId = String(account.id || account.account_id);
                        const content = accountContent[accId] || {};

                        return (
                          <div key={accId} className="rounded-xl border border-slate-800 bg-slate-950/50 p-3">
                            <p className="mb-2 text-[11px] font-semibold text-orange-300">
                              {account.account_name || account.account_code || `#${accId}`}
                            </p>
                            <input
                              value={content.title || ""}
                              onChange={(e) => handleAccountContentChange(accId, "title", e.target.value)}
                              placeholder={title || "Uses the shared title above"}
                              className={`${inputClass} mb-2`}
                            />
                            <RichTextField
                              label="Description"
                              value={content.shortDescription || ""}
                              onChange={(value) => handleAccountContentChange(accId, "shortDescription", value)}
                              minHeight={100}
                              onUploadImage={handleRichTextImageUpload}
                            />
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
                  <div className="rounded-2xl border border-slate-800 bg-slate-900 p-3">
                    <p className="mb-2 text-xs font-medium text-slate-400">Daraz Category</p>

                    {selectedBreadcrumb && (
                      <p className="mb-1 text-[11px] font-medium text-orange-300">Selected: {selectedBreadcrumb}</p>
                    )}

                    <div ref={categorySearchContainerRef} className="relative mb-2">
                      <input
                        value={categorySearchDisplayValue}
                        onChange={(e) => setCategorySearch(e.target.value)}
                        onFocus={() => {
                          setCategorySearchFocused(true);
                          setCategorySearch("");
                        }}
                        placeholder="Click to browse, or type to search category by name..."
                        className={inputClass}
                      />

                      {categorySearchResults.length > 0 && (
                        <div className="absolute left-0 right-0 top-full z-10 mt-1 max-h-64 overflow-y-auto rounded-lg border border-slate-700 bg-slate-950 shadow-xl">
                          {!categorySearch.trim() && (
                            <p className="px-3 py-1.5 text-[10px] uppercase tracking-wide text-slate-500">
                              All categories ({flatLeafCategories.length})
                            </p>
                          )}
                          {categorySearchResults.map((item) => (
                            <button
                              key={item.id}
                              type="button"
                              onClick={() => handleCategorySearchSelect(item)}
                              className="block w-full px-3 py-2 text-left text-xs text-slate-300 hover:bg-slate-800 hover:text-orange-300"
                            >
                              {item.breadcrumb}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    {loadingTree ? (
                      <Loader label="Loading category tree..." className="py-6" minHeight="0" />
                    ) : (
                      <div className="space-y-2">
                        {levels.map((options, levelIndex) => (
                          <select
                            key={levelIndex}
                            value={
                              selectedChain[levelIndex]
                                ? String(getCategoryId(selectedChain[levelIndex]))
                                : ""
                            }
                            onChange={(e) => handleLevelChange(levelIndex, e.target.value)}
                            className={inputClass}
                          >
                            <option value="">Select category...</option>
                            {options.map((node) => (
                              <option key={getCategoryId(node)} value={getCategoryId(node)}>
                                {getCategoryName(node)}
                              </option>
                            ))}
                          </select>
                        ))}
                      </div>
                    )}

                    {leafNode && (
                      <p className="mt-2 text-[11px] text-emerald-300">
                        Selected: {categoryName} (ID: {categoryId})
                      </p>
                    )}
                  </div>

                  <div className="rounded-2xl border border-slate-800 bg-slate-900 p-3">
                    <p className="mb-2 text-xs font-medium text-slate-400">Brand & Model</p>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className={labelClass}>Brand</label>
                        <input
                          value={brand}
                          onChange={(e) => setBrand(e.target.value)}
                          className={inputClass}
                        />
                      </div>

                      <div>
                        <label className={labelClass}>
                          Model
                          {modelSchema && isAttrMandatory(modelSchema) ? (
                            <span className="text-red-400"> *</span>
                          ) : null}
                        </label>
                        <input
                          value={model}
                          onChange={(e) => setModel(e.target.value)}
                          className={inputClass}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {shortDescriptionSchema && (
                  <div className="rounded-2xl border border-slate-800 bg-slate-900 p-3">
                    <RichTextField
                      label={getAttrLabel(shortDescriptionSchema)}
                      required={isAttrMandatory(shortDescriptionSchema)}
                      value={shortDescription}
                      onChange={setShortDescription}
                      minHeight={140}
                      onUploadImage={handleRichTextImageUpload}
                    />
                  </div>
                )}

                {descriptionSchema && (
                  <div className="rounded-2xl border border-slate-800 bg-slate-900 p-3">
                    <RichTextField
                      label={getAttrLabel(descriptionSchema)}
                      required={isAttrMandatory(descriptionSchema)}
                      value={attributeValues.description || ""}
                      onChange={(value) => handleAttributeChange("description", value)}
                      minHeight={140}
                      onUploadImage={handleRichTextImageUpload}
                    />
                  </div>
                )}

                <div className="rounded-2xl border border-slate-800 bg-slate-900 p-3">
                  <p className="mb-2 text-xs font-medium text-slate-400">
                    SKUs to transfer ({skuRows.length})
                    {saleAttributes.filter(isAttrMandatory).length > 0 && (
                      <span className="ml-2 text-[11px] font-normal text-red-400">
                        {saleAttributes.filter(isAttrMandatory).length} required field(s) per SKU
                      </span>
                    )}
                  </p>
                  <div className="space-y-3">
                    {skuRows.map((row, index) => (
                      <div key={row.sellerSku + index} className="space-y-1.5 border-b border-slate-800 pb-2 last:border-b-0">
                        <div className="grid grid-cols-3 gap-2 text-xs">
                          <input
                            value={row.sellerSku}
                            readOnly
                            className={`${inputClass} bg-slate-900 text-slate-400`}
                          />
                          <input
                            type="number"
                            value={row.price}
                            onChange={(e) =>
                              setSkuRows((prev) =>
                                prev.map((r, i) => (i === index ? { ...r, price: e.target.value } : r))
                              )
                            }
                            className={inputClass}
                            placeholder="Price"
                          />
                          <input
                            type="number"
                            value={row.quantity}
                            onChange={(e) =>
                              setSkuRows((prev) =>
                                prev.map((r, i) =>
                                  i === index ? { ...r, quantity: e.target.value } : r
                                )
                              )
                            }
                            className={inputClass}
                            placeholder="Qty"
                          />
                        </div>

                        {saleAttributes.length > 0 && (
                          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-4">
                            {saleAttributes.map((attr) => {
                              const key = getAttrKey(attr);
                              const type = getAttrType(attr);
                              const value = (skuAttributeValues[row.sellerSku] || {})[key] || "";
                              const mandatory = isAttrMandatory(attr);
                              const uploadKey = `${row.sellerSku}:${key}`;

                              return (
                                <div key={key} className={isRichTextType(type) ? "col-span-2 sm:col-span-3 xl:col-span-4" : ""}>
                                  <label className="mb-0.5 block text-[10px] font-medium text-slate-500">
                                    {getAttrLabel(attr)}
                                    {mandatory ? <span className="text-red-400"> *</span> : null}
                                  </label>

                                  <AttributeField
                                    attr={attr}
                                    value={value}
                                    onChange={(v) => handleSkuAttributeChange(row.sellerSku, key, v)}
                                    uploading={uploadingKey === uploadKey}
                                    onUploadFile={(file) =>
                                      handleImageAttributeUpload(row.sellerSku, key, file)
                                    }
                                    onUploadImage={handleRichTextImageUpload}
                                  />
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                  <p className="mt-2 text-[11px] text-slate-500">
                    If a SKU already exists on a target account, it will be auto-suffixed (e.g.
                    SKU_AA) instead of failing.
                  </p>
                </div>
              </div>
            )}

            {activeTab === "attributes" && (
              <div className="rounded-2xl border border-slate-800 bg-slate-900 p-3">
                <p className="mb-2 text-xs font-medium text-slate-400">
                  Category Attributes
                  {productAttributes.filter(isAttrMandatory).length > 0 && (
                    <span className="ml-2 text-[11px] font-normal text-red-400">
                      {productAttributes.filter(isAttrMandatory).length} required
                    </span>
                  )}
                </p>
                {saleAttributes.length > 0 && (
                  <p className="mb-2 text-[11px] text-slate-500">
                    {saleAttributes.length} attribute(s) (e.g. colour/size) vary per SKU — fill
                    those in next to each SKU on the Basic Details tab instead.
                  </p>
                )}

                {!categoryId ? (
                  <p className="py-4 text-center text-xs text-slate-500">
                    Select a leaf category on the Basic Details tab to load its attributes.
                  </p>
                ) : loadingAttributes ? (
                  <Loader label="Loading attributes..." className="py-6" minHeight="0" />
                ) : productAttributes.length ? (
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
                    {productAttributes.map((attr) => {
                      const key = getAttrKey(attr);
                      const type = getAttrType(attr);
                      const mandatory = isAttrMandatory(attr);
                      const uploadKey = `product:${key}`;

                      return (
                        <div key={key} className={isRichTextType(type) ? "sm:col-span-2 xl:col-span-4" : ""}>
                          <label className={labelClass}>
                            {getAttrLabel(attr)}
                            {mandatory ? <span className="text-red-400"> *</span> : null}
                          </label>

                          <AttributeField
                            attr={attr}
                            value={attributeValues[key] || ""}
                            onChange={(value) => handleAttributeChange(key, value)}
                            uploading={uploadingKey === uploadKey}
                            onUploadFile={(file) => handleImageAttributeUpload("", key, file)}
                            onUploadImage={handleRichTextImageUpload}
                          />
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="py-4 text-center text-xs text-slate-500">
                    {saleAttributes.length
                      ? "No shared attributes — only the per-SKU ones on the Basic Details tab."
                      : "No attributes required for this category."}
                  </p>
                )}
              </div>
            )}

            <div className="flex justify-end">
              <button
                onClick={handleTransfer}
                disabled={sending || !categoryId}
                className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-orange-500 px-3 text-[12px] font-semibold text-slate-950 hover:bg-orange-400 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {sending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                Transfer to {accountIds.length} Daraz Account(s)
              </button>
            </div>

            {results && (
              <div className="space-y-2 rounded-2xl border border-slate-800 bg-slate-900 p-3">
                <p className="mb-1 text-xs font-medium text-slate-400">Results</p>
                {results.map((result) => (
                  <div
                    key={result.accountId}
                    className={`flex items-start gap-2 rounded-lg px-3 py-2 text-xs ${
                      result.success
                        ? "border border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
                        : "border border-red-500/30 bg-red-500/10 text-red-300"
                    }`}
                  >
                    {result.success ? (
                      <CheckCircle2 size={14} className="mt-0.5 shrink-0" />
                    ) : (
                      <XCircle size={14} className="mt-0.5 shrink-0" />
                    )}
                    <div>
                      <p className="font-semibold">
                        {result.accountName || `Account #${result.accountId}`}
                      </p>
                      {result.success ? (
                        <>
                          <p>Daraz Item ID: {result.itemId || "-"}</p>
                          {result.skuMap &&
                            Object.entries(result.skuMap).map(([original, final]) => (
                              <p key={original}>
                                SKU: {original}
                                {original !== final ? ` → ${final} (auto-suffixed)` : ""}
                              </p>
                            ))}
                        </>
                      ) : (
                        <>
                          <p>{result.error}</p>
                          {result.errorDetail && (
                            <pre className="mt-1 max-h-40 overflow-auto whitespace-pre-wrap rounded bg-black/30 p-2 text-[11px] text-red-200/80">
                              {JSON.stringify(result.errorDetail, null, 2)}
                            </pre>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
