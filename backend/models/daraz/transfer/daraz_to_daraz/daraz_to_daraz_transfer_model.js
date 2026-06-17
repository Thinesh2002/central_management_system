const orderDb = require("../../../../config/order_management_db");
const productDb = require("../../../../config/product_management_db");

exports.getSourceProductById = async (productId) => {
  const [rows] = await productDb.query(
    `
    SELECT *
    FROM daraz_products
    WHERE id = ?
    LIMIT 1
    `,
    [productId]
  );

  return rows[0] || null;
};

exports.getProductSkus = async (productId) => {
  const [rows] = await productDb.query(
    `
    SELECT *
    FROM daraz_skus
    WHERE product_id = ?
    `,
    [productId]
  );

  return rows;
};

exports.getProductImages = async (productId) => {
  const product = await exports.getSourceProductById(productId);

  if (!product) return [];

  const images = [];

  const addImage = (url) => {
    if (url && typeof url === "string" && url.trim().startsWith("http")) {
      images.push({ image_url: url.trim() });
    }
  };

  const parseImageValue = (value) => {
    if (!value) return;

    if (typeof value === "string") {
      const trimmed = value.trim();

      if (trimmed.startsWith("http")) {
        addImage(trimmed);
        return;
      }

      try {
        const parsed = JSON.parse(trimmed);

        if (Array.isArray(parsed)) {
          parsed.forEach(parseImageValue);
        } else if (parsed && typeof parsed === "object") {
          parseImageValue(parsed.images);
          parseImageValue(parsed.marketImages);
          parseImageValue(parsed.main_image);
          parseImageValue(parsed.image);
          parseImageValue(parsed.url);
          parseImageValue(parsed.image_url);
        }
      } catch {
        trimmed.split(",").forEach((url) => addImage(url));
      }

      return;
    }

    if (Array.isArray(value)) {
      value.forEach(parseImageValue);
      return;
    }

    if (typeof value === "object") {
      parseImageValue(value.image_url);
      parseImageValue(value.url);
      parseImageValue(value.image);
      parseImageValue(value.main_image);
      parseImageValue(value.sku_image);
    }
  };

  parseImageValue(product.images_json);
  parseImageValue(product.raw_json);
  parseImageValue(product.attributes_json);

  return images.filter(
    (img, index, self) =>
      img.image_url &&
      self.findIndex((i) => i.image_url === img.image_url) === index
  );
};

exports.getProductAttributes = async (productId) => {
  const product = await exports.getSourceProductById(productId);

  if (!product) return [];

  const parseJson = (value) => {
    try {
      return value ? JSON.parse(value) : null;
    } catch {
      return null;
    }
  };

  const attrs = parseJson(product.attributes_json) || {};
  const raw = parseJson(product.raw_json) || {};
  const rawAttrs = raw.attributes || {};

  const mergedAttrs = {
    ...attrs,
    ...rawAttrs,
  };

  return Object.entries(mergedAttrs)
    .filter(([_, value]) => value !== null && value !== undefined && value !== "")
    .map(([key, value]) => ({
      attribute_name: key,
      attribute_value: Array.isArray(value) || typeof value === "object"
        ? JSON.stringify(value)
        : value,
    }));
};

exports.getDarazAccountsByCodes = async (accountCodes) => {
  if (!Array.isArray(accountCodes) || accountCodes.length === 0) {
    return [];
  }

  const [rows] = await orderDb.query(
    `
    SELECT *
    FROM daraz_accounts
    WHERE account_code IN (?)
    `,
    [accountCodes]
  );

  return rows;
};

exports.createTransferLog = async (data) => {
  const [result] = await productDb.query(
    `
    INSERT INTO daraz_transfer_logs
    (
      transfer_type,
      source_account_code,
      target_account_code,
      source_product_id,
      status,
      message,
      error,
      created_at
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, NOW())
    `,
    [
      "daraz_to_daraz",
      data.source_account_code,
      data.target_account_code,
      data.source_product_id,
      data.status,
      data.message,
      data.error || null
    ]
  );

  return result.insertId;
};