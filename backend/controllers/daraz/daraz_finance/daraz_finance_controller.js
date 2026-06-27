const darazFinanceService = require("../../../services/daraz/daraz_finance/daraz_finance_api_service");
const darazFinanceModel = require("../../../models/daraz/daraz_finance/daraz_finance_model");
const db = require("../../../config/marketplace_management_db/cm_marketplace_management");
const accountModel = require("../../../models/marketplace/account_model");


/* =====================================================
   RESPONSE HELPERS
===================================================== */

function sendSuccess(res, message, data) {
  return res.json({
    success: true,
    message,
    data,
  });
}

function sendError(res, error) {
  return res.status(error.statusCode || 500).json({
    success: false,
    message: error.message || "Daraz finance API request failed.",
    daraz_error: error.daraz || null,
  });
}

/* =====================================================
   PLAIN TEXT CREDENTIAL HELPERS
===================================================== */

function safePlain(value) {
  if (value === undefined || value === null || value === "") return null;
  return String(value);
}

/* =====================================================
   ACCOUNT + CREDENTIAL RESOLVER
===================================================== */

function getAccountInput(req) {
  return {
    account_id: req.query.account_id || req.body?.account_id || null,
    account_code: req.query.account_code || req.body?.account_code || null,
  };
}

async function getAccountByCode(accountCode) {
  const accounts = await accountModel.getAllAccounts();

  return (
    accounts.find(
      (account) =>
        String(account.account_code || "").toLowerCase() ===
          String(accountCode || "").toLowerCase() &&
        String(account.platform_code || "").toUpperCase() === "DARAZ"
    ) || null
  );
}

async function resolveDarazAccount({ account_id, account_code }) {
  let account = null;

  if (account_id) {
    account = await accountModel.getAccountById(account_id);
  }

  if (!account && account_code) {
    account = await getAccountByCode(account_code);
  }

  if (!account) {
    const error = new Error("Daraz account not found.");
    error.statusCode = 404;
    throw error;
  }

  if (String(account.platform_code || "").toUpperCase() !== "DARAZ") {
    const error = new Error("Selected account is not a Daraz account.");
    error.statusCode = 400;
    throw error;
  }

  return account;
}

async function getDarazCredentialRow(accountId) {
  const [rows] = await db.query(
    `
    SELECT *
    FROM account_credentials
    WHERE account_id = ?
      AND credential_type = 'daraz_oauth'
    ORDER BY
      CASE
        WHEN token_status = 'valid' THEN 0
        ELSE 1
      END,
      updated_at DESC,
      id DESC
    LIMIT 1
    `,
    [accountId]
  );

  return rows[0] || null;
}

async function resolveDarazCredentials(accountId) {
  const row = await getDarazCredentialRow(accountId);

  if (!row) {
    const error = new Error("Daraz account credentials not found.");
    error.statusCode = 404;
    throw error;
  }

  const credentials = {
    id: row.id,
    account_id: row.account_id,

    app_key: safePlain(row.app_key_encrypted || row.app_key),
    app_secret: safePlain(row.app_secret_encrypted || row.app_secret),
    access_token: safePlain(row.access_token_encrypted || row.access_token),
    refresh_token: safePlain(row.refresh_token_encrypted || row.refresh_token),

    consumer_key: safePlain(row.consumer_key_encrypted || row.consumer_key),
    consumer_secret: safePlain(row.consumer_secret_encrypted || row.consumer_secret),

    access_token_expires_at: row.access_token_expires_at,
    refresh_token_expires_at: row.refresh_token_expires_at,
    token_status: row.token_status,
  };

  if (!credentials.app_key) {
    const error = new Error("Daraz app_key missing in account_credentials.");
    error.statusCode = 400;
    throw error;
  }

  if (!credentials.app_secret) {
    const error = new Error("Daraz app_secret missing in account_credentials.");
    error.statusCode = 400;
    throw error;
  }

  if (!credentials.access_token) {
    const error = new Error("Daraz access_token missing in account_credentials.");
    error.statusCode = 400;
    throw error;
  }

  return credentials;
}

async function resolveDarazFinanceContext(req) {
  const { account_id, account_code } = getAccountInput(req);

  const accountError = validateAccount(account_id, account_code);
  if (accountError) {
    const error = new Error(accountError);
    error.statusCode = 400;
    throw error;
  }

  const account = await resolveDarazAccount({
    account_id,
    account_code,
  });

  const credentials = await resolveDarazCredentials(account.id);

  return {
    account,
    credentials,
  };
}

/* =====================================================
   VALIDATION HELPERS
===================================================== */

function safeLimit(value) {
  const limit = Number(value || 500);

  if (!Number.isFinite(limit)) return 500;

  return Math.min(Math.max(limit, 1), 500);
}

function safeOffset(value) {
  const offset = Number(value || 0);

  if (!Number.isFinite(offset)) return 0;

  return Math.max(offset, 0);
}

function safeMaxPages(value) {
  const pages = Number(value || 20);

  if (!Number.isFinite(pages)) return 20;

  return Math.min(Math.max(pages, 1), 50);
}

function validateAccount(account_id, account_code) {
  if (!account_id && !account_code) {
    return "account_id or account_code is required.";
  }

  return null;
}

function validateCreatedAfter(created_after) {
  if (!created_after) {
    return "created_after is required. Example: 2026-06-01";
  }

  return null;
}

function defaultDateOnly(date) {
  return date.toISOString().slice(0, 10);
}

function resolveDateRange(req) {
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - 30);

  return {
    start_time: req.query.start_time || req.query.date_from || req.body?.start_time || req.body?.date_from || defaultDateOnly(start),
    end_time: req.query.end_time || req.query.date_to || req.body?.end_time || req.body?.date_to || defaultDateOnly(end),
  };
}

function validateDateRange(start_time, end_time) {

  const startDate = new Date(start_time);
  const endDate = new Date(end_time);

  if (Number.isNaN(startDate.getTime())) {
    return "Invalid start_time.";
  }

  if (Number.isNaN(endDate.getTime())) {
    return "Invalid end_time.";
  }

  if (startDate > endDate) {
    return "start_time cannot be greater than end_time.";
  }

  const diffDays = Math.ceil(
    (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
  );

  if (diffDays > 180) {
    return "Daraz finance date range should be 180 days or less.";
  }

  return null;
}

/* =====================================================
   CONTROLLERS
===================================================== */

async function checkFinancePermission(req, res) {
  try {
    const { account, credentials } = await resolveDarazFinanceContext(req);

    const data = await darazFinanceService.checkFinancePermission({
      account,
      credentials,
    });

    return sendSuccess(res, "Daraz finance permission checked.", data);
  } catch (error) {
    return sendError(res, error);
  }
}

async function getPayoutStatus(req, res) {
  try {
    const created_after = req.query.created_after || req.body?.created_after;

    const createdAfterError = validateCreatedAfter(created_after);
    if (createdAfterError) {
      return res.status(400).json({
        success: false,
        message: createdAfterError,
      });
    }

    const { account, credentials } = await resolveDarazFinanceContext(req);

    const data = await darazFinanceService.getPayoutStatus({
      account,
      credentials,
      created_after,
    });

    data.database = await darazFinanceModel.savePayouts({
      account,
      created_after,
      rows: data.rows || [],
    });

    return sendSuccess(res, "Daraz payout status loaded and saved successfully.", data);
  } catch (error) {
    return sendError(res, error);
  }
}

async function getTransactionDetails(req, res) {
  try {
    const { start_time, end_time } = resolveDateRange(req);

    const dateError = validateDateRange(start_time, end_time);
    if (dateError) {
      return res.status(400).json({
        success: false,
        message: dateError,
      });
    }

    const { account, credentials } = await resolveDarazFinanceContext(req);

    const data = await darazFinanceService.getTransactionDetails({
      account,
      credentials,
      start_time,
      end_time,
      limit: safeLimit(req.query.limit || req.body?.limit),
      offset: safeOffset(req.query.offset || req.body?.offset),
      trans_type: req.query.trans_type || req.body?.trans_type || -1,
      trade_order_id: req.query.trade_order_id || req.body?.trade_order_id,
      trade_order_line_id:
        req.query.trade_order_line_id || req.body?.trade_order_line_id,
    });

    data.database = await darazFinanceModel.saveTransactions({
      account,
      start_time,
      end_time,
      rows: data.rows || [],
    });

    return sendSuccess(
      res,
      "Daraz transaction details loaded and saved successfully.",
      data
    );
  } catch (error) {
    return sendError(res, error);
  }
}

async function getFinanceSummary(req, res) {
  try {
    const { start_time, end_time } = resolveDateRange(req);

    const dateError = validateDateRange(start_time, end_time);
    if (dateError) {
      return res.status(400).json({
        success: false,
        message: dateError,
      });
    }

    const { account, credentials } = await resolveDarazFinanceContext(req);

    const data = await darazFinanceService.getFinanceSummary({
      account,
      credentials,
      start_time,
      end_time,
      trans_type: req.query.trans_type || req.body?.trans_type || -1,
      trade_order_id: req.query.trade_order_id || req.body?.trade_order_id,
      trade_order_line_id:
        req.query.trade_order_line_id || req.body?.trade_order_line_id,
      max_pages: safeMaxPages(req.query.max_pages || req.body?.max_pages),
    });

    data.database = await darazFinanceModel.saveTransactions({
      account,
      start_time,
      end_time,
      rows: (data.raw_lines || []).map((row) => row.raw || row),
    });

    return sendSuccess(res, "Daraz finance summary loaded and saved successfully.", data);
  } catch (error) {
    return sendError(res, error);
  }
}

async function getOrderFinanceDetails(req, res) {
  try {
    const trade_order_id =
      req.params.order_no ||
      req.params.order_id ||
      req.query.trade_order_id ||
      req.body?.trade_order_id;

    const { start_time, end_time } = resolveDateRange(req);

    if (!trade_order_id) {
      return res.status(400).json({
        success: false,
        message: "trade_order_id or order_no is required.",
      });
    }

    const dateError = validateDateRange(start_time, end_time);
    if (dateError) {
      return res.status(400).json({
        success: false,
        message: dateError,
      });
    }

    const { account, credentials } = await resolveDarazFinanceContext(req);

    const data = await darazFinanceService.getFinanceSummary({
      account,
      credentials,
      start_time,
      end_time,
      trade_order_id,
      max_pages: 2,
    });

    data.database = await darazFinanceModel.saveTransactions({
      account,
      start_time,
      end_time,
      rows: (data.raw_lines || []).map((row) => row.raw || row),
    });

    return sendSuccess(
      res,
      "Daraz order finance details loaded and saved successfully.",
      data
    );
  } catch (error) {
    return sendError(res, error);
  }
}

module.exports = {
  checkFinancePermission,
  getPayoutStatus,
  getTransactionDetails,
  getFinanceSummary,
  getOrderFinanceDetails,
};