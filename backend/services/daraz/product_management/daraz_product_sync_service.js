const { callDarazApi } = require("../../marketplace/daraz_api_service");

const darazProductSyncModel = require("../../../models/daraz/product_management/daraz_product_sync_model");

const PRODUCT_FILTERS = [
  "all",
  "live",
  "inactive",
  "deleted",
  "pending",
  "rejected",
  "draft",
  "violation",
];

const DARAZ_CREATED_TIME_KEYS = [
  "_daraz_created_time",
  "created_time",
  "CreatedTime",
  "createdTime",
  "create_time",
  "CreateTime",
  "createTime",
  "gmt_create",
  "GmtCreate",
  "gmtCreate",
  "date_created",
  "DateCreated",
  "dateCreated",
];

const DARAZ_UPDATED_TIME_KEYS = [
  "_daraz_updated_time",
  "updated_time",
  "UpdatedTime",
  "updatedTime",
  "update_time",
  "UpdateTime",
  "updateTime",
  "modified_time",
  "ModifiedTime",
  "modifiedTime",
  "gmt_modified",
  "GmtModified",
  "gmtModified",
  "date_modified",
  "DateModified",
  "dateModified",
];

function createProductSyncError(
  message,
  statusCode = 400,
  code = "DARAZ_PRODUCT_SYNC_ERROR"
) {
  const error = new Error(message);
  error.statusCode = statusCode;
  error.code = code;
  return error;
}

function getPayload(response) {
  if (response?.success === true && response?.data) {
    return response.data;
  }

  return response || {};
}

function extractProducts(response) {
  const payload = getPayload(response);

  const candidates = [
    payload?.data?.products,
    payload?.data?.Products,
    payload?.data?.items,
    payload?.data?.Items,
    payload?.data?.data?.products,
    payload?.data?.data?.Products,
    payload?.data?.data?.items,
    payload?.data?.data?.Items,
    payload?.data?.result?.products,
    payload?.data?.result?.Products,
    payload?.data?.result?.items,
    payload?.data?.result?.Items,
    payload?.result?.products,
    payload?.result?.Products,
    payload?.result?.items,
    payload?.result?.Items,
    payload?.products,
    payload?.Products,
    payload?.items,
    payload?.Items,
  ];

  for (const candidate of candidates) {
    if (Array.isArray(candidate)) return candidate;
  }

  for (const candidate of candidates) {
    if (candidate && typeof candidate === "object") {
      const arrayValue = Object.values(candidate).find((value) =>
        Array.isArray(value)
      );

      if (arrayValue) return arrayValue;
    }
  }

  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload)) return payload;

  return [];
}

function extractTotal(response) {
  const payload = getPayload(response);

  return Number(
    payload?.data?.total_products ||
      payload?.data?.TotalProducts ||
      payload?.data?.total ||
      payload?.data?.Total ||
      payload?.data?.data?.total_products ||
      payload?.data?.data?.TotalProducts ||
      payload?.data?.data?.total ||
      payload?.data?.data?.Total ||
      payload?.data?.result?.total ||
      payload?.data?.result?.Total ||
      payload?.result?.total ||
      payload?.result?.Total ||
      payload?.total ||
      payload?.Total ||
      0
  );
}

function getDarazItemId(product) {
  return (
    product?.item_id ||
    product?.ItemId ||
    product?.itemId ||
    product?.id ||
    product?.product_id ||
    product?.ProductId ||
    product?.productId ||
    null
  );
}

function getProductSku(product) {
  return (
    product?.sku ||
    product?.Sku ||
    product?.seller_sku ||
    product?.SellerSku ||
    product?.sellerSku ||
    product?.shop_sku ||
    product?.ShopSku ||
    product?.skus?.[0]?.SellerSku ||
    product?.skus?.[0]?.seller_sku ||
    product?.skus?.[0]?.ShopSku ||
    product?.skus?.[0]?.shop_sku ||
    product?.skus?.[0]?.sku ||
    product?.Skus?.[0]?.SellerSku ||
    product?.Skus?.[0]?.seller_sku ||
    product?.Skus?.[0]?.ShopSku ||
    product?.Skus?.[0]?.shop_sku ||
    product?.Skus?.[0]?.sku ||
    null
  );
}

function getProductStatus(product) {
  return (
    product?.status ||
    product?.Status ||
    product?.product_status ||
    product?.ProductStatus ||
    product?.approval_status ||
    product?.ApprovalStatus ||
    product?.skus?.[0]?.Status ||
    product?.skus?.[0]?.status ||
    product?.Skus?.[0]?.Status ||
    product?.Skus?.[0]?.status ||
    null
  );
}

function isDarazApiError(response) {
  const payload = getPayload(response);

  if (!payload) return false;
  if (payload.ErrorResponse) return true;
  if (payload.error_response) return true;
  if (payload.type === "ISV" || payload.type === "ISP") return true;

  if (
    payload.code &&
    String(payload.code) !== "0" &&
    String(payload.code).toLowerCase() !== "success"
  ) {
    return true;
  }

  if (
    payload.error_code &&
    String(payload.error_code) !== "0" &&
    String(payload.error_code).toLowerCase() !== "success"
  ) {
    return true;
  }

  return false;
}

function getDarazApiErrorMessage(response) {
  const payload = getPayload(response);

  if (!payload) return "Unknown Daraz API error";

  if (payload.ErrorResponse) {
    return JSON.stringify(payload.ErrorResponse);
  }

  if (payload.error_response) {
    return JSON.stringify(payload.error_response);
  }

  return `${payload.code || payload.error_code || "UNKNOWN"} - ${
    payload.message || payload.msg || payload.error_message || "Daraz API error"
  }`;
}

function extractDetailPayload(detailResponse) {
  const payload = getPayload(detailResponse);

  return (
    payload?.data?.data ||
    payload?.data?.result ||
    payload?.data?.product ||
    payload?.data?.item ||
    payload?.result ||
    payload?.product ||
    payload?.item ||
    payload?.data ||
    payload
  );
}

function findDeepValue(object, keys = []) {
  if (!object || typeof object !== "object") return null;

  for (const key of keys) {
    if (
      Object.prototype.hasOwnProperty.call(object, key) &&
      object[key] !== undefined &&
      object[key] !== null &&
      object[key] !== ""
    ) {
      return object[key];
    }
  }

  for (const value of Object.values(object)) {
    if (value && typeof value === "object") {
      const found = findDeepValue(value, keys);

      if (found !== null && found !== undefined && found !== "") {
        return found;
      }
    }
  }

  return null;
}

function mergeProductWithDetail(
  listProduct = {},
  detailPayload = {},
  currentFilter = ""
) {
  const detailCreatedTime = findDeepValue(
    detailPayload || {},
    DARAZ_CREATED_TIME_KEYS
  );

  const detailUpdatedTime = findDeepValue(
    detailPayload || {},
    DARAZ_UPDATED_TIME_KEYS
  );

  const listCreatedTime = findDeepValue(
    listProduct || {},
    DARAZ_CREATED_TIME_KEYS
  );

  const listUpdatedTime = findDeepValue(
    listProduct || {},
    DARAZ_UPDATED_TIME_KEYS
  );

  const darazCreatedTime = detailCreatedTime || listCreatedTime || null;
  const darazUpdatedTime = detailUpdatedTime || listUpdatedTime || null;

  return {
    ...listProduct,
    ...(detailPayload || {}),
    synced_filter: currentFilter,
    _daraz_created_time: darazCreatedTime,
    _daraz_updated_time: darazUpdatedTime,
    created_time: darazCreatedTime,
    updated_time: darazUpdatedTime,
  };
}

function resolveSyncAction(saveResult) {
  if (saveResult?.sync_action) return saveResult.sync_action;
  if (saveResult?.syncAction) return saveResult.syncAction;
  if (saveResult?.action) return saveResult.action;

  const affectedRows = Number(
    saveResult?.result?.affectedRows || saveResult?.affectedRows || 0
  );

  const insertId = Number(
    saveResult?.result?.insertId || saveResult?.insertId || 0
  );

  if (affectedRows === 1 && insertId > 0) return "new_synced";
  if (affectedRows >= 2) return "updated_synced";

  return "already_synced";
}

function createFailedResult({ product, error, filter }) {
  return {
    filter,
    item_id: getDarazItemId(product),
    sku: getProductSku(product),
    status: getProductStatus(product),
    message: error?.message || "Product sync failed",
    code: error?.code || null,
    request_id: error?.request_id || null,
    trace_id: error?.trace_id || null,
  };
}

function createFilterSummary() {
  return {
    api_total: 0,
    extracted_listing: 0,
    success_listing: 0,
    already_synced_listing: 0,
    new_synced_listing: 0,
    updated_synced_listing: 0,
    failed_listing: 0,
    duplicate_skipped_listing: 0,
    detail_failed_listing: 0,
    unsupported: false,
    error_message: null,
  };
}

function isUnsupportedFilterError(error) {
  const code = String(error?.code || error?.daraz?.code || "").toLowerCase();
  const message = String(
    error?.message || error?.daraz?.message || ""
  ).toLowerCase();

  return (
    code.includes("invalid") ||
    code.includes("illegal") ||
    code.includes("unsupported") ||
    message.includes("invalid") ||
    message.includes("illegal") ||
    message.includes("unsupported") ||
    message.includes("not support")
  );
}

async function safeFinishSyncRun(payload) {
  try {
    await darazProductSyncModel.finishSyncRun({
      run_id: payload.run_id,
      status: payload.status,
      total_found: payload.total_found,
      total_saved: payload.total_saved,
      total_failed: payload.total_failed,
      error_message: payload.error_message || null,
    });
  } catch (error) {
    console.error("[DARAZ_PRODUCT_SYNC_FINISH_FAIL]:", {
      message: error?.message,
      code: error?.code,
      sqlMessage: error?.sqlMessage,
    });
  }
}

async function getProductsPage({
  account,
  credentials,
  offset = 0,
  limit = 50,
  filter = "all",
}) {
  const query = {
    filter: filter || "all",
    offset,
    limit,
  };

  const response = await callDarazApi({
    account,
    credentials,
    apiPath: "/products/get",
    method: "GET",
    requestType: "daraz_products_get",
    query,
  });

  return response;
}

async function getProductDetail({ account, credentials, item_id }) {
  if (!item_id) {
    throw createProductSyncError(
      "Daraz item_id is required for product detail.",
      400,
      "DARAZ_ITEM_ID_REQUIRED"
    );
  }

  const response = await callDarazApi({
    account,
    credentials,
    apiPath: "/product/item/get",
    method: "GET",
    requestType: "daraz_product_item_get",
    query: {
      item_id,
    },
  });

  if (isDarazApiError(response)) {
    throw createProductSyncError(
      `Daraz API Error: ${getDarazApiErrorMessage(response)}`,
      502,
      "DARAZ_PRODUCT_DETAIL_API_ERROR"
    );
  }

  return response;
}

async function syncDarazProducts({
  account,
  credentials,
  sync_type = "manual",
  withDetail = true,
  filter = "all_products",
}) {
  if (!account?.id) {
    throw createProductSyncError(
      "Daraz account missing.",
      400,
      "DARAZ_ACCOUNT_MISSING"
    );
  }

  if (!credentials?.access_token) {
    throw createProductSyncError(
      "Daraz access token missing.",
      401,
      "DARAZ_ACCESS_TOKEN_MISSING"
    );
  }

  const account_id = account.id;

  const run_id = await darazProductSyncModel.createSyncRun({
    account_id,
    sync_type,
  });

  let totalListing = 0;
  let totalSuccessListing = 0;
  let totalAlreadySyncedListing = 0;
  let totalNewSyncedListing = 0;
  let totalUpdatedSyncedListing = 0;
  let totalFailedSyncedListing = 0;
  let totalDetailFailedListing = 0;
  let totalDuplicateSkippedListing = 0;

  const seenItemIds = new Set();
  const failedResults = [];
  const unsupportedFilters = [];
  const filterErrors = [];
  const filterSummary = {};

  try {
    const filtersToSync =
      filter && filter !== "all_products" && filter !== "all_statuses"
        ? [filter]
        : PRODUCT_FILTERS;

    for (const currentFilter of filtersToSync) {
      filterSummary[currentFilter] = createFilterSummary();

      const limit = 50;
      let offset = 0;
      let page = 1;
      let hasMore = true;

      while (hasMore) {
        let response;

        try {
          response = await getProductsPage({
            account,
            credentials,
            offset,
            limit,
            filter: currentFilter,
          });

          if (isDarazApiError(response)) {
            throw createProductSyncError(
              `Daraz API Error: ${getDarazApiErrorMessage(response)}`,
              502,
              "DARAZ_PRODUCTS_API_ERROR"
            );
          }
        } catch (filterError) {
          if (isUnsupportedFilterError(filterError)) {
            filterSummary[currentFilter].unsupported = true;
            filterSummary[currentFilter].error_message =
              filterError?.message || "Unsupported filter";

            unsupportedFilters.push(currentFilter);
            break;
          }

          filterSummary[currentFilter].error_message =
            filterError?.message || "Filter sync failed";

          filterErrors.push({
            filter: currentFilter,
            message: filterError?.message || "Filter sync failed",
            code: filterError?.code || null,
            request_id: filterError?.request_id || null,
            trace_id: filterError?.trace_id || null,
          });

          break;
        }

        const products = extractProducts(response);
        const apiTotal = extractTotal(response);

        filterSummary[currentFilter].api_total = apiTotal;
        filterSummary[currentFilter].extracted_listing += products.length;

        if (!products.length) {
          hasMore = false;
          break;
        }

        for (const listProduct of products) {
          const baseItemId = getDarazItemId(listProduct);

          if (baseItemId && seenItemIds.has(String(baseItemId))) {
            totalDuplicateSkippedListing += 1;
            filterSummary[currentFilter].duplicate_skipped_listing += 1;
            continue;
          }

          if (baseItemId) {
            seenItemIds.add(String(baseItemId));
          }

          totalListing += 1;

          try {
            let finalProduct = listProduct;
            const itemId = getDarazItemId(listProduct);

            if (withDetail && itemId) {
              try {
                const detailResponse = await getProductDetail({
                  account,
                  credentials,
                  item_id: itemId,
                });

                const detailPayload = extractDetailPayload(detailResponse);

                finalProduct = mergeProductWithDetail(
                  listProduct,
                  detailPayload,
                  currentFilter
                );
              } catch (detailError) {
                totalDetailFailedListing += 1;
                filterSummary[currentFilter].detail_failed_listing += 1;

                finalProduct = mergeProductWithDetail(
                  listProduct,
                  {},
                  currentFilter
                );
              }
            } else {
              finalProduct = mergeProductWithDetail(
                finalProduct,
                {},
                currentFilter
              );
            }

            const darazItemId = getDarazItemId(finalProduct);

            if (!darazItemId) {
              throw createProductSyncError(
                "Daraz item ID missing from product response.",
                422,
                "DARAZ_ITEM_ID_MISSING"
              );
            }

            const saveResult = await darazProductSyncModel.upsertDarazProduct({
              account_id,
              product: finalProduct,
              run_id,
              sync_filter: currentFilter,
            });

            await darazProductSyncModel.upsertDarazVariants({
              account_id,
              daraz_item_id: darazItemId,
              product: finalProduct,
            });

            const syncAction = resolveSyncAction(saveResult);

            totalSuccessListing += 1;
            filterSummary[currentFilter].success_listing += 1;

            if (syncAction === "new_synced") {
              totalNewSyncedListing += 1;
              filterSummary[currentFilter].new_synced_listing += 1;
            } else if (syncAction === "already_synced") {
              totalAlreadySyncedListing += 1;
              filterSummary[currentFilter].already_synced_listing += 1;
            } else {
              totalUpdatedSyncedListing += 1;
              filterSummary[currentFilter].updated_synced_listing += 1;
            }
          } catch (productError) {
            totalFailedSyncedListing += 1;
            filterSummary[currentFilter].failed_listing += 1;

            const failedItem = createFailedResult({
              product: listProduct,
              error: productError,
              filter: currentFilter,
            });

            failedResults.push(failedItem);
          }
        }

        if (products.length < limit) {
          hasMore = false;
        } else {
          offset += limit;
          page += 1;
        }
      }
    }

    const finalStatus =
      totalFailedSyncedListing > 0 || filterErrors.length > 0
        ? "partial_success"
        : "success";

    await safeFinishSyncRun({
      run_id,
      status: finalStatus,
      total_found: totalListing,
      total_saved: totalSuccessListing,
      total_failed: totalFailedSyncedListing,
      error_message:
        totalFailedSyncedListing > 0 || filterErrors.length > 0
          ? `${totalFailedSyncedListing} products failed. ${filterErrors.length} filter errors. ${totalDetailFailedListing} detail requests failed.`
          : null,
    });

    return {
      success: true,
      message: `Daraz product sync completed. Total: ${totalListing}, Success: ${totalSuccessListing}, Already synced: ${totalAlreadySyncedListing}, New synced: ${totalNewSyncedListing}, Updated synced: ${totalUpdatedSyncedListing}, Failed: ${totalFailedSyncedListing}.`,
      run_id,
      account_id,
      account_code: account.account_code || null,
      status: finalStatus,
      requested_filter: filter,
      filters_used: filtersToSync,
      unsupported_filters: unsupportedFilters,
      total_listing: totalListing,
      total_success_listing: totalSuccessListing,
      total_already_synced_listing: totalAlreadySyncedListing,
      total_new_synced_listing: totalNewSyncedListing,
      total_updated_synced_listing: totalUpdatedSyncedListing,
      total_failed_synced_listing: totalFailedSyncedListing,
      total_detail_failed_listing: totalDetailFailedListing,
      total_duplicate_skipped_listing: totalDuplicateSkippedListing,
      total_filter_errors: filterErrors.length,
      filter_summary: filterSummary,
      failed_results: totalFailedSyncedListing > 0 ? failedResults : [],
      filter_errors: filterErrors,
    };
  } catch (error) {
    if (failedResults.length === 0) {
      failedResults.push({
        filter,
        item_id: null,
        sku: null,
        status: null,
        message: error?.message || "Daraz product sync failed.",
        code: error?.code || null,
        request_id: error?.request_id || null,
        trace_id: error?.trace_id || null,
      });
    }

    await safeFinishSyncRun({
      run_id,
      status: "failed",
      total_found: totalListing,
      total_saved: totalSuccessListing,
      total_failed: totalFailedSyncedListing || 1,
      error_message: error?.message || "Daraz product sync failed.",
    });

    const finalError = createProductSyncError(
      error?.message || "Daraz product sync failed.",
      error?.statusCode || 500,
      error?.code || "DARAZ_PRODUCT_SYNC_FAILED"
    );

    finalError.details = {
      run_id,
      account_id,
      account_code: account.account_code || null,
      requested_filter: filter,
      total_listing: totalListing,
      total_success_listing: totalSuccessListing,
      total_already_synced_listing: totalAlreadySyncedListing,
      total_new_synced_listing: totalNewSyncedListing,
      total_updated_synced_listing: totalUpdatedSyncedListing,
      total_failed_synced_listing: totalFailedSyncedListing || 1,
      total_detail_failed_listing: totalDetailFailedListing,
      total_duplicate_skipped_listing: totalDuplicateSkippedListing,
      total_filter_errors: filterErrors.length,
      unsupported_filters: unsupportedFilters,
      filter_summary: filterSummary,
      failed_results: failedResults,
      filter_errors: filterErrors,
      request_id: error?.request_id || null,
      trace_id: error?.trace_id || null,
      daraz: error?.daraz || null,
    };

    throw finalError;
  }
}

module.exports = {
  syncDarazProducts,
  extractProducts,
  extractTotal,
  getDarazItemId,
};