const express = require("express");
const controller = require("../../controllers/order_management/message_template_controller");

const router = express.Router();

router.get("/", controller.listTemplates);
router.post("/", controller.createTemplate);
router.patch("/:id", controller.updateTemplate);
router.delete("/:id", controller.deleteTemplate);

module.exports = router;
