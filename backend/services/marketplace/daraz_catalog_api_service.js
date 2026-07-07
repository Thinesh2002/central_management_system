const axios = require("axios");
const crypto = require("crypto");
const FormData = require("form-data");

const {
  callDarazApi,
  callDarazApiWithoutAccessToken,
  signDarazRequest,
  isDarazApiError,
  normalizeDarazErrorPayload,
} = require("./daraz_api_service");

const syncLogModel = require("../../models/marketplace/sync_log_model");

function escapeXml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

async function getDarazCategoryTree({ account, credentials }) {
  return callDarazApiWithoutAccessToken({
    account,
    credentials,
    apiPath: "/category/tree/get",
    method: "GET",
    requestType: "categories",
  });
}

async function getDarazCategoryAttributes({ account, credentials, primaryCategoryId, languageCode = "en_US" }) {
  if (!primaryCategoryId) {
    const error = new Error("primary_category_id is required.");
    error.statusCode = 400;
    throw error;
  }

  return callDarazApiWithoutAccessToken({
    account,
    credentials,
    apiPath: "/category/attributes/get",
    method: "GET",
    requestType: "category_attributes",
    query: {
      primary_category_id: primaryCategoryId,
      language_code: languageCode,
    },
  });
}

async function getDarazBrandsByPage({ account, credentials, startRow = 0, pageSize = 40 }) {
  return callDarazApiWithoutAccessToken({
    account,
    credentials,
    apiPath: "/category/brands/query",
    method: "GET",
    requestType: "brands",
    query: {
      startRow,
      pageSize,
    },
  });
}

async function getDarazQcStatus({ account, credentials, offset = 0, limit = 100, sellerSkus = [] }) {
  return callDarazApi({
    account,
    credentials,
    apiPath: "/product/qc/status/get",
    method: "GET",
    requestType: "qc_status",
    query: {
      offset,
      limit,
      seller_skus: JSON.stringify(sellerSkus || []),
    },
  });
}

async function migrateDarazImage({ account, credentials, imageUrl }) {
  if (!imageUrl) {
    const error = new Error("imageUrl is required.");
    error.statusCode = 400;
    throw error;
  }

  const payload = `<?xml version="1.0" encoding="UTF-8" ?>
<Request>
  <Image>
    <Url>${escapeXml(imageUrl)}</Url>
  </Image>
</Request>`;

  return callDarazApi({
    account,
    credentials,
    apiPath: "/image/migrate",
    method: "POST",
    requestType: "image_migrate",
    query: { payload },
    body: null,
  });
}

async function migrateDarazImages({ account, credentials, imageUrls = [] }) {
  if (!Array.isArray(imageUrls) || imageUrls.length === 0) {
    const error = new Error("At least one image URL is required.");
    error.statusCode = 400;
    throw error;
  }

  if (imageUrls.length > 8) {
    const error = new Error("A maximum of 8 images can be migrated in one request.");
    error.statusCode = 400;
    throw error;
  }

  const urlsXml = imageUrls.map((url) => `<Url>${escapeXml(url)}</Url>`).join("");

  const payload = `<?xml version="1.0" encoding="UTF-8" ?>
<Request>
  <Images>${urlsXml}</Images>
</Request>`;

  return callDarazApi({
    account,
    credentials,
    apiPath: "/images/migrate",
    method: "POST",
    requestType: "images_migrate",
    query: { payload },
    body: null,
  });
}

async function getDarazImageMigrationResult({ account, credentials, batchId }) {
  if (!batchId) {
    const error = new Error("batch_id is required.");
    error.statusCode = 400;
    throw error;
  }

  return callDarazApi({
    account,
    credentials,
    apiPath: "/image/response/get",
    method: "GET",
    requestType: "image_migrate_result",
    query: { batch_id: batchId },
  });
}

async function setDarazSkuImages({ account, credentials, skuId, imageUrls = [] }) {
  if (!skuId) {
    const error = new Error("skuId is required.");
    error.statusCode = 400;
    throw error;
  }

  if (imageUrls.length > 8) {
    const error = new Error("A maximum of 8 images are allowed per SKU.");
    error.statusCode = 400;
    throw error;
  }

  const imagesXml = imageUrls.map((url) => `<Image>${escapeXml(url)}</Image>`).join("");

  const payload = `<Request>
  <Product>
    <Skus>
      <Sku>
        <SkuId>${escapeXml(skuId)}</SkuId>
        <Images>${imagesXml}</Images>
      </Sku>
    </Skus>
  </Product>
</Request>`;

  return callDarazApi({
    account,
    credentials,
    apiPath: "/images/set",
    method: "POST",
    requestType: "images_set",
    query: { payload },
    body: null,
  });
}

async function uploadDarazImage({ account, credentials, fileBuffer, fileName = "image.jpg" }) {
  const requestUid = `daraz_image_upload_${Date.now()}_${crypto.randomUUID()}`;
  const startedAt = Date.now();

  const appKey = credentials?.app_key || credentials?.appKey;
  const appSecret = credentials?.app_secret || credentials?.appSecret;
  const accessToken = credentials?.access_token || credentials?.accessToken;

  if (!appKey || !appSecret || !accessToken) {
    const error = new Error("Daraz credentials are incomplete for image upload.");
    error.statusCode = 400;
    throw error;
  }

  const baseUrl = (account?.api_base_url || process.env.DARAZ_API_BASE_URL || "https://api.daraz.lk/rest").replace(/\/$/, "");
  const apiPath = "/image/upload";

  const commonParams = {
    app_key: appKey,
    timestamp: Date.now().toString(),
    access_token: accessToken,
    sign_method: "sha256",
  };

  const sign = signDarazRequest(apiPath, commonParams, appSecret);
  const finalParams = { ...commonParams, sign };

  const form = new FormData();
  Object.entries(finalParams).forEach(([key, value]) => form.append(key, value));
  form.append("image", fileBuffer, fileName);

  try {
    const response = await axios.post(`${baseUrl}${apiPath}`, form, {
      headers: form.getHeaders(),
      timeout: 60000,
    });

    const responseData = response.data;

    if (isDarazApiError(responseData)) {
      const darazError = normalizeDarazErrorPayload(null, responseData);

      await syncLogModel.createApiRequestLog({
        request_uid: requestUid,
        account_id: account.id,
        platform_code: "DARAZ",
        request_type: "image_upload",
        endpoint: apiPath,
        http_method: "POST",
        api_status: "failed",
        response_status_code: response.status,
        error_message: darazError.message,
        response_summary: JSON.stringify(darazError),
        duration_ms: Date.now() - startedAt,
      });

      const err = new Error(darazError.message);
      err.statusCode = response.status || 400;
      err.daraz = darazError;
      throw err;
    }

    await syncLogModel.createApiRequestLog({
      request_uid: requestUid,
      account_id: account.id,
      platform_code: "DARAZ",
      request_type: "image_upload",
      endpoint: apiPath,
      http_method: "POST",
      api_status: "success",
      response_status_code: response.status,
      duration_ms: Date.now() - startedAt,
    });

    return { success: true, request_uid: requestUid, data: responseData };
  } catch (error) {
    if (error?.daraz) throw error;

    await syncLogModel.createApiRequestLog({
      request_uid: requestUid,
      account_id: account.id,
      platform_code: "DARAZ",
      request_type: "image_upload",
      endpoint: apiPath,
      http_method: "POST",
      api_status: "failed",
      response_status_code: error?.response?.status || null,
      error_message: error?.message || "Daraz image upload failed.",
      duration_ms: Date.now() - startedAt,
    });

    throw error;
  }
}

module.exports = {
  getDarazCategoryTree,
  getDarazCategoryAttributes,
  getDarazBrandsByPage,
  getDarazQcStatus,
  migrateDarazImage,
  migrateDarazImages,
  getDarazImageMigrationResult,
  setDarazSkuImages,
  uploadDarazImage,
};
