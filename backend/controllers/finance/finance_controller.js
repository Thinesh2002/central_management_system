const asyncHandler = require("../../middleware/async_handler");
const accessModel = require("../../models/accessModel");
const accountModel = require("../../models/marketplace/account_model");
const ledgerModel = require("../../models/finance/finance_ledger_model");
const dashboardModel = require("../../models/finance/finance_dashboard_model");

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

const getAccess = asyncHandler(async (req, res) => {
  const [dashboardView, ledgerView, ledgerEdit, ledgerDelete] = await Promise.all([
    accessModel.hasPermission(req.user, "finance_dashboard", "view"),
    accessModel.hasPermission(req.user, "finance_ledger", "view"),
    accessModel.hasPermission(req.user, "finance_ledger", "edit"),
    accessModel.hasPermission(req.user, "finance_ledger", "delete"),
  ]);

  return res.json({
    success: true,
    data: {
      dashboard: { view: dashboardView },
      ledger: { view: ledgerView, edit: ledgerEdit, delete: ledgerDelete },
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
};
