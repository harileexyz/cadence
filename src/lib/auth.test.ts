import { describe, expect, it } from "vitest";
import { hashPassword, verifyPassword } from "./auth";

describe("auth password hashing", () => {
  it("hashes and verifies password round-trip", () => {
    const hash = hashPassword("bufferclone123");
    expect(hash).not.toContain("bufferclone123");
    expect(verifyPassword("bufferclone123", hash)).toBe(true);
    expect(verifyPassword("wrong-password", hash)).toBe(false);
  });

  it("uses unique salts per hash", () => {
    const first = hashPassword("same-password");
    const second = hashPassword("same-password");
    expect(first).not.toBe(second);
  });
});
