const db = require("../../config/product_management_db");

const Colour = {

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
  validateColour: (data) => {
    if (!data.colour_code) throw new Error("Colour code is required");
    if (!data.colour_name) throw new Error("Colour name is required");

    if (data.colour_name.length < 2) {
      throw new Error("Colour name must be at least 2 characters");
    }
  },

  /* ================= CREATE ================= */
  create: async (data) => {
    try {

      Colour.validateColour(data);

      const codeExists = await Colour.codeExists(data.colour_code);
      if (codeExists) {
        throw new Error("Colour code already exists");
      }

      const nameExists = await Colour.nameExists(data.colour_name);
      if (nameExists) {
        throw new Error("Colour name already exists");
      }

      const sql = `
        INSERT INTO colours (colour_code, colour_name, created_at)
        VALUES (?, ?, NOW())
      `;

      return await Colour.safeQuery(sql, [
        data.colour_code,
        data.colour_name
      ]);

    } catch (error) {
      console.error("COLOUR CREATE ERROR:", error.message);
      throw error;
    }
  },

  /* ================= READ ALL ================= */
  getAll: async ({ page = 1, limit = 50, search = "" } = {}) => {
    try {

      const offset = (page - 1) * limit;

      const sql = `
        SELECT *
        FROM colours
        WHERE colour_name LIKE ?
        ORDER BY colour_name ASC
        LIMIT ? OFFSET ?
      `;

      return await Colour.safeQuery(sql, [`%${search}%`, limit, offset]);

    } catch (error) {
      console.error("COLOUR GET ALL ERROR:", error.message);
      throw error;
    }
  },

  /* ================= READ BY CODE ================= */
  getByCode: async (colourCode) => {
    try {

      if (!colourCode) throw new Error("Colour code is required");

      const rows = await Colour.safeQuery(
        "SELECT * FROM colours WHERE colour_code = ?",
        [colourCode]
      );

      return rows[0] || null;

    } catch (error) {
      console.error("COLOUR GET ERROR:", error.message);
      throw error;
    }
  },

  /* ================= UPDATE ================= */
  update: async (colourCode, data) => {
    try {

      if (!colourCode) throw new Error("Colour code is required");

      if (!data.colour_name) {
        throw new Error("Colour name is required");
      }

      const exists = await Colour.getByCode(colourCode);
      if (!exists) {
        throw new Error("Colour not found");
      }

      const nameExists = await Colour.nameExists(
        data.colour_name,
        colourCode
      );

      if (nameExists) {
        throw new Error("Colour name already exists");
      }

      const sql = `
        UPDATE colours
        SET colour_name = ?, updated_at = NOW()
        WHERE colour_code = ?
      `;

      return await Colour.safeQuery(sql, [
        data.colour_name,
        colourCode
      ]);

    } catch (error) {
      console.error("COLOUR UPDATE ERROR:", error.message);
      throw error;
    }
  },

  /* ================= DELETE ================= */
  delete: async (colourCode) => {
    try {

      if (!colourCode) throw new Error("Colour code is required");

      const isUsed = await Colour.isUsedByVariations(colourCode);
      if (isUsed) {
        throw new Error("Cannot delete colour used in variations");
      }

      return await Colour.safeQuery(
        "DELETE FROM colours WHERE colour_code = ?",
        [colourCode]
      );

    } catch (error) {
      console.error("COLOUR DELETE ERROR:", error.message);
      throw error;
    }
  },

  /* ================= VALIDATION ================= */

  codeExists: async (colourCode) => {
    try {
      const rows = await Colour.safeQuery(
        "SELECT colour_code FROM colours WHERE colour_code = ?",
        [colourCode]
      );
      return rows.length > 0;
    } catch (error) {
      console.error("CODE EXISTS ERROR:", error.message);
      throw error;
    }
  },

  nameExists: async (colourName, excludeCode = null) => {
    try {

      let sql = `
        SELECT colour_code
        FROM colours
        WHERE colour_name = ?
      `;

      const params = [colourName];

      if (excludeCode) {
        sql += " AND colour_code != ?";
        params.push(excludeCode);
      }

      const rows = await Colour.safeQuery(sql, params);
      return rows.length > 0;

    } catch (error) {
      console.error("NAME EXISTS ERROR:", error.message);
      throw error;
    }
  },

  /* ================= CHECK USAGE ================= */

  isUsedByVariations: async (colourCode) => {
    try {
      const rows = await Colour.safeQuery(
        "SELECT COUNT(*) AS count FROM product_variations WHERE colour_code = ?",
        [colourCode]
      );
      return rows[0].count > 0;
    } catch (error) {
      console.error("USAGE CHECK ERROR:", error.message);
      throw error;
    }
  }

};

module.exports = Colour;