import { useEffect, useMemo, useState } from "react";
import { Plus } from "lucide-react";
import { useParams } from "react-router-dom";
import localProductsApi from "../../../../config/sub_api/product_management_api/local_products_api";
import ProductPageLayout from "./../components/ProductPageLayout";
import {
  generateVariantSku,
  getErrorMessage,
  getName,
  normalizeList,
} from "./../utils/productSku";
import { EMPTY_VARIANT } from "./constants/variantImageConstants";
import ImageUploadPopup from "./components/variants/ImageUploadPopup";
import VariantModal from "./components/variants/VariantModal";
import VariantTable from "./components/variants/VariantTable";
import {
  cleanNumber,
  getCategoryId,
  getModelId,
  getRecordId,
  getSubCategoryId,
  getVariantSku,
  imageBelongsToVariant,
  rowBelongsToProduct,
  splitImages,
  unwrapOne,
  validateImage,
} from "./utils/variantPageHelpers";

export default function LocalProductVariantsPage() {
  const { productId } = useParams();

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savingImages, setSavingImages] = useState(false);

  const [product, setProduct] = useState(null);
  const [categories, setCategories] = useState([]);
  const [subCategories, setSubCategories] = useState([]);
  const [models, setModels] = useState([]);
  const [colours, setColours] = useState([]);
  const [variants, setVariants] = useState([]);
  const [images, setImages] = useState([]);

  const [formOpen, setFormOpen] = useState(false);
  const [imagePopup, setImagePopup] = useState(null);
  const [form, setForm] = useState({
    ...EMPTY_VARIANT,
    product_id: productId,
  });

  const selectedCategory = useMemo(() => {
    const categoryId = getCategoryId(product);
    return categories.find((item) => String(item.id) === String(categoryId));
  }, [categories, product]);

  const selectedSubCategory = useMemo(() => {
    const subCategoryId = getSubCategoryId(product);

    return subCategories.find(
      (item) => String(item.id) === String(subCategoryId)
    );
  }, [subCategories, product]);

  const selectedModel = useMemo(() => {
    const modelId = getModelId(product);
    return models.find((item) => String(item.id) === String(modelId));
  }, [models, product]);

  const selectedColour = useMemo(() => {
    return colours.find((item) => String(item.id) === String(form.colour_id));
  }, [colours, form.colour_id]);

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productId]);

  async function loadData() {
    setLoading(true);

    try {
      const [
        productRes,
        variantRes,
        imageRes,
        colourRes,
        categoryRes,
        subCategoryRes,
        modelRes,
      ] = await Promise.all([
        localProductsApi.getProductById(productId),
        localProductsApi.getVariants({ product_id: productId }).catch(() => ({
          data: [],
        })),
        localProductsApi.getImages().catch(() => ({ data: [] })),
        localProductsApi.getColours().catch(() => []),
        localProductsApi.getCategories().catch(() => []),
        localProductsApi.getSubCategories().catch(() => []),
        localProductsApi.getProductModels().catch(() => []),
      ]);

      const productData = unwrapOne(productRes);
      const variantRows = normalizeList(variantRes).filter((item) =>
        rowBelongsToProduct(item, productId)
      );
      const imageRows = normalizeList(imageRes).filter(
        (item) => String(item.product_id) === String(productId)
      );

      setProduct(productData);
      setVariants(variantRows);
      setImages(imageRows);
      setColours(normalizeList(colourRes));
      setCategories(normalizeList(categoryRes));
      setSubCategories(normalizeList(subCategoryRes));
      setModels(normalizeList(modelRes));
    } catch (error) {
      alert(getErrorMessage(error, "Unable to load variants."));
    } finally {
      setLoading(false);
    }
  }

  function resetForm() {
    setForm({
      ...EMPTY_VARIANT,
      product_id: productId,
    });
  }

  function openAddForm() {
    resetForm();
    setFormOpen(true);
  }

  function openEditForm(variant) {
    setForm({
      ...EMPTY_VARIANT,
      ...variant,
      product_id: productId,
      id: getRecordId(variant),
      colour_id: variant.colour_id || variant.product_colour_id || "",
      colour: variant.colour || variant.color || "",
      price:
        variant.price ??
        variant.main_price ??
        variant.selling_price ??
        variant.sale_price ??
        0,
      stock_qty:
        variant.stock_qty ??
        variant.current_stock ??
        variant.quantity ??
        variant.available_stock ??
        0,
    });

    setFormOpen(true);
  }

  function updateField(name, value) {
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  function generateSkuForColour(colourId = form.colour_id) {
    const colour = colours.find((item) => String(item.id) === String(colourId));

    const sku = generateVariantSku({
      category: selectedCategory,
      subCategory: selectedSubCategory,
      model: selectedModel,
      colour,
    });

    setForm((prev) => ({
      ...prev,
      colour_id: colourId,
      colour: getName(colour) || prev.colour,
      variant_sku: sku,
    }));
  }

  function handleColourChange(value) {
    const colour = colours.find((item) => String(item.id) === String(value));

    setForm((prev) => ({
      ...prev,
      colour_id: value,
      colour: getName(colour),
    }));

    if (value) {
      const sku = generateVariantSku({
        category: selectedCategory,
        subCategory: selectedSubCategory,
        model: selectedModel,
        colour,
      });

      setForm((prev) => ({
        ...prev,
        colour_id: value,
        colour: getName(colour),
        variant_sku: sku,
      }));
    }
  }

  async function handleSave(event) {
    event.preventDefault();

    if (!String(form.variant_sku || "").trim()) {
      alert("Variant SKU is required.");
      return;
    }

    setSaving(true);

    try {
      const payload = {
        ...form,
        product_id: productId,
        variant_sku: String(form.variant_sku || "").trim(),
        colour_id: form.colour_id || null,
        colour: form.colour || getName(selectedColour) || "",
        price: cleanNumber(form.price),
        main_price: cleanNumber(form.price),
        selling_price: cleanNumber(form.price),
        cost_price: cleanNumber(form.cost_price),
        sale_price: cleanNumber(form.sale_price),
        stock_qty: cleanNumber(form.stock_qty),
        status: form.status || "active",
        updated_by: 1,
      };

      if (form.id) {
        await localProductsApi.updateVariant(form.id, payload);
      } else {
        await localProductsApi.createVariant(payload);
      }

      await localProductsApi
        .updateProduct(productId, {
          ...product,
          has_variants: 1,
          product_type: "variable",
          updated_by: 1,
        })
        .catch(() => null);

      resetForm();
      setFormOpen(false);
      await loadData();
    } catch (error) {
      alert(getErrorMessage(error, "Unable to save variant."));
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(variant) {
    const variantId = getRecordId(variant);
    const confirmed = window.confirm(`Delete variant ${getVariantSku(variant)}?`);

    if (!confirmed) return;

    try {
      await localProductsApi.deleteVariant(variantId);
      await loadData();
    } catch (error) {
      alert(getErrorMessage(error, "Unable to delete variant."));
    }
  }

  function getVariantImageSet(variant) {
    const variantId = getRecordId(variant);

    const variantImages = images.filter(
      (image) =>
        String(image.product_id) === String(productId) &&
        imageBelongsToVariant(image, variantId)
    );

    return splitImages(variantImages);
  }

  async function uploadImageOnly({
    file,
    isMain,
    sortOrder,
    existingImage = null,
    variantId = "",
  }) {
    if (!file) return;

    await validateImage(file);

    const formData = new FormData();
    formData.append("image", file);
    formData.append("product_id", productId);
    formData.append("variant_id", String(variantId));
    formData.append("product_variant_id", String(variantId));
    formData.append("is_main", isMain ? "1" : "0");
    formData.append("sort_order", String(sortOrder));
    formData.append("image_type", isMain ? "main" : "sub");
    formData.append("created_by", "1");
    formData.append("updated_by", "1");

    if (existingImage?.id) {
      await localProductsApi.updateImage(existingImage.id, formData);
    } else {
      await localProductsApi.uploadImage(formData);
    }
  }

  async function savePopupImages({ mode, mainFile, extraFiles, removals }) {
    if (!imagePopup?.variantId) return;

    setSavingImages(true);

    try {
      for (const image of removals || []) {
        if (image?.id) {
          await localProductsApi.deleteImage(image.id);
        }
      }

      if (mode === "main" && mainFile) {
        await uploadImageOnly({
          file: mainFile,
          isMain: true,
          sortOrder: 0,
          existingImage: imagePopup.imageSet?.main,
          variantId: imagePopup.variantId,
        });
      }

      if (mode === "sub") {
        for (const [indexText, file] of Object.entries(extraFiles || {})) {
          const index = Number(indexText);

          await uploadImageOnly({
            file,
            isMain: false,
            sortOrder: index + 1,
            existingImage: imagePopup.imageSet?.extras?.[index],
            variantId: imagePopup.variantId,
          });
        }
      }

      setImagePopup(null);
      await loadData();
    } catch (error) {
      alert(getErrorMessage(error, error.message || "Unable to save images."));
    } finally {
      setSavingImages(false);
    }
  }

  return (
    <ProductPageLayout productId={productId} active="variants" product={product}>
      <div className="border border-slate-800 bg-[#0b1220] text-slate-100">
        <div className="flex items-center justify-end border-b border-slate-800 bg-[#07101f] px-4 py-2">
          <button
            type="button"
            onClick={openAddForm}
            className="inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-md bg-orange-500 px-3 text-xs font-black text-white shadow-sm shadow-orange-500/20 transition hover:bg-orange-400"
          >
            <Plus size={14} />
            Add Variant
          </button>
        </div>

        <VariantTable
          loading={loading}
          variants={variants}
          getVariantImageSet={getVariantImageSet}
          onEdit={openEditForm}
          onDelete={handleDelete}
          onOpenImagePopup={setImagePopup}
        />
      </div>

      <VariantModal
        open={formOpen}
        form={form}
        saving={saving}
        loading={loading}
        colours={colours}
        onClose={() => {
          setFormOpen(false);
          resetForm();
        }}
        onSubmit={handleSave}
        onChange={updateField}
        onColourChange={handleColourChange}
        onGenerateSku={() => generateSkuForColour()}
      />

      {imagePopup ? (
        <ImageUploadPopup
          mode={imagePopup.mode}
          title={imagePopup.title}
          mainImage={imagePopup.imageSet?.main}
          extraImages={imagePopup.imageSet?.extras || []}
          saving={savingImages}
          onClose={() => {
            if (!savingImages) setImagePopup(null);
          }}
          onSave={savePopupImages}
        />
      ) : null}
    </ProductPageLayout>
  );
}
