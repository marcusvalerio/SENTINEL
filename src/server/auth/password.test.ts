import { describe, expect, it } from "vitest";
import { hashPassword, verifyPassword } from "./password";

describe("password hashing", () => {
  it("verifies the original password", async () => {
    const hash = await hashPassword("correct horse battery staple");
    expect(hash.startsWith("scrypt$")).toBe(true);
    expect(await verifyPassword("correct horse battery staple", hash)).toBe(true);
  });

  it("rejects a different password", async () => {
    const hash = await hashPassword("secret-one");
    expect(await verifyPassword("secret-two", hash)).toBe(false);
  });

  it("produces unique salts", async () => {
    const [a, b] = await Promise.all([hashPassword("same"), hashPassword("same")]);
    expect(a).not.toEqual(b);
  });

  it("rejects malformed hashes without throwing", async () => {
    expect(await verifyPassword("x", "not-a-hash")).toBe(false);
    expect(await verifyPassword("x", "scrypt$1$2$3$$")).toBe(false);
  });
});
