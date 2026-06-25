const bcrypt = require("bcrypt");
const generateToken = require("../utils/generateToken");
const userModel = require("../models/userModel");
const accessModel = require("../models/accessModel");
const { writeLoginLog } = require("../utils/logger");
const { requestInfo } = require("../utils/requestInfo");
const { cleanString } = require("../utils/validators");

function isLocked(user) {
  if (!user?.locked_until) return false;
  const lockedUntil = new Date(user.locked_until);
  return !Number.isNaN(lockedUntil.getTime()) && lockedUntil > new Date();
}

function safeUser(user) {
  return {
    id: user.id,
    user_uid: user.user_uid,
    name: user.name,
    email: user.email,
    role: user.role,
    status: user.status,
    is_master_locked: user.is_master_locked,
    last_login_at: user.last_login_at,
  };
}

async function login(req, res) {
  const loginIdentifier = cleanString(
    req.body.identifier || req.body.login_id || req.body.user_id || req.body.email
  );
  const password = String(req.body.password || "");
  const { ip, userAgent } = requestInfo(req);
  const maxAttempts = Number(process.env.LOGIN_MAX_FAILED_ATTEMPTS || 5);
  const lockMinutes = Number(process.env.LOGIN_LOCK_MINUTES || 15);

  if (!loginIdentifier || !password) {
    await writeLoginLog({
      loginIdentifier,
      action: "login_failed",
      status: "failed",
      failureReason: "missing_credentials",
      message: "Email/User ID and password are required.",
      ip,
      userAgent,
    });

    return res.status(400).json({ success: false, message: "Email/User ID and password are required." });
  }

  let user = await userModel.findByIdentifier(loginIdentifier);
  if (user) user = await userModel.unlockIfExpired(user);

  if (user && isLocked(user)) {
    await writeLoginLog({
      userId: user.id,
      loginUserId: user.user_uid,
      email: user.email,
      loginIdentifier,
      action: "login_blocked",
      status: "blocked",
      failureReason: "account_temporarily_locked",
      message: `Login blocked. Account locked until ${user.locked_until}.`,
      ip,
      userAgent,
    });

    return res.status(423).json({
      success: false,
      message: `Too many failed attempts. Account locked for ${lockMinutes} minutes.`,
    });
  }

  const validPassword = user ? await bcrypt.compare(password, user.password) : false;

  if (!user || !validPassword) {
    const nextFailedAttempts = user ? Number(user.failed_login_attempts || 0) + 1 : 1;
    const shouldLock = Boolean(user && nextFailedAttempts >= maxAttempts);

    if (user) await userModel.registerFailedLogin(user.id, shouldLock, lockMinutes);

    await writeLoginLog({
      userId: user?.id || null,
      loginUserId: user?.user_uid || null,
      email: user?.email || (loginIdentifier.includes("@") ? loginIdentifier.toLowerCase() : null),
      loginIdentifier,
      action: shouldLock ? "login_blocked" : "login_failed",
      status: shouldLock ? "blocked" : "failed",
      failureReason: shouldLock ? "max_failed_attempts_reached" : "invalid_credentials",
      message: shouldLock
        ? `Account locked after ${nextFailedAttempts} failed attempts.`
        : `Failed login attempt for ${loginIdentifier}.`,
      ip,
      userAgent,
    });

    return res.status(401).json({ success: false, message: "Invalid Email/User ID or password." });
  }

  if (user.status !== "active") {
    await writeLoginLog({
      userId: user.id,
      loginUserId: user.user_uid,
      email: user.email,
      loginIdentifier,
      action: "login_failed",
      status: "failed",
      failureReason: "inactive_account",
      message: "Inactive account tried to login.",
      ip,
      userAgent,
    });

    return res.status(403).json({ success: false, message: "Your account is inactive. Please contact Master Admin." });
  }

  await userModel.markLoginSuccess(user.id, ip);
  await accessModel.ensureUserDefaultPermissions(user.id, user.role);

  const freshUser = await userModel.findById(user.id);
  const token = generateToken(freshUser);
  const menu = await accessModel.listUserMenu(freshUser);

  await writeLoginLog({
    userId: user.id,
    loginUserId: user.user_uid,
    email: user.email,
    loginIdentifier,
    action: "login_success",
    status: "success",
    message: `${user.user_uid} logged in successfully.`,
    ip,
    userAgent,
  });

  return res.json({ success: true, message: "Login successful.", token, user: safeUser(freshUser), menu });
}

async function me(req, res) {
  const menu = await accessModel.listUserMenu(req.user);
  return res.json({ success: true, user: safeUser(req.user), menu });
}

async function logout(req, res) {
  const { ip, userAgent } = requestInfo(req);

  await writeLoginLog({
    userId: req.user.id,
    loginUserId: req.user.user_uid,
    email: req.user.email,
    loginIdentifier: req.user.user_uid,
    action: "logout",
    status: "success",
    message: `${req.user.user_uid} logged out.`,
    ip,
    userAgent,
  });

  return res.json({ success: true, message: "Logout logged successfully." });
}

module.exports = { login, me, logout };
