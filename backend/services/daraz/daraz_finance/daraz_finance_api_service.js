const {
  callDarazApi,
} = require("../../marketplace/daraz_api_service");

const PAYOUT_STATUS_PATH = "/finance/payout/status/get";
const TRANSACTION_DETAIL_PATH = "/finance/transaction/details/get";

function previewJson(value, maxLength = 4000) {
  try {
    const text = JSON.stringify(value, null, 2);
    return text.length > maxLength ? text.substring(0, maxLength) + "..." : text;
  } catch {
    return String(value);
  }
}

function isDarazApiError(response) {
  if (!response) return false;
  if (response.ErrorResponse) return true;
  if (response.type === "ISV" || response.type === "ISP") return true;
  if (response.code && String(response.code) !== "0") return true;
  if (response.error_code && String(response.error_code) !== "0") return true;

  return false;
}

function getDarazApiErrorPayload(response) {
  if (!response) {
    return {
      type: null,
      code: "UNKNOWN",
      message: "Unknown Daraz API error",
      request_id: null,
      _trace_id_: null,
      raw: null,
    };
  }

  if (response.ErrorResponse) {
    return {
      type: response.ErrorResponse.type || null,
      code: response.ErrorResponse.code || "UNKNOWN",
      message: response.ErrorResponse.message || "Daraz API error",
      request_id: response.ErrorResponse.request_id || null,
      _trace_id_: response.ErrorResponse._trace_id_ || null,
      raw: response.ErrorResponse,
    };
  }

  return {
    type: response.type || null,
    code: response.code || response.error_code || "UNKNOWN",
    message:
      response.message ||
      response.msg ||
      response.error_message ||
      "Daraz API error",
    request_id: response.request_id || null,
    _trace_id_: response._trace_id_ || null,
    raw: response,
  };
}

function throwDarazApiError(response) {
  const payload = getDarazApiErrorPayload(response);

  let statusCode = 400;
  let message = payload.message || "Daraz API error";

  if (payload.code === "InsufficientPermission") {
    statusCode = 403;
    message =
      "Daraz Finance API permission is blocked for this app/seller token. Product APIs can work separately. Re-authorize seller account after enabling Finance permission.";
  }

  if (
    payload.code === "InvalidAccessToken" ||
    payload.code === "IllegalAccessToken" ||
    payload.code === "ExpiredAccessToken"
  ) {
    statusCode = 401;
    message =
      "Daraz access token is invalid or expired. Refresh token or re-authorize seller account.";
  }

  if (
    payload.code === "InvalidParameter" ||
    payload.code === "MissingParameter" ||
    payload.code === "IllegalArgument"
  ) {
    statusCode = 422;
    message = payload.message || "Invalid Daraz Finance API request parameters.";
  }

  const error = new Error(message);
  error.statusCode = statusCode;
  error.daraz = payload;

  throw error;
}

function extractArrayFromObject(objectValue) {
  if (!objectValue || typeof objectValue !== "object") return [];

  const arrayValue = Object.values(objectValue).find((value) =>
    Array.isArray(value)
  );

  return arrayValue || [];
}

function getPayoutRows(response) {
  const candidates = [
    response?.data?.data,
    response?.data?.payouts,
    response?.data?.Payouts,
    response?.data?.statements,
    response?.data?.Statements,
    response?.data?.statement,
    response?.data?.Statement,
    response?.data?.list,
    response?.data?.items,
    response?.data?.result,
    response?.result?.payouts,
    response?.result?.statements,
    response?.result?.list,
    response?.result?.items,
    response?.payouts,
    response?.statements,
    response?.list,
    response?.items,
  ];

  for (const candidate of candidates) {
    if (Array.isArray(candidate)) return candidate;
  }

  for (const candidate of candidates) {
    if (candidate && typeof candidate === "object") {
      const nestedArray = extractArrayFromObject(candidate);
      if (nestedArray.length) return nestedArray;
      return [candidate];
    }
  }

  if (Array.isArray(response?.data)) return response.data;
  if (Array.isArray(response?.result)) return response.result;

  return [];
}

function getTransactionRows(response) {
  const candidates = [
    response?.data?.data,
    response?.data?.transactions,
    response?.data?.Transactions,
    response?.data?.transaction,
    response?.data?.Transaction,
    response?.data?.transaction_details,
    response?.data?.TransactionDetails,
    response?.data?.transaction_detail,
    response?.data?.details,
    response?.data?.Details,
    response?.data?.list,
    response?.data?.items,
    response?.data?.result,

    response?.result?.transactions,
    response?.result?.Transactions,
    response?.result?.transaction_details,
    response?.result?.details,
    response?.result?.list,
    response?.result?.items,

    response?.transactions,
    response?.Transactions,
    response?.transaction_details,
    response?.details,
    response?.list,
    response?.items,
  ];

  for (const candidate of candidates) {
    if (Array.isArray(candidate)) return candidate;
  }

  for (const candidate of candidates) {
    if (candidate && typeof candidate === "object") {
      const nestedArray = extractArrayFromObject(candidate);
      if (nestedArray.length) return nestedArray;
    }
  }

  if (Array.isArray(response?.data)) return response.data;
  if (Array.isArray(response?.result)) return response.result;

  return [];
}

function toNumber(value) {
  if (value === undefined || value === null || value === "") return 0;

  const number = Number(String(value).replace(/,/g, "").trim());

  return Number.isFinite(number) ? number : 0;
}

function normalizeTransactionLine(line = {}) {
  const feeName =
    line.fee_name ||
    line.feeName ||
    line.details ||
    line.detail ||
    line.transaction_type ||
    line.transactionType ||
    line.fee_type ||
    line.feeType ||
    line.name ||
    "Unknown Fee";

  const amount = toNumber(
    line.amount ||
      line.Amount ||
      line.fee_amount ||
      line.feeAmount ||
      line.transaction_amount ||
      line.transactionAmount ||
      line.total_amount ||
      line.totalAmount
  );

  const label = String(feeName).toLowerCase();

  let category = "other";

  if (
    label.includes("penalty") ||
    label.includes("fine") ||
    label.includes("seller fault") ||
    label.includes("late") ||
    label.includes("cancellation") ||
    label.includes("cancel")
  ) {
    category = "penalty";
  } else if (label.includes("refund") || label.includes("return")) {
    category = "refund";
  } else if (
    label.includes("shipping") ||
    label.includes("shipment") ||
    label.includes("logistic") ||
    label.includes("delivery")
  ) {
    category = "shipping";
  } else if (
    label.includes("commission") ||
    label.includes("fee") ||
    label.includes("charge") ||
    label.includes("payment")
  ) {
    category = "fee";
  } else if (
    label.includes("item revenue") ||
    label.includes("revenue") ||
    label.includes("sale") ||
    label.includes("sales")
  ) {
    category = "revenue";
  } else if (amount < 0) {
    category = "expense";
  }

  return {
    order_no:
      line.order_no ||
      line.orderNo ||
      line.trade_order_id ||
      line.tradeOrderId ||
      line.order_id ||
      line.orderId ||
      null,

    order_item_no:
      line.orderItem_no ||
      line.order_item_no ||
      line.orderItemNo ||
      line.trade_order_line_id ||
      line.tradeOrderLineId ||
      line.order_item_id ||
      null,

    seller_sku:
      line.seller_sku ||
      line.sellerSku ||
      line.sku ||
      line.SKU ||
      null,

    fee_name: feeName,
    fee_type: line.fee_type || line.feeType || null,
    transaction_type: line.transaction_type || line.transactionType || null,

    amount,
    vat_amount: toNumber(
      line.VAT_in_amount ||
        line.vat_amount ||
        line.vatAmount ||
        line.tax_amount ||
        line.taxAmount
    ),
    wht_amount: toNumber(
      line.WHT_amount ||
        line.wht_amount ||
        line.whtAmount
    ),

    statement:
      line.statement ||
      line.statement_id ||
      line.statementId ||
      null,

    paid_status:
      line.paid_status ||
      line.paidStatus ||
      line.paid ||
      null,

    transaction_date:
      line.transaction_date ||
      line.transactionDate ||
      line.created_at ||
      line.createdAt ||
      null,

    reference: line.reference || line.ref || null,
    comment: line.comment || line.remarks || null,

    category,
    raw: line,
  };
}

function buildFinanceSummary(lines = []) {
  const normalized = lines.map(normalizeTransactionLine);

  const accountSummary = {
    total_lines: normalized.length,
    total_orders: 0,
    total_revenue: 0,
    total_expense: 0,
    total_fee: 0,
    total_shipping: 0,
    total_refund: 0,
    total_penalty: 0,
    total_other: 0,
    net_amount: 0,
  };

  const orderMap = new Map();
  const feeMap = new Map();

  for (const line of normalized) {
    const orderKey = line.order_no || "NO_ORDER";
    const feeKey = line.fee_name || "Unknown Fee";

    if (!orderMap.has(orderKey)) {
      orderMap.set(orderKey, {
        order_no: line.order_no,
        total_revenue: 0,
        total_expense: 0,
        total_fee: 0,
        total_shipping: 0,
        total_refund: 0,
        total_penalty: 0,
        total_other: 0,
        net_amount: 0,
        fees: {},
        items: [],
      });
    }

    const order = orderMap.get(orderKey);

    if (!feeMap.has(feeKey)) {
      feeMap.set(feeKey, {
        fee_name: feeKey,
        category: line.category,
        count: 0,
        total_amount: 0,
      });
    }

    const fee = feeMap.get(feeKey);

    fee.count += 1;
    fee.total_amount += line.amount;

    order.fees[feeKey] = toNumber(order.fees[feeKey]) + line.amount;
    order.items.push(line);

    accountSummary.net_amount += line.amount;
    order.net_amount += line.amount;

    if (line.category === "revenue") {
      accountSummary.total_revenue += Math.abs(line.amount);
      order.total_revenue += Math.abs(line.amount);
    } else if (line.category === "penalty") {
      accountSummary.total_penalty += Math.abs(line.amount);
      accountSummary.total_expense += Math.abs(line.amount);
      order.total_penalty += Math.abs(line.amount);
      order.total_expense += Math.abs(line.amount);
    } else if (line.category === "refund") {
      accountSummary.total_refund += Math.abs(line.amount);
      accountSummary.total_expense += Math.abs(line.amount);
      order.total_refund += Math.abs(line.amount);
      order.total_expense += Math.abs(line.amount);
    } else if (line.category === "shipping") {
      accountSummary.total_shipping += Math.abs(line.amount);
      order.total_shipping += Math.abs(line.amount);

      if (line.amount < 0) {
        accountSummary.total_expense += Math.abs(line.amount);
        order.total_expense += Math.abs(line.amount);
      }
    } else if (line.category === "fee" || line.category === "expense") {
      accountSummary.total_fee += Math.abs(line.amount);
      accountSummary.total_expense += Math.abs(line.amount);
      order.total_fee += Math.abs(line.amount);
      order.total_expense += Math.abs(line.amount);
    } else {
      accountSummary.total_other += line.amount;
      order.total_other += line.amount;
    }
  }

  const orders = Array.from(orderMap.values()).filter(
    (order) => order.order_no !== null
  );

  accountSummary.total_orders = orders.length;

  return {
    account_summary: accountSummary,
    fee_summary: Array.from(feeMap.values()).sort(
      (a, b) => Math.abs(b.total_amount) - Math.abs(a.total_amount)
    ),
    order_summary: orders.sort(
      (a, b) => Math.abs(b.total_expense) - Math.abs(a.total_expense)
    ),
    raw_lines: normalized,
  };
}

async function getPayoutStatus({ account, credentials, created_after }) {
  if (!account?.id) throw new Error("Daraz account missing");
  if (!credentials?.access_token) throw new Error("Daraz access token missing");

  const query = {
    created_after: String(created_after),
  };

  const response = await callDarazApi({
    account,
    credentials,
    apiPath: PAYOUT_STATUS_PATH,
    method: "GET",
    requestType: "daraz_finance_payout_status_get",
    query,
  });

  console.log("[DARAZ_FINANCE_PAYOUT_QUERY]", query);
  console.log("[DARAZ_FINANCE_PAYOUT_RAW]", previewJson(response));

  if (isDarazApiError(response)) throwDarazApiError(response);

  return {
    success: true,
    account: {
      id: account.id,
      account_code: account.account_code,
      account_name: account.account_name,
    },
    rows: getPayoutRows(response),
    raw: response,
  };
}

async function getTransactionDetails({
  account,
  credentials,
  start_time,
  end_time,
  limit = 500,
  offset = 0,
  trans_type,
  trade_order_id,
  trade_order_line_id,
}) {
  if (!account?.id) throw new Error("Daraz account missing");
  if (!credentials?.access_token) throw new Error("Daraz access token missing");

  const query = {
    start_time: String(start_time),
    end_time: String(end_time),
    limit: String(limit || 500),
    offset: String(offset || 0),
  };

  if (trans_type !== undefined && trans_type !== null && trans_type !== "") {
    query.trans_type = String(trans_type);
  }

  if (trade_order_id) query.trade_order_id = String(trade_order_id);
  if (trade_order_line_id) query.trade_order_line_id = String(trade_order_line_id);

  const response = await callDarazApi({
    account,
    credentials,
    apiPath: TRANSACTION_DETAIL_PATH,
    method: "GET",
    requestType: "daraz_finance_transaction_details_get",
    query,
  });

  console.log("[DARAZ_FINANCE_TRANSACTION_QUERY]", query);
  console.log("[DARAZ_FINANCE_TRANSACTION_RAW]", previewJson(response));

  if (isDarazApiError(response)) throwDarazApiError(response);

  return {
    success: true,
    account: {
      id: account.id,
      account_code: account.account_code,
      account_name: account.account_name,
    },
    rows: getTransactionRows(response),
    raw: response,
  };
}

async function getAllTransactionDetails({
  account,
  credentials,
  start_time,
  end_time,
  trans_type,
  trade_order_id,
  trade_order_line_id,
  max_pages = 20,
}) {
  const limit = 500;
  let offset = 0;
  let page = 1;
  let pagesChecked = 0;
  let allRows = [];
  let lastRaw = null;

  while (page <= max_pages) {
    const result = await getTransactionDetails({
      account,
      credentials,
      start_time,
      end_time,
      limit,
      offset,
      trans_type,
      trade_order_id,
      trade_order_line_id,
    });

    pagesChecked += 1;

    const rows = result.rows || [];
    allRows = allRows.concat(rows);
    lastRaw = result.raw;

    console.log("[DARAZ_FINANCE_TRANSACTION_PAGE_RESULT]", {
      page,
      offset,
      limit,
      extractedRows: rows.length,
    });

    if (rows.length < limit) break;

    offset += limit;
    page += 1;
  }

  return {
    success: true,
    account: {
      id: account.id,
      account_code: account.account_code,
      account_name: account.account_name,
    },
    rows: allRows,
    pages_checked: pagesChecked,
    raw: lastRaw,
  };
}

async function getFinanceSummary({
  account,
  credentials,
  start_time,
  end_time,
  trans_type,
  trade_order_id,
  trade_order_line_id,
  max_pages = 20,
}) {
  const result = await getAllTransactionDetails({
    account,
    credentials,
    start_time,
    end_time,
    trans_type,
    trade_order_id,
    trade_order_line_id,
    max_pages,
  });

  const summary = buildFinanceSummary(result.rows);

  return {
    success: true,
    account: result.account,
    pages_checked: result.pages_checked,
    ...summary,
  };
}

async function checkFinancePermission({ account, credentials }) {
  if (!account?.id) throw new Error("Daraz account missing");
  if (!credentials?.access_token) throw new Error("Daraz access token missing");

  const query = {
    start_time: "2026-06-01",
    end_time: "2026-06-02",
    limit: "1",
    offset: "0",
  };

  const response = await callDarazApi({
    account,
    credentials,
    apiPath: TRANSACTION_DETAIL_PATH,
    method: "GET",
    requestType: "daraz_finance_permission_check",
    query,
  });

  console.log("[DARAZ_FINANCE_PERMISSION_CHECK_QUERY]", query);
  console.log("[DARAZ_FINANCE_PERMISSION_CHECK_RAW]", previewJson(response));

  if (isDarazApiError(response)) {
    const payload = getDarazApiErrorPayload(response);

    return {
      success: false,
      allowed: false,
      code: payload.code,
      message:
        payload.code === "InsufficientPermission"
          ? "Daraz Finance API permission is blocked for this app/seller token. Re-authorize seller account after enabling Finance permission."
          : payload.message,
      daraz_error: payload,
    };
  }

  return {
    success: true,
    allowed: true,
    message: "Daraz Finance API permission is enabled for this seller token.",
    raw: response,
  };
}

module.exports = {
  getPayoutStatus,
  getTransactionDetails,
  getAllTransactionDetails,
  getFinanceSummary,
  checkFinancePermission,
};