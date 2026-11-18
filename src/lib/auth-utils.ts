import { randomBytes, pbkdf2Sync, timingSafeEqual } from "crypto";

/**
 * Hashes a plaintext password using PBKDF2 with SHA-512 and a random salt.
 * Format: `<salt>:<hash>`
 */
export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const iterations = 10000;
  const keylen = 64;
  const digest = "sha512";
  const hash = pbkdf2Sync(password, salt, iterations, keylen, digest).toString("hex");
  return `${salt}:${hash}`;
}

/**
 * Verifies a plaintext password against a stored `<salt>:<hash>` string.
 */
export function verifyPassword(password: string, storedHash: string): boolean {
  try {
    const [salt, originalHash] = storedHash.split(":");
    if (!salt || !originalHash) return false;

    const iterations = 10000;
    const keylen = 64;
    const digest = "sha512";
    const computedHash = pbkdf2Sync(password, salt, iterations, keylen, digest).toString("hex");

    const a = Buffer.from(computedHash, "hex");
    const b = Buffer.from(originalHash, "hex");
    if (a.length !== b.length) return false;
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

/**
 * Generates a secure random temporary password for employee onboarding invitations.
 * e.g., "Korbit#9X4k2P"
 */
export function generateTemporaryPassword(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
  let rand = "";
  const bytes = randomBytes(6);
  for (let i = 0; i < 6; i++) {
    rand += chars[bytes[i] % chars.length];
  }
  return `Korbit#${rand}`;
}
