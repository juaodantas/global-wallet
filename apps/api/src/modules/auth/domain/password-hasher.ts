import { randomBytes, scrypt, timingSafeEqual } from 'node:crypto';

const keyLength = 64;

function deriveKey(password: string, salt: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scrypt(password, salt, keyLength, (error, derivedKey) => {
      if (error) {
        reject(error);
        return;
      }
      resolve(derivedKey);
    });
  });
}

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString('base64url');
  const derivedKey = await deriveKey(password, salt);
  return `scrypt$${salt}$${derivedKey.toString('base64url')}`;
}

export async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
  const parts = storedHash.split('$');
  const algorithm = parts[0];
  const salt = parts[1];
  const hash = parts[2];
  if (algorithm !== 'scrypt' || !salt || !hash) return false;
  const derivedKey = await deriveKey(password, salt);
  const expected = Buffer.from(hash, 'base64url');
  const actual = derivedKey;
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}
