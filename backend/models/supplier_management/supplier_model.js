const db = require("../../config/supplier_management_db/supplier_management_db");

const ALLOWED_PAYMENT_TERMS = new Set(["net_30", "net_60", "cod", "advance", "other"]);
const ALLOWED_STATUSES = new Set(["active", "inactive"]);

function clean(value) {
  return value === undefined || value === null ? null : String(value).trim() || null;
}

// Minimal, non-sensitive projection (id + name only) for other modules'
// supplier pickers (e.g. Purchase Orders) - unlike list()/findById(), this
// is not master-admin gated, since a supplier's name isn't the sensitive
// part (contact info, payment terms, registration no are).
async function listOptions() {
  const [rows] = await db.query(
    `SELECT id, name FROM suppliers WHERE deleted_at IS NULL AND status = 'active' ORDER BY name ASC`
  );

  return rows;
}

async function list({ status, search, limit = 100, offset = 0 } = {}) {
  const params = [];
  let whereSql = "WHERE deleted_at IS NULL";

  if (status && ALLOWED_STATUSES.has(status)) {
    whereSql += " AND status = ?";
    params.push(status);
  }

  if (search) {
    whereSql += " AND (name LIKE ? OR contact_email LIKE ? OR contact_phone LIKE ? OR business_registration_no LIKE ?)";
    const term = `%${search}%`;
    params.push(term, term, term, term);
  }

  const [rows] = await db.query(
    `SELECT * FROM suppliers ${whereSql} ORDER BY name ASC LIMIT ? OFFSET ?`,
    [...params, Number(limit), Number(offset)]
  );

  const [countRows] = await db.query(`SELECT COUNT(*) AS total FROM suppliers ${whereSql}`, params);

  return { rows, total: Number(countRows[0]?.total || 0) };
}

async function findById(id) {
  const [rows] = await db.query(`SELECT * FROM suppliers WHERE id = ? AND deleted_at IS NULL LIMIT 1`, [id]);
  return rows[0] || null;
}

async function create({
  name,
  contact_email: contactEmail,
  contact_phone: contactPhone,
  business_registration_no: businessRegistrationNo,
  payment_terms: paymentTerms,
  currency,
  delivery_lead_time_days: deliveryLeadTimeDays,
  rating,
  status,
  notes,
  created_by: createdBy = null,
}) {
  if (!name || !name.trim()) {
    const error = new Error("Supplier name is required.");
    error.statusCode = 400;
    throw error;
  }

  const [result] = await db.query(
    `INSERT INTO suppliers
       (name, contact_email, contact_phone, business_registration_no, payment_terms, currency,
        delivery_lead_time_days, rating, status, notes, created_by, updated_by)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      name.trim(),
      clean(contactEmail),
      clean(contactPhone),
      clean(businessRegistrationNo),
      ALLOWED_PAYMENT_TERMS.has(paymentTerms) ? paymentTerms : "cod",
      clean(currency) || "LKR",
      deliveryLeadTimeDays !== undefined && deliveryLeadTimeDays !== null && deliveryLeadTimeDays !== ""
        ? Number(deliveryLeadTimeDays)
        : null,
      rating !== undefined && rating !== null && rating !== "" ? Number(rating) : null,
      ALLOWED_STATUSES.has(status) ? status : "active",
      clean(notes),
      createdBy,
      createdBy,
    ]
  );

  return findById(result.insertId);
}

async function update(
  id,
  {
    name,
    contact_email: contactEmail,
    contact_phone: contactPhone,
    business_registration_no: businessRegistrationNo,
    payment_terms: paymentTerms,
    currency,
    delivery_lead_time_days: deliveryLeadTimeDays,
    rating,
    status,
    notes,
    updated_by: updatedBy = null,
  }
) {
  const existing = await findById(id);
  if (!existing) return null;

  await db.query(
    `UPDATE suppliers
     SET name = ?, contact_email = ?, contact_phone = ?, business_registration_no = ?, payment_terms = ?,
         currency = ?, delivery_lead_time_days = ?, rating = ?, status = ?, notes = ?, updated_by = ?
     WHERE id = ?`,
    [
      name && name.trim() ? name.trim() : existing.name,
      contactEmail !== undefined ? clean(contactEmail) : existing.contact_email,
      contactPhone !== undefined ? clean(contactPhone) : existing.contact_phone,
      businessRegistrationNo !== undefined ? clean(businessRegistrationNo) : existing.business_registration_no,
      ALLOWED_PAYMENT_TERMS.has(paymentTerms) ? paymentTerms : existing.payment_terms,
      currency !== undefined ? clean(currency) || existing.currency : existing.currency,
      deliveryLeadTimeDays !== undefined && deliveryLeadTimeDays !== ""
        ? deliveryLeadTimeDays === null
          ? null
          : Number(deliveryLeadTimeDays)
        : existing.delivery_lead_time_days,
      rating !== undefined && rating !== "" ? (rating === null ? null : Number(rating)) : existing.rating,
      ALLOWED_STATUSES.has(status) ? status : existing.status,
      notes !== undefined ? clean(notes) : existing.notes,
      updatedBy,
      id,
    ]
  );

  return findById(id);
}

async function softDelete(id) {
  const [result] = await db.query(
    `UPDATE suppliers SET deleted_at = NOW() WHERE id = ? AND deleted_at IS NULL`,
    [id]
  );

  return result.affectedRows > 0;
}

module.exports = { list, listOptions, findById, create, update, softDelete };
