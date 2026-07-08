const express = require("express");
const router = express.Router();

const customerController = require("../../controllers/order_management/customer_controller");

router.get("/", customerController.listCustomers);
router.get("/:id", customerController.getCustomer);

module.exports = router;
