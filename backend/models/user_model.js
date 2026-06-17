// models/userModel.js
const db = require('../config/db');

module.exports = {
  // find by email OR user_id OR id
  findByLogin: async (login) => {
    // try numeric id and string matches
    const [rows] = await db.query(
      `SELECT * FROM users WHERE email = ? OR user_id = ? OR id = ? LIMIT 1`,
      [login, login, login]
    );
    return rows[0] || null;
  },

  findByEmail: async (email) => {
    const [rows] = await db.query(`SELECT * FROM users WHERE email = ? LIMIT 1`, [email]);
    return rows[0] || null;
  },

  findByUserId: async (user_id) => {
    const [rows] = await db.query(`SELECT * FROM users WHERE user_id = ? LIMIT 1`, [user_id]);
    return rows[0] || null;
  },

  findById: async (id) => {
    const [rows] = await db.query(`SELECT * FROM users WHERE id = ? LIMIT 1`, [id]);
    return rows[0] || null;
  },

  createUser: async ({ name, user_id, email, hashedPassword, created_at }) => {
    const [result] = await db.query(
      `INSERT INTO users (name, user_id, email, password, created_at) VALUES (?, ?, ?, ?, ?)`,
      [name || null, user_id || null, email || null, hashedPassword, created_at || null]
    );
    return result.insertId;
  },

  updateUserById: async (id, { name, user_id, email, hashedPassword }) => {
    // build query dynamically
    const fields = [];
    const params = [];

    if (name !== undefined) { fields.push('name = ?'); params.push(name); }
    if (user_id !== undefined) { fields.push('user_id = ?'); params.push(user_id); }
    if (email !== undefined) { fields.push('email = ?'); params.push(email); }
    if (hashedPassword !== undefined) { fields.push('password = ?'); params.push(hashedPassword); }

    if (fields.length === 0) return 0;

    params.push(id);
    const sql = `UPDATE users SET ${fields.join(', ')} WHERE id = ?`;
    const [res] = await db.query(sql, params);
    return res.affectedRows;
  },

  deleteUserById: async (id) => {
    const [res] = await db.query(`DELETE FROM users WHERE id = ?`, [id]);
    return res.affectedRows;
  }
};


module.exports.getAllUsers = async () => {
  const [rows] = await db.query(`SELECT id, name, user_id, email, created_at FROM users ORDER BY id DESC`);
  return rows;
};

module.exports.getUserCount = async () => {
  const [rows] = await db.query(`SELECT COUNT(*) AS total FROM users`);
  return rows[0]?.total || 0;
};

module.exports.getRecentUsers = async (limit = 5) => {
  const [rows] = await db.query(
    `SELECT id, name, user_id, email, created_at FROM users ORDER BY created_at DESC LIMIT ?`,
    [Number(limit)]
  );
  return rows;
};


module.exports.findById = async (id) => {
  const [rows] = await db.query('SELECT id, name, user_id, email, password, created_at FROM users WHERE id = ? LIMIT 1', [id]);
  return rows[0] || null;
};