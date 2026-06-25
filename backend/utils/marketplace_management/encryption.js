const crypto = require("crypto");

const ALGORITHM = "aes-256-gcm";

function getKey() {
  const key = process.env.TOKEN_ENCRYPTION_KEY;

  if (!key || key.length !== 32) {
    throw new Error("TOKEN_ENCRYPTION_KEY must be exactly 32 characters");
  }

  return Buffer.from(key, "utf8");
}

function encryptText(text) {
  if (!text) return null;

  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGORITHM, getKey(), iv);

  const encrypted = Buffer.concat([
    cipher.update(String(text), "utf8"),
    cipher.final(),
  ]);

  const authTag = cipher.getAuthTag();

  return JSON.stringify({
    iv: iv.toString("hex"),
    authTag: authTag.toString("hex"),
    data: encrypted.toString("hex"),
  });
}

function decryptText(encryptedText) {
  if (!encryptedText) return null;

  const payload = JSON.parse(encryptedText);

  const decipher = crypto.createDecipheriv(
    ALGORITHM,
    getKey(),
    Buffer.from(payload.iv, "hex")
  );

  decipher.setAuthTag(Buffer.from(payload.authTag, "hex"));

  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(payload.data, "hex")),
    decipher.final(),
  ]);

  return decrypted.toString("utf8");
}

module.exports = {
  encryptText,
  decryptText,
};