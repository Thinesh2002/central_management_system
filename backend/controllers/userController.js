const userModel = require("../models/userModel");
const accessModel = require("../models/accessModel");
const { canManageRole } = require("../middleware/auth");
const { writeSystemLog } = require("../utils/logger");
const { requestInfo } = require("../utils/requestInfo");
const {
  cleanString,
  cleanEmail,
  isValidEmail,
  isValidUserUid,
  isStrongPassword,
} = require("../utils/validators");

const ROLES = ["master_admin", "admin", "user"];
const STATUSES = ["active", "inactive"];

function cleanPayload(body, isCreate = true) {
  const payload = {};

  if (isCreate || body.user_uid !== undefined || body.user_id !== undefined) {
    payload.user_uid = cleanString(body.user_uid || body.user_id);
  }

  if (isCreate || body.name !== undefined) {
    payload.name = cleanString(body.name);
  }

  if (isCreate || body.email !== undefined) {
    payload.email = cleanEmail(body.email);
  }

  if (isCreate || body.role !== undefined) {
    payload.role = body.role || "user";
  }

  if (isCreate || body.status !== undefined) {
    payload.status = body.status || "active";
  }

  if (isCreate || body.password) {
    payload.password = String(body.password || "");
  }

  return payload;
}

function validateUserPayload(payload, isCreate = true) {
  if (isCreate && (!payload.user_uid || !payload.name || !payload.email || !payload.password)) {
    return "User ID, name, email and password are required.";
  }

  if (payload.user_uid && !isValidUserUid(payload.user_uid)) {
    return "User ID must start with a letter and use 3-40 letters/numbers/dot/dash/underscore only.";
  }

  if (payload.email && !isValidEmail(payload.email)) {
    return "Please enter a valid email address.";
  }

  if (payload.password && !isStrongPassword(payload.password)) {
    return "Password must be at least 8 characters.";
  }

  if (payload.role && !ROLES.includes(payload.role)) {
    return "Invalid role selected.";
  }

  if (payload.status && !STATUSES.includes(payload.status)) {
    return "Invalid status selected.";
  }

  return null;
}

async function getUsers(req, res) {
  const users = await userModel.listUsers();
  return res.json({ success: true, users });
}

async function createUser(req, res) {
  const payload = cleanPayload(req.body, true);
  const { ip, userAgent } = requestInfo(req);

  const validationError = validateUserPayload(payload, true);
  if (validationError) return res.status(400).json({ success: false, message: validationError });

  if (!canManageRole(req.user.role, payload.role)) {
    return res.status(403).json({ success: false, message: "You cannot create this user role." });
  }

  const existingEmail = await userModel.findByEmail(payload.email);
  if (existingEmail) return res.status(409).json({ success: false, message: "This email already exists." });

  const existingUid = await userModel.findByUserUid(payload.user_uid);
  if (existingUid) return res.status(409).json({ success: false, message: "This User ID already exists." });

  const user = await userModel.createUser(payload);
  await accessModel.ensureUserDefaultPermissions(user.id, user.role, req.user.id);

  await writeSystemLog({
    userId: req.user.id,
    userUid: req.user.user_uid,
    userEmail: req.user.email,
    action: "user_created",
    module: "users",
    status: "success",
    message: `${req.user.user_uid} created user ${user.user_uid} (${user.email}).`,
    ip,
    userAgent,
  });

  return res.status(201).json({ success: true, message: "User created successfully.", user });
}

async function updateUser(req, res) {
  const targetId = Number(req.params.id);
  const target = await userModel.findById(targetId);
  const { ip, userAgent } = requestInfo(req);

  if (!target) return res.status(404).json({ success: false, message: "User not found." });

  if (!canManageRole(req.user.role, target.role)) {
    return res.status(403).json({ success: false, message: "You cannot update this user." });
  }

  const payload = cleanPayload(req.body, false);

  const validationError = validateUserPayload(payload, false);
  if (validationError) return res.status(400).json({ success: false, message: validationError });

  if (!canManageRole(req.user.role, payload.role || target.role)) {
    return res.status(403).json({ success: false, message: "You cannot change to this role." });
  }

  if (target.is_master_locked || target.role === "master_admin") {
    payload.user_uid = target.user_uid;
    payload.role = "master_admin";
    payload.status = "active";
  }

  if (payload.email && payload.email !== target.email) {
    const existing = await userModel.findByEmail(payload.email);
    if (existing && existing.id !== target.id) {
      return res.status(409).json({ success: false, message: "This email already exists." });
    }
  }

  if (payload.user_uid && payload.user_uid !== target.user_uid) {
    const existing = await userModel.findByUserUid(payload.user_uid);
    if (existing && existing.id !== target.id) {
      return res.status(409).json({ success: false, message: "This User ID already exists." });
    }
  }

  const oldRole = target.role;
  const updated = await userModel.updateUser(target.id, payload);
  if (updated.role !== oldRole) await accessModel.ensureUserDefaultPermissions(updated.id, updated.role, req.user.id);

  await writeSystemLog({
    userId: req.user.id,
    userUid: req.user.user_uid,
    userEmail: req.user.email,
    action: "user_updated",
    module: "users",
    status: "success",
    message: `${req.user.user_uid} updated user ${updated.user_uid} (${updated.email}).`,
    ip,
    userAgent,
  });

  return res.json({ success: true, message: "User updated successfully.", user: updated });
}

async function deleteUser(req, res) {
  const targetId = Number(req.params.id);
  const target = await userModel.findById(targetId);
  const { ip, userAgent } = requestInfo(req);

  if (!target) return res.status(404).json({ success: false, message: "User not found." });
  if (target.id === req.user.id) return res.status(400).json({ success: false, message: "You cannot delete your own account." });
  if (target.is_master_locked || target.role === "master_admin") {
    return res.status(403).json({ success: false, message: "Master Admin cannot be deleted." });
  }
  if (!canManageRole(req.user.role, target.role)) {
    return res.status(403).json({ success: false, message: "You cannot delete this user." });
  }

  await userModel.deleteUser(target.id);

  await writeSystemLog({
    userId: req.user.id,
    userUid: req.user.user_uid,
    userEmail: req.user.email,
    action: "user_deleted",
    module: "users",
    status: "success",
    message: `${req.user.user_uid} deleted user ${target.user_uid} (${target.email}).`,
    ip,
    userAgent,
  });

  return res.json({ success: true, message: "User deleted successfully." });
}

module.exports = { getUsers, createUser, updateUser, deleteUser };
