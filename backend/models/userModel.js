const bcrypt = require("bcrypt");
const pool = require("../config/db");
const { cleanEmail, cleanString } = require("../utils/validators");

const SAFE_FIELDS = `id, user_uid, name, email, role, status, is_master_locked,
  failed_login_attempts, locked_until, last_login_at, last_login_ip,
  password_changed_at, created_at, updated_at`;

function saltRounds() {
  const rounds = Number(process.env.BCRYPT_SALT_ROUNDS || 10);
  return Number.isFinite(rounds) && rounds >= 10 ? rounds : 10;
}

async function hashPassword(password) {
  return bcrypt.hash(String(password), saltRounds());
}

async function findById(id, includePassword = false) {
  const fields = includePassword ? "*" : SAFE_FIELDS;
  const [rows] = await pool.query(`SELECT ${fields} FROM users WHERE id = ? LIMIT 1`, [id]);
  return rows[0] || null;
}

async function findByEmail(email) {
  const [rows] = await pool.query(`SELECT * FROM users WHERE email = ? LIMIT 1`, [cleanEmail(email)]);
  return rows[0] || null;
}

async function findByUserUid(userUid) {
  const [rows] = await pool.query(`SELECT * FROM users WHERE user_uid = ? LIMIT 1`, [cleanString(userUid)]);
  return rows[0] || null;
}

async function findByIdentifier(identifier) {
  const value = cleanString(identifier);
  if (!value) return null;

  const [rows] = await pool.query(
    `SELECT * FROM users
     WHERE email = ? OR user_uid = ?
     LIMIT 1`,
    [cleanEmail(value), value]
  );

  return rows[0] || null;
}

async function listUsers() {
  const [rows] = await pool.query(
    `SELECT ${SAFE_FIELDS}
     FROM users
     ORDER BY FIELD(role, 'master_admin', 'admin', 'user'), name ASC`
  );
  return rows;
}

async function createUser(payload) {
  const passwordHash = await hashPassword(payload.password);

  const [result] = await pool.query(
    `INSERT INTO users
      (user_uid, name, email, password, role, status, is_master_locked, password_changed_at)
     VALUES (?, ?, ?, ?, ?, ?, 0, NOW())`,
    [
      cleanString(payload.user_uid),
      cleanString(payload.name),
      cleanEmail(payload.email),
      passwordHash,
      payload.role || "user",
      payload.status || "active",
    ]
  );

  return findById(result.insertId);
}

async function updateUser(id, payload) {
  const allowed = ["user_uid", "name", "email", "role", "status", "password"];
  const setParts = [];
  const values = [];

  for (const field of allowed) {
    if (payload[field] === undefined) continue;

    if (field === "password") {
      setParts.push("password = ?", "password_changed_at = NOW()");
      values.push(await hashPassword(payload.password));
    } else if (field === "email") {
      setParts.push("email = ?");
      values.push(cleanEmail(payload.email));
    } else if (field === "user_uid" || field === "name") {
      setParts.push(`${field} = ?`);
      values.push(cleanString(payload[field]));
    } else {
      setParts.push(`${field} = ?`);
      values.push(payload[field]);
    }
  }

  if (!setParts.length) return findById(id);

  values.push(id);
  await pool.query(`UPDATE users SET ${setParts.join(", ")} WHERE id = ?`, values);
  return findById(id);
}

async function deleteUser(id) {
  await pool.query(`DELETE FROM users WHERE id = ?`, [id]);
}

async function unlockIfExpired(user) {
  if (!user?.locked_until) return user;

  const lockedUntil = new Date(user.locked_until);
  if (!Number.isNaN(lockedUntil.getTime()) && lockedUntil <= new Date()) {
    await pool.query(
      `UPDATE users SET failed_login_attempts = 0, locked_until = NULL WHERE id = ?`,
      [user.id]
    );
    return findById(user.id, true);
  }

  return user;
}

async function registerFailedLogin(userId, shouldLock, lockMinutes) {
  if (shouldLock) {
    await pool.query(
      `UPDATE users
       SET failed_login_attempts = failed_login_attempts + 1,
           locked_until = DATE_ADD(NOW(), INTERVAL ? MINUTE)
       WHERE id = ?`,
      [lockMinutes, userId]
    );
    return;
  }

  await pool.query(
    `UPDATE users SET failed_login_attempts = failed_login_attempts + 1 WHERE id = ?`,
    [userId]
  );
}

async function markLoginSuccess(userId, ip) {
  await pool.query(
    `UPDATE users
     SET failed_login_attempts = 0,
         locked_until = NULL,
         last_login_at = NOW(),
         last_login_ip = ?
     WHERE id = ?`,
    [ip, userId]
  );
}

module.exports = {
  hashPassword,
  findById,
  findByEmail,
  findByUserUid,
  findByIdentifier,
  listUsers,
  createUser,
  updateUser,
  deleteUser,
  unlockIfExpired,
  registerFailedLogin,
  markLoginSuccess,
};
