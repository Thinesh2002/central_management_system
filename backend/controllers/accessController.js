const userModel = require("../models/userModel");
const accessModel = require("../models/accessModel");
const { writeSystemLog } = require("../utils/logger");
const { requestInfo } = require("../utils/requestInfo");
const { canManageRole } = require("../middleware/auth");

function canManageTarget(actor, target) {
  if (!actor || !target) return false;
  if (actor.role === "master_admin") return true;
  if (actor.role === "admin") return target.role === "user";
  return actor.id === target.id;
}

async function myMenu(req, res) {
  const menu = await accessModel.listUserMenu(req.user);
  return res.json({ success: true, menu });
}

async function myPermissions(req, res) {
  const pages = await accessModel.getUserPermissionMatrix(req.user);
  return res.json({ success: true, pages });
}

async function pages(req, res) {
  const pages = await accessModel.listPages({ includeInactive: false });
  return res.json({ success: true, actions: accessModel.ACTIONS, pages });
}

async function allPages(req, res) {
  const pages = await accessModel.listPages({ includeInactive: true });
  return res.json({ success: true, actions: accessModel.ACTIONS, pages });
}

async function pageByPath(req, res) {
  const page = await accessModel.getPageByPath(req.query.path);
  if (!page) return res.status(404).json({ success: false, message: "Page not found." });

  const canView = await accessModel.hasPermission(req.user, page.page_key, "view");
  if (!canView) return res.status(403).json({ success: false, message: "Access denied for this page." });

  return res.json({ success: true, page });
}

async function createPage(req, res) {
  const { ip, userAgent } = requestInfo(req);
  const page = await accessModel.createPage(req.body, req.user.id);

  await writeSystemLog({
    userId: req.user.id,
    userUid: req.user.user_uid,
    userEmail: req.user.email,
    action: "page_created",
    module: "access_control",
    status: "success",
    message: `${req.user.user_uid} created page ${page.page_name} (${page.route_path}).`,
    ip,
    userAgent,
  });

  return res.status(201).json({
    success: true,
    message: "Page created successfully.",
    page,
  });
}

async function updatePage(req, res) {
  const { ip, userAgent } = requestInfo(req);
  const page = await accessModel.updatePage(Number(req.params.pageId), req.body);

  if (!page) return res.status(404).json({ success: false, message: "Page not found." });

  await writeSystemLog({
    userId: req.user.id,
    userUid: req.user.user_uid,
    userEmail: req.user.email,
    action: "page_updated",
    module: "access_control",
    status: "success",
    message: `${req.user.user_uid} updated page ${page.page_name} (${page.route_path}).`,
    ip,
    userAgent,
  });

  return res.json({ success: true, message: "Page updated successfully.", page });
}

async function deletePage(req, res) {
  const { ip, userAgent } = requestInfo(req);
  const page = await accessModel.deletePage(Number(req.params.pageId));

  if (!page) return res.status(404).json({ success: false, message: "Page not found." });

  await writeSystemLog({
    userId: req.user.id,
    userUid: req.user.user_uid,
    userEmail: req.user.email,
    action: "page_deleted",
    module: "access_control",
    status: "success",
    message: `${req.user.user_uid} disabled page ${page.page_name} (${page.route_path}).`,
    ip,
    userAgent,
  });

  return res.json({ success: true, message: "Page deleted successfully." });
}

async function userPermissions(req, res) {
  const target = await userModel.findById(Number(req.params.userId));
  if (!target) return res.status(404).json({ success: false, message: "User not found." });

  if (!canManageTarget(req.user, target)) {
    return res.status(403).json({ success: false, message: "You cannot view this user's permissions." });
  }

  const pages = await accessModel.getUserPermissionMatrix(target);

  return res.json({
    success: true,
    actions: accessModel.ACTIONS,
    locked: target.role === "master_admin" || target.is_master_locked === 1,
    user: target,
    pages,
  });
}

async function updateUserPermissions(req, res) {
  const target = await userModel.findById(Number(req.params.userId));
  const { ip, userAgent } = requestInfo(req);

  if (!target) return res.status(404).json({ success: false, message: "User not found." });

  if (target.role === "master_admin" || target.is_master_locked === 1) {
    return res.status(403).json({ success: false, message: "Master Admin permissions cannot be changed." });
  }

  if (!canManageRole(req.user.role, target.role)) {
    return res.status(403).json({
      success: false,
      message: "Admin can update normal user access only. Master Admin can update all non-master users.",
    });
  }

  const permissions = Array.isArray(req.body.permissions) ? req.body.permissions : [];
  await accessModel.updateUserPermissions(target.id, permissions, req.user.id);

  await writeSystemLog({
    userId: req.user.id,
    userUid: req.user.user_uid,
    userEmail: req.user.email,
    action: "permissions_updated",
    module: "access_control",
    status: "success",
    message: `${req.user.user_uid} updated page access for ${target.user_uid}.`,
    ip,
    userAgent,
  });

  return res.json({ success: true, message: "Page access updated successfully." });
}

async function syncPermissions(req, res) {
  if (req.user.role !== "master_admin") {
    return res.status(403).json({ success: false, message: "Only Master Admin can sync permissions." });
  }

  await accessModel.ensureAllUserPermissions();
  return res.json({ success: true, message: "User permissions synced successfully." });
}

module.exports = {
  myMenu,
  myPermissions,
  pages,
  allPages,
  pageByPath,
  createPage,
  updatePage,
  deletePage,
  userPermissions,
  updateUserPermissions,
  syncPermissions,
};
