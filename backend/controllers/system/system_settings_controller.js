const model = require("../../models/system/system_settings_model");

const ok = (res, data = {}, message = "Success") => res.json({ success: true, message, ...data });
const fail = (res, error) => res.status(error?.statusCode || 500).json({ success: false, message: error?.message || "Request failed" });

exports.features = async (req, res) => { try { ok(res, { rows: await model.getFeatures() }); } catch (e) { fail(res, e); } };
exports.bookmarks = async (req, res) => { try { ok(res, { rows: await model.getBookmarks(req.query.user_id || null) }); } catch (e) { fail(res, e); } };
exports.saveBookmark = async (req, res) => { try { await model.saveBookmark(req.body); ok(res, {}, "Bookmark saved."); } catch (e) { fail(res, e); } };
exports.removeBookmark = async (req, res) => { try { await model.removeBookmark(req.body); ok(res, {}, "Bookmark removed."); } catch (e) { fail(res, e); } };
exports.permissions = async (req, res) => { try { ok(res, { rows: await model.getPermissions(req.query) }); } catch (e) { fail(res, e); } };
exports.savePermission = async (req, res) => { try { await model.savePermission(req.body); ok(res, {}, "Permission saved."); } catch (e) { fail(res, e); } };
