const Model = require("../../../models/product_management/logs/product_image_log_model");

function success(res, message, data = null, status = 200) {
  return res.status(status).json({ success: true, message, data });
}

function fail(res, error) {
  return res.status(error.statusCode || 500).json({
    success: false,
    message: error.message || "Something went wrong",
    errorCode: error.code || null,
  });
}

async function getAll(req, res) {
  try {
    return success(res, "Product image logs loaded", await Model.getAll(req.query));
  } catch (error) {
    return fail(res, error);
  }
}

async function getById(req, res) {
  try {
    const data = await Model.getById(req.params.id);
    if (!data) return res.status(404).json({ success: false, message: "Product image log not found" });
    return success(res, "Product image log loaded", data);
  } catch (error) {
    return fail(res, error);
  }
}

async function create(req, res) {
  try {
    return success(res, "Product image log created", await Model.create(req.body), 201);
  } catch (error) {
    return fail(res, error);
  }
}

async function remove(req, res) {
  try {
    const data = await Model.remove(req.params.id);
    if (!data) return res.status(404).json({ success: false, message: "Product image log not found" });
    return success(res, "Product image log deleted", data);
  } catch (error) {
    return fail(res, error);
  }
}

module.exports = { getAll, getById, create, remove };