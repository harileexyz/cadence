import crypto from "node:crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;

function getEncryptionKey(keyOverride?: string): Buffer {
  const hexKey = keyOverride ?? process.env.ENCRYPTION_KEY ?? "";
  if (!/^[0-9a-fA-F]{64}$/.test(hexKey)) {
    throw new Error(
      "ENCRYPTION_KEY must be a 64-character hex string (32 bytes). Generate one with `openssl rand -hex 32`."
    );
  }
  return Buffer.from(hexKey, "hex");
}

/**
 * Encrypts sensitive token strings with AES-256-GCM.
 * Output format: `ivHex:authTagHex:ciphertextHex`
 */
export function encryptToken(plaintext: string, keyOverride?: string): string {
  const key = getEncryptionKey(keyOverride);
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();
  return `${iv.toString("hex")}:${authTag.toString("hex")}:${encrypted.toString("hex")}`;
}

/**
 * Decrypts AES-256-GCM ciphertext created by `encryptToken`.
 */
export function decryptToken(payload: string, keyOverride?: string): string {
  const parts = payload.split(":");
  if (parts.length !== 3) {
    throw new Error("Invalid encrypted token payload format.");
  }
  const [ivHex, authTagHex, ciphertextHex] = parts;
  const key = getEncryptionKey(keyOverride);
  const iv = Buffer.from(ivHex, "hex");
  const authTag = Buffer.from(authTagHex, "hex");
  const ciphertext = Buffer.from(ciphertextHex, "hex");

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);
  const decrypted = Buffer.concat([
    decipher.update(ciphertext),
    decipher.final(),
  ]);
  return decrypted.toString("utf8");
}
