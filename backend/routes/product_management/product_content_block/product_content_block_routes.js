const express = require("express");
const router = express.Router();

const productContentBlockController = require("../../../controllers/product_management/product_content_block/product_content_block_controller");

router.get("/", productContentBlockController.listBlocks);
router.post("/", productContentBlockController.createBlock);
router.put("/reorder", productContentBlockController.reorderBlocks);
router.put("/:id", productContentBlockController.updateBlock);
router.delete("/:id", productContentBlockController.deleteBlock);

module.exports = router;
