const express = require("express");
const router = express.Router();

const supplierController = require("../../controllers/supplier/supplier_controller");

router.post("/create", supplierController.createSupplier);
router.get("/all", supplierController.getAllSuppliers);

router.post("/products", supplierController.createSupplierProduct);
router.get("/products", supplierController.getSupplierProducts);

router.get("/supplier-products/sku/:sku", supplierController.getSupplierProductBySku);
router.get("/supplier-products/:id", supplierController.getSupplierProductById);
router.put("/supplier-products/:id", supplierController.updateSupplierProduct);
router.delete("/supplier-products/:id", supplierController.deleteSupplierProduct);

router.post("/shipments", supplierController.createShipment);
router.get("/shipments", supplierController.getShipments);
router.get("/shipments/:id", supplierController.getShipmentById);
router.put("/shipments/:id", supplierController.updateShipment);
router.delete("/shipments/:id", supplierController.deleteShipment);

router.post("/shipments/:id/orders", supplierController.createShipmentOrder);
router.get("/shipments/:id/orders", supplierController.getShipmentOrders);

router.put("/shipment-orders/:orderId", supplierController.updateShipmentOrder);
router.delete("/shipment-orders/:orderId", supplierController.deleteShipmentOrder);

router.get("/:id", supplierController.getSupplierById);
router.put("/:id", supplierController.updateSupplier);
router.delete("/:id", supplierController.deleteSupplier);

module.exports = router;