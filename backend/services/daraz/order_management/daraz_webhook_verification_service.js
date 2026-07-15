const crypto = require("crypto");

// Daraz's Open Platform push-notification signature follows the same
// family convention as the outbound request signing already used in
// daraz_api_service.js's signDarazRequest: sort every field except
// `sign` alphabetically, concatenate key+value pairs with no separator,
// HMAC-SHA256 with the app secret, uppercase hex. There's no "apiPath"
// for a push notification (unlike an outbound API call), so the string
// to sign starts empty rather than with a path segment.
//
// This has not been verified against a live Daraz webhook payload - it
// is the best-effort inference from this codebase's own outbound
// signing convention and the documented Open Platform signing family.
// Every inbound call is logged with its raw body regardless of whether
// verification passes, specifically so a mismatch here is diagnosable
// once real traffic arrives, rather than silently dropped.
function verifyDarazWebhookSignature(body, appSecret) {
  if (!appSecret || !body || typeof body !== "object") return false;

  const providedSign = String(body.sign || "").toUpperCase();
  if (!providedSign) return false;

  const sortedKeys = Object.keys(body)
    .filter((key) => key !== "sign")
    .filter((key) => body[key] !== undefined && body[key] !== null && body[key] !== "")
    .sort();

  let stringToSign = "";
  for (const key of sortedKeys) {
    stringToSign += `${key}${body[key]}`;
  }

  const computedSign = crypto.createHmac("sha256", appSecret).update(stringToSign, "utf8").digest("hex").toUpperCase();

  return computedSign === providedSign;
}

module.exports = { verifyDarazWebhookSignature };
