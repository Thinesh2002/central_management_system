const db = require("../../config/product_management_db");

const Inventory = {

  /* ================= HELPER: SAFE QUERY ================= */
  safeQuery: async (sql, values = [], connection = null) => {
    try {
      if (connection) {
        const [result] = await connection.query(sql, values);
        return result;
      }
      const [result] = await db.query(sql, values);
      return result;
    } catch (error) {
      console.error("DB ERROR:", error.message);
      throw new Error("Database operation failed");
    }
  },

  /* ================= HELPER: VALIDATION ================= */
  validateStock: (data) => {
    if (!data.sku) throw new Error("SKU is required");

    ["total_stock", "reserved_stock", "available_stock"].forEach(field => {
      if (data[field] !== undefined && data[field] < 0) {
        throw new Error(`${field} cannot be negative`);
      }
    });
  },

  /* ================= HELPER: AUTO CALC ================= */
  calculateAvailableStock: (total, reserved) => {
    return total - reserved;
  },

  /* ================= CREATE ================= */
  create: async (data) => {
    try {

      Inventory.validateStock(data);

      const total = data.total_stock || 0;
      const reserved = data.reserved_stock || 0;
      const available = Inventory.calculateAvailableStock(total, reserved);

      const sql = `
        INSERT INTO inventory
        (
          sku,
          total_stock,
          reserved_stock,
          available_stock,
          last_updated
        )
        VALUES (?, ?, ?, ?, NOW())
      `;

      const values = [
        data.sku,
        total,
        reserved,
        available
      ];

      return await Inventory.safeQuery(sql, values);

    } catch (error) {
      console.error("INVENTORY CREATE ERROR:", error.message);
      throw error;
    }
  },

  /* ================= READ ALL ================= */
  getAll: async ({ page = 1, limit = 50, search = "" } = {}) => {
    try {

      const offset = (page - 1) * limit;

      const sql = `
        SELECT 
          i.*,
          pv.parent_sku,
          p.product_name
        FROM inventory i
        LEFT JOIN product_variations pv 
          ON pv.sku = i.sku
        LEFT JOIN products p 
          ON p.parent_sku = pv.parent_sku
        WHERE i.sku LIKE ?
        ORDER BY i.last_updated DESC
        LIMIT ? OFFSET ?
      `;

      return await Inventory.safeQuery(sql, [`%${search}%`, limit, offset]);

    } catch (error) {
      console.error("INVENTORY GET ALL ERROR:", error.message);
      throw error;
    }
  },

  /* ================= GET BY SKU ================= */
  getBySku: async (sku) => {
    try {

      if (!sku) throw new Error("SKU is required");

      const sql = `
        SELECT *
        FROM inventory
        WHERE sku = ?
      `;

      const rows = await Inventory.safeQuery(sql, [sku]);
      return rows[0] || null;

    } catch (error) {
      console.error("INVENTORY GET BY SKU ERROR:", error.message);
      throw error;
    }
  },

  /* ================= UPDATE ================= */
  update: async (sku, data) => {
    try {

      if (!sku) throw new Error("SKU is required");

      Inventory.validateStock(data);

      const existing = await Inventory.getBySku(sku);
      if (!existing) throw new Error("Inventory not found");

      const total = data.total_stock ?? existing.total_stock;
      const reserved = data.reserved_stock ?? existing.reserved_stock;

      if (reserved > total) {
        throw new Error("Reserved stock cannot exceed total stock");
      }

      const available = Inventory.calculateAvailableStock(total, reserved);

      const sql = `
        UPDATE inventory 
        SET 
          total_stock = ?, 
          reserved_stock = ?, 
          available_stock = ?, 
          last_updated = NOW()
        WHERE sku = ?
      `;

      return await Inventory.safeQuery(sql, [
        total,
        reserved,
        available,
        sku
      ]);

    } catch (error) {
      console.error("INVENTORY UPDATE ERROR:", error.message);
      throw error;
    }
  },

  /* ================= DELETE ================= */
  delete: async (sku) => {
    try {

      if (!sku) throw new Error("SKU is required");

      return await Inventory.safeQuery(
        "DELETE FROM inventory WHERE sku = ?",
        [sku]
      );

    } catch (error) {
      console.error("INVENTORY DELETE ERROR:", error.message);
      throw error;
    }
  },

  /* ================= STOCK OPERATIONS (TRANSACTION SAFE) ================= */

  reserveStock: async (sku, qty) => {
    const connection = await db.getConnection();

    try {
      await connection.beginTransaction();

      if (qty <= 0) throw new Error("Quantity must be greater than 0");

      const sql = `
        UPDATE inventory
        SET
          available_stock = available_stock - ?,
          reserved_stock = reserved_stock + ?,
          last_updated = NOW()
        WHERE sku = ? AND available_stock >= ?
      `;

      const result = await Inventory.safeQuery(sql, [qty, qty, sku, qty], connection);

      if (result.affectedRows === 0) {
        throw new Error("Not enough stock available");
      }

      await connection.commit();
      return result;

    } catch (error) {
      await connection.rollback();
      console.error("RESERVE STOCK ERROR:", error.message);
      throw error;
    } finally {
      connection.release();
    }
  },

  releaseReservedStock: async (sku, qty) => {
    const connection = await db.getConnection();

    try {
      await connection.beginTransaction();

      if (qty <= 0) throw new Error("Quantity must be greater than 0");

      const sql = `
        UPDATE inventory
        SET
          available_stock = available_stock + ?,
          reserved_stock = reserved_stock - ?,
          last_updated = NOW()
        WHERE sku = ? AND reserved_stock >= ?
      `;

      const result = await Inventory.safeQuery(sql, [qty, qty, sku, qty], connection);

      if (result.affectedRows === 0) {
        throw new Error("Not enough reserved stock");
      }

      await connection.commit();
      return result;

    } catch (error) {
      await connection.rollback();
      console.error("RELEASE STOCK ERROR:", error.message);
      throw error;
    } finally {
      connection.release();
    }
  },

  /* ================= LOW STOCK ALERT ================= */
  getLowStock: async (threshold = 5) => {
    try {

      const sql = `
        SELECT *
        FROM inventory
        WHERE available_stock <= ?
        ORDER BY available_stock ASC
      `;

      return await Inventory.safeQuery(sql, [threshold]);

    } catch (error) {
      console.error("LOW STOCK ERROR:", error.message);
      throw error;
    }
  }

};

module.exports = Inventory;