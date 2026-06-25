const express = require("express");
const controller = require("../../../controllers/product_management/attribute/attributeValue_controller");

const router = express.Router();

router.get("/", controller.getAll);
router.get("/:id", controller.getById);
router.post("/", controller.create);
router.put("/:id", controller.update);
router.delete("/:id", controller.remove);
router.patch("/:id/restore", controller.restore);

module.exports = router;