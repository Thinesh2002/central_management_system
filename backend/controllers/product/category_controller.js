const Category = require("../../models/product/category_model");

/* ================= HELPER: RESPONSE ================= */
const success = (res, data, message = "Success", status = 200) => {
  return res.status(status).json({
    success: true,
    message,
    ...data
  });
};

const error = (res, message = "Error", status = 500) => {
  return res.status(status).json({
    success: false,
    message
  });
};

/* ================= CREATE CATEGORY ================= */
const createCategory = async (req, res) => {
  try {
    let { category_code, category_name, created_by } = req.body;

    category_code = category_code?.trim();
    category_name = category_name?.trim();
    created_by = created_by?.trim() || null;

    if (!category_code) return error(res, "Category code is required", 400);
    if (!category_name) return error(res, "Category name is required", 400);

    if (category_code.length > 20)
      return error(res, "Category code max 20 characters", 400);

    if (category_name.length > 100)
      return error(res, "Category name max 100 characters", 400);

    const codeExists = await Category.codeExists(category_code);
    if (codeExists)
      return error(res, `Category code '${category_code}' already exists`, 409);

    const nameExists = await Category.nameExists(category_name);
    if (nameExists)
      return error(res, `Category name '${category_name}' already exists`, 409);

    await Category.create({
      category_code,
      category_name,
      created_by
    });

    return success(res, {
      data: { category_code }
    }, "Category created successfully", 201);

  } catch (err) {
    console.error("CREATE CATEGORY ERROR:", err.message);
    return error(res, "Failed to create category");
  }
};

/* ================= GET ALL CATEGORIES ================= */
const getAllCategories = async (req, res) => {
  try {
    const { page = 1, limit = 50 } = req.query;

    const categories = await Category.getAll({
      page: Number(page),
      limit: Number(limit)
    });

    return success(res, {
      count: categories.length,
      data: categories
    });

  } catch (err) {
    console.error("GET ALL ERROR:", err.message);
    return error(res, "Failed to fetch categories");
  }
};

/* ================= GET CATEGORY BY CODE ================= */
const getCategoryByCode = async (req, res) => {
  try {
    const { categoryCode } = req.params;

    if (!categoryCode)
      return error(res, "Category code is required", 400);

    const category = await Category.getByCode(categoryCode);

    if (!category)
      return error(res, `Category '${categoryCode}' not found`, 404);

    return success(res, { data: category });

  } catch (err) {
    console.error("GET CATEGORY ERROR:", err.message);
    return error(res, "Failed to fetch category");
  }
};

/* ================= UPDATE CATEGORY ================= */
const updateCategory = async (req, res) => {
  try {
    const { categoryCode } = req.params;
    let data = { ...req.body };

    if (!categoryCode)
      return error(res, "Category code is required", 400);

    const existing = await Category.getByCode(categoryCode);
    if (!existing)
      return error(res, `Category '${categoryCode}' not found`, 404);

    delete data.category_code;
    delete data.created_at;
    delete data.updated_at;

    if (data.category_name) {
      data.category_name = data.category_name.trim();

      const nameExists = await Category.nameExists(
        data.category_name,
        categoryCode
      );

      if (nameExists)
        return error(res, "Category name already exists", 409);
    }

    const result = await Category.update(categoryCode, data);

    if (result.affectedRows === 0)
      return error(res, "No changes made", 400);

    return success(res, {}, "Category updated successfully");

  } catch (err) {
    console.error("UPDATE CATEGORY ERROR:", err.message);
    return error(res, "Failed to update category");
  }
};

/* ================= DELETE CATEGORY ================= */
const deleteCategory = async (req, res) => {
  try {
    const { categoryCode } = req.params;

    if (!categoryCode)
      return error(res, "Category code is required", 400);

    const existing = await Category.getByCode(categoryCode);
    if (!existing)
      return error(res, `Category '${categoryCode}' not found`, 404);

    const hasSub = await Category.hasSubCategories(categoryCode);
    if (hasSub)
      return error(res, "Category has subcategories", 409);

    await Category.delete(categoryCode);

    return success(res, {}, "Category deleted successfully");

  } catch (err) {
    console.error("DELETE CATEGORY ERROR:", err.message);
    return error(res, "Failed to delete category");
  }
};

module.exports = {
  createCategory,
  getAllCategories,
  getCategoryByCode,
  updateCategory,
  deleteCategory,
};