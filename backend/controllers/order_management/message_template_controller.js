const asyncHandler = require("../../middleware/async_handler");
const messageTemplateModel = require("../../models/order_management/message_template_model");

function getUserId(req) {
  return req?.user?.id || req?.user?.user_id || null;
}

const listTemplates = asyncHandler(async (req, res) => {
  const templates = await messageTemplateModel.list({ limit: 500 });
  return res.json({ success: true, message: "Templates loaded", data: templates.data });
});

const createTemplate = asyncHandler(async (req, res) => {
  const { name, trigger_key: triggerKey, content, is_active: isActive } = req.body || {};

  if (!name || !content) {
    return res.status(400).json({ success: false, message: "name and content are required." });
  }

  const template = await messageTemplateModel.create({
    name,
    trigger_key: triggerKey || "custom",
    content,
    is_active: isActive === undefined ? 1 : isActive ? 1 : 0,
    created_by: getUserId(req),
    updated_by: getUserId(req),
  });

  return res.status(201).json({ success: true, message: "Template created", data: template });
});

const updateTemplate = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { name, trigger_key: triggerKey, content, is_active: isActive } = req.body || {};

  const payload = { updated_by: getUserId(req) };
  if (name !== undefined) payload.name = name;
  if (triggerKey !== undefined) payload.trigger_key = triggerKey;
  if (content !== undefined) payload.content = content;
  if (isActive !== undefined) payload.is_active = isActive ? 1 : 0;

  const template = await messageTemplateModel.update(id, payload);

  if (!template) {
    return res.status(404).json({ success: false, message: "Template not found." });
  }

  return res.json({ success: true, message: "Template updated", data: template });
});

const deleteTemplate = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const deleted = await messageTemplateModel.remove(id);

  if (!deleted) {
    return res.status(404).json({ success: false, message: "Template not found." });
  }

  return res.json({ success: true, message: "Template deleted" });
});

module.exports = { listTemplates, createTemplate, updateTemplate, deleteTemplate };
