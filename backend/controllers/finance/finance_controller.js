const asyncHandler = require("../../middleware/async_handler");
const accessModel = require("../../models/accessModel");
const accountModel = require("../../models/marketplace/account_model");
const ledgerModel = require("../../models/finance/finance_ledger_model");
const dashboardModel = require("../../models/finance/finance_dashboard_model");
const darazModel = require("../../models/finance/finance_daraz_model");
const darazOrderLookupModel = require("../../models/daraz/finance_management/daraz_order_lookup_model");
const credentialModel = require("../../models/marketplace/credential_model");
const darazFinanceSyncService = require("../../services/daraz/finance_management/daraz_finance_sync_service");

const MAX_RANGE_DAYS = 3 * 366;

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function resolveRange(query = {}) {
  const to = ledgerModel.cleanDate(query.date_to) || todayIso();
  const from = ledgerModel.cleanDate(query.date_from) || `${to.slice(0, 7)}-01`;

  if (from > to) {
    const error = new Error("Start date must be on or before end date.");
    error.statusCode = 400;
    throw error;
  }

  const days = (new Date(`${to}T00:00:00Z`) - new Date(`${from}T00:00:00Z`)) / 86400000 + 1;
  if (days > MAX_RANGE_DAYS) {
    const error = new Error("Date range can be at most 3 years.");
    error.statusCode = 400;
    throw error;
  }

  return { from, to };
}

async function loadAccountNames() {
  try {
    const accounts = await accountModel.getAllAccounts({ platform_code: "daraz" });
    return new Map(accounts.map((account) => [Number(account.id), account.account_name]));
  } catch (error) {
    console.error("[FINANCE_ACCOUNT_NAMES_FAILED]", error.message);
    return new Map();
  }
}

async function enrichOrdersWithImages(rows) {
  try {
    const thumbnails = await darazOrderLookupModel.getOrderThumbnailsByOrderNos(
      rows.map((row) => row.order_no)
    );
    return rows.map((row) => ({
      ...row,
      thumbnail_url: thumbnails[row.order_no]?.thumbnail_url || null,
      product_title: thumbnails[row.order_no]?.product_title || row.product_title,
    }));
  } catch (error) {
    console.error("[FINANCE_DARAZ_ORDER_IMAGES_FAILED]", error.message);
    return rows;
  }
}

const getAccess = asyncHandler(async (req, res) => {
  const [dashboardView, ledgerView, ledgerEdit, ledgerDelete, darazView, darazEdit] = await Promise.all([
    accessModel.hasPermission(req.user, "finance_dashboard", "view"),
    accessModel.hasPermission(req.user, "finance_ledger", "view"),
    accessModel.hasPermission(req.user, "finance_ledger", "edit"),
    accessModel.hasPermission(req.user, "finance_ledger", "delete"),
    accessModel.hasPermission(req.user, "finance_daraz", "view"),
    accessModel.hasPermission(req.user, "finance_daraz", "edit"),
  ]);

  return res.json({
    success: true,
    data: {
      dashboard: { view: dashboardView },
      ledger: { view: ledgerView, edit: ledgerEdit, delete: ledgerDelete },
      daraz: { view: darazView, edit: darazEdit },
    },
  });
});

const getDashboard = asyncHandler(async (req, res) => {
  const { from, to } = resolveRange(req.query);
  const accountNames = await loadAccountNames();
  const data = await dashboardModel.getDashboard({ from, to, accountNames });
  return res.json({ success: true, data });
});

const listCategories = asyncHandler(async (req, res) => {
  const data = await ledgerModel.listCategories({
    entry_type: req.query.entry_type,
    include_inactive: String(req.query.include_inactive || "") === "1",
  });
  return res.json({ success: true, data });
});

const createCategory = asyncHandler(async (req, res) => {
  const data = await ledgerModel.createCategory(req.body, req.user?.id || null);
  return res.status(201).json({ success: true, message: "Category created.", data });
});

const updateCategory = asyncHandler(async (req, res) => {
  const data = await ledgerModel.updateCategory(Number(req.params.id), req.body);
  return res.json({ success: true, message: "Category updated.", data });
});

const deleteCategory = asyncHandler(async (req, res) => {
  const result = await ledgerModel.deleteCategory(Number(req.params.id));
  return res.json({
    success: true,
    message: result.deactivated
      ? "Category has entries, so it was deactivated instead of deleted."
      : "Category deleted.",
    data: result,
  });
});

const listEntries = asyncHandler(async (req, res) => {
  const data = await ledgerModel.listEntries(req.query);
  return res.json({ success: true, ...data });
});

const createEntry = asyncHandler(async (req, res) => {
  const data = await ledgerModel.createEntry(req.body, req.user?.id || null);
  return res.status(201).json({ success: true, message: "Entry added.", data });
});

const updateEntry = asyncHandler(async (req, res) => {
  const data = await ledgerModel.updateEntry(Number(req.params.id), req.body, req.user?.id || null);
  return res.json({ success: true, message: "Entry updated.", data });
});

const deleteEntry = asyncHandler(async (req, res) => {
  await ledgerModel.deleteEntry(Number(req.params.id), req.user?.id || null);
  return res.json({ success: true, message: "Entry deleted." });
});

function positiveInteger(value, fieldName) {
  const number = Number(value);
  if (!Number.isInteger(number) || number <= 0) {
    const error = new Error(`${fieldName} must be a positive integer.`);
    error.statusCode = 400;
    throw error;
  }
  return number;
}

function darazFilters(query = {}) {
  const { from, to } = resolveRange(query);
  return {
    from,
    to,
    account_id: query.account_id ? positiveInteger(query.account_id, "Account") : undefined,
  };
}

const listDarazAccounts = asyncHandler(async (_req, res) => {
  const accounts = await accountModel.getAllAccounts({ platform_code: "DARAZ" });
  const data = accounts.map((account) => ({
    id: Number(account.id),
    name: account.account_name,
    code: account.account_code,
    country_code: account.country_code,
    seller_id: account.seller_id,
    seller_email: account.seller_email,
    store_url: account.store_url,
    is_sandbox: Boolean(account.is_sandbox),
    status: account.status,
    connection_status: account.connection_status,
    token_status: account.token_status,
    last_sync_at: account.last_sync_at,
    last_checked_at: account.last_checked_at,
  }));
  return res.json({ success: true, data });
});

const getDarazSummary = asyncHandler(async (req, res) => {
  const data = await darazModel.getSummary(darazFilters(req.query));
  return res.json({ success: true, data: { ...data, category_definitions: darazModel.CATEGORIES } });
});

const listDarazOrders = asyncHandler(async (req, res) => {
  const filters = darazFilters(req.query);
  const data = await darazModel.listOrders({
    ...filters,
    search: req.query.search,
    paid: req.query.paid,
    limit: req.query.limit,
    offset: req.query.offset,
  });
  const rows = await enrichOrdersWithImages(data.rows);
  return res.json({ success: true, ...data, rows });
});

const getDarazOrderLines = asyncHandler(async (req, res) => {
  const accountId = positiveInteger(req.params.accountId, "Account");
  const orderNo = String(req.params.orderNo || "").trim();
  if (!orderNo) {
    const error = new Error("Order number is required.");
    error.statusCode = 400;
    throw error;
  }
  const data = await darazModel.getOrderLines(accountId, orderNo);
  return res.json({ success: true, data });
});

const listDarazFeeTypes = asyncHandler(async (req, res) => {
  const data = await darazModel.listFeeTypes(darazFilters(req.query));
  return res.json({ success: true, data });
});

const listDarazStatements = asyncHandler(async (req, res) => {
  const data = await darazModel.listStatements(darazFilters(req.query));
  return res.json({ success: true, data });
});

const listDarazAccountTransactions = asyncHandler(async (req, res) => {
  const data = await darazModel.listAccountTransactions(darazFilters(req.query));
  return res.json({ success: true, data });
});

const syncDarazFinance = asyncHandler(async (req, res) => {
  const accountId = positiveInteger(req.params.accountId, "Account");
  const { from, to } = resolveRange({
    date_from: req.body?.date_from,
    date_to: req.body?.date_to,
  });
  const account = await accountModel.findById(accountId);
  if (!account || String(account.platform_code).toUpperCase() !== "DARAZ") {
    const error = new Error("Daraz marketplace account not found.");
    error.statusCode = 404;
    throw error;
  }
  const credentials = await credentialModel.findByAccountId(accountId);
  if (!credentials?.access_token) {
    const error = new Error("Daraz access token is missing for this account.");
    error.statusCode = 400;
    throw error;
  }

  const transactions = await darazFinanceSyncService.syncTransactionsRange({
    account,
    credentials,
    sync_type: "manual",
    dateFrom: from,
    dateTo: to,
  });
  const payouts = await darazFinanceSyncService.syncPayouts({
    account,
    credentials,
    sync_type: "manual",
    createdAfter: from,
  });
  const accountTransactions = await darazFinanceSyncService.syncAccountTransactionsRange({
    account,
    credentials,
    sync_type: "manual",
    dateFrom: from,
    dateTo: to,
  });

  return res.json({
    success: true,
    message: "Daraz finance sync completed.",
    data: { range: { from, to }, transactions, account_transactions: accountTransactions, payouts },
  });
});

module.exports = {
  getAccess,
  getDashboard,
  listCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  listEntries,
  createEntry,
  updateEntry,
  deleteEntry,
  listDarazAccounts,
  getDarazSummary,
  listDarazOrders,
  getDarazOrderLines,
  listDarazFeeTypes,
  listDarazStatements,
  listDarazAccountTransactions,
  syncDarazFinance,
};
