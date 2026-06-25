function cleanString(value = "") {
  return String(value || "").trim();
}

function cleanEmail(email = "") {
  return cleanString(email).toLowerCase();
}

function isValidEmail(email = "") {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail(email));
}

function isValidUserUid(userUid = "") {
  return /^[A-Za-z][A-Za-z0-9._-]{2,39}$/.test(cleanString(userUid));
}

function isStrongPassword(password = "") {
  return String(password || "").length >= 8;
}

function makePageKey(value = "") {
  return cleanString(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 100);
}

function normalizeRoutePath(value = "") {
  const clean = cleanString(value);
  if (!clean) return "";
  const withSlash = clean.startsWith("/") ? clean : `/${clean}`;
  return withSlash.replace(/\/+$/g, "").replace(/\/+/g, "/").slice(0, 255) || "/";
}

function toFlag(value) {
  return value === true || value === 1 || value === "1" ? 1 : 0;
}

module.exports = {
  cleanString,
  cleanEmail,
  isValidEmail,
  isValidUserUid,
  isStrongPassword,
  makePageKey,
  normalizeRoutePath,
  toFlag,
};
