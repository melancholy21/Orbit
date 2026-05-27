import crypto from 'crypto';

const ALGORITHM = 'aes-256-cbc';
const IV_LENGTH = 16;

// Retrieve or derive the 32-byte encryption key
const getKey = () => {
  const secret = process.env.ENCRYPTION_KEY || process.env.JWT_SECRET || 'orbit-default-fallback-secret-key-32';
  // Use SHA-256 to hash the secret and guarantee a 32-byte key
  return crypto.createHash('sha256').update(secret).digest();
};

/**
 * Encrypts cleartext using AES-256-CBC.
 * Returns a colon-separated string: "ivHex:encryptedHex".
 */
export const encrypt = (text) => {
  if (!text) return '';
  try {
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, getKey(), iv);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return `${iv.toString('hex')}:${encrypted}`;
  } catch (error) {
    console.error('Encryption error:', error);
    return text; // fallback to plaintext if encryption fails
  }
};

/**
 * Decrypts encrypted text formatted as "ivHex:encryptedHex".
 * Returns the original cleartext.
 */
export const decrypt = (text) => {
  if (!text) return '';
  try {
    const parts = text.split(':');
    if (parts.length !== 2) {
      // If it doesn't contain a colon, it's probably legacy plaintext
      return text;
    }
    const iv = Buffer.from(parts[0], 'hex');
    const encryptedText = Buffer.from(parts[1], 'hex');
    const decipher = crypto.createDecipheriv(ALGORITHM, getKey(), iv);
    let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (error) {
    console.error('Decryption error:', error);
    return text; // fallback to encrypted/raw if decryption fails
  }
};
