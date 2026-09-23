import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

export class DeliveryCredentialCipherError extends Error {}

function key(material: string) {
  return createHash("sha256").update(material).digest();
}

/** Encrypts an integration secret for database storage; ciphertext is never a client DTO. */
export function encryptDeliveryCredential(value: string, keyMaterial: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key(keyMaterial), iv);
  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  return `${iv.toString("base64url")}.${cipher.getAuthTag().toString("base64url")}.${encrypted.toString("base64url")}`;
}

export function decryptDeliveryCredential(value: string, keyMaterial: string) {
  try {
    const [iv, tag, data] = value.split(".");
    if (!iv || !tag || !data) throw new Error("Malformed ciphertext");
    const decipher = createDecipheriv("aes-256-gcm", key(keyMaterial), Buffer.from(iv, "base64url"));
    decipher.setAuthTag(Buffer.from(tag, "base64url"));
    return Buffer.concat([decipher.update(Buffer.from(data, "base64url")), decipher.final()]).toString("utf8");
  } catch {
    throw new DeliveryCredentialCipherError();
  }
}
