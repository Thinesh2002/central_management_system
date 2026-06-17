// utils/generateToken.js
const jwt = require('jsonwebtoken');
require('dotenv').config();

module.exports = (userOrId) => {
  // accept either an object { id, email, user_id } or a plain id
  const id = userOrId && typeof userOrId === 'object' ? userOrId.id : userOrId;
  if (!id) {
    // defensive fallback: do not throw — return null so controller can handle
    console.warn('generateToken called without valid id/user:', userOrId);
    return null;
  }

  const payload = { id };
  return jwt.sign(payload, process.env.JWT_SECRET || 'secretkey', { expiresIn: '7d' });
};
