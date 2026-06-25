const crypto = require("crypto");

function signDarazRequest(apiPath, params, appSecret, body = "") {
  const sortedKeys = Object.keys(params).sort();

  let signString = apiPath;

  for (const key of sortedKeys) {
    const value = params[key];
    if (value !== undefined && value !== null && value !== "") {
      signString += `${key}${value}`;
    }
  }

  if (body) {
    signString += body;
  }

  return crypto
    .createHmac("sha256", appSecret)
    .update(signString)
    .digest("hex")
    .toUpperCase();
}

module.exports = {
  signDarazRequest,
};