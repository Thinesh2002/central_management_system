const axios = require("axios");
const qs = require("qs");
const crypto = require("crypto");

const transferModel = require("../../../models/daraz/transfer/woo_to_daraz_transfer_model");

const WC_API_URL = `${process.env.WC_API_URL}/products`;

const wcAuth = {
  username: process.env.WC_CONSUMER_KEY,
  password: process.env.WC_CONSUMER_SECRET,
};

const generateDarazSign = (apiPath, params, appSecret) => {
  const sortedKeys = Object.keys(params).sort();
  let signString = apiPath;

  sortedKeys.forEach((key) => {
    signString += key + params[key];
  });

  return crypto
    .createHmac("sha256", appSecret)
    .update(signString)
    .digest("hex")
    .toUpperCase();
};

const cleanXmlValue = (value = "") => {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "")
    .replace(/>/g, "")
    .trim();
};

const cleanCDataValue = (value = "") => {
  return String(value).replace(/\]\]>/g, "").trim();
};

const cleanCategoryAttributes = (attributes = {}) => {
  const cleaned = { ...attributes };

  const removeKeys = [
    "name",
    "name_en",
    "short_description",
    "short_description_en",
    "description",
    "description_en",
    "__images__",
    "Images",
    "images",
    "image",
    "price",
    "special_price",
    "SellerSku",
    "seller_sku",
    "sku",
    "quantity",
    "color_thumbnail",
    "promotion_whitebkg_image",
  ];

  removeKeys.forEach((key) => {
    delete cleaned[key];
  });

  Object.keys(cleaned).forEach((key) => {
    if (
      cleaned[key] === "" ||
      cleaned[key] === null ||
      cleaned[key] === undefined
    ) {
      delete cleaned[key];
    }
  });

  return cleaned;
};

const buildDynamicXML = (attributes = {}) => {
  let normalAttributesXML = "";
  let skuAttributesXML = "";

  Object.entries(attributes).forEach(([key, item]) => {
    if (item === undefined || item === null || item === "") return;

    const value = typeof item === "object" ? item.value : item;
    const type =
      typeof item === "object" ? item.attribute_type || "normal" : "normal";

    if (value === undefined || value === null || value === "") return;

    const xml = `<${key}>${cleanXmlValue(value)}</${key}>`;

    if (type === "sku") {
      skuAttributesXML += xml;
    } else {
      normalAttributesXML += xml;
    }
  });

  return {
    normalAttributesXML,
    skuAttributesXML,
  };
};

const buildDarazXML = (
  product,
  categoryId,
  imageUrls = [],
  categoryAttributes = {},
  whiteBackgroundImage = ""
) => {
  const safeAttributes = cleanCategoryAttributes(categoryAttributes);

  if (whiteBackgroundImage) {
    safeAttributes.promotion_whitebkg_image = whiteBackgroundImage;
  }

  if (!safeAttributes.brand) {
    safeAttributes.brand = "No Brand";
  }

  if (!safeAttributes.model) {
    safeAttributes.model = product.sku || `MODEL-${product.id}`;
  }

  const { normalAttributesXML, skuAttributesXML } =
    buildDynamicXML(safeAttributes);

  const images = imageUrls
    .slice(0, 6)
    .map((url) => `<Image>${cleanXmlValue(url)}</Image>`)
    .join("");

  const sellerSku = product.sku
    ? `${cleanXmlValue(product.sku)}-${product.id}`
    : `SKU-${product.id}-${Date.now()}`;

  const shortDescription =
    product.short_description ||
    product.highlights?.join("\n") ||
    product.description ||
    product.name;

  const description =
    product.description || product.short_description || product.name;

  return `<?xml version="1.0" encoding="UTF-8" ?>
<Request>
  <Product>
    <PrimaryCategory>${categoryId}</PrimaryCategory>

    <Images>
      ${images}
    </Images>

    <Attributes>
      <name><![CDATA[${cleanCDataValue(product.name)}]]></name>

      <short_description><![CDATA[
        ${cleanCDataValue(shortDescription)}
      ]]></short_description>

      <description><![CDATA[
        ${cleanCDataValue(description)}
      ]]></description>

      ${normalAttributesXML}
    </Attributes>

    <Skus>
      <Sku>
        <SellerSku>${sellerSku}</SellerSku>

        <quantity>${cleanXmlValue(product.stock_quantity || 100)}</quantity>

        <price>${cleanXmlValue(product.price)}</price>

        <package_length>${cleanXmlValue(
          categoryAttributes.package_length || 5
        )}</package_length>

        <package_width>${cleanXmlValue(
          categoryAttributes.package_width || 5
        )}</package_width>

        <package_height>${cleanXmlValue(
          categoryAttributes.package_height || 5
        )}</package_height>

        <package_weight>${cleanXmlValue(
          categoryAttributes.package_weight || 0.2
        )}</package_weight>

        <package_content>${cleanXmlValue(
          categoryAttributes.package_content || `1 x ${product.name}`
        )}</package_content>

        ${skuAttributesXML}
      </Sku>
    </Skus>
  </Product>
</Request>`;
};

const getWooProduct = async (productId) => {
  const response = await axios.get(`${WC_API_URL}/${productId}`, {
    auth: wcAuth,
  });

  return response.data;
};

const saveLogSafe = async (data) => {
  try {
    await transferModel.insertTransferLog(data);
  } catch (error) {
    console.error("Transfer Log Save Error:", error.message);
  }
};

const migrateDarazImage = async (account, imageUrl) => {
  const apiPath = "/image/migrate";
  const timestamp = Date.now().toString();

  const payload = `<Request>
    <Image>
      <Url>${cleanXmlValue(imageUrl)}</Url>
    </Image>
  </Request>`;

  const signParams = {
    app_key: account.app_key,
    timestamp,
    access_token: account.access_token,
    sign_method: "sha256",
    payload,
  };

  const sign = generateDarazSign(apiPath, signParams, account.app_secret);

  const response = await axios.post(
    `${account.api_base}${apiPath}`,
    qs.stringify({
      ...signParams,
      sign,
    }),
    {
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      timeout: 30000,
    }
  );

  if (response.data?.code !== "0") {
    throw response.data;
  }

  return (
    response.data?.data?.image?.url ||
    response.data?.data?.url ||
    response.data?.data?.image_url ||
    response.data?.data?.url_list?.[0]
  );
};

exports.transferListings = async (req, res) => {
  try {
    const {
      product_ids,
      account_codes,
      category_id,
      category_attributes = {},
      customized_products = [],
    } = req.body || {};

    if (!Array.isArray(product_ids) || product_ids.length === 0) {
      return res.status(400).json({
        success: false,
        message: "No products selected",
      });
    }

    if (!Array.isArray(account_codes) || account_codes.length === 0) {
      return res.status(400).json({
        success: false,
        message: "No accounts selected",
      });
    }

    if (!category_id) {
      return res.status(400).json({
        success: false,
        message: "category_id is required",
      });
    }

    const accounts = await transferModel.getSelectedAccounts(account_codes);

    if (!accounts.length) {
      return res.status(400).json({
        success: false,
        message: "No valid Daraz accounts found",
      });
    }

    const results = [];

    for (const productId of product_ids) {
      let wooProduct;

      try {
        wooProduct = await getWooProduct(productId);
      } catch (error) {
        results.push({
          success: false,
          stage: "woo_product_fetch",
          product_id: productId,
          error: error.response?.data || error.message,
        });

        continue;
      }

      const customProduct = customized_products.find(
        (item) => Number(item.id) === Number(wooProduct.id)
      );

      const customImages =
        customProduct?.image_links?.filter(Boolean)?.slice(0, 6) || [];

      const finalProduct = {
        id: wooProduct.id,

        name: customProduct?.title || wooProduct.name,

        price: customProduct?.price || wooProduct.price,

        sku:
          customProduct?.sku ||
          wooProduct.sku ||
          `SKU-${wooProduct.id}-${Date.now()}`,

        short_description:
          customProduct?.highlights?.length > 0
            ? customProduct.highlights.join("\n")
            : customProduct?.short_description_html ||
              wooProduct.short_description ||
              wooProduct.name,

        description:
          customProduct?.description_html ||
          wooProduct.description ||
          wooProduct.short_description ||
          wooProduct.name,

        highlights: customProduct?.highlights || [],

        stock_quantity: wooProduct.stock_quantity || 100,
      };

      if (customImages.length < 3) {
        results.push({
          success: false,
          stage: "product_validation",
          product_id: wooProduct.id,
          product_name: finalProduct.name,
          message: "Minimum 3 images required",
        });

        continue;
      }

      if (customImages.length > 6) {
        results.push({
          success: false,
          stage: "product_validation",
          product_id: wooProduct.id,
          product_name: finalProduct.name,
          message: "Maximum 6 images allowed",
        });

        continue;
      }

      if (!finalProduct.name || finalProduct.name.length < 80) {
        results.push({
          success: false,
          stage: "product_validation",
          product_id: wooProduct.id,
          product_name: finalProduct.name,
          message: "Title minimum 80 characters required",
        });

        continue;
      }

      if (!finalProduct.price || finalProduct.price === "0") {
        results.push({
          success: false,
          stage: "product_validation",
          product_id: wooProduct.id,
          product_name: finalProduct.name,
          message: "Product price missing",
        });

        continue;
      }

      for (const account of accounts) {
        const apiPath = "/product/create";

        try {
          const migratedImages = [];

          for (const imageUrl of customImages) {
            try {
              const darazImageUrl = await migrateDarazImage(account, imageUrl);

              if (darazImageUrl) {
                migratedImages.push(darazImageUrl);
              }
            } catch (imageError) {
              console.error("Image Migration Error:", imageError);
            }
          }

          if (migratedImages.length < 2) {
            results.push({
              success: false,
              stage: "image_migration",
              product_id: wooProduct.id,
              product_name: finalProduct.name,
              account_code: account.account_code,
              account_name: account.account_name,
              message: "Minimum 2 migrated Daraz images required",
              migrated_images: migratedImages,
            });

            continue;
          }

          const cleanAttributes = cleanCategoryAttributes(category_attributes);
          const whiteBackgroundImage = migratedImages[0];

          const xmlPayload = buildDarazXML(
            finalProduct,
            category_id,
            migratedImages,
            cleanAttributes,
            whiteBackgroundImage
          );

          console.log("DARAZ XML PAYLOAD:\n", xmlPayload);

          const timestamp = Date.now().toString();

          const signParams = {
            app_key: account.app_key,
            timestamp,
            access_token: account.access_token,
            sign_method: "sha256",
            payload: xmlPayload,
          };

          const sign = generateDarazSign(
            apiPath,
            signParams,
            account.app_secret
          );

          const response = await axios.post(
            `${account.api_base}${apiPath}`,
            qs.stringify({
              ...signParams,
              sign,
            }),
            {
              headers: {
                "Content-Type": "application/x-www-form-urlencoded",
              },
              timeout: 30000,
            }
          );

          const isDarazSuccess = response.data?.code === "0";
          const itemId = response.data?.data?.item_id || null;
          const skuId = response.data?.data?.sku_list?.[0]?.sku_id || null;

          await saveLogSafe({
            woo_product_id: wooProduct.id,
            daraz_item_id: itemId,
            daraz_sku_id: skuId,
            account_code: account.account_code,
            account_name: account.account_name,
            status: isDarazSuccess ? "success" : "failed",
            message: JSON.stringify(response.data),
          });

          results.push({
            success: isDarazSuccess,
            stage: isDarazSuccess
              ? "daraz_create_success"
              : "daraz_create_failed",
            product_id: wooProduct.id,
            product_name: finalProduct.name,
            custom_title_used: customProduct?.title || null,
            account_code: account.account_code,
            account_name: account.account_name,
            category_id,
            category_attributes_sent: {
              ...cleanAttributes,
              promotion_whitebkg_image: whiteBackgroundImage,
            },
            migrated_images: migratedImages,
            white_background_image_used: whiteBackgroundImage,
            daraz_item_id: itemId,
            daraz_sku_id: skuId,
            response: response.data,
          });
        } catch (error) {
          const errorData = error.response?.data || error.message;

          await saveLogSafe({
            woo_product_id: wooProduct.id,
            account_code: account.account_code,
            account_name: account.account_name,
            status: "failed",
            message: JSON.stringify(errorData),
          });

          results.push({
            success: false,
            stage: "daraz_api_request_failed",
            product_id: wooProduct.id,
            product_name: finalProduct.name,
            account_code: account.account_code,
            account_name: account.account_name,
            category_id,
            error: errorData,
          });
        }
      }
    }

    const successCount = results.filter((item) => item.success).length;
    const failedCount = results.filter((item) => !item.success).length;

    return res.json({
      success: failedCount === 0,
      total_products: product_ids.length,
      total_accounts: accounts.length,
      success_count: successCount,
      failed_count: failedCount,
      results,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      stage: "server_error",
      error: error.message,
    });
  }
};