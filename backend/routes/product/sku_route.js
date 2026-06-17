const express = require("express");
const router = express.Router();

const {
  createColour,
  getAllColours,
  getColourByCode,
  updateColour,
  deleteColour,
} = require("../../controllers/product/sku_controller");

/* ================= CREATE ================= */
router.post("/", createColour);

/* ================= READ ================= */
router.get("/", getAllColours);
router.get("/:colourCode", getColourByCode);

/* ================= UPDATE ================= */
router.put("/:colourCode", updateColour);

/* ================= DELETE ================= */
router.delete("/:colourCode", deleteColour);

module.exports = router;