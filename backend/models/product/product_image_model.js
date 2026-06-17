const db = require("../../config/product_management_db");

const ProductImage = {

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
  validateImages: (data) => {
    if (!data.sku) throw new Error("SKU is required");

    const imageFields = [
      "main_image",
      "sub_image1","sub_image2","sub_image3","sub_image4",
      "sub_image5","sub_image6","sub_image7","sub_image8","sub_image9"
    ];

    imageFields.forEach(field => {
      if (data[field] && typeof data[field] !== "string") {
        throw new Error(`${field} must be a valid image URL`);
      }
    });
  },

  /* ================= HELPER: MAP ARRAY ================= */
  mapImagesFromArray: (sku, images = []) => {
    return {
      sku,
      main_image: images[0] || null,
      sub_image1: images[1] || null,
      sub_image2: images[2] || null,
      sub_image3: images[3] || null,
      sub_image4: images[4] || null,
      sub_image5: images[5] || null,
      sub_image6: images[6] || null,
      sub_image7: images[7] || null,
      sub_image8: images[8] || null,
      sub_image9: images[9] || null
    };
  },

  /* ================= CREATE ================= */
  create: async (data) => {
    try {

      ProductImage.validateImages(data);

      const exists = await ProductImage.anySkuExists(data.sku);
      if (!exists) {
        throw new Error("Invalid SKU - not found in products or variations");
      }

      const sql = `
        INSERT INTO product_images
        (
          sku,
          main_image,
          sub_image1,
          sub_image2,
          sub_image3,
          sub_image4,
          sub_image5,
          sub_image6,
          sub_image7,
          sub_image8,
          sub_image9
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;

      const values = [
        data.sku,
        data.main_image || null,
        data.sub_image1 || null,
        data.sub_image2 || null,
        data.sub_image3 || null,
        data.sub_image4 || null,
        data.sub_image5 || null,
        data.sub_image6 || null,
        data.sub_image7 || null,
        data.sub_image8 || null,
        data.sub_image9 || null
      ];

      return await ProductImage.safeQuery(sql, values);

    } catch (error) {
      console.error("PRODUCT IMAGE CREATE ERROR:", error.message);
      throw error;
    }
  },

  /* ================= GET BY SKU ================= */
  getBySku: async (sku) => {
    try {

      if (!sku) throw new Error("SKU is required");

      const rows = await ProductImage.safeQuery(
        "SELECT * FROM product_images WHERE sku = ?",
        [sku]
      );

      return rows[0] || null;

    } catch (error) {
      console.error("PRODUCT IMAGE GET ERROR:", error.message);
      throw error;
    }
  },

  /* ================= UPDATE (SMART UPSERT) ================= */
  update: async (sku, data) => {
    try {

      if (!sku) throw new Error("SKU is required");

      ProductImage.validateImages({ ...data, sku });

      const existing = await ProductImage.getBySku(sku);

      if (!existing) {
        return await ProductImage.create({ ...data, sku });
      }

      const fields = [];
      const values = [];

      const allowedFields = [
        "main_image",
        "sub_image1",
        "sub_image2",
        "sub_image3",
        "sub_image4",
        "sub_image5",
        "sub_image6",
        "sub_image7",
        "sub_image8",
        "sub_image9"
      ];

      for (const field of allowedFields) {
        if (data[field] !== undefined) {
          fields.push(`${field} = ?`);
          values.push(data[field]);
        }
      }

      if (fields.length === 0) {
        throw new Error("No fields provided for update");
      }

      values.push(sku);

      const sql = `
        UPDATE product_images 
        SET ${fields.join(", ")}
        WHERE sku = ?
      `;

      return await ProductImage.safeQuery(sql, values);

    } catch (error) {
      console.error("PRODUCT IMAGE UPDATE ERROR:", error.message);
      throw error;
    }
  },

  /* ================= BULK UPDATE (NEW) ================= */
  bulkUpdate: async (items = []) => {
    const connection = await db.getConnection();

    try {
      await connection.beginTransaction();

      for (const item of items) {
        await ProductImage.update(item.sku, item);
      }

      await connection.commit();
      return { success: true };

    } catch (error) {
      await connection.rollback();
      console.error("BULK UPDATE ERROR:", error.message);
      throw error;
    } finally {
      connection.release();
    }
  },

  /* ================= DELETE ================= */
  delete: async (sku) => {
    try {

      if (!sku) throw new Error("SKU is required");

      return await ProductImage.safeQuery(
        "DELETE FROM product_images WHERE sku = ?",
        [sku]
      );

    } catch (error) {
      console.error("PRODUCT IMAGE DELETE ERROR:", error.message);
      throw error;
    }
  },

  /* ================= VALIDATION ================= */

  skuExists: async (sku) => {
    try {
      const rows = await ProductImage.safeQuery(
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
      const rows = await ProductImage.safeQuery(
        "SELECT parent_sku FROM products WHERE parent_sku = ?",
        [parentSku]
      );
      return rows.length > 0;
    } catch (error) {
      console.error("PARENT SKU CHECK ERROR:", error.message);
      throw error;
    }
  },

  anySkuExists: async (sku) => {
    try {

      const productRows = await ProductImage.safeQuery(
        "SELECT parent_sku FROM products WHERE parent_sku = ?",
        [sku]
      );

      if (productRows.length > 0) return true;

      const variationRows = await ProductImage.safeQuery(
        "SELECT sku FROM product_variations WHERE sku = ?",
        [sku]
      );

      return variationRows.length > 0;

    } catch (error) {
      console.error("ANY SKU CHECK ERROR:", error.message);
      throw error;
    }
  }

};

module.exports = ProductImage;