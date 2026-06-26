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

const LKR = "LKR";

const REMOVE_PRICE_FIELDS = [
  "price",
  "main_price",
  "regular_price",
  "cost_price",
  "start_date",
  "end_date",
];

function removeUnwantedPriceFields(data = {}) {
  const cleaned = { ...data };

  REMOVE_PRICE_FIELDS.forEach((field) => {
    delete cleaned[field];
  });

  return cleaned;
}

function safeText(value, fallback = "-") {
  if (value === null || value === undefined || value === "") return fallback;

  if (Array.isArray(value)) {
    return value.map((item) => safeText(item, fallback)).join(", ");
  }

  if (typeof value === "object") {
    return safeText(
      value.variant_sku ??
        value.sku ??
        value.product_sku ??
        value.name ??
        value.title ??
        value.id,
      fallback
    );
  }

  return String(value);
}

function getVariantRecordId(row) {
  return (
    row?.id ??
    row?.variant_id ??
    row?.product_variant_id ??
    row?.local_variant_id ??
    row?.variantId ??
    ""
  );
}

function getVariantIdFromPrice(row) {
  return (
    row?.variant_id ??
    row?.product_variant_id ??
    row?.local_variant_id ??
    row?.variantId ??
    ""
  );
}

function getPriceRowId(row) {
  return row?.id ?? row?.price_id ?? row?.product_price_id ?? "";
}

function getPriceSku(row) {
  return (
    row?.variant_sku ??
    row?.sku ??
    row?.product_sku ??
    row?.seller_sku ??
    row?.local_sku ??
    ""
  );
}

function getSellingPrice(row) {
  return (
    row?.selling_price ??
    row?.sale_price ??
    row?.price ??
    row?.main_price ??
    row?.product_selling_price ??
    row?.variant_selling_price ??
    0
  );
}

function findPriceForVariant(priceRows, variant) {
  const variantId = getVariantRecordId(variant);
  const variantSku = getVariantSku(variant) || getPriceSku(variant);

  return (
    priceRows.find(
      (price) =>
        String(getVariantIdFromPrice(price)) === String(variantId) &&
        String(variantId)
    ) ||
    priceRows.find(
      (price) =>
        String(getPriceSku(price)).trim() &&
        String(getPriceSku(price)).trim() === String(variantSku).trim()
    ) ||
    null
  );
}

function mergeVariantWithSellingPrice(variant, priceRows) {
  const priceRow = findPriceForVariant(priceRows, variant);
  const sellingPrice =
    getSellingPrice(variant) || getSellingPrice(priceRow) || "";

  return removeUnwantedPriceFields({
    ...variant,
    selling_price: sellingPrice,
    price_id: getPriceRowId(priceRow),
  });
}

function extractCreatedId(response) {
  const data = response?.data?.data ?? response?.data ?? response;

  if (Array.isArray(data)) {
    return data[0]?.id ?? data[0]?.insertId ?? "";
  }

  return data?.id ?? data?.insertId ?? data?.variant_id ?? "";
}

function getEmptyVariant(productId) {
  return {
    ...removeUnwantedPriceFields(EMPTY_VARIANT),
    product_id: productId,
    selling_price: "",
    stock_qty: 0,
  };
}

export default function LocalProductVariantsPage() {
  const { productId } = useParams();

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savingImages, setSavingImages] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");

  const [product, setProduct] = useState(null);
  const [categories, setCategories] = useState([]);
  const [subCategories, setSubCategories] = useState([]);
  const [models, setModels] = useState([]);
  const [colours, setColours] = useState([]);
  const [variants, setVariants] = useState([]);
  const [priceRows, setPriceRows] = useState([]);
  const [images, setImages] = useState([]);

  const [formOpen, setFormOpen] = useState(false);
  const [imagePopup, setImagePopup] = useState(null);
  const [form, setForm] = useState(() => getEmptyVariant(productId));

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
    resetForm();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productId]);

  function showSuccessMessage(message) {
    setSuccessMessage(message);

    window.setTimeout(() => {
      setSuccessMessage("");
    }, 1800);
  }

  async function loadData() {
    setLoading(true);

    try {
      const [
        productRes,
        variantRes,
        priceRes,
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

        localProductsApi.getPrices({ product_id: productId }).catch(() => ({
          data: [],
        })),

        localProductsApi.getImages().catch(() => ({ data: [] })),
        localProductsApi.getColours().catch(() => []),
        localProductsApi.getCategories().catch(() => []),
        localProductsApi.getSubCategories().catch(() => []),
        localProductsApi.getProductModels().catch(() => []),
      ]);

      const productData = unwrapOne(productRes);

      const rawPriceRows = normalizeList(priceRes).filter((item) =>
        rowBelongsToProduct(item, productId)
      );

      const variantRows = normalizeList(variantRes)
        .filter((item) => rowBelongsToProduct(item, productId))
        .map((item) => mergeVariantWithSellingPrice(item, rawPriceRows));

      const imageRows = normalizeList(imageRes).filter(
        (item) => String(item.product_id) === String(productId)
      );

      setProduct(productData);
      setVariants(variantRows);
      setPriceRows(rawPriceRows);
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
    setForm(getEmptyVariant(productId));
  }

  function openAddForm() {
    resetForm();
    setFormOpen(true);
  }

  function openEditForm(variant) {
    const priceRow = findPriceForVariant(priceRows, variant);
    const cleanVariant = removeUnwantedPriceFields(variant);

    setForm({
      ...getEmptyVariant(productId),
      ...cleanVariant,
      product_id: productId,
      id: getRecordId(variant),
      price_id: getPriceRowId(priceRow) || variant.price_id || "",
      colour_id: variant.colour_id || variant.product_colour_id || "",
      colour: safeText(variant.colour || variant.color || ""),
      selling_price: getSellingPrice(variant) || getSellingPrice(priceRow) || "",
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
    setForm((prev) => {
      const next = {
        ...prev,
        [name]: value,
      };

      return removeUnwantedPriceFields(next);
    });
  }

  function generateSkuForColour(colourId = form.colour_id) {
    const colour = colours.find((item) => String(item.id) === String(colourId));

    const sku = generateVariantSku({
      category: selectedCategory,
      subCategory: selectedSubCategory,
      model: selectedModel,
      colour,
    });

    setForm((prev) =>
      removeUnwantedPriceFields({
        ...prev,
        colour_id: colourId,
        colour: getName(colour) || prev.colour,
        variant_sku: sku,
      })
    );
  }

  function handleColourChange(value) {
    const colour = colours.find((item) => String(item.id) === String(value));

    const sku = value
      ? generateVariantSku({
          category: selectedCategory,
          subCategory: selectedSubCategory,
          model: selectedModel,
          colour,
        })
      : "";

    setForm((prev) =>
      removeUnwantedPriceFields({
        ...prev,
        colour_id: value,
        colour: getName(colour),
        variant_sku: sku || prev.variant_sku,
      })
    );
  }

  async function saveSellingPrice({
    variantId,
    variantSku,
    sellingPrice,
    priceId,
  }) {
    const cleanPrice = cleanNumber(sellingPrice);

    const pricePayload = {
      product_id: productId,
      variant_id: variantId || null,
      product_variant_id: variantId || null,
      sku: variantSku,
      selling_price: cleanPrice,
      sale_price: cleanPrice,
      currency: LKR,
      status: "active",
      created_by: 1,
      updated_by: 1,
    };

    if (priceId) {
      return localProductsApi.updatePrice(priceId, pricePayload);
    }

    return localProductsApi.createPrice(pricePayload);
  }

  async function handleSave(event) {
    event.preventDefault();

    const safeForm = removeUnwantedPriceFields(form);
    const variantSku = String(safeForm.variant_sku || "").trim();

    if (!variantSku) {
      alert("Variant SKU is required.");
      return;
    }

    setSaving(true);

    try {
      const sellingPrice = cleanNumber(safeForm.selling_price);
      const stockQty = cleanNumber(safeForm.stock_qty);

      const payload = removeUnwantedPriceFields({
        ...safeForm,
        product_id: productId,
        variant_sku: variantSku,
        colour_id: safeForm.colour_id || null,
        colour: safeForm.colour || getName(selectedColour) || "",
        selling_price: sellingPrice,
        stock_qty: stockQty,
        status: safeForm.status || "active",
        updated_by: 1,
      });

      let savedVariantId = safeForm.id;

      if (safeForm.id) {
        await localProductsApi.updateVariant(safeForm.id, payload);
      } else {
        const createdVariant = await localProductsApi.createVariant(payload);
        savedVariantId = extractCreatedId(createdVariant) || safeForm.id;
      }

      if (savedVariantId) {
        await saveSellingPrice({
          variantId: savedVariantId,
          variantSku,
          sellingPrice,
          priceId: safeForm.price_id,
        });
      }

      setVariants((prev) => {
        const found = prev.some(
          (item) => String(getRecordId(item)) === String(savedVariantId)
        );

        if (found) {
          return prev.map((item) => {
            if (String(getRecordId(item)) !== String(savedVariantId)) {
              return item;
            }

            return {
              ...item,
              ...payload,
              id: savedVariantId,
              selling_price: sellingPrice,
              sale_price: sellingPrice,
              stock_qty: stockQty,
            };
          });
        }

        return [
          ...prev,
          {
            ...payload,
            id: savedVariantId,
            selling_price: sellingPrice,
            sale_price: sellingPrice,
            stock_qty: stockQty,
          },
        ];
      });

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
      showSuccessMessage("Selling price updated successfully.");
      await loadData();
    } catch (error) {
      alert(getErrorMessage(error, "Unable to save variant selling price."));
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
      showSuccessMessage("Variant deleted successfully.");
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
      showSuccessMessage("Variant images updated successfully.");
      await loadData();
    } catch (error) {
      alert(getErrorMessage(error, error.message || "Unable to save images."));
    } finally {
      setSavingImages(false);
    }
  }

  return (
    <ProductPageLayout productId={productId} active="variants" product={product}>
      {successMessage ? (
        <div className="fixed right-5 top-5 z-[9999] rounded-lg border border-emerald-500/40 bg-emerald-600 px-4 py-2 text-sm font-black text-white shadow-xl shadow-black/30">
          {successMessage}
        </div>
      ) : null}

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