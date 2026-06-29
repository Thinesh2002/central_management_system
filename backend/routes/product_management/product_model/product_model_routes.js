const express = require("express");
const router = express.Router();

const productModelController = require("../../../controllers/product_management/product_model/product_model_controller");

router.get("/", productModelController.listModels);
router.get("/:id", productModelController.getModel);

router.post("/", productModelController.createModel);
router.put("/:id", productModelController.updateModel);

router.delete("/:id", productModelController.deleteModel);
router.patch("/:id/restore", productModelController.restoreModel);
router.delete("/:id/force", productModelController.forceDeleteModel);


module.exports = router;