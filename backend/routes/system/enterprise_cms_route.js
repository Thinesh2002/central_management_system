const express = require("express");
const router = express.Router();
const controller = require("../../controllers/system/enterprise_cms_controller");

router.post("/bootstrap", controller.bootstrap);
router.get("/dashboard", controller.dashboard);
router.get("/generate-sku", controller.generateSku);

router.get("/products", controller.products);
router.post("/products", controller.saveProduct);
router.put("/products/:sku", controller.updateProduct);
router.post("/products/:sku/deactivate", controller.deactivateProduct);
router.delete("/products/:sku", controller.deleteProduct);

router.put("/stock", controller.updateStock);
router.post("/stock", controller.updateStock);

router.get("/sku-mapping", controller.mappings);
router.post("/sku-mapping", controller.saveMapping);

router.get("/categories", controller.categories);
router.post("/categories", controller.saveCategory);
router.delete("/categories/:code", controller.deleteCategory);
router.post("/sub-categories", controller.saveSubCategory);
router.delete("/sub-categories/:code", controller.deleteSubCategory);
router.get("/category-mapping", controller.categoryMappings);
router.post("/category-mapping", controller.saveCategoryMapping);

router.get("/images", controller.images);
router.get("/orders", controller.orders);
router.put("/orders/status", controller.updateOrderStatus);
router.post("/orders/status", controller.updateOrderStatus);
router.get("/finance", controller.finance);
router.get("/pack-rules", controller.packRules);
router.post("/pack-rules", controller.savePackRule);
router.get("/logs", controller.logs);

module.exports = router;
