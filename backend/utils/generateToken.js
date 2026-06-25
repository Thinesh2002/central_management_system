const jwt = require("jsonwebtoken");

function generateToken(user) {
  return jwt.sign(
    {
      id: user.id,
      user_uid: user.user_uid,
      email: user.email,
      role: user.role,
    },
    process.env.JWT_SECRET || "change_this_secret_key",
    { expiresIn: process.env.JWT_EXPIRES_IN || "1d" }
  );
}

module.exports = generateToken;
