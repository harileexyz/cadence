import { describe, expect, it } from "vitest";
import { decryptToken, encryptToken } from "./crypto";

const TEST_KEY =
  "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";

describe("crypto token vault", () => {
  it("encrypts and decrypts tokens round-trip", () => {
    const secret = "ya29.a0AfH6SMBx_example_token_12345";
    const encrypted = encryptToken(secret, TEST_KEY);

    expect(encrypted).not.toContain(secret);
    expect(encrypted.split(":")).toHaveLength(3);
    expect(decryptToken(encrypted, TEST_KEY)).toBe(secret);
  });

  it("produces unique ciphertexts for identical plaintexts (random IV)", () => {
    const first = encryptToken("same-secret", TEST_KEY);
    const second = encryptToken("same-secret", TEST_KEY);
    expect(first).not.toBe(second);
  });

  it("rejects tampered ciphertext", () => {
    const encrypted = encryptToken("sensitive-token", TEST_KEY);
    const parts = encrypted.split(":");
    const corrupted = `${parts[0]}:${parts[1]}:ff${parts[2].slice(2)}`;
    expect(() => decryptToken(corrupted, TEST_KEY)).toThrow();
  });

  it("rejects invalid encryption key length", () => {
    expect(() => encryptToken("abc", "short-key")).toThrow(/ENCRYPTION_KEY/);
  });
});
