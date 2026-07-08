import { useEffect, useMemo, useState } from "react";
import { RefreshCw, Save } from "lucide-react";
import { useParams } from "react-router-dom";
import localProductsApi from "../../../config/sub_api/product_management_api/local_products_api";
import { getStoredUser } from "../../../config/auth";
import Loader from "../../../components/common/Loader";
import ProductPageLayout from "./components/ProductPageLayout";
import { RichTextField } from "../../../components/common/rich_text_editor/RichTextEditor";
import {
  generateProductSku,
  getCode,
  getErrorMessage,
  getName,
  makeSlug,
  normalizeList,
} from "./utils/productSku";
import { resolveImageUrl } from "./product_dashboard/utils/localProductsImageHelpers";
import { useToast } from "../../../components/common/toast/ToastProvider";

function unwrapOne(response) {
  const data = response?.data?.data ?? response?.data ?? response;
  if (Array.isArray(data)) return data[0] || null;
  return data || null;
}

function asText(value) {
  if (value === undefined || value === null) return "";
  return String(value).trim();
}

function isSame(a, b) {
  const left = asText(a).toLowerCase();
  const right = asText(b).toLowerCase();
  return Boolean(left && right && left === right);
}

function getOptionId(item) {
  return (
    item?.id ??
    item?.value ??
    item?.product_model_id ??
    item?.model_id ??
    item?.category_id ??
    item?.sub_category_id ??
    item?.subcategory_id ??
    item?.colour_id ??
    ""
  );
}


function getCurrentUserId() {
  const user = getStoredUser?.();
  return user?.id || user?.user_id || user?.user_uid || 1;
}

function formatMasterOption(item, type) {
  const code = getCode(item, type);
  const name = getName(item, type);
  if (code && name) return `${code} - ${name}`;
  return code || name || "Unnamed";
}

function getAllIds(item) {
  return [
    item?.id,
    item?.value,
    item?.category_id,
    item?.product_category_id,
    item?.sub_category_id,
    item?.subcategory_id,
    item?.product_sub_category_id,
    item?.model_id,
    item?.product_model_id,
    item?.modelId,
    item?.productModelId,
    item?.model?.id,
    item?.model?.model_id,
    item?.model?.product_model_id,
    item?.product_model?.id,
    item?.product_model?.model_id,
    item?.product_model?.product_model_id,
  ]
    .map(asText)
    .filter(Boolean);
}

function getCategoryId(item) {
  return (
    item?.category_id ??
    item?.product_category_id ??
    item?.categoryId ??
    item?.parent_category_id ??
    item?.category?.id ??
    item?.category?.category_id ??
    ""
  );
}

function getSubCategoryId(item) {
  return (
    item?.sub_category_id ??
    item?.subcategory_id ??
    item?.subCategoryId ??
    item?.product_sub_category_id ??
    item?.sub_category?.id ??
    item?.subcategory?.id ??
    ""
  );
}

function getModelId(item) {
  const modelValue =
    item?.model_id ??
    item?.product_model_id ??
    item?.productModelId ??
    item?.modelId ??
    item?.model?.id ??
    item?.model?.model_id ??
    item?.model?.product_model_id ??
    item?.product_model?.id ??
    item?.product_model?.model_id ??
    item?.product_model?.product_model_id;

  if (modelValue !== undefined && modelValue !== null && modelValue !== "") {
    return modelValue;
  }

  // Some backend versions return model as a direct number/string id.
  if (
    typeof item?.model === "number" ||
    (typeof item?.model === "string" && /^\d+$/.test(item.model.trim()))
  ) {
    return item.model;
  }

  if (
    typeof item?.product_model === "number" ||
    (typeof item?.product_model === "string" &&
      /^\d+$/.test(item.product_model.trim()))
  ) {
    return item.product_model;
  }

  return "";
}

function getAllNames(item) {
  return [
    getName(item),
    item?.name,
    item?.title,
    item?.label,
    item?.model_name,
    item?.product_model_name,
    item?.model_code,
    item?.product_model_code,
    item?.code,
    item?.model?.name,
    item?.model?.title,
    item?.model?.model_name,
    item?.model?.product_model_name,
    item?.product_model?.name,
    item?.product_model?.title,
    item?.product_model?.model_name,
    item?.product_model?.product_model_name,
    typeof item?.model === "string" ? item.model : "",
    typeof item?.product_model === "string" ? item.product_model : "",
  ]
    .map(asText)
    .filter(Boolean);
}

function resolveOptionValue(options, rawIds = [], rawNames = []) {
  const ids = rawIds.map(asText).filter(Boolean);
  const names = rawNames.map(asText).filter(Boolean);

  const byId = options.find((option) => {
    const optionIds = getAllIds(option);
    return ids.some((id) => optionIds.some((optionId) => isSame(optionId, id)));
  });

  if (byId) return asText(getOptionId(byId));

  const byName = options.find((option) => {
    const optionNames = getAllNames(option);
    return names.some((name) =>
      optionNames.some((optionName) => isSame(optionName, name))
    );
  });

  if (byName) return asText(getOptionId(byName));

  return ids[0] || "";
}

function normalizeProductForForm(productData, categoryRows, subCategoryRows, modelRows) {
  const categoryValue = resolveOptionValue(
    categoryRows,
    [getCategoryId(productData)],
    [
      productData?.category_name,
      productData?.category,
      productData?.product_category_name,
      productData?.category?.name,
      productData?.category?.title,
    ]
  );

  const subCategoryValue = resolveOptionValue(
    subCategoryRows,
    [getSubCategoryId(productData)],
    [
      productData?.sub_category_name,
      productData?.subcategory_name,
      productData?.subCategoryName,
      productData?.sub_category,
      productData?.subcategory,
      productData?.product_sub_category_name,
      productData?.sub_category?.name,
      productData?.subcategory?.name,
    ]
  );

  const modelValue = resolveOptionValue(
    modelRows,
    [getModelId(productData)],
    [
      productData?.model_name,
      productData?.product_model_name,
      productData?.model,
      productData?.product_model,
      productData?.model?.name,
      productData?.model?.title,
      productData?.model?.model_name,
      productData?.product_model?.name,
      productData?.product_model?.title,
      productData?.product_model?.model_name,
    ]
  );

  return {
    ...productData,
    category_id: categoryValue,
    product_category_id: categoryValue,
    sub_category_id: subCategoryValue,
    product_sub_category_id: subCategoryValue,
    model_id: modelValue,
    product_model_id: modelValue,
  };
}

function setProductCategoryId(prev, value) {
  return {
    ...prev,
    category_id: value,
    product_category_id: value,
    sub_category_id: "",
    product_sub_category_id: "",
  };
}

function setProductSubCategoryId(prev, value) {
  return {
    ...prev,
    sub_category_id: value,
    product_sub_category_id: value,
  };
}

function setProductModelId(prev, value) {
  return {
    ...prev,
    model_id: value,
    product_model_id: value,
  };
}

function findByFlexibleId(list, value) {
  const searchValue = asText(value);

  return list.find((item) =>
    getAllIds(item).some((id) => isSame(id, searchValue))
  );
}

function DarkInput({
  label,
  value,
  onChange,
  type = "text",
  step,
  required = false,
  placeholder = "",
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-xs font-bold uppercase tracking-wide text-slate-500">
        {label}
        {required ? <span className="text-orange-300"> *</span> : null}
      </span>
      <input
        type={type}
        step={step}
        value={value ?? ""}
        required={required}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        className="h-11 w-full border border-slate-800 bg-[#070b16] px-3 text-sm font-semibold text-slate-100 outline-none transition placeholder:text-slate-600 focus:border-orange-400"
      />
    </label>
  );
}

function DarkSelect({
  label,
  value,
  onChange,
  children,
  required = false,
  disabled = false,
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-xs font-bold uppercase tracking-wide text-slate-500">
        {label}
        {required ? <span className="text-orange-300"> *</span> : null}
      </span>
      <select
        value={value ?? ""}
        required={required}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
        className="h-11 w-full cursor-pointer border border-slate-800 bg-[#070b16] px-3 text-sm font-semibold text-slate-100 outline-none transition focus:border-orange-400 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {children}
      </select>
    </label>
  );
}

export default function LocalProductBasicPage() {
  const { productId } = useParams();
  const showToast = useToast();

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  async function handleUploadDescriptionImage(file) {
    const formData = new FormData();
    formData.append("image", file);
    formData.append("product_id", productId);

    const response = await localProductsApi.uploadImage(formData);
    const created = response?.data?.data || response?.data;
    const rawUrl = created?.image_url || created?.url || created?.image_path || "";
    return resolveImageUrl(rawUrl);
  }

  const [product, setProduct] = useState(null);
  const [categories, setCategories] = useState([]);
  const [subCategories, setSubCategories] = useState([]);
  const [models, setModels] = useState([]);
  const [form, setForm] = useState({});

  const categoryValue = asText(form.category_id || form.product_category_id);
  const subCategoryValue = asText(form.sub_category_id || form.product_sub_category_id);
  const modelValue = asText(form.model_id || form.product_model_id);
  const currentUser = useMemo(() => getStoredUser?.() || null, []);

  function updateField(name, value) {
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  async function loadData() {
    setLoading(true);

    try {
      const [productRes, categoryRes, subCategoryRes, modelRes] =
        await Promise.all([
          localProductsApi.getProductById(productId),
          localProductsApi.getCategories({ limit: 100 }).catch(() => []),
          localProductsApi.getSubCategories({ limit: 500 }).catch(() => []),
          localProductsApi.getProductModels({ limit: 1000 }).catch(() => []),
        ]);

      const categoryRows = normalizeList(categoryRes);
      const subCategoryRows = normalizeList(subCategoryRes);
      const modelRows = normalizeList(modelRes);
      const productData = unwrapOne(productRes) || {};

      const normalizedProduct = normalizeProductForForm(
        productData,
        categoryRows,
        subCategoryRows,
        modelRows
      );

      setProduct(normalizedProduct);
      setForm(normalizedProduct);
      setCategories(categoryRows);
      setSubCategories(subCategoryRows);
      setModels(modelRows);
    } catch (error) {
      alert(getErrorMessage(error, "Unable to load product basic details."));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productId]);

  const filteredSubCategories = useMemo(() => {
    if (!categoryValue) return [];

    const category = findByFlexibleId(categories, categoryValue);
    const categoryCode = asText(category?.category_code);

    if (!categoryCode) return [];

    return subCategories.filter(
      (item) => asText(item?.category_code) === categoryCode
    );
  }, [subCategories, categories, categoryValue]);

  const selectedModelExists = useMemo(() => {
    if (!modelValue) return true;
    return models.some((item) => isSame(getOptionId(item), modelValue));
  }, [models, modelValue]);

  const selectedCategory = useMemo(
    () => findByFlexibleId(categories, categoryValue),
    [categories, categoryValue]
  );

  const selectedSubCategory = useMemo(
    () => findByFlexibleId(subCategories, subCategoryValue),
    [subCategories, subCategoryValue]
  );

  const selectedModel = useMemo(
    () => findByFlexibleId(models, modelValue),
    [models, modelValue]
  );

  const generatedSkuPreview = useMemo(() => {
    if (!selectedCategory || !selectedSubCategory || !selectedModel) return "";
    return generateProductSku({
      category: selectedCategory,
      subCategory: selectedSubCategory,
      model: selectedModel,
    });
  }, [selectedCategory, selectedSubCategory, selectedModel]);

  function regenerateSku(customForm = form) {
    const category = findByFlexibleId(categories, categoryValue);
    const subCategory = findByFlexibleId(subCategories, subCategoryValue);
    const model = findByFlexibleId(models, modelValue);

    const sku = generateProductSku({
      category,
      subCategory,
      model,
      index: Number(productId || 1),
    });

    setForm((prev) => ({
      ...prev,
      sku,
      slug: makeSlug(`${prev.title || sku}-${sku}`),
    }));
  }

  function handleTitleChange(value) {
    setForm((prev) => ({
      ...prev,
      title: value,
      slug: makeSlug(`${value}-${prev.sku || "product"}`),
    }));
  }

  function handleCategoryChange(value) {
    setForm((prev) => setProductCategoryId(prev, value));
  }

  function handleSubCategoryChange(value) {
    setForm((prev) => setProductSubCategoryId(prev, value));
  }

  function handleModelChange(value) {
    setForm((prev) => setProductModelId(prev, value));
  }

  function handleProductTypeChange(value) {
    setForm((prev) => ({
      ...prev,
      product_type: value,
      has_variants: value === "variable" ? 1 : 0,
    }));
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (!String(form.title || "").trim()) {
      alert("Product title is required.");
      return;
    }

    if (!categoryValue || !subCategoryValue || !modelValue) {
      alert("Select category, sub category and model first.");
      return;
    }

    setSaving(true);

    try {
      const payload = {
        ...form,
        title: String(form.title || "").trim(),
        sku: String(form.sku || "").trim(),
        slug: form.slug || makeSlug(`${form.title}-${form.sku}`),

        // Send both names to support both backend/table versions.
        category_id: categoryValue,
        product_category_id: categoryValue,
        sub_category_id: subCategoryValue,
        product_sub_category_id: subCategoryValue,
        model_id: modelValue,
        product_model_id: modelValue,

        has_variants: Number(form.has_variants || 0),
        updated_by: getCurrentUserId(),
      };

      const response = await localProductsApi.updateProduct(productId, payload);
      const updatedResponse = unwrapOne(response) || payload;

      const updated = normalizeProductForForm(
        {
          ...payload,
          ...updatedResponse,
        },
        categories,
        subCategories,
        models
      );

      setProduct(updated);
      setForm(updated);

      showToast("Product basic details updated successfully.");
    } catch (error) {
      alert(getErrorMessage(error, "Unable to update product."));
    } finally {
      setSaving(false);
    }
  }

  return (
    <ProductPageLayout
      productId={productId}
      active="basic"
      product={product}
      title="Product Basic Details"
      description="Update title, category, sub category, model, SKU, slug and descriptions."
    >
      <form
        onSubmit={handleSubmit}
        className="rounded-3xl border border-slate-800 bg-[#0b1220] p-5 text-slate-100 shadow-xl shadow-black/10"
      >
        {loading ? (
          <Loader label="Loading product..." minHeight="260px" />
        ) : (
          <>
            <div className="mb-4 border border-slate-800 bg-[#070b16] p-4">
              <div className="grid grid-cols-1 gap-3 text-xs font-bold text-slate-400 md:grid-cols-4">
                <div>
                  <p className="uppercase tracking-wide text-slate-500">Category Code</p>
                  <p className="mt-1 text-orange-300">{getCode(selectedCategory, "category") || "-"}</p>
                </div>
                <div>
                  <p className="uppercase tracking-wide text-slate-500">Sub Category Code</p>
                  <p className="mt-1 text-orange-300">{getCode(selectedSubCategory, "subCategory") || "-"}</p>
                </div>
                <div>
                  <p className="uppercase tracking-wide text-slate-500">Model Code</p>
                  <p className="mt-1 text-orange-300">{getCode(selectedModel, "model") || "-"}</p>
                </div>
                <div>
                  <p className="uppercase tracking-wide text-slate-500">Login User</p>
                  <p className="mt-1 text-cyan-300">{currentUser?.user_uid || currentUser?.name || currentUser?.email || "User"}</p>
                </div>
              </div>
              <div className="mt-3 flex flex-col gap-2 rounded-xl border border-slate-800 bg-[#0b1220] px-3 py-2 md:flex-row md:items-center md:justify-between">
                <p className="text-xs font-black uppercase tracking-wide text-slate-500">Code Based SKU</p>
                <p className="font-mono text-sm font-black text-emerald-300">{generatedSkuPreview || "Select category + sub category + model"}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <DarkInput
                label="Product Title"
                value={form.title}
                onChange={handleTitleChange}
                required
                placeholder="Product title"
              />

              <DarkInput
                label="SKU"
                value={form.sku}
                onChange={(value) => updateField("sku", value)}
                required
                placeholder="Auto SKU"
              />

              <DarkSelect
                label="Category"
                value={categoryValue}
                onChange={handleCategoryChange}
                required
              >
                <option value="">Select category</option>
                {categories.map((item, index) => (
                  <option
                    key={getOptionId(item) || `category-${index}`}
                    value={getOptionId(item)}
                  >
                    {formatMasterOption(item, "category")}
                  </option>
                ))}
              </DarkSelect>

              <DarkSelect
                label="Sub Category"
                value={subCategoryValue}
                onChange={handleSubCategoryChange}
                required
                disabled={!categoryValue}
              >
                <option value="">Select sub category</option>
                {filteredSubCategories.map((item, index) => (
                  <option
                    key={getOptionId(item) || `sub-category-${index}`}
                    value={getOptionId(item)}
                  >
                    {formatMasterOption(item, "subCategory")}
                  </option>
                ))}
              </DarkSelect>

              <DarkSelect
                label="Product Model"
                value={modelValue}
                onChange={handleModelChange}
                required
              >
                <option value="">Select model</option>

                {modelValue && !selectedModelExists ? (
                  <option value={modelValue}>
                    Saved Model #{modelValue}
                  </option>
                ) : null}

                {models.map((item, index) => (
                  <option
                    key={getOptionId(item) || `model-${index}`}
                    value={getOptionId(item)}
                  >
                    {formatMasterOption(item, "model")}
                  </option>
                ))}
              </DarkSelect>

              <DarkInput
                label="Slug"
                value={form.slug}
                onChange={(value) => updateField("slug", value)}
                required
                placeholder="product-slug"
              />

              <DarkSelect
                label="Product Type"
                value={form.product_type || "single"}
                onChange={handleProductTypeChange}
              >
                <option value="single">Single</option>
                <option value="variable">Variable</option>
              </DarkSelect>

              <DarkSelect
                label="Has Variants"
                value={String(form.has_variants || 0)}
                onChange={(value) => updateField("has_variants", Number(value))}
              >
                <option value="0">No</option>
                <option value="1">Yes</option>
              </DarkSelect>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-4">
              <RichTextField
                label="Short Description"
                value={form.short_description}
                onChange={(value) => updateField("short_description", value)}
                minHeight={90}
                placeholder="Short product description (shown on listing cards)..."
                onUploadImage={handleUploadDescriptionImage}
                hint="HTML"
              />

              <RichTextField
                label="Description"
                value={form.description}
                onChange={(value) => updateField("description", value)}
                minHeight={220}
                placeholder="Full product description — formatting, images, links and tables are supported..."
                onUploadImage={handleUploadDescriptionImage}
                hint="HTML"
              />
            </div>

            <div className="mt-5 flex flex-wrap justify-end gap-2">
              <button
                type="button"
                onClick={() => regenerateSku()}
                className="inline-flex h-10 cursor-pointer items-center gap-2 border border-slate-800 bg-[#070b16] px-4 text-sm font-bold text-slate-300 transition hover:border-orange-400 hover:text-orange-300"
              >
                <RefreshCw size={15} />
                Regenerate SKU
              </button>

              <button
                disabled={saving}
                type="submit"
                className="inline-flex h-10 cursor-pointer items-center gap-2 bg-orange-500 px-4 text-sm font-bold text-white transition hover:bg-orange-400 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving ? (
                  <RefreshCw size={15} className="animate-spin" />
                ) : (
                  <Save size={15} />
                )}
                {saving ? "Saving..." : "Save Basic Details"}
              </button>
            </div>
          </>
        )}
      </form>
    </ProductPageLayout>
  );
}
