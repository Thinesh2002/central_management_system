const db = require("../../config/product_management_db");

const ProductVariation = {

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

  /* ================= VALIDATION ================= */
  validateVariation: (data) => {
    if (!data.parent_sku) throw new Error("Parent SKU is required");
    if (!data.sku) throw new Error("SKU is required");

    if (data.cost_price < 0 || data.selling_price < 0) {
      throw new Error("Prices cannot be negative");
    }

    if (data.selling_price < data.cost_price) {
      throw new Error("Selling price cannot be less than cost price");
    }
  },

  /* ================= CREATE ================= */
  create: async (data) => {
    try {

      ProductVariation.validateVariation(data);

      const parentExists = await ProductVariation.parentSkuExists(data.parent_sku);
      if (!parentExists) {
        throw new Error("Parent product not found");
      }

      const exists = await ProductVariation.skuExists(data.sku);
      if (exists) {
        throw new Error("SKU already exists");
      }

      const sql = `
        INSERT INTO product_variations
        (
          parent_sku,
          sku,
          color,
          size,
          material,
          weight,
          weight_unit,
          length,
          length_unit,
          width,
          width_unit,
          height,
          height_unit,
          capacity,
          capacity_unit,
          power,
          voltage,
          wattage,
          shape,
          style,
          pattern,
          cost_price,
          selling_price,
          status,
          created_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
      `;

      const values = [
        data.parent_sku,
        data.sku,
        data.color || null,
        data.size || null,
        data.material || null,
        data.weight || null,
        data.weight_unit || null,
        data.length || null,
        data.length_unit || null,
        data.width || null,
        data.width_unit || null,
        data.height || null,
        data.height_unit || null,
        data.capacity || null,
        data.capacity_unit || null,
        data.power || null,
        data.voltage || null,
        data.wattage || null,
        data.shape || null,
        data.style || null,
        data.pattern || null,
        data.cost_price || 0,
        data.selling_price || 0,
        data.status ?? 1
      ];

      return await ProductVariation.safeQuery(sql, values);

    } catch (error) {
      console.error("PRODUCT VARIATION CREATE ERROR:", error.message);
      throw error;
    }
  },

  /* ================= READ ALL ================= */
  getAll: async ({ page = 1, limit = 50, search = "" } = {}) => {
    try {

      const offset = (page - 1) * limit;

      const sql = `
        SELECT 
          pv.*,
          p.product_name
        FROM product_variations pv
        LEFT JOIN products p
          ON p.parent_sku = pv.parent_sku
        WHERE pv.sku LIKE ?
        ORDER BY pv.created_at DESC
        LIMIT ? OFFSET ?
      `;

      return await ProductVariation.safeQuery(sql, [`%${search}%`, limit, offset]);

    } catch (error) {
      console.error("PRODUCT VARIATION GET ALL ERROR:", error.message);
      throw error;
    }
  },

  /* ================= READ BY SKU ================= */
  getBySku: async (sku) => {
    try {

      if (!sku) throw new Error("SKU is required");

      const sql = `
        SELECT 
          pv.*,
          p.product_name,
          pi.main_image,
          pi.sub_image1,
          pi.sub_image2,
          pi.sub_image3,
          pi.sub_image4,
          pi.sub_image5,
          pi.sub_image6,
          pi.sub_image7,
          pi.sub_image8,
          pi.sub_image9
        FROM product_variations pv
        LEFT JOIN products p
          ON p.parent_sku = pv.parent_sku
        LEFT JOIN product_images pi
          ON pi.sku = pv.sku
        WHERE pv.sku = ?
      `;

      const rows = await ProductVariation.safeQuery(sql, [sku]);
      return rows[0] || null;

    } catch (error) {
      console.error("PRODUCT VARIATION GET BY SKU ERROR:", error.message);
      throw error;
    }
  },

  /* ================= READ BY PARENT SKU ================= */
  getByParentSku: async (parentSku) => {
    try {

      if (!parentSku) throw new Error("Parent SKU is required");

      const sql = `
        SELECT 
          pv.*,
          pi.main_image
        FROM product_variations pv
        LEFT JOIN product_images pi
          ON pi.sku = pv.sku
        WHERE pv.parent_sku = ?
        ORDER BY pv.created_at DESC
      `;

      return await ProductVariation.safeQuery(sql, [parentSku]);

    } catch (error) {
      console.error("PRODUCT VARIATION GET BY PARENT SKU ERROR:", error.message);
      throw error;
    }
  },

  /* ================= UPDATE ================= */
  update: async (sku, data) => {
    try {

      if (!sku) throw new Error("SKU is required");

      const existing = await ProductVariation.getBySku(sku);
      if (!existing) throw new Error("Variation not found");

      ProductVariation.validateVariation({
        ...existing,
        ...data
      });

      const fields = [];
      const values = [];

      const allowedFields = [
        "color","size","material",
        "weight","weight_unit",
        "length","length_unit",
        "width","width_unit",
        "height","height_unit",
        "capacity","capacity_unit",
        "power","voltage","wattage",
        "shape","style","pattern",
        "cost_price","selling_price","status"
      ];

      for (const field of allowedFields) {
        if (data[field] !== undefined) {
          fields.push(`${field} = ?`);
          values.push(data[field]);
        }
      }

      if (fields.length === 0) {
        throw new Error("No fields to update");
      }

      values.push(sku);

      const sql = `
        UPDATE product_variations 
        SET ${fields.join(", ")}, updated_at = NOW()
        WHERE sku = ?
      `;

      return await ProductVariation.safeQuery(sql, values);

    } catch (error) {
      console.error("PRODUCT VARIATION UPDATE ERROR:", error.message);
      throw error;
    }
  },

  /* ================= DELETE ================= */
  delete: async (sku) => {
    try {

      if (!sku) throw new Error("SKU is required");

      const hasStock = await ProductVariation.hasInventory(sku);
      if (hasStock) {
        throw new Error("Cannot delete variation with inventory");
      }

      return await ProductVariation.safeQuery(
        "DELETE FROM product_variations WHERE sku = ?",
        [sku]
      );

    } catch (error) {
      console.error("PRODUCT VARIATION DELETE ERROR:", error.message);
      throw error;
    }
  },

  /* ================= VALIDATION ================= */

  skuExists: async (sku) => {
    try {
      const rows = await ProductVariation.safeQuery(
        "SELECT sku FROM product_variations WHERE sku = ?",
        [sku]
      );
      return rows.length > 0;
    } catch (error) {
      console.error("SKU CHECK ERROR:", error.message);
      throw error;
    }
  },

  parentSkuExists: async (parentSku) => {
    try {
      const rows = await ProductVariation.safeQuery(
        "SELECT parent_sku FROM products WHERE parent_sku = ?",
        [parentSku]
      );
      return rows.length > 0;
    } catch (error) {
      console.error("PARENT SKU CHECK ERROR:", error.message);
      throw error;
    }
  },

  hasInventory: async (sku) => {
    try {
      const rows = await ProductVariation.safeQuery(
        "SELECT COUNT(*) AS count FROM inventory WHERE sku = ?",
        [sku]
      );
      return rows[0].count > 0;
    } catch (error) {
      console.error("INVENTORY CHECK ERROR:", error.message);
      throw error;
    }
  }

};

module.exports = ProductVariation;