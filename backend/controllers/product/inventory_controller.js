const Inventory = require("../../models/product/inventory_model");

/* ================= HELPER ================= */
const success = (res, data = {}, message = "Success", status = 200) => {
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

/* ================= CREATE INVENTORY ================= */
const createInventory = async (req, res) => {
  try {
    let { sku, total_stock, reserved_stock } = req.body;

    sku = sku?.trim();

    if (!sku) return error(res, "SKU is required", 400);

    const skuValid = await Inventory.skuExists(sku);
    if (!skuValid)
      return error(res, `SKU '${sku}' does not exist`, 400);

    const total = Number(total_stock) || 0;
    const reserved = Number(reserved_stock) || 0;

    if (total < 0 || reserved < 0)
      return error(res, "Stock values cannot be negative", 400);

    if (reserved > total)
      return error(res, "Reserved stock cannot exceed total stock", 400);

    await Inventory.create({
      sku,
      total_stock: total,
      reserved_stock: reserved
    });

    return success(res, {}, "Inventory created successfully", 201);

  } catch (err) {
    console.error("CREATE INVENTORY ERROR:", err.message);
    return error(res, "Failed to create inventory");
  }
};

/* ================= GET ALL ================= */
const getAllInventory = async (req, res) => {
  try {
    const { page = 1, limit = 50, search = "" } = req.query;

    const inventory = await Inventory.getAll({
      page: Number(page),
      limit: Number(limit),
      search
    });

    return success(res, {
      count: inventory.length,
      data: inventory
    });

  } catch (err) {
    console.error("GET INVENTORY ERROR:", err.message);
    return error(res, "Failed to retrieve inventory");
  }
};

/* ================= GET BY SKU ================= */
const getInventoryBySku = async (req, res) => {
  try {
    const { sku } = req.params;

    if (!sku) return error(res, "SKU is required", 400);

    const record = await Inventory.getBySku(sku);

    if (!record)
      return error(res, `Inventory '${sku}' not found`, 404);

    return success(res, { data: record });

  } catch (err) {
    console.error("GET INVENTORY ERROR:", err.message);
    return error(res, "Failed to retrieve inventory");
  }
};

/* ================= UPDATE ================= */
const updateInventory = async (req, res) => {
  try {
    const { sku } = req.params;
    let data = { ...req.body };

    if (!sku) return error(res, "SKU is required", 400);

    const existing = await Inventory.getBySku(sku);
    if (!existing)
      return error(res, `Inventory '${sku}' not found`, 404);

    const total = data.total_stock !== undefined
      ? Number(data.total_stock)
      : existing.total_stock;

    const reserved = data.reserved_stock !== undefined
      ? Number(data.reserved_stock)
      : existing.reserved_stock;

    if (isNaN(total) || isNaN(reserved))
      return error(res, "Invalid numeric values", 400);

    if (total < 0 || reserved < 0)
      return error(res, "Stock cannot be negative", 400);

    if (reserved > total)
      return error(res, "Reserved stock cannot exceed total", 400);

    const result = await Inventory.update(sku, {
      total_stock: total,
      reserved_stock: reserved
    });

    if (result.affectedRows === 0)
      return error(res, "No changes made", 400);

    return success(res, {}, "Inventory updated successfully");

  } catch (err) {
    console.error("UPDATE INVENTORY ERROR:", err.message);
    return error(res, "Failed to update inventory");
  }
};

/* ================= DELETE ================= */
const deleteInventory = async (req, res) => {
  try {
    const { sku } = req.params;

    if (!sku) return error(res, "SKU is required", 400);

    const existing = await Inventory.getBySku(sku);
    if (!existing)
      return error(res, `Inventory '${sku}' not found`, 404);

    await Inventory.delete(sku);

    return success(res, {}, "Inventory deleted successfully");

  } catch (err) {
    console.error("DELETE INVENTORY ERROR:", err.message);
    return error(res, "Failed to delete inventory");
  }
};

module.exports = {
  createInventory,
  getAllInventory,
  getInventoryBySku,
  updateInventory,
  deleteInventory
};