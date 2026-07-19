import { useEffect, useMemo, useState } from "react";
import { RefreshCw, Save } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import localProductsApi from "../../../../../config/sub_api/product_management_api/local_products_api";
import { getStoredUser } from "../../../../../config/auth";
import { useToast } from "../../../../../components/common/toast/ToastProvider";
import Loader from "../../../../../components/common/Loader";
import {
  generateVariantSku,
  getErrorMessage,
  getName,
  normalizeList,
} from "../../utils/productSku";
import {
  getCategoryId,
  getModelId,
  getRecordId,
  getSubCategoryId,
} from "../utils/variantPageHelpers";
import VariantPageLayout from "./VariantPageLayout";

function getCurrentUserId() {
  const user = getStoredUser?.();
  return user?.id || user?.user_id || user?.user_uid || 1;
}

function unwrapOne(response) {
  const data = response?.data?.data ?? response?.data ?? response;
  if (Array.isArray(data)) return data[0] || null;
  return data || null;
}

function rowBelongsToProduct(row, productId) {
  const possibleIds = [row?.product_id, row?.local_product_id, row?.parent_product_id].filter(
    (value) => value !== undefined && value !== null && value !== ""
  );

  if (!possibleIds.length) return true;
  return possibleIds.some((value) => String(value) === String(productId));
}

function buildVariantTitle(product, colour, size) {
  const colourName = getName(colour, "colour") || colour?.colour || colour?.color || "Variant";
  const sizeName = getName(size, "size");
  const productTitle = product?.title || product?.name || product?.product_name || "Product";
  return sizeName ? `${productTitle} - ${colourName} - ${sizeName}` : `${productTitle} - ${colourName}`;
}

export default function VariantBasicPage() {
  const { productId, variantId } = useParams();
  const navigate = useNavigate();
  const showToast = useToast();
  const isCreate = !variantId;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [product, setProduct] = useState(null);
  const [colours, setColours] = useState([]);
  const [sizes, setSizes] = useState([]);
  const [categories, setCategories] = useState([]);
  const [subCategories, setSubCategories] = useState([]);
  const [models, setModels] = useState([]);
  const [form, setForm] = useState({
    id: "",
    colour_id: "",
    colour_name: "",
    size_id: "",
    size_name: "",
    variant_name: "",
    variant_sku: "",
    status: "active",
  });

  const selectedCategory = useMemo(
    () => categories.find((item) => String(item.id) === String(getCategoryId(product))),
    [categories, product]
  );

  const selectedSubCategory = useMemo(
    () => subCategories.find((item) => String(item.id) === String(getSubCategoryId(product))),
    [subCategories, product]
  );

  const selectedModel = useMemo(
    () => models.find((item) => String(item.id) === String(getModelId(product))),
    [models, product]
  );

  const selectedColour = useMemo(
    () => colours.find((item) => String(item.id) === String(form.colour_id)),
    [colours, form.colour_id]
  );

  const selectedSize = useMemo(
    () => sizes.find((item) => String(item.id) === String(form.size_id)),
    [sizes, form.size_id]
  );

  async function loadData() {
    setLoading(true);

    try {
      const [productRes, colourRes, sizeRes, categoryRes, subCategoryRes, modelRes] = await Promise.all([
        localProductsApi.getProductById(productId),
        localProductsApi.getColours().catch(() => []),
        localProductsApi.getSizes().catch(() => []),
        localProductsApi.getCategories({ limit: 100 }).catch(() => []),
        localProductsApi.getSubCategories({ limit: 500 }).catch(() => []),
        localProductsApi.getProductModels({ limit: 1000 }).catch(() => []),
      ]);

      setProduct(unwrapOne(productRes));
      setColours(normalizeList(colourRes));
      setSizes(normalizeList(sizeRes));
      setCategories(normalizeList(categoryRes));
      setSubCategories(normalizeList(subCategoryRes));
      setModels(normalizeList(modelRes));

      if (!isCreate) {
        const variantRes = await localProductsApi.getVariants({ product_id: productId });
        const variants = normalizeList(variantRes).filter((item) =>
          rowBelongsToProduct(item, productId)
        );
        const variant = variants.find(
          (item) => String(getRecordId(item)) === String(variantId)
        );

        if (variant) {
          setForm({
            id: getRecordId(variant),
            colour_id: variant.colour_id || "",
            colour_name: variant.colour_name || "",
            size_id: variant.size_id || "",
            size_name: variant.size_name || "",
            variant_name: variant.variant_name || "",
            variant_sku: variant.variant_sku || variant.sku || "",
            status: variant.status || "active",
          });
        }
      }
    } catch (error) {
      alert(getErrorMessage(error, "Unable to load variant."));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productId, variantId]);

  function generateSku(colourId = form.colour_id, sizeId = form.size_id) {
    const colour = colours.find((item) => String(item.id) === String(colourId));
    const size = sizes.find((item) => String(item.id) === String(sizeId));

    return generateVariantSku({
      category: selectedCategory,
      subCategory: selectedSubCategory,
      model: selectedModel,
      colour,
      size,
    });
  }

  function handleColourChange(value) {
    const colour = colours.find((item) => String(item.id) === String(value));

    setForm((prev) => ({
      ...prev,
      colour_id: value,
      colour_name: getName(colour) || prev.colour_name,
      variant_name: prev.variant_name || buildVariantTitle(product, colour, selectedSize),
      variant_sku: prev.variant_sku || generateSku(value, prev.size_id),
    }));
  }

  function handleSizeChange(value) {
    const size = sizes.find((item) => String(item.id) === String(value));

    setForm((prev) => ({
      ...prev,
      size_id: value,
      size_name: getName(size, "size") || prev.size_name,
      variant_name: prev.variant_name || buildVariantTitle(product, selectedColour, size),
      variant_sku: prev.variant_sku || generateSku(prev.colour_id, value),
    }));
  }

  async function handleSubmit(event) {
    event.preventDefault();

    const sku = String(form.variant_sku || "").trim();

    if (!sku) {
      alert("Variant SKU is required.");
      return;
    }

    setSaving(true);

    try {
      const payload = {
        product_id: productId,
        variant_sku: sku,
        variant_name: form.variant_name || buildVariantTitle(product, selectedColour, selectedSize),
        colour_id: form.colour_id || null,
        colour_name: form.colour_name || getName(selectedColour) || "",
        size_id: form.size_id || null,
        size_name: form.size_name || getName(selectedSize, "size") || "",
        status: form.status || "active",
        created_by: getCurrentUserId(),
        updated_by: getCurrentUserId(),
      };

      if (isCreate) {
        const created = await localProductsApi.createVariant(payload);
        const createdData = created?.data?.data ?? created?.data ?? created;
        const newId =
          createdData?.id ?? createdData?.insertId ?? createdData?.variant_id;

        if (!newId) {
          alert("Variant created, but ID was not returned.");
          navigate(`/product/local-products/edit/${productId}/variants`);
          return;
        }

        showToast("Variant created successfully.");
        navigate(`/product/local-products/edit/${productId}/variants`);
        return;
      }

      await localProductsApi.updateVariant(form.id, payload);
      showToast("Variant saved successfully.");
      await loadData();
    } catch (error) {
      alert(getErrorMessage(error, "Unable to save variant."));
    } finally {
      setSaving(false);
    }
  }

  return (
    <VariantPageLayout
      productId={productId}
      variantId={variantId}
      active="basic"
      product={product}
      variant={form}
    >
      <form
        onSubmit={handleSubmit}
        className="border border-slate-800 bg-[#0b1220] text-slate-100"
      >
        <div className="border-b border-slate-800 bg-[#07101f] px-4 py-3">
          <p className="text-sm font-black text-white">
            {isCreate ? "Create Variant" : "Variant Basic Details"}
          </p>
        </div>

        {loading ? (
          <Loader label="Loading variant..." minHeight="280px" />
        ) : (
          <div className="grid grid-cols-1 gap-4 p-4 md:grid-cols-2">
            <label className="block">
              <span className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-400">
                Colour
              </span>
              <select
                value={form.colour_id}
                onChange={(event) => handleColourChange(event.target.value)}
                className="h-11 w-full border border-slate-700 bg-[#0a101d] px-3 text-sm font-semibold text-slate-100 outline-none focus:border-orange-400"
              >
                <option value="">Select colour</option>
                {colours.map((item) => (
                  <option key={item.id} value={item.id}>
                    {getName(item)}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-400">
                Size
              </span>
              <select
                value={form.size_id}
                onChange={(event) => handleSizeChange(event.target.value)}
                className="h-11 w-full border border-slate-700 bg-[#0a101d] px-3 text-sm font-semibold text-slate-100 outline-none focus:border-orange-400"
              >
                <option value="">Select size</option>
                {sizes.map((item) => (
                  <option key={item.id} value={item.id}>
                    {getName(item, "size")}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-400">
                Variant Title
              </span>
              <input
                value={form.variant_name}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, variant_name: event.target.value }))
                }
                placeholder="Example: LED Bulb 10W - Blue"
                className="h-11 w-full border border-slate-700 bg-[#0a101d] px-3 text-sm font-semibold text-slate-100 outline-none placeholder:text-slate-600 focus:border-orange-400"
              />
            </label>

            <div className="grid grid-cols-[1fr_auto] gap-2">
              <label className="block">
                <span className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-400">
                  Variant SKU
                </span>
                <input
                  value={form.variant_sku}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, variant_sku: event.target.value }))
                  }
                  required
                  placeholder="Auto SKU"
                  className="h-11 w-full border border-slate-700 bg-[#0a101d] px-3 text-sm font-semibold text-slate-100 outline-none placeholder:text-slate-600 focus:border-orange-400"
                />
              </label>

              <div className="flex items-end">
                <button
                  type="button"
                  onClick={() =>
                    setForm((prev) => ({ ...prev, variant_sku: generateSku() }))
                  }
                  className="h-11 cursor-pointer border border-slate-700 bg-slate-800/60 px-4 text-[12px] font-semibold text-slate-200 hover:bg-slate-800"
                >
                  SKU
                </button>
              </div>
            </div>

            <label className="block">
              <span className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-400">
                Status
              </span>
              <select
                value={form.status}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, status: event.target.value }))
                }
                className="h-11 w-full border border-slate-700 bg-[#0a101d] px-3 text-sm font-semibold text-slate-100 outline-none focus:border-orange-400"
              >
                <option value="active">active</option>
                <option value="inactive">inactive</option>
                <option value="draft">draft</option>
              </select>
            </label>
          </div>
        )}

        <div className="flex justify-end border-t border-slate-800 bg-[#07101f] px-4 py-3">
          <button
            disabled={saving || loading}
            type="submit"
            className="inline-flex h-9 cursor-pointer items-center gap-1.5 bg-orange-500 px-4 text-[12px] font-black text-white transition hover:bg-orange-400 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving ? (
              <RefreshCw size={14} className="animate-spin" />
            ) : (
              <Save size={14} />
            )}
            {saving ? "Saving..." : isCreate ? "Create Variant" : "Save Variant"}
          </button>
        </div>
      </form>
    </VariantPageLayout>
  );
}
