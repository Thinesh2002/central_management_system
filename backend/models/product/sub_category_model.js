const db = require("../../config/product_management_db");

const SubCategory = {

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
  validateSubCategory: (data) => {
    if (!data.sub_category_code) throw new Error("Sub category code is required");
    if (!data.sub_category_name) throw new Error("Sub category name is required");
    if (!data.category_code) throw new Error("Category code is required");

    if (data.sub_category_name.length < 2) {
      throw new Error("Sub category name must be at least 2 characters");
    }
  },

  /* ================= CREATE ================= */
  create: async (data) => {
    try {

      SubCategory.validateSubCategory(data);

      const codeExists = await SubCategory.codeExists(data.sub_category_code);
      if (codeExists) {
        throw new Error("Sub category code already exists");
      }

      const nameExists = await SubCategory.nameExists(
        data.sub_category_name,
        data.category_code
      );
      if (nameExists) {
        throw new Error("Sub category name already exists in this category");
      }

      const categoryExists = await SubCategory.categoryExists(data.category_code);
      if (!categoryExists) {
        throw new Error("Invalid category code");
      }

      const sql = `
        INSERT INTO sub_categories
        (
          sub_category_code,
          sub_category_name,
          category_code,
          created_by,
          created_at
        )
        VALUES (?, ?, ?, ?, NOW())
      `;

      return await SubCategory.safeQuery(sql, [
        data.sub_category_code,
        data.sub_category_name,
        data.category_code,
        data.created_by || null
      ]);

    } catch (error) {
      console.error("SUB CATEGORY CREATE ERROR:", error.message);
      throw error;
    }
  },

  /* ================= GET ALL ================= */
  getAll: async ({ page = 1, limit = 50, search = "" } = {}) => {
    try {

      const offset = (page - 1) * limit;

      const sql = `
        SELECT 
          sc.*,
          c.category_name
        FROM sub_categories sc
        JOIN categories c
          ON sc.category_code = c.category_code
        WHERE sc.sub_category_name LIKE ?
        ORDER BY sc.sub_category_name ASC
        LIMIT ? OFFSET ?
      `;

      return await SubCategory.safeQuery(sql, [
        `%${search}%`,
        limit,
        offset
      ]);

    } catch (error) {
      console.error("GET ALL SUB CATEGORY ERROR:", error.message);
      throw error;
    }
  },

  /* ================= GET BY CATEGORY ================= */
  getByCategory: async (categoryCode) => {
    try {

      if (!categoryCode) throw new Error("Category code is required");

      const sql = `
        SELECT *
        FROM sub_categories
        WHERE category_code = ?
        ORDER BY sub_category_name ASC
      `;

      return await SubCategory.safeQuery(sql, [categoryCode]);

    } catch (error) {
      console.error("GET BY CATEGORY ERROR:", error.message);
      throw error;
    }
  },

  /* ================= GET BY CODE ================= */
  getByCode: async (code) => {
    try {

      if (!code) throw new Error("Sub category code is required");

      const rows = await SubCategory.safeQuery(
        "SELECT * FROM sub_categories WHERE sub_category_code = ?",
        [code]
      );

      return rows[0] || null;

    } catch (error) {
      console.error("GET SUB CATEGORY ERROR:", error.message);
      throw error;
    }
  },

  /* ================= UPDATE ================= */
  update: async (code, data) => {
    try {

      if (!code) throw new Error("Sub category code is required");

      const existing = await SubCategory.getByCode(code);
      if (!existing) {
        throw new Error("Sub category not found");
      }

      const fields = [];
      const values = [];

      if (data.sub_category_name !== undefined) {

        const nameExists = await SubCategory.nameExists(
          data.sub_category_name,
          existing.category_code,
          code
        );

        if (nameExists) {
          throw new Error("Sub category name already exists");
        }

        fields.push("sub_category_name = ?");
        values.push(data.sub_category_name);
      }

      if (fields.length === 0) {
        throw new Error("No fields to update");
      }

      values.push(code);

      const sql = `
        UPDATE sub_categories
        SET ${fields.join(", ")}, updated_at = NOW()
        WHERE sub_category_code = ?
      `;

      return await SubCategory.safeQuery(sql, values);

    } catch (error) {
      console.error("SUB CATEGORY UPDATE ERROR:", error.message);
      throw error;
    }
  },

  /* ================= DELETE ================= */
  delete: async (code) => {
    try {

      if (!code) throw new Error("Sub category code is required");

      const isUsed = await SubCategory.isUsedInProducts(code);
      if (isUsed) {
        throw new Error("Cannot delete sub category used in products");
      }

      return await SubCategory.safeQuery(
        "DELETE FROM sub_categories WHERE sub_category_code = ?",
        [code]
      );

    } catch (error) {
      console.error("SUB CATEGORY DELETE ERROR:", error.message);
      throw error;
    }
  },

  /* ================= VALIDATION ================= */

  codeExists: async (code) => {
    const rows = await SubCategory.safeQuery(
      "SELECT sub_category_code FROM sub_categories WHERE sub_category_code = ?",
      [code]
    );
    return rows.length > 0;
  },

  nameExists: async (name, categoryCode, excludeCode = null) => {
    let sql = `
      SELECT sub_category_code
      FROM sub_categories
      WHERE sub_category_name = ? AND category_code = ?
    `;

    const params = [name, categoryCode];

    if (excludeCode) {
      sql += " AND sub_category_code != ?";
      params.push(excludeCode);
    }

    const rows = await SubCategory.safeQuery(sql, params);
    return rows.length > 0;
  },

  categoryExists: async (categoryCode) => {
    const rows = await SubCategory.safeQuery(
      "SELECT category_code FROM categories WHERE category_code = ?",
      [categoryCode]
    );
    return rows.length > 0;
  },

  isUsedInProducts: async (code) => {
    const rows = await SubCategory.safeQuery(
      "SELECT COUNT(*) AS count FROM products WHERE sub_category_code = ?",
      [code]
    );
    return rows[0].count > 0;
  }

};

module.exports = SubCategory;