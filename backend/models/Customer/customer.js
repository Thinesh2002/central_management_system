const db = require("../../config/db");

// 1. CREATE
const createCustomer = async (data) => {
  const { name, email, phone, address } = data;
  const [res] = await db.query(
    `INSERT INTO customers (name, email, phone, address)
     VALUES (?, ?, ?, ?)`,
    [name, email, phone, address]
  );
  return res.insertId;
};

// 2. READ ALL
const getCustomers = async () => {
  const [rows] = await db.query(
    `SELECT * FROM customers ORDER BY id DESC`
  );
  return rows;
};

// 3. READ SINGLE
const getCustomerById = async (id) => {
  const [rows] = await db.query(
    `SELECT * FROM customers WHERE id = ?`,
    [id]
  );
  return rows[0];
};

// 4. UPDATE
const updateCustomer = async (id, data) => {
  const { name, email, phone, address } = data;
  const [res] = await db.query(
    `UPDATE customers 
     SET name = ?, email = ?, phone = ?, address = ? 
     WHERE id = ?`,
    [name, email, phone, address, id]
  );
  return res;
};

// 5. DELETE
const deleteCustomer = async (id) => {
  const [res] = await db.query(
    `DELETE FROM customers WHERE id = ?`,
    [id]
  );
  return res;
};

module.exports = {
  createCustomer,
  getCustomers,
  getCustomerById,
  updateCustomer,
  deleteCustomer
};
