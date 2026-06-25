const Model = require("../../../models/product_management/category/sub_category_model");

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

    if (String(error.message || "").includes("sub_category_code")) {
      message = "Sub category code already exists";
    } else if (String(error.message || "").includes("slug")) {
      message = "Sub category slug already exists";
    } else {
      message = "Duplicate sub category already exists";
    }
  }

  if (
    error.code === "ER_NO_REFERENCED_ROW_2" ||
    error.code === "ER_ROW_IS_REFERENCED_2"
  ) {
    status = 400;
    message = "Invalid category code";
  }

  return res.status(status).json({
    success: false,
    message,
    errorCode: error.code || null,
  });
}

async function getAll(req, res) {
  try {
    const data = await Model.getAll(req.query);
    return success(res, "Sub categories loaded", data);
  } catch (error) {
    return fail(res, error);
  }
}

async function getById(req, res) {
  try {
    const includeDeleted = req.query.includeDeleted === "true";

    const data = await Model.getById(req.params.id, includeDeleted);

    if (!data) {
      return res.status(404).json({
        success: false,
        message: "Sub category not found",
      });
    }

    return success(res, "Sub category loaded", data);
  } catch (error) {
    return fail(res, error);
  }
}

async function create(req, res) {
  try {
    const data = await Model.create(req.body);
    return success(res, "Sub category created", data, 201);
  } catch (error) {
    return fail(res, error);
  }
}

async function update(req, res) {
  try {
    const data = await Model.update(req.params.id, req.body);

    if (!data) {
      return res.status(404).json({
        success: false,
        message: "Sub category not found",
      });
    }

    return success(res, "Sub category updated", data);
  } catch (error) {
    return fail(res, error);
  }
}

async function remove(req, res) {
  try {
    const data = await Model.remove(req.params.id);

    if (!data) {
      return res.status(404).json({
        success: false,
        message: "Sub category not found",
      });
    }

    return success(res, "Sub category deleted", data);
  } catch (error) {
    return fail(res, error);
  }
}

async function restore(req, res) {
  try {
    const data = await Model.restore(req.params.id);

    if (!data) {
      return res.status(404).json({
        success: false,
        message: "Sub category not found",
      });
    }

    return success(res, "Sub category restored", data);
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