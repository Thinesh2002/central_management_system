const Model = require(".././../../models/product_management/attribute/attribute_model");

function success(res, message, data = null, status = 200) {
  return res.status(status).json({ success: true, message, data });
}

function fail(res, error) {
  let status = error.statusCode || 500;
  let message = error.message || "Something went wrong";

  if (error.code === "ER_DUP_ENTRY") {
    status = 409;
    message = "Duplicate attribute already exists";
  }

  return res.status(status).json({ success: false, message, errorCode: error.code || null });
}

async function getAll(req, res) {
  try {
    return success(res, "Attributes loaded", await Model.getAll(req.query));
  } catch (error) {
    return fail(res, error);
  }
}

async function getById(req, res) {
  try {
    const data = await Model.getById(req.params.id, req.query.includeDeleted === "true");
    if (!data) return res.status(404).json({ success: false, message: "Attribute not found" });
    return success(res, "Attribute loaded", data);
  } catch (error) {
    return fail(res, error);
  }
}

async function create(req, res) {
  try {
    return success(res, "Attribute created", await Model.create(req.body), 201);
  } catch (error) {
    return fail(res, error);
  }
}

async function update(req, res) {
  try {
    const data = await Model.update(req.params.id, req.body);
    if (!data) return res.status(404).json({ success: false, message: "Attribute not found" });
    return success(res, "Attribute updated", data);
  } catch (error) {
    return fail(res, error);
  }
}

async function remove(req, res) {
  try {
    return success(res, "Attribute deleted", await Model.remove(req.params.id));
  } catch (error) {
    return fail(res, error);
  }
}

async function restore(req, res) {
  try {
    return success(res, "Attribute restored", await Model.restore(req.params.id));
  } catch (error) {
    return fail(res, error);
  }
}

module.exports = { getAll, getById, create, update, remove, restore };