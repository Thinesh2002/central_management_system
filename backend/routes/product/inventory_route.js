const express = require("express");
const router = express.Router();

const {
  createInventory,
  getAllInventory,
  getInventoryBySku,
  updateInventory,
  deleteInventory
} = require("../../controllers/product/inventory_controller");

/* ================= CREATE ================= */
router.post("/", createInventory);

/* ================= READ ================= */
router.get("/", getAllInventory);
router.get("/:sku", getInventoryBySku);

/* ================= UPDATE ================= */
router.put("/:sku", updateInventory);

/* ================= DELETE ================= */
router.delete("/:sku", deleteInventory);

module.exports = router;