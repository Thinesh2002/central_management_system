const Colour = require("../../models/product/sku_model");

/* ================= RESPONSE ================= */
const success = (res, data = {}, message = "Success", status = 200) =>
  res.status(status).json({ success: true, message, ...data });

const error = (res, message = "Error", status = 500) =>
  res.status(status).json({ success: false, message });

/* ================= CREATE ================= */
const createColour = async (req, res) => {
  try {

    let { colour_code, colour_name } = req.body;

    colour_code = colour_code?.trim();
    colour_name = colour_name?.trim();

    if (!colour_code) return error(res, "Colour code is required", 400);
    if (!colour_name) return error(res, "Colour name is required", 400);

    if (colour_code.length > 20)
      return error(res, "Colour code max 20 characters", 400);

    if (colour_name.length > 100)
      return error(res, "Colour name max 100 characters", 400);

    const codeExists = await Colour.codeExists(colour_code);
    if (codeExists)
      return error(res, "Colour code already exists", 409);

    const nameExists = await Colour.nameExists(colour_name);
    if (nameExists)
      return error(res, "Colour name already exists", 409);

    await Colour.create({ colour_code, colour_name });

    return success(res, {
      data: { colour_code }
    }, "Colour created", 201);

  } catch (err) {
    console.error("CREATE COLOUR ERROR:", err.message);
    return error(res, "Failed to create colour");
  }
};

/* ================= GET ALL ================= */
const getAllColours = async (req, res) => {
  try {

    const { page = 1, limit = 50, search = "" } = req.query;

    const colours = await Colour.getAll({
      page: Number(page),
      limit: Number(limit),
      search
    });

    return success(res, {
      count: colours.length,
      data: colours
    });

  } catch (err) {
    console.error("GET COLOURS ERROR:", err.message);
    return error(res, "Failed to retrieve colours");
  }
};

/* ================= GET BY CODE ================= */
const getColourByCode = async (req, res) => {
  try {

    const { colourCode } = req.params;

    if (!colourCode)
      return error(res, "Colour code is required", 400);

    const colour = await Colour.getByCode(colourCode);

    if (!colour)
      return error(res, `Colour '${colourCode}' not found`, 404);

    return success(res, { data: colour });

  } catch (err) {
    console.error("GET COLOUR ERROR:", err.message);
    return error(res, "Failed to retrieve colour");
  }
};

/* ================= UPDATE ================= */
const updateColour = async (req, res) => {
  try {

    const { colourCode } = req.params;
    let data = { ...req.body };

    if (!colourCode)
      return error(res, "Colour code is required", 400);

    const existing = await Colour.getByCode(colourCode);

    if (!existing)
      return error(res, "Colour not found", 404);

    delete data.colour_code;
    delete data.created_at;
    delete data.updated_at;

    if (data.colour_name) {
      data.colour_name = data.colour_name.trim();

      if (data.colour_name.length > 100)
        return error(res, "Colour name max 100 characters", 400);

      const exists = await Colour.nameExists(
        data.colour_name,
        colourCode
      );

      if (exists)
        return error(res, "Colour name already exists", 409);
    }

    const result = await Colour.update(colourCode, data);

    if (result.affectedRows === 0)
      return error(res, "No changes made", 400);

    return success(res, {}, "Colour updated");

  } catch (err) {
    console.error("UPDATE COLOUR ERROR:", err.message);
    return error(res, "Failed to update colour");
  }
};

/* ================= DELETE ================= */
const deleteColour = async (req, res) => {
  try {

    const { colourCode } = req.params;

    if (!colourCode)
      return error(res, "Colour code is required", 400);

    const existing = await Colour.getByCode(colourCode);

    if (!existing)
      return error(res, "Colour not found", 404);

    const isUsed = await Colour.isUsedByVariations(colourCode);

    if (isUsed)
      return error(res, "Colour is used in variations", 409);

    await Colour.delete(colourCode);

    return success(res, {}, "Colour deleted");

  } catch (err) {
    console.error("DELETE COLOUR ERROR:", err.message);
    return error(res, "Failed to delete colour");
  }
};

module.exports = {
  createColour,
  getAllColours,
  getColourByCode,
  updateColour,
  deleteColour
};