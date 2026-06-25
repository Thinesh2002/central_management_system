function generateOrderId(orderType = "MANUAL") {
  const prefix = orderType === "CUSTOM" ? "CUS" : "MAN";
  const now = new Date();

  const pad = (value) => String(value).padStart(2, "0");
  const datePart = [
    now.getFullYear(),
    pad(now.getMonth() + 1),
    pad(now.getDate()),
  ].join("");

  const timePart = [
    pad(now.getHours()),
    pad(now.getMinutes()),
    pad(now.getSeconds()),
  ].join("");

  const randomPart = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `${prefix}-${datePart}-${timePart}-${randomPart}`;
}

function toMoney(value, fallback = 0) {
  const numberValue = Number(value);
  if (!Number.isFinite(numberValue)) return Number(fallback || 0);
  return Number(numberValue.toFixed(2));
}

function toInt(value, fallback = 0) {
  const numberValue = Number(value);
  if (!Number.isFinite(numberValue)) return Number(fallback || 0);
  return Math.trunc(numberValue);
}

function cleanString(value) {
  if (value === undefined || value === null) return null;
  const text = String(value).trim();
  return text === "" ? null : text;
}

function cleanRequiredString(value, fieldName) {
  const text = cleanString(value);
  if (!text) {
    const error = new Error(`${fieldName} is required`);
    error.statusCode = 400;
    throw error;
  }
  return text;
}

function pickAllowedFields(payload = {}, allowedFields = []) {
  const picked = {};
  allowedFields.forEach((field) => {
    if (Object.prototype.hasOwnProperty.call(payload, field)) {
      picked[field] = payload[field];
    }
  });
  return picked;
}

function buildSetClause(data = {}) {
  const keys = Object.keys(data).filter((key) => data[key] !== undefined);
  if (!keys.length) return { clause: "", values: [] };

  return {
    clause: keys.map((key) => `\`${key}\` = ?`).join(", "),
    values: keys.map((key) => data[key]),
  };
}

function normalizeItemPayload(item = {}, requireProductName = true) {
  const quantity = Math.max(1, toInt(item.quantity, 1));
  const unitPrice = toMoney(item.unit_price, 0);
  const itemTotal = toMoney(item.item_total ?? quantity * unitPrice, quantity * unitPrice);

  return {
    sku: cleanString(item.sku),
    product_name: requireProductName
      ? cleanRequiredString(item.product_name, "product_name")
      : cleanString(item.product_name),
    description: cleanString(item.description),
    image_url: cleanString(item.image_url),
    quantity,
    unit_price: unitPrice,
    item_total: itemTotal,
    item_status: cleanString(item.item_status) || "Active",
  };
}

function sendSuccess(res, data, message = "Success", statusCode = 200) {
  return res.status(statusCode).json({
    success: true,
    message,
    data,
  });
}

function sendPaginated(res, data, pagination, message = "Success") {
  return res.json({
    success: true,
    message,
    data,
    pagination,
  });
}

function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

module.exports = {
  generateOrderId,
  toMoney,
  toInt,
  cleanString,
  cleanRequiredString,
  pickAllowedFields,
  buildSetClause,
  normalizeItemPayload,
  sendSuccess,
  sendPaginated,
  asyncHandler,
};
