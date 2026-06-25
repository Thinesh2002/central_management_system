const Model = require("../../../models/product_management/category/category_model");

function success(res, message, data = null, status = 200) {
  return res.status(status).json({
    success: true,
    message,
    data,
  });
}

function fail(res, error) {
  let status = error.statusCode || 500;
  let message = error.message || "Something went wrong";

  if (error.code === "ER_DUP_ENTRY") {
    status = 409;

    if (error.sqlMessage?.includes("category_code")) {
      message = "Category code already exists.";
    } else if (error.sqlMessage?.includes("slug")) {
      message = "Category slug already exists.";
    } else if (error.sqlMessage?.includes("name")) {
      message = "Category name already exists.";
    } else {
      message = "Duplicate category already exists.";
    }
  }

  if (error.code === "ER_BAD_NULL_ERROR") {
    status = 400;
    message = "Required category field is missing.";
  }

  return res.status(status).json({
    success: false,
    message,
    errorCode: error.code || null,
  });
}

function cleanBody(body = {}) {
  return {
    category_code:
      body.category_code !== undefined ? String(body.category_code).trim() : undefined,

    name:
      body.name !== undefined
        ? String(body.name).trim()
        : body.category_name !== undefined
        ? String(body.category_name).trim()
        : undefined,

    slug:
      body.slug !== undefined ? String(body.slug).trim() : undefined,

    description:
      body.description !== undefined ? String(body.description).trim() : undefined,
  };
}

async function getAll(req, res) {
  try {
    const data = await Model.getAll(req.query);
    return success(res, "Categories loaded", data);
  } catch (error) {
    return fail(res, error);
  }
}

async function getById(req, res) {
  try {
    const id = req.params.id;

    if (!id || id === "undefined" || id === "null") {
      return res.status(400).json({
        success: false,
        message: "Valid category ID is required.",
      });
    }

    const includeDeleted = req.query.includeDeleted === "true";
    const data = await Model.getById(id, includeDeleted);

    if (!data) {
      return res.status(404).json({
        success: false,
        message: "Category not found.",
      });
    }

    return success(res, "Category loaded", data);
  } catch (error) {
    return fail(res, error);
  }
}

async function create(req, res) {
  try {
    const body = cleanBody(req.body);

    if (!body.name) {
      return res.status(400).json({
        success: false,
        message: "Category name is required.",
      });
    }

    const data = await Model.create(body);
    return success(res, "Category created", data, 201);
  } catch (error) {
    return fail(res, error);
  }
}

async function update(req, res) {
  try {
    const id = req.params.id;

    if (!id || id === "undefined" || id === "null") {
      return res.status(400).json({
        success: false,
        message: "Valid category ID is required.",
      });
    }

    const body = cleanBody(req.body);

    const data = await Model.update(id, body);

    if (!data) {
      return res.status(404).json({
        success: false,
        message: "Category not found.",
      });
    }

    return success(res, "Category updated", data);
  } catch (error) {
    return fail(res, error);
  }
}

async function remove(req, res) {
  try {
    const id = req.params.id;

    if (!id || id === "undefined" || id === "null") {
      return res.status(400).json({
        success: false,
        message: "Valid category ID is required.",
      });
    }

    const data = await Model.remove(id);

    if (!data) {
      return res.status(404).json({
        success: false,
        message: "Category not found or already deleted.",
      });
    }

    return success(res, "Category deleted", data);
  } catch (error) {
    return fail(res, error);
  }
}

async function restore(req, res) {
  try {
    const id = req.params.id;

    if (!id || id === "undefined" || id === "null") {
      return res.status(400).json({
        success: false,
        message: "Valid category ID is required.",
      });
    }

    const data = await Model.restore(id);

    if (!data) {
      return res.status(404).json({
        success: false,
        message: "Category not found.",
      });
    }

    return success(res, "Category restored", data);
  } catch (error) {
    return fail(res, error);
  }
}

module.exports = {
  getAll,
  getById,
  create,
  update,
  remove,
  restore,
};