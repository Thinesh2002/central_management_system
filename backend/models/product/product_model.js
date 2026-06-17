const db = require("../../config/product_management_db");

const Product = {

  /* ================= CREATE PRODUCT ================= */
  create: async (data) => {
    try {

      const sql = `
        INSERT INTO products
        (
          parent_sku,
          product_name,
          sub_category_code,
          brand,
          description
        )
        VALUES (?, ?, ?, ?, ?)
      `;

      const values = [
        data.parent_sku,
        data.product_name,
        data.sub_category_code || null,
        data.brand || null,
        data.description || null
      ];

      const [result] = await db.query(sql, values);
      return result;

    } catch (error) {
      console.error("PRODUCT CREATE ERROR:", error);
      throw error;
    }
  },


  /* ================= GET ALL PRODUCTS ================= */
getAll: async () => {
  try {

    const sql = `
      SELECT 
        p.*,
        sc.sub_category_name,
        MAX(pi.main_image) AS main_image,
        COUNT(pv.sku) AS variation_count
      FROM products p
      LEFT JOIN sub_categories sc 
        ON sc.sub_category_code = p.sub_category_code
      LEFT JOIN product_images pi
        ON pi.sku = p.parent_sku
      LEFT JOIN product_variations pv 
        ON pv.parent_sku = p.parent_sku
      GROUP BY p.parent_sku
      ORDER BY p.created_at DESC
    `;

    const [rows] = await db.query(sql);
    return rows;

  } catch (error) {
    console.error("PRODUCT GET ALL ERROR:", error);
    throw error;
  }
},


  /* ================= GET PRODUCT BY SKU ================= */
  getBySku: async (parentSku) => {
    try {

      const sql = `
        SELECT 
          p.*,
          sc.sub_category_name,
          sc.sub_category_code,
          c.category_name,
          c.category_code,
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
        FROM products p
        LEFT JOIN sub_categories sc
          ON sc.sub_category_code = p.sub_category_code
        LEFT JOIN categories c
          ON c.category_code = sc.category_code
        LEFT JOIN product_images pi
          ON pi.sku = p.parent_sku
        WHERE p.parent_sku = ?
      `;

      const [rows] = await db.query(sql, [parentSku]);
      return rows[0] || null;

    } catch (error) {
      console.error("PRODUCT GET BY SKU ERROR:", error);
      throw error;
    }
  },


  /* ================= UPDATE PRODUCT ================= */
  update: async (parentSku, data) => {
    try {

      const fields = [];
      const values = [];

      const allowedFields = [
        "product_name",
        "sub_category_code",
        "brand",
        "description"
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

      values.push(parentSku);

      const sql = `UPDATE products SET ${fields.join(", ")} WHERE parent_sku = ?`;

      const [result] = await db.query(sql, values);
      return result;

    } catch (error) {
      console.error("PRODUCT UPDATE ERROR:", error);
      throw error;
    }
  },


  /* ================= DELETE PRODUCT ================= */
  delete: async (parentSku) => {
    try {

      const [result] = await db.query(
        "DELETE FROM products WHERE parent_sku = ?",
        [parentSku]
      );

      return result;

    } catch (error) {
      console.error("PRODUCT DELETE ERROR:", error);
      throw error;
    }
  },


  /* ================= CHECK SKU EXISTS ================= */
  parentSkuExists: async (parentSku) => {
    try {

      const [rows] = await db.query(
        "SELECT parent_sku FROM products WHERE parent_sku = ?",
        [parentSku]
      );

      return rows.length > 0;

    } catch (error) {
      console.error("PRODUCT SKU CHECK ERROR:", error);
      throw error;
    }
  },


  /* ================= SUB CATEGORY EXISTS ================= */
  subCategoryExists: async (subCategoryCode) => {
    try {

      const [rows] = await db.query(
        "SELECT sub_category_code FROM sub_categories WHERE sub_category_code = ?",
        [subCategoryCode]
      );

      return rows.length > 0;

    } catch (error) {
      console.error("SUB CATEGORY CHECK ERROR:", error);
      throw error;
    }
  },


  /* ================= HAS VARIATIONS ================= */
  hasVariations: async (parentSku) => {
    try {

      const [rows] = await db.query(
        "SELECT COUNT(*) AS count FROM product_variations WHERE parent_sku = ?",
        [parentSku]
      );

      return rows[0].count > 0;

    } catch (error) {
      console.error("VARIATION CHECK ERROR:", error);
      throw error;
    }
  },


  /* ================= GET VARIATIONS ================= */
  getVariations: async (parentSku) => {
    try {

      const sql = `
        SELECT *
        FROM product_variations
        WHERE parent_sku = ?
        ORDER BY created_at DESC
      `;

      const [rows] = await db.query(sql, [parentSku]);
      return rows;

    } catch (error) {
      console.error("GET VARIATIONS ERROR:", error);
      throw error;
    }
  }

};

module.exports = Product;