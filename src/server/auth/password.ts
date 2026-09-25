import { randomBytes, scrypt as scryptCallback, timingSafeEqual, type ScryptOptions } from "node:crypto";

/**
 * Password hashing with scrypt (memory-hard KDF from Node's standard library).
 *
 * Format: `scrypt$N$r$p$saltBase64$hashBase64` — parameters are stored with the
 * hash so they can be raised later without invalidating existing passwords.
 */

const KEY_LENGTH = 64;
const PARAMS = { N: 2 ** 15, r: 8, p: 1 } as const;
const MAX_MEM = 128 * PARAMS.N * PARAMS.r * 2;

function scrypt(password: string, salt: Buffer, keylen: number, options: ScryptOptions) {
  return new Promise<Buffer>((resolve, reject) => {
    scryptCallback(password.normalize("NFKC"), salt, keylen, options, (error, key) =>
      error ? reject(error) : resolve(key),
    );
  });
}

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const key = await scrypt(password, salt, KEY_LENGTH, { ...PARAMS, maxmem: MAX_MEM });
  return ["scrypt", PARAMS.N, PARAMS.r, PARAMS.p, salt.toString("base64"), key.toString("base64")].join("$");
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [algorithm, n, r, p, saltB64, hashB64] = stored.split("$");
  if (algorithm !== "scrypt" || !n || !r || !p || !saltB64 || !hashB64) return false;

  const expected = Buffer.from(hashB64, "base64");
  const N = Number(n);
  const options = { N, r: Number(r), p: Number(p), maxmem: 128 * N * Number(r) * 2 };
  try {
    const actual = await scrypt(password, Buffer.from(saltB64, "base64"), expected.length, options);
    return actual.length === expected.length && timingSafeEqual(actual, expected);
  } catch {
    return false;
  }
}

/**
 * A precomputed hash used to spend comparable time when the e-mail does not
 * exist, so response timing does not reveal which accounts are registered.
 */
let dummyHash: Promise<string> | undefined;
export function getDummyHash() {
  dummyHash ??= hashPassword(randomBytes(16).toString("hex"));
  return dummyHash;
}
