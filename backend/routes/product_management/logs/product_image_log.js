const express = require("express");
const controller = require("../../../controllers/product_management/logs/product_image_log");

const router = express.Router();

router.get("/", controller.getAll);
router.get("/:id", controller.getById);
router.post("/", controller.create);
router.delete("/:id", controller.remove);

module.exports = router;