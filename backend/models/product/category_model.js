const db = require("../../config/product_management_db");

const Category = {

  /* ================= HELPER: SAFE QUERY ================= */
  safeQuery: async (sql, values = []) => {
    try {
      const [result] = await db.query(sql, values);
      return result;
    } catch (error) {
      console.error("DB ERROR:", error.message);
      throw new Error("Database operation failed");
    }
  },

  /* ================= HELPER: VALIDATE ================= */
  validateCategory: (data) => {
    if (!data.category_code || !data.category_name) {
      throw new Error("Category code and name are required");
    }

    if (data.category_name.length < 2) {
      throw new Error("Category name must be at least 2 characters");
    }
  },

  /* ================= CREATE ================= */
  create: async (data) => {
    try {
      Category.validateCategory(data);

      const exists = await Category.codeExists(data.category_code);
      if (exists) {
        throw new Error("Category code already exists");
      }

      const nameExists = await Category.nameExists(data.category_name);
      if (nameExists) {
        throw new Error("Category name already exists");
      }

      const sql = `
        INSERT INTO categories 
        (
          category_code,
          category_name,
          created_by,
          created_at
        )
        VALUES (?, ?, ?, NOW())
      `;

      const values = [
        data.category_code,
        data.category_name,
        data.created_by || null
      ];

      const result = await Category.safeQuery(sql, values);
      return result;

    } catch (error) {
      console.error("CREATE CATEGORY ERROR:", error.message);
      throw error;
    }
  },

  /* ================= READ ALL ================= */
  getAll: async ({ page = 1, limit = 50 } = {}) => {
    try {
      const offset = (page - 1) * limit;

      const sql = `
        SELECT 
          c.*,
          COUNT(sc.sub_category_code) AS sub_category_count
        FROM categories c
        LEFT JOIN sub_categories sc 
          ON sc.category_code = c.category_code
        GROUP BY c.category_code
        ORDER BY c.category_name ASC
        LIMIT ? OFFSET ?
      `;

      const rows = await Category.safeQuery(sql, [limit, offset]);
      return rows;

    } catch (error) {
      console.error("GET ALL CATEGORY ERROR:", error.message);
      throw error;
    }
  },

  /* ================= READ BY CODE ================= */
  getByCode: async (categoryCode) => {
    try {
      if (!categoryCode) throw new Error("Category code is required");

      const sql = `
        SELECT * 
        FROM categories
        WHERE category_code = ?
      `;

      const rows = await Category.safeQuery(sql, [categoryCode]);
      return rows[0] || null;

    } catch (error) {
      console.error("GET CATEGORY ERROR:", error.message);
      throw error;
    }
  },

  /* ================= UPDATE ================= */
  update: async (categoryCode, data) => {
    try {
      if (!categoryCode) throw new Error("Category code is required");

      const fields = [];
      const values = [];

      const allowedFields = [
        "category_name",
        "created_by"
      ];

      for (const field of allowedFields) {
        if (data[field] !== undefined) {
          fields.push(`${field} = ?`);
          values.push(data[field]);
        }
      }

      if (fields.length === 0) {
        return { affectedRows: 0 };
      }

      // Check duplicate name
      if (data.category_name) {
        const exists = await Category.nameExists(
          data.category_name,
          categoryCode
        );
        if (exists) {
          throw new Error("Category name already exists");
        }
      }

      values.push(categoryCode);

      const sql = `
        UPDATE categories 
        SET ${fields.join(", ")}, updated_at = NOW()
        WHERE category_code = ?
      `;

      const result = await Category.safeQuery(sql, values);
      return result;

    } catch (error) {
      console.error("UPDATE CATEGORY ERROR:", error.message);
      throw error;
    }
  },

  /* ================= DELETE ================= */
  delete: async (categoryCode) => {
    try {
      if (!categoryCode) throw new Error("Category code is required");

      const hasSubs = await Category.hasSubCategories(categoryCode);
      if (hasSubs) {
        throw new Error("Cannot delete category with subcategories");
      }

      const sql = `
        DELETE FROM categories
        WHERE category_code = ?
      `;

      const result = await Category.safeQuery(sql, [categoryCode]);
      return result;

    } catch (error) {
      console.error("DELETE CATEGORY ERROR:", error.message);
      throw error;
    }
  },

  /* ================= OPTIONAL: SOFT DELETE ================= */
  softDelete: async (categoryCode) => {
    try {
      const sql = `
        UPDATE categories
        SET is_deleted = 1, deleted_at = NOW()
        WHERE category_code = ?
      `;

      return await Category.safeQuery(sql, [categoryCode]);

    } catch (error) {
      console.error("SOFT DELETE ERROR:", error.message);
      throw error;
    }
  },

  /* ================= VALIDATION ================= */

  codeExists: async (categoryCode) => {
    try {
      const rows = await Category.safeQuery(
        "SELECT category_code FROM categories WHERE category_code = ?",
        [categoryCode]
      );

      return rows.length > 0;

    } catch (error) {
      console.error("CODE EXISTS ERROR:", error.message);
      throw error;
    }
  },

  nameExists: async (categoryName, excludeCode = null) => {
    try {
      let sql = `
        SELECT category_code
        FROM categories
        WHERE category_name = ?
      `;

      const params = [categoryName];

      if (excludeCode) {
        sql += " AND category_code != ?";
        params.push(excludeCode);
      }

      const rows = await Category.safeQuery(sql, params);
      return rows.length > 0;

    } catch (error) {
      console.error("NAME EXISTS ERROR:", error.message);
      throw error;
    }
  },

  hasSubCategories: async (categoryCode) => {
    try {
      const rows = await Category.safeQuery(
        "SELECT COUNT(*) AS count FROM sub_categories WHERE category_code = ?",
        [categoryCode]
      );

      return rows[0].count > 0;

    } catch (error) {
      console.error("SUB CATEGORY CHECK ERROR:", error.message);
      throw error;
    }
  }

};

module.exports = Category;