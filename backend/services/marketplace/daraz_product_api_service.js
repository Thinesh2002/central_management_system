const { callDarazApi } = require("./daraz_api_service");

function escapeXml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

async function updateDarazPriceQuantity({
  account,
  credentials,
  itemId = null,
  skuId = null,
  sellerSku,
  price,
  salePrice = null,
  saleStartDate = null,
  saleEndDate = null,
  quantity,
}) {
  if (!sellerSku) {
    const error = new Error("Seller SKU is required to update Daraz price/quantity.");
    error.statusCode = 400;
    throw error;
  }

  const skuFields = [
    itemId ? `<ItemId>${escapeXml(itemId)}</ItemId>` : "",
    skuId ? `<SkuId>${escapeXml(skuId)}</SkuId>` : "",
    `<SellerSku>${escapeXml(sellerSku)}</SellerSku>`,
    price !== undefined && price !== null ? `<Price>${Number(price)}</Price>` : "",
    salePrice !== undefined && salePrice !== null
      ? `<SalePrice>${Number(salePrice)}</SalePrice>`
      : "",
    saleStartDate ? `<SaleStartDate>${escapeXml(saleStartDate)}</SaleStartDate>` : "",
    saleEndDate ? `<SaleEndDate>${escapeXml(saleEndDate)}</SaleEndDate>` : "",
    quantity !== undefined && quantity !== null
      ? `<Quantity>${Number(quantity)}</Quantity>`
      : "",
  ]
    .filter(Boolean)
    .join("\n      ");

  const payload = `<?xml version="1.0" encoding="UTF-8"?>
<Request>
  <Product>
    <Skus>
      <Sku>
      ${skuFields}
      </Sku>
    </Skus>
  </Product>
</Request>`;

  return callDarazApi({
    account,
    credentials,
    apiPath: "/product/price_quantity/update",
    method: "POST",
    requestType: "product_price_quantity_update",
    query: { payload },
    body: null,
  });
}

async function updateDarazProductDetails({
  account,
  credentials,
  itemId,
  primaryCategory = null,
  sellerSku,
  name,
  shortDescription,
  brand = null,
  quantity = null,
  price = null,
}) {
  if (!itemId) {
    const error = new Error("Daraz Item ID is required to update the product.");
    error.statusCode = 400;
    throw error;
  }

  const attributeFields = [
    name ? `<name>${escapeXml(name)}</name>` : "",
    shortDescription
      ? `<short_description>${escapeXml(shortDescription)}</short_description>`
      : "",
    brand ? `<brand>${escapeXml(brand)}</brand>` : "",
  ]
    .filter(Boolean)
    .join("\n      ");

  const skuFields = [
    `<SellerSku>${escapeXml(sellerSku || "")}</SellerSku>`,
    quantity !== null && quantity !== undefined ? `<quantity>${Number(quantity)}</quantity>` : "",
    price !== null && price !== undefined && price !== "" ? `<price>${Number(price)}</price>` : "",
  ]
    .filter(Boolean)
    .join("\n        ");

  const payload = `<?xml version="1.0" encoding="UTF-8"?>
<Request>
  <Product>
    <ItemId>${escapeXml(itemId)}</ItemId>
    ${primaryCategory ? `<PrimaryCategory>${escapeXml(primaryCategory)}</PrimaryCategory>` : ""}
    <Attributes>
      ${attributeFields}
    </Attributes>
    <Skus>
      <Sku>
        ${skuFields}
      </Sku>
    </Skus>
  </Product>
</Request>`;

  return callDarazApi({
    account,
    credentials,
    apiPath: "/product/update",
    method: "POST",
    requestType: "product_update",
    query: { payload },
    body: null,
  });
}

async function createDarazProduct({
  account,
  credentials,
  primaryCategory,
  name,
  shortDescription,
  brand = "No Brand",
  model = "",
  attributes = {},
  images = [],
  skus = [],
}) {
  if (!primaryCategory) {
    const error = new Error("Primary category is required to create a Daraz product.");
    error.statusCode = 400;
    throw error;
  }

  if (!Array.isArray(skus) || skus.length === 0) {
    const error = new Error("At least one SKU is required to create a Daraz product.");
    error.statusCode = 400;
    throw error;
  }

  const blockedAttributeKeys = new Set([
    "name",
    "short_description",
    "brand",
    "model",
    "primaryCategory",
    "primary_category",
  ]);

  const dynamicAttributeXml = Object.entries(attributes || {})
    .filter(([key, value]) => key && !blockedAttributeKeys.has(key) && value !== undefined && value !== null && value !== "")
    .map(([key, value]) => `<${key}>${escapeXml(value)}</${key}>`)
    .join("\n      ");

  const imagesXml = (images || [])
    .filter(Boolean)
    .slice(0, 8)
    .map((url) => `<Image>${escapeXml(url)}</Image>`)
    .join("\n      ");

  const skusXml = skus
    .map((sku) => {
      const skuImagesXml = (sku.images || [])
        .filter(Boolean)
        .slice(0, 8)
        .map((url) => `<Image>${escapeXml(url)}</Image>`)
        .join("\n            ");

      const saleFields = [
        sku.salePrice !== undefined && sku.salePrice !== null && sku.salePrice !== "" ? `<SalePrice>${Number(sku.salePrice)}</SalePrice>` : "",
        sku.saleStartDate ? `<SaleStartDate>${escapeXml(sku.saleStartDate)}</SaleStartDate>` : "",
        sku.saleEndDate ? `<SaleEndDate>${escapeXml(sku.saleEndDate)}</SaleEndDate>` : "",
      ].filter(Boolean).join("\n        ");

      const optionalSkuAttributes = Object.entries(sku.attributes || {})
        .filter(([key, value]) => key && value !== undefined && value !== null && value !== "")
        .map(([key, value]) => `<${key}>${escapeXml(value)}</${key}>`)
        .join("\n        ");

      return `      <Sku>
        <SellerSku>${escapeXml(sku.sellerSku)}</SellerSku>
        ${sku.colorFamily ? `<color_family>${escapeXml(sku.colorFamily)}</color_family>` : ""}
        ${sku.size ? `<size>${escapeXml(sku.size)}</size>` : ""}
        ${optionalSkuAttributes}
        <quantity>${Number(sku.quantity ?? 0)}</quantity>
        <price>${Number(sku.price ?? 0)}</price>
        ${saleFields}
        <package_length>${Number(sku.packageLength || 1)}</package_length>
        <package_height>${Number(sku.packageHeight || 1)}</package_height>
        <package_weight>${Number(sku.packageWeight || 0.1)}</package_weight>
        <package_width>${Number(sku.packageWidth || 1)}</package_width>
        <package_content>${escapeXml(sku.packageContent || name || sku.sellerSku)}</package_content>
        ${skuImagesXml ? `<Images>\n            ${skuImagesXml}\n        </Images>` : ""}
      </Sku>`;
    })
    .join("\n");

  const payload = `<?xml version="1.0" encoding="UTF-8"?>
<Request>
  <Product>
    <PrimaryCategory>${escapeXml(primaryCategory)}</PrimaryCategory>
    ${imagesXml ? `<Images>\n      ${imagesXml}\n    </Images>` : ""}
    <Attributes>
      <name>${escapeXml(name)}</name>
      <short_description>${escapeXml(shortDescription || "")}</short_description>
      <brand>${escapeXml(brand || "No Brand")}</brand>
      ${model ? `<model>${escapeXml(model)}</model>` : ""}
      ${dynamicAttributeXml}
    </Attributes>
    <Skus>
${skusXml}
    </Skus>
  </Product>
</Request>`;

  return callDarazApi({
    account,
    credentials,
    apiPath: "/product/create",
    method: "POST",
    requestType: "product_create",
    query: { payload },
    body: null,
  });
}

async function deactivateDarazProduct({ account, credentials, itemId, skuIds = [] }) {
  if (!itemId) {
    const error = new Error("Daraz Item ID is required to deactivate a product.");
    error.statusCode = 400;
    throw error;
  }

  const skuIdsXml = (skuIds || [])
    .map((skuId) => `<SkuId>${escapeXml(skuId)}</SkuId>`)
    .join("");

  const payload = `<Request>
  <Product>
    <ItemId>${escapeXml(itemId)}</ItemId>
    ${skuIdsXml ? `<Skus>${skuIdsXml}</Skus>` : ""}
  </Product>
</Request>`;

  return callDarazApi({
    account,
    credentials,
    apiPath: "/product/deactivate",
    method: "POST",
    requestType: "product_deactivate",
    query: { payload },
    body: null,
  });
}

async function removeDarazProductSkus({ account, credentials, skuIdList }) {
  if (!Array.isArray(skuIdList) || skuIdList.length === 0) {
    const error = new Error("At least one SkuId_ItemId_SkuId entry is required to remove a Daraz product.");
    error.statusCode = 400;
    throw error;
  }

  return callDarazApi({
    account,
    credentials,
    apiPath: "/product/remove",
    method: "POST",
    requestType: "product_remove",
    query: { sku_id_list: JSON.stringify(skuIdList) },
    body: null,
  });
}

module.exports = {
  updateDarazPriceQuantity,
  updateDarazProductDetails,
  createDarazProduct,
  deactivateDarazProduct,
  removeDarazProductSkus,
};
