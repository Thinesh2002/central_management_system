import { useCallback, useEffect, useMemo, useState } from "react";
import localProductsApi from "../../../../../config/sub_api/product_management_api/local_products_api";
import {
  clean,
  findMasterName,
  getColourId,
  getColourName,
  getInventorySummary,
  getProductId,
  getVariantId,
  getVariantOnlyId,
  getVariantSku,
  imageBelongsToVariant,
  isProductOnlyImage,
  normalizeArray,
  normalizeObject,
  sameProduct,
  uniqueRows,
  valueOf,
} from "../utils/localProductViewHelpers";

async function safeCall(fn, fallback = []) {
  try {
    if (typeof fn !== "function") return fallback;
    return await fn();
  } catch (error) {
    const status = error?.response?.status;

    if (status === 404) return fallback;

    console.warn("[LOCAL_PRODUCT_VIEW_FETCH_WARNING]", error?.message || error);
    return fallback;
  }
}

function getVariantUniqueKey(variant = {}, index = 0) {
  const variantId = clean(getVariantOnlyId(variant) || getVariantId(variant));
  if (variantId) return `id-${variantId}`;

  const sku = clean(getVariantSku(variant));
  if (sku) return `sku-${sku.toLowerCase()}`;

  const colourId = clean(getColourId(variant));
  if (colourId) return `colour-id-${colourId}`;

  const colourName = clean(getColourName(variant));
  if (colourName) return `colour-${colourName.toLowerCase()}`;

  return `row-${index}`;
}

function getEmbeddedVariants(productData = {}) {
  return normalizeArray(
    productData?.variants ||
      productData?.product_variants ||
      productData?.variant_rows ||
      productData?.variations ||
      productData?.product_variations ||
      productData?.variation_rows
  );
}

function getProductSku(product = {}) {
  return clean(
    product?.sku ||
      product?.product_sku ||
      product?.local_sku ||
      product?.seller_sku ||
      product?.variant_sku ||
      ""
  );
}

function getInventorySku(row = {}) {
  return clean(
    row?.sku ||
      row?.product_sku ||
      row?.variant_sku ||
      row?.local_sku ||
      row?.seller_sku ||
      ""
  );
}

function sameSku(a, b) {
  const left = clean(a).toLowerCase();
  const right = clean(b).toLowerCase();
  return Boolean(left && right && left === right);
}

function inventoryBelongsToVariantBySku(inventory = {}, variant = {}) {
  return sameSku(getInventorySku(inventory), getVariantSku(variant));
}

function uniqueSkuList(values = []) {
  return Array.from(
    new Set(
      values
        .map((value) => clean(value))
        .filter(Boolean)
        .map((value) => value.trim())
    )
  );
}

async function getVariantsResponse(realProductId, productData) {
  const embeddedVariants = getEmbeddedVariants(productData);

  if (embeddedVariants.length > 0) {
    return embeddedVariants;
  }

  if (typeof localProductsApi.getVariants === "function") {
    return safeCall(() =>
      localProductsApi.getVariants({
        product_id: realProductId,
        local_product_id: realProductId,
        limit: 500,
      })
    );
  }

  if (typeof localProductsApi.getProductVariants === "function") {
    return safeCall(() =>
      localProductsApi.getProductVariants({
        product_id: realProductId,
        local_product_id: realProductId,
        limit: 500,
      })
    );
  }

  return [];
}

async function getInventoryRowsBySkus(skus = []) {
  const cleanSkus = uniqueSkuList(skus);

  if (!cleanSkus.length) return [];

  const responses = await Promise.all(
    cleanSkus.map((sku) =>
      safeCall(() =>
        localProductsApi.getInventory({
          sku,
          limit: 500,
        })
      )
    )
  );

  return uniqueRows(
    responses.flatMap((response) => normalizeArray(response)),
    (row, index) => {
      const id = clean(row?.id);
      if (id) return `id-${id}`;

      const sku = getInventorySku(row);
      if (sku) return `sku-${sku.toLowerCase()}`;

      return `row-${index}`;
    }
  );
}

export default function useLocalProductView(productId) {
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const loadProduct = useCallback(async () => {
    if (!productId) {
      setProduct(null);
      setErrorMessage("Product ID is missing.");
      return;
    }

    setLoading(true);
    setErrorMessage("");

    try {
      const productResponse = await localProductsApi.getProductById(productId);
      const productData = normalizeObject(productResponse);

      if (!productData) {
        setProduct(null);
        setErrorMessage("Product not found.");
        return;
      }

      const realProductId = getProductId(productData) || productId;
      const productSku = getProductSku(productData);

      const [
        imagesResponse,
        variantsResponse,
        attributesResponse,
        categoriesResponse,
        subCategoriesResponse,
        modelsResponse,
        coloursResponse,
      ] = await Promise.all([
        safeCall(() =>
          localProductsApi.getImages({
            product_id: realProductId,
            local_product_id: realProductId,
            limit: 500,
          })
        ),

        getVariantsResponse(realProductId, productData),

        safeCall(() =>
          localProductsApi.getProductAttributeValues({
            product_id: realProductId,
            local_product_id: realProductId,
            limit: 500,
          })
        ),

        safeCall(() => localProductsApi.getCategories({ limit: 1000 })),
        safeCall(() => localProductsApi.getSubCategories({ limit: 1000 })),
        safeCall(() => localProductsApi.getProductModels({ limit: 1000 })),
        safeCall(() => localProductsApi.getColours({ limit: 1000 })),
      ]);

      const imageRows = normalizeArray(imagesResponse).filter((row) =>
        sameProduct(row, realProductId)
      );

      const categories = normalizeArray(categoriesResponse);
      const subCategories = normalizeArray(subCategoriesResponse);
      const models = normalizeArray(modelsResponse);
      const colours = normalizeArray(coloursResponse);

      const rawVariants = normalizeArray(variantsResponse).filter((row) =>
        sameProduct(row, realProductId)
      );

      const uniqueVariants = uniqueRows(rawVariants, getVariantUniqueKey);

      const variantSkus = uniqueVariants
        .map((variant) => getVariantSku(variant))
        .filter(Boolean);

      const hasVariants = variantSkus.length > 0;
      const inventoryFetchSkus = hasVariants ? variantSkus : [productSku];

      const inventoryRows = await getInventoryRowsBySkus(inventoryFetchSkus);

      const inventorySummary = getInventorySummary(inventoryRows);

      const variants = uniqueVariants.map((variant) => {
        const variantImages = imageRows.filter((image) =>
          imageBelongsToVariant(image, variant)
        );

        const variantInventoryRows = inventoryRows.filter((inventory) =>
          inventoryBelongsToVariantBySku(inventory, variant)
        );

        const variantInventorySummary =
          getInventorySummary(variantInventoryRows);

        const colourValue = valueOf(
          variant,
          [
            "colour_name",
            "color_name",
            "colour",
            "color",
            "colour_id",
            "color_id",
          ],
          ""
        );

        return {
          ...variant,

          product_variant_id: getVariantId(variant),
          variant_id: getVariantId(variant),
          variant_sku: getVariantSku(variant),

          colour_name: findMasterName(
            colours,
            ["id", "colour_id", "color_id"],
            colourValue
          ),

          images: variantImages,
          product_images: variantImages,
          variant_images: variantImages,

          inventory_rows: variantInventoryRows,
          inventory_summary: variantInventorySummary,

          stock_qty: variantInventorySummary.stock_qty,
          reserved_qty: variantInventorySummary.reserved_qty,
          available_qty: variantInventorySummary.available_qty,
          stock_status: variantInventorySummary.stock_status,
          is_out_of_stock: variantInventorySummary.is_out_of_stock,
        };
      });

      const productImages = imageRows.filter(isProductOnlyImage);

      const attributeValues = normalizeArray(attributesResponse).filter((row) =>
        sameProduct(row, realProductId)
      );

      const categoryValue = valueOf(
        productData,
        ["category_name", "category", "category_id", "product_category_id"],
        ""
      );

      const subCategoryValue = valueOf(
        productData,
        [
          "sub_category_name",
          "subcategory_name",
          "subCategoryName",
          "sub_category",
          "sub_category_id",
          "subcategory_id",
          "product_sub_category_id",
        ],
        ""
      );

      const modelValue = valueOf(
        productData,
        [
          "product_model_name",
          "model_name",
          "model",
          "model_id",
          "product_model_id",
        ],
        ""
      );

      const colourValue = valueOf(
        productData,
        [
          "colour_name",
          "color_name",
          "colour",
          "color",
          "colour_id",
          "color_id",
        ],
        ""
      );

      setProduct({
        ...productData,

        product_id: realProductId,
        local_product_id: realProductId,
        sku: productSku,

        category_name: findMasterName(
          categories,
          ["id", "category_id", "product_category_id"],
          categoryValue
        ),

        sub_category_name: findMasterName(
          subCategories,
          ["id", "sub_category_id", "subcategory_id", "product_sub_category_id"],
          subCategoryValue
        ),

        product_model_name: findMasterName(
          models,
          ["id", "model_id", "product_model_id"],
          modelValue
        ),

        colour_name: findMasterName(
          colours,
          ["id", "colour_id", "color_id"],
          colourValue
        ),

        images: productImages,
        product_images: productImages,
        image_rows: productImages,
        all_images: imageRows,

        variants,
        product_variants: variants,
        variant_rows: variants,
        variations: variants,
        product_variations: variants,
        variation_rows: variants,

        specifications: attributeValues,
        attribute_values: attributeValues,
        product_attribute_values: attributeValues,

        inventory_rows: inventoryRows,
        product_inventory: inventoryRows,
        inventory_summary: inventorySummary,

        stock_qty: inventorySummary.stock_qty,
        reserved_qty: inventorySummary.reserved_qty,
        available_qty: inventorySummary.available_qty,
        stock_status: inventorySummary.stock_status,
        is_out_of_stock: inventorySummary.is_out_of_stock,
      });
    } catch (error) {
      console.error("[LOCAL_PRODUCT_VIEW_ERROR]", error);

      setProduct(null);
      setErrorMessage(
        error?.response?.data?.message ||
          error?.message ||
          "Unable to load product details."
      );
    } finally {
      setLoading(false);
    }
  }, [productId]);

  useEffect(() => {
    loadProduct();
  }, [loadProduct]);

  return {
    product,
    loading,
    errorMessage,
    reload: loadProduct,
  };
}