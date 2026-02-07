const crypto = require('node:crypto');

function hashPassword(plainPassword, salt = null) {
  const normalizedSalt = salt ?? crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(plainPassword, normalizedSalt, 64).toString('hex');

  return `${normalizedSalt}:${hash}`;
}

function verifyPassword(plainPassword, hashedPassword) {
  const [salt, expectedHash] = String(hashedPassword).split(':');
  if (!salt || !expectedHash) {
    return false;
  }

  const providedHash = crypto.scryptSync(plainPassword, salt, 64).toString('hex');
  const expectedBuffer = Buffer.from(expectedHash, 'hex');
  const providedBuffer = Buffer.from(providedHash, 'hex');

  if (expectedBuffer.length !== providedBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(expectedBuffer, providedBuffer);
}

module.exports = {
  hashPassword,
  verifyPassword
};