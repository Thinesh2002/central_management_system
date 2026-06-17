const CustomerModel = require("../../models/Customer/customer");

// CREATE
const createCustomer = async (req, res) => {
  try {
    const id = await CustomerModel.createCustomer(req.body);
    res.status(201).json({ success: true, customer_id: id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// READ ALL
const getCustomers = async (req, res) => {
  try {
    const data = await CustomerModel.getCustomers();
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// READ ONE
const getCustomerById = async (req, res) => {
  try {
    const data = await CustomerModel.getCustomerById(req.params.id);
    if (!data) return res.status(404).json({ message: "Customer not found" });
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// UPDATE
const updateCustomer = async (req, res) => {
  try {
    await CustomerModel.updateCustomer(req.params.id, req.body);
    res.json({ success: true, message: "Customer updated successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// DELETE
const deleteCustomer = async (req, res) => {
  try {
    await CustomerModel.deleteCustomer(req.params.id);
    res.json({ success: true, message: "Customer deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

module.exports = {
  createCustomer,
  getCustomers,
  getCustomerById,
  updateCustomer,
  deleteCustomer
};
