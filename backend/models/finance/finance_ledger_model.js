const db = require("../../config/finance_management_db/finance_management_db");

const ENTRY_TYPES = new Set(["income", "expense"]);

function httpError(message, statusCode = 400) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function cleanString(value, maxLength) {
  if (value === undefined || value === null) return null;
  const text = String(value).trim();
  if (!text) return null;
  return maxLength ? text.slice(0, maxLength) : text;
}

function cleanEntryType(value, { required = false } = {}) {
  const type = String(value || "").trim().toLowerCase();
  if (!type) {
    if (required) throw httpError("Entry type must be income or expense.");
    return null;
  }
  if (!ENTRY_TYPES.has(type)) throw httpError("Entry type must be income or expense.");
  return type;
}

function cleanDate(value) {
  const text = String(value || "").trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) return null;
  return Number.isNaN(new Date(`${text}T00:00:00Z`).getTime()) ? null : text;
}

// ---------------------------------------------------------------------
// Categories
// ---------------------------------------------------------------------

async function listCategories({ entry_type, include_inactive } = {}) {
  const where = [];
  const params = [];

  const type = cleanEntryType(entry_type);
  if (type) {
    where.push("c.entry_type = ?");
    params.push(type);
  }

  if (!include_inactive) where.push("c.status = 'active'");

  const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

  const [rows] = await db.query(
    `SELECT c.*,
       (SELECT COUNT(*) FROM finance_entries e
        WHERE e.category_id = c.id AND e.deleted_at IS NULL) AS entry_count
     FROM finance_categories c
     ${whereSql}
     ORDER BY c.entry_type ASC, c.name ASC`,
    params
  );

  return rows;
}

async function findCategoryById(id) {
  const [rows] = await db.query(`SELECT * FROM finance_categories WHERE id = ? LIMIT 1`, [id]);
  return rows[0] || null;
}

async function createCategory(payload = {}, userId = null) {
  const name = cleanString(payload.name, 100);
  if (!name) throw httpError("Category name is required.");
  const entryType = cleanEntryType(payload.entry_type, { required: true });

  const [result] = await db.query(
    `INSERT INTO finance_categories (name, entry_type, description, created_by) VALUES (?, ?, ?, ?)`,
    [name, entryType, cleanString(payload.description, 255), userId]
  );

  return findCategoryById(result.insertId);
}

async function updateCategory(id, payload = {}) {
  const existing = await findCategoryById(id);
  if (!existing) throw httpError("Category not found.", 404);

  const updates = [];
  const params = [];

  if (payload.name !== undefined) {
    const name = cleanString(payload.name, 100);
    if (!name) throw httpError("Category name is required.");
    updates.push("name = ?");
    params.push(name);
  }

  if (payload.description !== undefined) {
    updates.push("description = ?");
    params.push(cleanString(payload.description, 255));
  }

  if (payload.status !== undefined) {
    const status = String(payload.status).toLowerCase() === "inactive" ? "inactive" : "active";
    updates.push("status = ?");
    params.push(status);
  }

  // Type is fixed once a category holds entries — flipping it would
  // silently move every existing entry between income and expense totals.
  if (payload.entry_type !== undefined) {
    const entryType = cleanEntryType(payload.entry_type, { required: true });
    if (entryType !== existing.entry_type) {
      const [[{ total }]] = await db.query(
        `SELECT COUNT(*) AS total FROM finance_entries WHERE category_id = ? AND deleted_at IS NULL`,
        [id]
      );
      if (Number(total) > 0) {
        throw httpError("This category already has entries, so its type can't be changed.");
      }
      updates.push("entry_type = ?");
      params.push(entryType);
    }
  }

  if (updates.length) {
    await db.query(`UPDATE finance_categories SET ${updates.join(", ")} WHERE id = ?`, [...params, id]);
  }

  return findCategoryById(id);
}

// Categories referenced by entries are deactivated rather than removed,
// so historical entries keep their category name.
async function deleteCategory(id) {
  const existing = await findCategoryById(id);
  if (!existing) throw httpError("Category not found.", 404);

  const [[{ total }]] = await db.query(
    `SELECT COUNT(*) AS total FROM finance_entries WHERE category_id = ?`,
    [id]
  );

  if (Number(total) > 0) {
    await db.query(`UPDATE finance_categories SET status = 'inactive' WHERE id = ?`, [id]);
    return { deleted: false, deactivated: true };
  }

  await db.query(`DELETE FROM finance_categories WHERE id = ?`, [id]);
  return { deleted: true, deactivated: false };
}

// ---------------------------------------------------------------------
// Entries
// ---------------------------------------------------------------------

function buildEntryFilters({ entry_type, category_id, date_from, date_to, search } = {}) {
  const where = ["e.deleted_at IS NULL"];
  const params = [];

  const type = cleanEntryType(entry_type);
  if (type) {
    where.push("e.entry_type = ?");
    params.push(type);
  }

  if (category_id) {
    where.push("e.category_id = ?");
    params.push(Number(category_id));
  }

  const from = cleanDate(date_from);
  if (from) {
    where.push("e.entry_date >= ?");
    params.push(from);
  }

  const to = cleanDate(date_to);
  if (to) {
    where.push("e.entry_date <= ?");
    params.push(to);
  }

  const term = cleanString(search, 100);
  if (term) {
    where.push("(e.description LIKE ? OR e.reference LIKE ? OR e.payment_method LIKE ? OR c.name LIKE ?)");
    const like = `%${term}%`;
    params.push(like, like, like, like);
  }

  return { whereSql: `WHERE ${where.join(" AND ")}`, params };
}

const ENTRY_SELECT = `
  SELECT e.id, e.entry_type, e.category_id, DATE_FORMAT(e.entry_date, '%Y-%m-%d') AS entry_date,
         e.amount, e.payment_method, e.reference, e.description,
         e.created_by, e.updated_by, e.created_at, e.updated_at,
         c.name AS category_name
  FROM finance_entries e
  LEFT JOIN finance_categories c ON c.id = e.category_id`;

async function listEntries(filters = {}) {
  const { whereSql, params } = buildEntryFilters(filters);
  const limit = Math.min(Math.max(Number(filters.limit) || 50, 1), 1000);
  const offset = Math.max(Number(filters.offset) || 0, 0);

  const [rows] = await db.query(
    `${ENTRY_SELECT} ${whereSql} ORDER BY e.entry_date DESC, e.id DESC LIMIT ? OFFSET ?`,
    [...params, limit, offset]
  );

  const [[totals]] = await db.query(
    `SELECT COUNT(*) AS total,
       COALESCE(SUM(CASE WHEN e.entry_type = 'income' THEN e.amount ELSE 0 END), 0) AS total_income,
       COALESCE(SUM(CASE WHEN e.entry_type = 'expense' THEN e.amount ELSE 0 END), 0) AS total_expense
     FROM finance_entries e
     LEFT JOIN finance_categories c ON c.id = e.category_id
     ${whereSql}`,
    params
  );

  return {
    rows,
    total: Number(totals.total || 0),
    totals: {
      income: Number(totals.total_income || 0),
      expense: Number(totals.total_expense || 0),
    },
  };
}

async function findEntryById(id) {
  const [rows] = await db.query(`${ENTRY_SELECT} WHERE e.id = ? AND e.deleted_at IS NULL LIMIT 1`, [id]);
  return rows[0] || null;
}

async function validateEntryPayload(payload = {}) {
  const entryType = cleanEntryType(payload.entry_type, { required: true });

  const entryDate = cleanDate(payload.entry_date);
  if (!entryDate) throw httpError("A valid entry date (YYYY-MM-DD) is required.");

  const amount = Number(payload.amount);
  if (!Number.isFinite(amount) || amount <= 0) throw httpError("Amount must be greater than zero.");
  if (amount >= 1e12) throw httpError("Amount is too large.");

  let categoryId = null;
  if (payload.category_id) {
    const category = await findCategoryById(Number(payload.category_id));
    if (!category) throw httpError("Selected category does not exist.");
    if (category.entry_type !== entryType) {
      throw httpError(`"${category.name}" is an ${category.entry_type} category.`);
    }
    categoryId = category.id;
  }

  return {
    entry_type: entryType,
    category_id: categoryId,
    entry_date: entryDate,
    amount: Math.round(amount * 100) / 100,
    payment_method: cleanString(payload.payment_method, 60),
    reference: cleanString(payload.reference, 120),
    description: cleanString(payload.description, 2000),
  };
}

async function createEntry(payload = {}, userId = null) {
  const data = await validateEntryPayload(payload);

  const [result] = await db.query(
    `INSERT INTO finance_entries
       (entry_type, category_id, entry_date, amount, payment_method, reference, description, created_by, updated_by)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      data.entry_type,
      data.category_id,
      data.entry_date,
      data.amount,
      data.payment_method,
      data.reference,
      data.description,
      userId,
      userId,
    ]
  );

  return findEntryById(result.insertId);
}

async function updateEntry(id, payload = {}, userId = null) {
  const existing = await findEntryById(id);
  if (!existing) throw httpError("Entry not found.", 404);

  const data = await validateEntryPayload({ ...existing, ...payload });

  await db.query(
    `UPDATE finance_entries
     SET entry_type = ?, category_id = ?, entry_date = ?, amount = ?, payment_method = ?,
         reference = ?, description = ?, updated_by = ?
     WHERE id = ? AND deleted_at IS NULL`,
    [
      data.entry_type,
      data.category_id,
      data.entry_date,
      data.amount,
      data.payment_method,
      data.reference,
      data.description,
      userId,
      id,
    ]
  );

  return findEntryById(id);
}

async function deleteEntry(id, userId = null) {
  const [result] = await db.query(
    `UPDATE finance_entries SET deleted_at = NOW(), updated_by = ? WHERE id = ? AND deleted_at IS NULL`,
    [userId, id]
  );
  if (!result.affectedRows) throw httpError("Entry not found.", 404);
  return true;
}

module.exports = {
  cleanDate,
  listCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  listEntries,
  findEntryById,
  createEntry,
  updateEntry,
  deleteEntry,
};
