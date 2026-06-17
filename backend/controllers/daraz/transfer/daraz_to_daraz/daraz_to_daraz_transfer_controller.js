const axios = require("axios");
const crypto = require("crypto");
const qs = require("qs");
const NodeFormData = require("form-data");

const transferModel = require("../../../../models/daraz/transfer/daraz_to_daraz/daraz_to_daraz_transfer_model");

const DARAZ_API_URL = process.env.DARAZ_API_URL || "https://api.daraz.lk/rest";

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

const callDarazApi = async (apiPath, params, appSecret) => {
  try {
    const sign = generateDarazSign(apiPath, params, appSecret);

    const response = await axios.post(
      `${DARAZ_API_URL}${apiPath}`,
      qs.stringify({
        ...params,
        sign,
      }),
      {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded;charset=utf-8",
          Accept: "application/json",
        },
        timeout: 180000,
        maxBodyLength: Infinity,
        maxContentLength: Infinity,
      }
    );

    console.log("DARAZ RESPONSE:", apiPath, response.data);
    return response.data;
  } catch (error) {
    console.error("DARAZ API ERROR:", {
      apiPath,
      message: error.message,
      code: error.code,
      status: error.response?.status,
      response: error.response?.data,
    });

    throw error;
  }
};

const escapeXml = (value) => {
  if (value === null || value === undefined) return "";

  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
};

const safeXmlTag = (key) => {
  return String(key)
    .trim()
    .replace(/\s+/g, "_")
    .replace(/[^a-zA-Z0-9_]/g, "");
};

const extractImageUrls = (images = []) => {
  const imageUrls = [];

  const addImage = (value) => {
    if (!value) return;

    if (typeof value === "string") {
      const trimmed = value.trim();

      if (trimmed.startsWith("http")) {
        imageUrls.push(trimmed);
        return;
      }

      try {
        addImage(JSON.parse(trimmed));
      } catch {
        trimmed.split(",").forEach((url) => {
          const cleanUrl = url.trim();
          if (cleanUrl.startsWith("http")) imageUrls.push(cleanUrl);
        });
      }

      return;
    }

    if (Array.isArray(value)) {
      value.forEach(addImage);
      return;
    }

    if (typeof value === "object") {
      addImage(value.image_url);
      addImage(value.url);
      addImage(value.image);
      addImage(value.Images);
      addImage(value.images);
      addImage(value.main_image);
      addImage(value.sku_image);
      addImage(value.marketImages);
    }
  };

  addImage(images);

  return [...new Set(imageUrls)]
    .filter((url) => typeof url === "string" && url.startsWith("http"))
    .map((url) => url.trim())
    .slice(0, 6);
};

const getUploadedImageUrl = (response) => {
  return (
    response?.data?.image?.url ||
    response?.data?.image?.Url ||
    response?.data?.url ||
    response?.data?.Url ||
    response?.data?.image_url ||
    response?.image?.url ||
    response?.image_url ||
    response?.url ||
    null
  );
};

const uploadDarazImage = async (imageUrl, account) => {
  const imageRes = await axios.get(imageUrl, {
    responseType: "arraybuffer",
    timeout: 120000,
    maxBodyLength: Infinity,
    maxContentLength: Infinity,
  });

  const imageBuffer = Buffer.from(imageRes.data);

  const apiPath = "/image/upload";
  const timestamp = Date.now().toString();

  const params = {
    app_key: process.env.DARAZ_APP_KEY,
    access_token: account.access_token,
    sign_method: "sha256",
    timestamp,
  };

  const sign = generateDarazSign(
    apiPath,
    params,
    process.env.DARAZ_APP_SECRET
  );

  const formData = new NodeFormData();

  formData.append("image", imageBuffer, {
    filename: `daraz-${Date.now()}.jpg`,
    contentType: imageRes.headers["content-type"] || "image/jpeg",
    knownLength: imageBuffer.length,
  });

  const response = await axios.post(
    `${DARAZ_API_URL}${apiPath}`,
    formData,
    {
      params: {
        ...params,
        sign,
      },
      headers: {
        ...formData.getHeaders(),
        Accept: "application/json",
      },
      timeout: 180000,
      maxBodyLength: Infinity,
      maxContentLength: Infinity,
    }
  );

  console.log("IMAGE UPLOAD RESPONSE:", response.data);

  const isSuccess =
    response.data && (response.data.code === "0" || response.data.code === 0);

  if (!isSuccess) {
    throw new Error(JSON.stringify(response.data));
  }

  const uploadedUrl =
    response.data?.data?.image?.url ||
    response.data?.data?.image?.Url ||
    response.data?.data?.url ||
    response.data?.data?.Url ||
    response.data?.data?.image_url ||
    response.data?.image?.url ||
    response.data?.url ||
    null;

  if (!uploadedUrl) {
    throw new Error("Uploaded image URL not found: " + JSON.stringify(response.data));
  }

  return uploadedUrl;
};

const buildProductPayloadXml = ({ product, skus, images, attributes }) => {
  const safeImageUrls = extractImageUrls(images);

  if (safeImageUrls.length < 1) {
    throw new Error("Minimum 1 valid product image required for Daraz.");
  }

  const attrMap = {};

  attributes.forEach((attr) => {
    if (
      attr.attribute_name &&
      attr.attribute_value !== null &&
      attr.attribute_value !== undefined &&
      String(attr.attribute_value).trim() !== ""
    ) {
      attrMap[attr.attribute_name] = attr.attribute_value;
    }
  });

  const brand = product.brand || "No Brand";

  const description =
    product.description ||
    product.short_description ||
    product.name ||
    "Product description";

  const skuRows =
    Array.isArray(skus) && skus.length > 0
      ? skus
      : [
          {
            seller_sku: product.seller_sku || product.item_id || `SKU-${product.id}`,
            price: product.price || 1000,
            quantity: product.quantity || 10,
            package_weight: product.package_weight || 0.5,
            package_length: product.package_length || 10,
            package_width: product.package_width || 10,
            package_height: product.package_height || 10,
            color_family: product.color_family || "Black",
          },
        ];

  const skuXml = skuRows
    .map((sku, index) => {
      const sellerSku =
        sku.seller_sku ||
        sku.SellerSku ||
        sku.sku ||
        sku.SKU ||
        product.seller_sku ||
        `${product.item_id || product.id}-${index + 1}`;

      return `
        <Sku>
          <SellerSku>${escapeXml(sellerSku)}</SellerSku>
          <quantity>${escapeXml(sku.quantity || sku.stock || sku.qty || 10)}</quantity>
          <price>${escapeXml(sku.special_price || sku.price || product.price || 1000)}</price>
          <package_weight>${escapeXml(sku.package_weight || product.package_weight || 0.5)}</package_weight>
          <package_length>${escapeXml(sku.package_length || product.package_length || 10)}</package_length>
          <package_width>${escapeXml(sku.package_width || product.package_width || 10)}</package_width>
          <package_height>${escapeXml(sku.package_height || product.package_height || 10)}</package_height>
          <color_family>${escapeXml(sku.color_family || product.color_family || "Black")}</color_family>
          <Images>
            ${safeImageUrls.map((url) => `<Image>${escapeXml(url)}</Image>`).join("")}
          </Images>
        </Sku>
      `;
    })
    .join("");

  const attributeXml = Object.entries(attrMap)
    .filter(([key, value]) => {
      return (
        key &&
        safeXmlTag(key) &&
        value !== null &&
        value !== undefined &&
        String(value).trim() !== ""
      );
    })
    .map(([key, value]) => {
      const tag = safeXmlTag(key);
      if (!tag) return "";
      return `<${tag}>${escapeXml(value)}</${tag}>`;
    })
    .join("");

  return `
    <Request>
      <Product>
        <PrimaryCategory>${escapeXml(product.primary_category)}</PrimaryCategory>
        <SPUId></SPUId>
        <AssociatedSku></AssociatedSku>

        <Attributes>
          <name>${escapeXml(product.name)}</name>
          <brand>${escapeXml(brand)}</brand>
          <description>${escapeXml(description)}</description>
          <short_description>${escapeXml(product.short_description || product.name)}</short_description>
          <warranty_type>${escapeXml(product.warranty_type || "No Warranty")}</warranty_type>
          <warranty>${escapeXml(product.warranty_period || "")}</warranty>
          ${attributeXml}
        </Attributes>

        <Skus>
          ${skuXml}
        </Skus>
      </Product>
    </Request>
  `;
};

exports.transferDarazToDaraz = async (req, res) => {
  try {
    const {
      source_account_code,
      target_account_codes,
      product_ids,
      customized_products = [],
    } = req.body;

    if (!source_account_code) {
      return res.status(400).json({
        success: false,
        message: "source_account_code is required",
      });
    }

    if (!Array.isArray(target_account_codes) || target_account_codes.length === 0) {
      return res.status(400).json({
        success: false,
        message: "target_account_codes is required",
      });
    }

    if (!Array.isArray(product_ids) || product_ids.length === 0) {
      return res.status(400).json({
        success: false,
        message: "product_ids is required",
      });
    }

    const targetAccounts = await transferModel.getDarazAccountsByCodes(
      target_account_codes
    );

    if (targetAccounts.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No target accounts found",
      });
    }

    const results = [];

    for (const productId of product_ids) {
      const product = await transferModel.getSourceProductById(productId);

      if (!product) {
        results.push({
          success: false,
          product_id: productId,
          stage: "product_not_found",
          message: "Source product not found",
        });
        continue;
      }

      if (product.account_code !== source_account_code) {
        results.push({
          success: false,
          product_id: productId,
          product_name: product.name,
          stage: "source_account_mismatch",
          message: "Product does not belong to selected source account",
        });
        continue;
      }

      const customizedProduct =
        customized_products.find((item) => Number(item.id) === Number(productId)) ||
        {};

      const skus = await transferModel.getProductSkus(productId);
      const dbImages = await transferModel.getProductImages(productId);
      const attributes = await transferModel.getProductAttributes(productId);

      const productForPayload = {
        ...product,
        name: customizedProduct.title || product.name,
        brand: customizedProduct.brand || product.brand || "No Brand",
        primary_category: customizedProduct.category_id || product.primary_category,
        description:
          customizedProduct.description_html ||
          product.description ||
          product.short_description,
        short_description:
          customizedProduct.short_description_html ||
          product.short_description ||
          product.name,
        price: customizedProduct.price || skus?.[0]?.price || product.price || 1000,
        seller_sku:
          customizedProduct.sku || skus?.[0]?.seller_sku || product.item_id,
      };

      const imageSource =
        customizedProduct.image_links && customizedProduct.image_links.length > 0
          ? customizedProduct.image_links
          : dbImages;

      const oldImageUrls = extractImageUrls(imageSource);

      if (oldImageUrls.length < 1) {
        results.push({
          success: false,
          stage: "image_missing",
          product_id: productId,
          product_name: product.name,
          message: "Minimum 1 product image required for Daraz.",
          old_images: oldImageUrls,
        });
        continue;
      }

      const finalAttributes = [
        ...attributes,
        ...Object.entries(customizedProduct.category_attributes || {}).map(
          ([key, value]) => ({
            attribute_name: key,
            attribute_value: value,
          })
        ),
      ];

      for (const account of targetAccounts) {
        try {
          if (account.account_code === source_account_code) {
            results.push({
              success: false,
              product_id: productId,
              product_name: product.name,
              account_code: account.account_code,
              account_name: account.account_name,
              stage: "same_account_skipped",
              message: "Source and target account cannot be same",
            });
            continue;
          }

          if (!account.access_token) {
            results.push({
              success: false,
              product_id: productId,
              product_name: product.name,
              account_code: account.account_code,
              account_name: account.account_name,
              stage: "access_token_missing",
              message: "Target account access token missing",
            });
            continue;
          }

          const uploadedImages = [];
          const imageUploadErrors = [];

          for (const oldImageUrl of oldImageUrls.slice(0, 6)) {
            try {
              const uploadedUrl = await uploadDarazImage(oldImageUrl, account);
              if (uploadedUrl) uploadedImages.push(uploadedUrl);
            } catch (imageError) {
              imageUploadErrors.push({
                old_image: oldImageUrl,
                error: imageError.message,
              });

              console.error("IMAGE UPLOAD FAILED:", {
                oldImageUrl,
                message: imageError.message,
              });
            }
          }

          if (uploadedImages.length < 1) {
            results.push({
              success: false,
              stage: "image_upload_failed",
              product_id: productId,
              product_name: product.name,
              account_code: account.account_code,
              account_name: account.account_name,
              message: "No images uploaded to Daraz target account",
              old_images: oldImageUrls,
              image_upload_errors: imageUploadErrors,
            });
            continue;
          }

          const payloadXml = buildProductPayloadXml({
            product: productForPayload,
            skus,
            images: uploadedImages,
            attributes: finalAttributes,
          });

          console.log("FINAL UPLOADED IMAGES:", uploadedImages);
          console.log("DARAZ PAYLOAD XML:", payloadXml);

          const apiPath = "/product/create";
          const timestamp = Date.now().toString();

          const params = {
            app_key: process.env.DARAZ_APP_KEY,
            access_token: account.access_token,
            sign_method: "sha256",
            timestamp,
            payload: payloadXml,
          };

          const response = await callDarazApi(
            apiPath,
            params,
            process.env.DARAZ_APP_SECRET
          );

          const isSuccess =
            response && (response.code === "0" || response.code === 0);

          await transferModel.createTransferLog({
            source_account_code,
            target_account_code: account.account_code,
            source_product_id: productId,
            status: isSuccess ? "success" : "failed",
            message: isSuccess
              ? "Daraz to Daraz transfer completed"
              : "Daraz create product failed",
            error: isSuccess ? null : JSON.stringify(response),
          });

          results.push({
            success: isSuccess,
            stage: isSuccess ? "completed" : "daraz_create_failed",
            product_id: productId,
            product_name: productForPayload.name,
            account_code: account.account_code,
            account_name: account.account_name,
            category_id: productForPayload.primary_category,
            old_images: oldImageUrls,
            uploaded_images: uploadedImages,
            response,
          });
        } catch (error) {
          await transferModel.createTransferLog({
            source_account_code,
            target_account_code: account.account_code,
            source_product_id: productId,
            status: "failed",
            message: "Transfer failed",
            error: error.response?.data
              ? JSON.stringify(error.response.data)
              : error.message,
          });

          results.push({
            success: false,
            stage: "transfer_error",
            product_id: productId,
            product_name: product.name,
            account_code: account.account_code,
            account_name: account.account_name,
            message: error.response?.data?.message || error.message,
            error: error.response?.data || null,
          });
        }
      }
    }

    const successCount = results.filter((r) => r.success).length;
    const failedCount = results.filter((r) => !r.success).length;

    return res.json({
      success: successCount > 0,
      total_products: product_ids.length,
      total_accounts: target_account_codes.length,
      success_count: successCount,
      failed_count: failedCount,
      results,
    });
  } catch (error) {
    console.error("Daraz to Daraz transfer error:", error);

    return res.status(500).json({
      success: false,
      message: "Daraz to Daraz transfer failed",
      error: error.message,
    });
  }
};