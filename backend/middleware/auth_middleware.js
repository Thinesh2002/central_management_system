const jwt = require('jsonwebtoken');
require('dotenv').config();

module.exports = (req, res, next) => {
  try {
    const auth = req.headers.authorization || req.headers.Authorization || '';
    if (!auth.startsWith('Bearer ')) return res.status(401).json({ message: 'No token' });

    const token = auth.split(' ')[1];
    const payload = jwt.verify(token, process.env.JWT_SECRET || 'secretkey');
    // payload should contain { id, ... } from generateToken
    req.userId = payload.id;
    next();
  } catch (err) {
    console.error('authMiddleware error', err.message || err);
    return res.status(401).json({ message: 'Invalid token' });
  }
};
