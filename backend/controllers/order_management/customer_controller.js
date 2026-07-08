const asyncHandler = require("../../middleware/async_handler");
const customerModel = require("../../models/order_management/customer_model");

const listCustomers = asyncHandler(async (req, res) => {
  const result = await customerModel.list(req.query);

  return res.json({
    success: true,
    message: "Customers loaded successfully.",
    data: result.data,
    pagination: result.pagination,
  });
});

const getCustomer = asyncHandler(async (req, res) => {
  const customer = await customerModel.findByIdWithOrders(req.params.id);

  if (!customer) {
    return res.status(404).json({ success: false, message: "Customer not found." });
  }

  return res.json({
    success: true,
    message: "Customer loaded successfully.",
    data: customer,
  });
});

module.exports = { listCustomers, getCustomer };
