const SubCategory = require("../../models/product/sub_category_model");

/* CREATE */
const createSubCategory = async (req, res) => {
  try {

    await SubCategory.create(req.body);

    res.status(201).json({
      success: true,
      message: "Sub category created"
    });

  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/* GET ALL */
const getAllSubCategories = async (req, res) => {
  try {

    const data = await SubCategory.getAll();

    res.json({
      success: true,
      data
    });

  } catch (err) {
    res.status(500).json({ success: false });
  }
};

/* GET BY CATEGORY */
const getSubByCategory = async (req, res) => {
  try {

    const { categoryCode } = req.params;

    const data = await SubCategory.getByCategory(categoryCode);

    res.json({
      success: true,
      data
    });

  } catch (err) {
    res.status(500).json({ success: false });
  }
};

/* UPDATE */
const updateSubCategory = async (req, res) => {
  try {

    const { subCategoryCode } = req.params;

    await SubCategory.update(subCategoryCode, req.body);

    res.json({
      success: true,
      message: "Updated"
    });

  } catch (err) {
    res.status(500).json({ success: false });
  }
};

/* DELETE */
const deleteSubCategory = async (req, res) => {
  try {

    const { subCategoryCode } = req.params;

    await SubCategory.delete(subCategoryCode);

    res.json({
      success: true,
      message: "Deleted"
    });

  } catch (err) {
    res.status(500).json({ success: false });
  }
};

module.exports = {
  createSubCategory,
  getAllSubCategories,
  getSubByCategory,
  updateSubCategory,
  deleteSubCategory
};