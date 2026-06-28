import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, ImagePlus, Loader2, Save, UploadCloud } from "lucide-react";
import { useNavigate } from "react-router-dom";
import localProductsApi from "../../../../config/sub_api/product_management_api/local_products_api";
import {
  generateProductSku,
  getErrorMessage,
  getName,
  makeSlug,
  normalizeList,
} from "../utils/productSku";

const FIELD_CLASS =
  "h-11 w-full rounded-xl border border-slate-700 bg-[#0b1220] px-3 text-sm font-semibold text-slate-100 outline-none transition placeholder:text-slate-500 focus:border-orange-400 disabled:cursor-not-allowed disabled:opacity-60";

function FieldWrap({ label, required, children, hint }) {
  return (
    <label className="block">
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <span className="text-[12px] font-bold uppercase tracking-wide text-slate-300">
          {label} {required && <span className="text-orange-300">*</span>}
        </span>
        {hint && <span className="text-[11px] font-medium text-slate-500">{hint}</span>}
      </div>
      {children}
    </label>
  );
}

function TextField({ label, value, onChange, required, placeholder, disabled, hint }) {
  return (
    <FieldWrap label={label} required={required} hint={hint}>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        required={required}
        disabled={disabled}
        placeholder={placeholder}
        className={FIELD_CLASS}
      />
    </FieldWrap>
  );
}

function SelectField({ label, value, onChange, required, disabled, children, hint }) {
  return (
    <FieldWrap label={label} required={required} hint={hint}>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        required={required}
        disabled={disabled}
        className={FIELD_CLASS}
      >
        {children}
      </select>
    </FieldWrap>
  );
}

function TextareaField({ label, value, onChange, rows = 4, placeholder }) {
  return (
    <FieldWrap label={label}>
      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        rows={rows}
        placeholder={placeholder}
        className="w-full resize-none rounded-xl border border-slate-700 bg-[#0b1220] px-3 py-3 text-sm font-medium text-slate-100 outline-none transition placeholder:text-slate-500 focus:border-orange-400"
      />
    </FieldWrap>
  );
}

function getCategoryId(item = {}) {
  return (
    item.id ??
    item.category_id ??
    item.product_category_id ??
    item.productCategoryId ??
    item.categoryId ??
    item.value ??
    ""
  );
}

function getSubCategoryId(item = {}) {
  return (
    item.id ??
    item.sub_category_id ??
    item.subCategoryId ??
    item.product_sub_category_id ??
    item.productSubCategoryId ??
    item.value ??
    ""
  );
}

function getSubCategoryParentId(item = {}) {
  const nestedCategory =
    item.category && typeof item.category === "object"
      ? item.category.id ?? item.category.category_id ?? item.category.value
      : "";

  return (
    item.category_id ??
    item.product_category_id ??
    item.productCategoryId ??
    item.categoryId ??
    item.parent_category_id ??
    item.parentCategoryId ??
    item.parent_id ??
    item.parentId ??
    item.main_category_id ??
    item.mainCategoryId ??
    nestedCategory ??
    ""
  );
}

function getModelId(item = {}) {
  return (
    item.id ??
    item.model_id ??
    item.product_model_id ??
    item.productModelId ??
    item.value ??
    ""
  );
}


function getModelCategoryId(item = {}) {
  const nestedCategory =
    item.category && typeof item.category === "object"
      ? item.category.id ?? item.category.category_id ?? item.category.value
      : "";

  return (
    item.category_id ??
    item.product_category_id ??
    item.productCategoryId ??
    item.categoryId ??
    item.parent_category_id ??
    item.parentCategoryId ??
    nestedCategory ??
    ""
  );
}

function getModelSubCategoryId(item = {}) {
  const nestedSubCategory =
    item.sub_category && typeof item.sub_category === "object"
      ? item.sub_category.id ?? item.sub_category.sub_category_id ?? item.sub_category.value
      : "";

  return (
    item.sub_category_id ??
    item.subCategoryId ??
    item.product_sub_category_id ??
    item.productSubCategoryId ??
    item.child_category_id ??
    item.childCategoryId ??
    nestedSubCategory ??
    ""
  );
}

function extractCreatedProduct(response) {
  return (
    response?.data?.data?.product ||
    response?.data?.product ||
    response?.data?.data ||
    response?.data ||
    response
  );
}

export default function LocalProductAddPage() {
  const navigate = useNavigate();

  const [saving, setSaving] = useState(false);
  const [mastersLoading, setMastersLoading] = useState(false);
  const [categories, setCategories] = useState([]);
  const [subCategories, setSubCategories] = useState([]);
  const [models, setModels] = useState([]);
  const [pendingImages, setPendingImages] = useState([]);

  const [form, setForm] = useState({
    title: "",
    sku: "",
    slug: "",
    category_id: "",
    sub_category_id: "",
    model_id: "",
    product_type: "single",
    has_variants: 0,
    short_description: "",
    description: "",
    main_price: 0,
    cost_price: 0,
    sale_price: 0,
    currency: "LKR",
    created_by: 1,
    updated_by: 1,
  });

  function updateField(name, value) {
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  async function loadMasters() {
    setMastersLoading(true);

    try {
      const [categoryRes, subCategoryRes, modelRes] = await Promise.all([
        localProductsApi.getCategories().catch(() => []),
        localProductsApi.getSubCategories().catch(() => []),
        localProductsApi.getProductModels().catch(() => []),
      ]);

      setCategories(normalizeList(categoryRes));
      setSubCategories(normalizeList(subCategoryRes));
      setModels(normalizeList(modelRes));
    } catch (error) {
      alert(getErrorMessage(error, "Unable to load master data."));
    } finally {
      setMastersLoading(false);
    }
  }

  useEffect(() => {
    loadMasters();
  }, []);

  const selectedCategory = useMemo(
    () =>
      categories.find(
        (item) => String(getCategoryId(item)) === String(form.category_id)
      ),
    [categories, form.category_id]
  );

  const selectedSubCategory = useMemo(
    () =>
      subCategories.find(
        (item) => String(getSubCategoryId(item)) === String(form.sub_category_id)
      ),
    [subCategories, form.sub_category_id]
  );

  const selectedModel = useMemo(
    () =>
      models.find((item) => String(getModelId(item)) === String(form.model_id)),
    [models, form.model_id]
  );

  const filteredSubCategories = useMemo(() => {
    if (!form.category_id) return subCategories;

    const hasParentCategoryField = subCategories.some(
      (item) => String(getSubCategoryParentId(item) || "").trim() !== ""
    );

    // If backend does not send category_id/parent_id with sub categories,
    // do not hide the dropdown. Show all sub categories instead.
    if (!hasParentCategoryField) return subCategories;

    return subCategories.filter(
      (item) => String(getSubCategoryParentId(item)) === String(form.category_id)
    );
  }, [subCategories, form.category_id]);
  const filteredModels = useMemo(() => {
    if (!form.category_id) return [];

    const hasCategoryField = models.some(
      (item) => String(getModelCategoryId(item) || "").trim() !== ""
    );

    const hasSubCategoryField = models.some(
      (item) => String(getModelSubCategoryId(item) || "").trim() !== ""
    );

    if (!hasCategoryField && !hasSubCategoryField) return models;

    return models.filter((item) => {
      const categoryMatches = !hasCategoryField || String(getModelCategoryId(item)) === String(form.category_id);
      const subCategoryMatches = !form.sub_category_id || !hasSubCategoryField || String(getModelSubCategoryId(item)) === String(form.sub_category_id);
      return categoryMatches && subCategoryMatches;
    });
  }, [models, form.category_id, form.sub_category_id]);


  useEffect(() => {
    if (!form.category_id || !form.sub_category_id || !form.model_id) return;
    if (!selectedCategory || !selectedSubCategory || !selectedModel) return;

    const generatedSku = generateProductSku({
      category: selectedCategory,
      subCategory: selectedSubCategory,
      model: selectedModel,
      index: 1,
    });

    setForm((prev) => {
      const nextSku = prev.sku || generatedSku;
      const nextSlug = prev.slug || makeSlug(`${prev.title || generatedSku}-${nextSku}`);

      return {
        ...prev,
        sku: nextSku,
        slug: nextSlug,
      };
    });
  }, [
    form.category_id,
    form.sub_category_id,
    form.model_id,
    selectedCategory,
    selectedSubCategory,
    selectedModel,
  ]);

  function handleTitleChange(value) {
    setForm((prev) => ({
      ...prev,
      title: value,
      slug: makeSlug(`${value || "product"}-${prev.sku || ""}`),
    }));
  }

  function handleSkuChange(value) {
    setForm((prev) => ({
      ...prev,
      sku: value,
      slug: makeSlug(`${prev.title || "product"}-${value || ""}`),
    }));
  }

  function handleProductTypeChange(value) {
    setForm((prev) => ({
      ...prev,
      product_type: value,
      has_variants: value === "variable" ? 1 : 0,
    }));
  }

  function handleHasVariantsChange(value) {
    const hasVariants = Number(value);

    setForm((prev) => ({
      ...prev,
      has_variants: hasVariants,
      product_type: hasVariants === 1 ? "variable" : "single",
    }));
  }

  function addImageFiles(fileList = []) {
    const nextFiles = Array.from(fileList || []).filter((file) => file && file.type?.startsWith("image/"));
    if (!nextFiles.length) return;

    setPendingImages((prev) => [
      ...prev,
      ...nextFiles.map((file) => ({
        id: `${Date.now()}-${Math.random()}`,
        type: "file",
        file,
        preview: URL.createObjectURL(file),
        name: file.name,
      })),
    ]);
  }

  function addMediaUrl() {
    const imageUrl = window.prompt("Paste existing image URL or /uploads path");
    if (!imageUrl) return;
    setPendingImages((prev) => [
      ...prev,
      {
        id: `${Date.now()}-${Math.random()}`,
        type: "url",
        image_url: imageUrl.trim(),
        preview: imageUrl.trim(),
        name: "Media center image",
      },
    ]);
  }

  function removePendingImage(id) {
    setPendingImages((prev) => {
      const image = prev.find((item) => item.id === id);
      if (image?.preview?.startsWith("blob:")) URL.revokeObjectURL(image.preview);
      return prev.filter((item) => item.id !== id);
    });
  }

  async function uploadPendingImages(productId, sku) {
    if (!pendingImages.length || !productId) return;

    for (let index = 0; index < pendingImages.length; index += 1) {
      const item = pendingImages[index];
      const imageForm = new FormData();
      imageForm.append("product_id", productId);
      imageForm.append("sku", sku || form.sku);
      imageForm.append("sort_order", String(index + 1));
      imageForm.append("is_main", index === 0 ? "1" : "0");

      if (item.type === "file" && item.file) {
        imageForm.append("image", item.file);
      } else if (item.type === "url" && item.image_url) {
        imageForm.append("image_url", item.image_url);
        imageForm.append("url", item.image_url);
        imageForm.append("image_path", item.image_url);
      }

      await localProductsApi.uploadImage(imageForm);
    }
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (!form.title.trim()) {
      alert("Product title is required.");
      return;
    }

    if (!form.category_id || !form.sub_category_id || !form.model_id) {
      alert("Select category, sub category and model first.");
      return;
    }

    setSaving(true);

    try {
      const payload = {
        ...form,
        slug: form.slug || makeSlug(`${form.title}-${form.sku}`),
        has_variants: Number(form.has_variants),
        main_price: Number(form.main_price || 0),
        cost_price: Number(form.cost_price || 0),
        sale_price: Number(form.sale_price || 0),
      };

      const response = await localProductsApi.createProduct(payload);
      const product = extractCreatedProduct(response);
      const productId = product?.id || product?.product_id || product?.local_product_id;

      if (!productId) {
        alert("Product created, but product ID was not returned. Please check dashboard.");
        navigate("/product/local-products");
        return;
      }

      try {
        await uploadPendingImages(productId, payload.sku);
      } catch (imageError) {
        alert(`Product created, but image upload failed: ${getErrorMessage(imageError, "Image upload failed.")}`);
      }

      navigate(`/product/local-products/edit/${productId}/price-inventory`);
    } catch (error) {
      alert(getErrorMessage(error, "Unable to create product."));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#070b16] p-3 text-slate-100 lg:p-5">
      <div className="mx-auto max-w-5xl">
        <div className="mb-3 flex items-center justify-between gap-3 border-b border-slate-800 pb-3">
          <div>
            <p className="text-[12px] font-black uppercase tracking-[0.22em] text-orange-300">
              Local Product
            </p>
            <h1 className="mt-1 text-xl font-black text-white">Create Product</h1>
          </div>

          <button
            type="button"
            onClick={() => navigate("/product/local-products")}
            className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-slate-700 bg-[#0b1220] px-4 py-2 text-sm font-bold text-slate-200 transition hover:border-orange-400 hover:text-orange-300"
          >
            <ArrowLeft size={16} /> Back
          </button>
        </div>

        <form
          onSubmit={handleSubmit}
          className="overflow-hidden rounded-2xl border border-slate-800 bg-[#0b1220] shadow-2xl shadow-black/20"
        >
          <div className="border-b border-slate-800 px-4 py-3">
            <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm font-black text-white">Basic Details</p>

              {mastersLoading && (
                <span className="inline-flex items-center gap-2 text-xs font-bold text-orange-300">
                  <Loader2 size={14} className="animate-spin" /> Loading master data...
                </span>
              )}
            </div>
          </div>

          <div className="p-4">
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <div className="lg:col-span-2">
                <TextField
                  label="Product Title"
                  value={form.title}
                  onChange={handleTitleChange}
                  required
                  placeholder="Example: LED Bulb 10W"
                />
              </div>

              <SelectField
                label="Category"
                value={form.category_id}
                onChange={(value) =>
                  setForm((prev) => ({
                    ...prev,
                    category_id: value,
                    sub_category_id: "",
                    model_id: "",
                    sku: "",
                    slug: "",
                  }))
                }
                required
                disabled={mastersLoading}
              >
                <option value="">Select category</option>
                {categories.map((item, index) => {
                  const categoryId = getCategoryId(item);

                  return (
                    <option key={categoryId || `category-${index}`} value={categoryId}>
                      {getName(item)}
                    </option>
                  );
                })}
              </SelectField>

              <SelectField
                label="Sub Category"
                value={form.sub_category_id}
                onChange={(value) =>
                  setForm((prev) => ({
                    ...prev,
                    sub_category_id: value,
                    model_id: "",
                    sku: "",
                    slug: "",
                  }))
                }
                required
                disabled={!form.category_id || mastersLoading}
              >
                <option value="">Select sub category</option>
                {filteredSubCategories.map((item, index) => {
                  const subCategoryId = getSubCategoryId(item);

                  return (
                    <option
                      key={subCategoryId || `sub-category-${index}`}
                      value={subCategoryId}
                    >
                      {getName(item)}
                    </option>
                  );
                })}
              </SelectField>

              <SelectField
                label="Product Model"
                value={form.model_id}
                onChange={(value) =>
                  setForm((prev) => ({
                    ...prev,
                    model_id: value,
                    sku: "",
                    slug: "",
                  }))
                }
                required
                disabled={!form.category_id || mastersLoading}
              >
                <option value="">Select model</option>
                {filteredModels.map((item, index) => {
                  const modelId = getModelId(item);

                  return (
                    <option key={modelId || `model-${index}`} value={modelId}>
                      {getName(item)}
                    </option>
                  );
                })}
              </SelectField>

              <SelectField
                label="Product Type"
                value={form.product_type}
                onChange={handleProductTypeChange}
              >
                <option value="single">Single Product</option>
                <option value="variable">Variant Product</option>
              </SelectField>

              <TextField
                label="Product SKU"
                value={form.sku}
                onChange={handleSkuChange}
                required
                placeholder="Auto generated after category, sub category and model"
                hint="Auto"
              />

              <TextField
                label="Slug"
                value={form.slug}
                onChange={(value) => updateField("slug", value)}
                required
                placeholder="product-slug"
              />

              <SelectField
                label="Has Variants"
                value={String(form.has_variants)}
                onChange={handleHasVariantsChange}
              >
                <option value="0">No</option>
                <option value="1">Yes</option>
              </SelectField>

              <SelectField
                label="Currency"
                value={form.currency}
                onChange={(value) => updateField("currency", value)}
              >
                <option value="LKR">LKR</option>
                <option value="USD">USD</option>
                <option value="GBP">GBP</option>
              </SelectField>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-4">
              <TextareaField
                label="Short Description"
                value={form.short_description}
                onChange={(value) => updateField("short_description", value)}
                rows={2}
                placeholder="Short product note..."
              />

              <TextareaField
                label="Description"
                value={form.description}
                onChange={(value) => updateField("description", value)}
                rows={5}
                placeholder="Full product description..."
              />
            </div>

            <div className="mt-5 rounded-2xl border border-slate-800 bg-[#070b16] p-4">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-black text-white">Product Images</p>
                  <p className="mt-1 text-xs text-slate-500">Hover image box to upload image or add existing media URL.</p>
                </div>
                <span className="rounded-full border border-slate-700 px-3 py-1 text-[11px] font-bold text-slate-400">
                  {pendingImages.length} selected
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
                {[...pendingImages, { id: "add-box", type: "add" }].slice(0, 10).map((item, index) => (
                  <div
                    key={item.id}
                    className="group relative flex aspect-square items-center justify-center overflow-hidden rounded-2xl border border-dashed border-slate-700 bg-[#0b1220]"
                  >
                    {item.type === "add" ? (
                      <div className="text-center text-slate-500">
                        <ImagePlus className="mx-auto mb-2" size={24} />
                        <p className="text-xs font-bold">Add Image</p>
                      </div>
                    ) : (
                      <img src={item.preview} alt="" className="h-full w-full object-contain bg-white" />
                    )}

                    {item.type !== "add" && (
                      <button
                        type="button"
                        onClick={() => removePendingImage(item.id)}
                        className="absolute right-2 top-2 hidden rounded-full bg-red-500 px-2 py-1 text-[10px] font-bold text-white group-hover:block"
                      >
                        Remove
                      </button>
                    )}

                    <div className="absolute inset-x-2 bottom-2 hidden overflow-hidden rounded-xl border border-slate-700 bg-slate-950/95 shadow-xl group-hover:block">
                      <label className="flex cursor-pointer items-center gap-2 px-3 py-2 text-[11px] font-bold text-slate-200 hover:bg-slate-800">
                        <UploadCloud size={13} /> Upload Image
                        <input type="file" accept="image/*" className="hidden" multiple onChange={(event) => addImageFiles(event.target.files)} />
                      </label>
                      <button
                        type="button"
                        onClick={addMediaUrl}
                        className="flex w-full items-center gap-2 border-t border-slate-800 px-3 py-2 text-left text-[11px] font-bold text-slate-200 hover:bg-slate-800"
                      >
                        <ImagePlus size={13} /> Media Center / Existing URL
                      </button>
                    </div>

                    {index === 0 && item.type !== "add" && (
                      <span className="absolute left-2 top-2 rounded-full bg-orange-500 px-2 py-1 text-[10px] font-black text-white">Main</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="flex flex-col-reverse gap-2 border-t border-slate-800 bg-[#09101d] px-4 py-4 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={() => navigate("/product/local-products")}
              className="rounded-xl border border-slate-700 bg-[#0b1220] px-5 py-2.5 text-sm font-bold text-slate-300 transition hover:border-slate-500 hover:text-white"
            >
              Cancel
            </button>

            <button
              disabled={saving || mastersLoading}
              type="submit"
              className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl bg-orange-500 px-5 py-2.5 text-sm font-black text-white transition hover:bg-orange-400 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
              {saving ? "Saving..." : "Create Product"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
