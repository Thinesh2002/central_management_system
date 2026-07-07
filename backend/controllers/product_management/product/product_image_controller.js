const fs = require("fs");
const path = require("path");
const asyncHandler = require("../../../middleware/async_handler");
const productImageModel = require("../../../models/product_management/product/product_image_model");
const productImageLogModel = require("../../../models/product_management/product/product_image_log_model");
const productLogModel = require("../../../models/product_management/product/product_log_model");
const {
  uploadDir,
  safeFileName,
} = require("../../../middleware/product_image_upload_middleware");

const TABLE_LABEL = "Product image";

function resolveUploadedFilePath(imagePath) {
  if (!imagePath) return null;
  return path.join(process.cwd(), String(imagePath).replace(/^\/+/, ""));
}

function assignedConflictError(action) {
  const error = new Error(
    `This image is assigned to a product or marketplace listing and cannot be ${action}. Unassign it first.`
  );
  error.statusCode = 409;
  return error;
}

function getUserId(req) {
  return (
    req?.user?.id ||
    req?.user?.user_id ||
    req?.auth?.id ||
    req?.body?.created_by ||
    req?.body?.updated_by ||
    null
  );
}

function sendSuccess(res, statusCode, message, data, extra = {}) {
  return res.status(statusCode).json({
    success: true,
    message,
    data,
    ...extra,
  });
}

function notFoundError() {
  const error = new Error(`${TABLE_LABEL} not found`);
  error.statusCode = 404;
  return error;
}

function addIfValid(target, key, value) {
  if (value === undefined || value === null || value === "") return;
  target[key] = value;
}

function isEmpty(value) {
  return (
    value === undefined ||
    value === null ||
    String(value).trim() === "" ||
    String(value).trim() === "null" ||
    String(value).trim() === "undefined"
  );
}

function firstValid(...values) {
  for (const value of values) {
    if (!isEmpty(value)) return value;
  }

  return null;
}

function cleanSku(value) {
  if (isEmpty(value)) return null;
  return String(value).trim();
}

function buildImagePayload(req) {
  const body = req.body || {};
  const meta = req.productImageMeta || {};
  const payload = { ...body };

  /**
   * SKU support
   * Frontend can send:
   * sku / product_sku / variant_sku / child_sku / local_sku
   */
  const sku = cleanSku(
    firstValid(
      body.sku,
      body.product_sku,
      body.variant_sku,
      body.child_sku,
      body.local_sku,
      meta.sku,
      meta.product_sku,
      meta.variant_sku,
      meta.child_sku,
      meta.local_sku
    )
  );

  if (sku) {
    payload.sku = sku;
  }

  addIfValid(payload, "image_path", meta.image_path);
  addIfValid(payload, "image_url", meta.image_path);
  addIfValid(payload, "url", meta.image_path);
  addIfValid(payload, "path", meta.image_path);

  addIfValid(payload, "file_name", meta.file_name);
  addIfValid(payload, "filename", meta.file_name);
  addIfValid(payload, "image_name", meta.file_name);
  addIfValid(payload, "original_name", meta.original_name);
  addIfValid(payload, "original_filename", meta.original_name);

  addIfValid(payload, "mime_type", meta.mime_type);
  addIfValid(payload, "mimetype", meta.mime_type);
  addIfValid(payload, "file_size", meta.size_bytes);
  addIfValid(payload, "size_bytes", meta.size_bytes);

  addIfValid(payload, "width", meta.width);
  addIfValid(payload, "height", meta.height);
  addIfValid(payload, "pixels", meta.pixels);
  addIfValid(payload, "megapixels", meta.megapixels);

  return payload;
}

async function safeWriteProductLog(req, action, recordId, beforeData, afterData) {
  try {
    await productLogModel.insertMatching({
      action,
      action_type: action,
      table_name: productImageModel.tableName,
      module_name: "local_products",
      record_id: recordId || null,
      product_id: afterData?.product_id || beforeData?.product_id || null,
      variant_id: afterData?.variant_id || beforeData?.variant_id || null,
      sku: afterData?.sku || beforeData?.sku || null,
      before_data: beforeData ? JSON.stringify(beforeData) : null,
      after_data: afterData ? JSON.stringify(afterData) : null,
      old_data: beforeData ? JSON.stringify(beforeData) : null,
      new_data: afterData ? JSON.stringify(afterData) : null,
      changed_by: getUserId(req),
      user_id: getUserId(req),
      ip_address: req.ip || null,
      user_agent: req.get ? req.get("user-agent") : null,
    });
  } catch (error) {
    console.error("[PRODUCT_IMAGE_PRODUCT_LOG_ERROR]", error.message);
  }
}

async function safeWriteImageLog(req, action, recordId, beforeData, afterData) {
  try {
    await productImageLogModel.insertMatching({
      action,
      action_type: action,
      table_name: productImageModel.tableName,
      module_name: "local_products",
      image_id: recordId || null,
      record_id: recordId || null,
      product_id: afterData?.product_id || beforeData?.product_id || null,
      variant_id: afterData?.variant_id || beforeData?.variant_id || null,
      sku: afterData?.sku || beforeData?.sku || null,
      before_data: beforeData ? JSON.stringify(beforeData) : null,
      after_data: afterData ? JSON.stringify(afterData) : null,
      old_data: beforeData ? JSON.stringify(beforeData) : null,
      new_data: afterData ? JSON.stringify(afterData) : null,
      changed_by: getUserId(req),
      user_id: getUserId(req),
      ip_address: req.ip || null,
      user_agent: req.get ? req.get("user-agent") : null,
    });
  } catch (error) {
    console.error("[PRODUCT_IMAGE_LOG_ERROR]", error.message);
  }
}

const list = asyncHandler(async (req, res) => {
  const result = await productImageModel.list(req.query || {});
  const assignedLookup = await productImageModel.getAssignedLookup();

  const data = result.data.map((row) => ({
    ...row,
    is_assigned: productImageModel.isAssigned(row, assignedLookup),
  }));

  return sendSuccess(res, 200, `${TABLE_LABEL} list loaded`, data, {
    pagination: result.pagination,
  });
});

const getById = asyncHandler(async (req, res) => {
  const row = await productImageModel.findById(req.params.id);

  if (!row) throw notFoundError();

  const assignedLookup = await productImageModel.getAssignedLookup();

  return sendSuccess(res, 200, `${TABLE_LABEL} loaded`, {
    ...row,
    is_assigned: productImageModel.isAssigned(row, assignedLookup),
  });
});

const create = asyncHandler(async (req, res) => {
  const payload = buildImagePayload(req);

  const created = await productImageModel.create(payload, {
    userId: getUserId(req),
  });

  await safeWriteProductLog(
    req,
    "UPLOAD_PRODUCT_IMAGE",
    created?.id || null,
    null,
    created
  );

  await safeWriteImageLog(
    req,
    "UPLOAD_PRODUCT_IMAGE",
    created?.id || null,
    null,
    created
  );

  return sendSuccess(res, 201, `${TABLE_LABEL} uploaded successfully`, created);
});

const update = asyncHandler(async (req, res) => {
  const before = await productImageModel.findById(req.params.id);

  if (!before) throw notFoundError();

  const payload = buildImagePayload(req);

  const updated = await productImageModel.updateById(req.params.id, payload, {
    userId: getUserId(req),
  });

  if (!updated) throw notFoundError();

  await safeWriteProductLog(
    req,
    "UPDATE_PRODUCT_IMAGE",
    req.params.id,
    before,
    updated
  );

  await safeWriteImageLog(
    req,
    "UPDATE_PRODUCT_IMAGE",
    req.params.id,
    before,
    updated
  );

  return sendSuccess(res, 200, `${TABLE_LABEL} updated successfully`, updated);
});

const patch = update;

const rename = asyncHandler(async (req, res) => {
  const existing = await productImageModel.findById(req.params.id);

  if (!existing) throw notFoundError();

  const assignedLookup = await productImageModel.getAssignedLookup();

  if (productImageModel.isAssigned(existing, assignedLookup)) {
    throw assignedConflictError("renamed");
  }

  const requestedName = String(
    req.body?.file_name || req.body?.name || ""
  ).trim();

  if (!requestedName) {
    const error = new Error("A new file name is required.");
    error.statusCode = 400;
    throw error;
  }

  const oldPath = resolveUploadedFilePath(existing.image_path);

  if (!oldPath || !fs.existsSync(oldPath)) {
    const error = new Error("Original image file was not found on disk.");
    error.statusCode = 404;
    throw error;
  }

  const ext = path
    .extname(existing.file_name || existing.image_path || "")
    .toLowerCase();
  const cleanBase = safeFileName(
    path.basename(requestedName, path.extname(requestedName))
  );
  const newFileName = `${cleanBase}${ext}`;
  const newPath = path.join(uploadDir, newFileName);

  if (newPath !== oldPath && fs.existsSync(newPath)) {
    const error = new Error(
      "A file with that name already exists. Choose a different name."
    );
    error.statusCode = 409;
    throw error;
  }

  if (newPath !== oldPath) {
    fs.renameSync(oldPath, newPath);
  }

  const newImagePath = `/uploads/product-images/${newFileName}`;

  const updated = await productImageModel.updateById(
    req.params.id,
    {
      file_name: newFileName,
      image_path: newImagePath,
      image_url: newImagePath,
    },
    { userId: getUserId(req) }
  );

  // Sibling rows created by "attach existing image" point at the same
  // physical file — the rename above already moved that file on disk, so
  // every sibling must be repointed too or their image goes missing.
  const siblings = await productImageModel.findByImagePath(
    existing.image_path,
    req.params.id
  );

  for (const sibling of siblings) {
    await productImageModel.updateById(
      sibling.id,
      {
        file_name: newFileName,
        image_path: newImagePath,
        image_url: newImagePath,
      },
      { userId: getUserId(req) }
    );
  }

  await safeWriteProductLog(
    req,
    "RENAME_PRODUCT_IMAGE",
    req.params.id,
    existing,
    updated
  );

  await safeWriteImageLog(
    req,
    "RENAME_PRODUCT_IMAGE",
    req.params.id,
    existing,
    updated
  );

  return sendSuccess(res, 200, `${TABLE_LABEL} renamed successfully`, updated);
});

const remove = asyncHandler(async (req, res) => {
  const existing = await productImageModel.findById(req.params.id);

  if (!existing) throw notFoundError();

  // Managing a product's own images (the per-product Edit Images page)
  // always sends force=true — an image being "assigned" to that same
  // product is expected there, not a reason to block removal. The
  // assignment guard is only meant for the flat Images Dashboard media
  // library, where deleting a random image that's quietly in use
  // elsewhere is the mistake it's meant to catch.
  const bypassAssignedCheck =
    String(req.query?.force ?? req.body?.force ?? "").toLowerCase() === "true";

  if (!bypassAssignedCheck) {
    const assignedLookup = await productImageModel.getAssignedLookup();

    if (productImageModel.isAssigned(existing, assignedLookup)) {
      throw assignedConflictError("deleted");
    }
  }

  const removed = await productImageModel.removeById(req.params.id, {
    userId: getUserId(req),
  });

  if (!removed) throw notFoundError();

  // "Attach existing image" creates one product_images row per attachment,
  // all pointing at the same physical file (see attachExistingImage on the
  // frontend). Only unlink the file once no other row still references it,
  // otherwise deleting one attachment breaks the image everywhere else it's used.
  const stillReferenced = await productImageModel.findByImagePath(removed.image_path);

  if (!stillReferenced.length) {
    const filePath = resolveUploadedFilePath(removed.image_path);

    if (filePath) {
      fs.unlink(filePath, (error) => {
        if (error && error.code !== "ENOENT") {
          console.error("[PRODUCT_IMAGE_FILE_DELETE_ERROR]", error.message);
        }
      });
    }
  }

  await safeWriteProductLog(
    req,
    "DELETE_PRODUCT_IMAGE",
    req.params.id,
    removed,
    null
  );

  await safeWriteImageLog(
    req,
    "DELETE_PRODUCT_IMAGE",
    req.params.id,
    removed,
    null
  );

  return sendSuccess(res, 200, `${TABLE_LABEL} deleted successfully`, removed);
});

module.exports = {
  list,
  getById,
  create,
  update,
  patch,
  rename,
  remove,
};