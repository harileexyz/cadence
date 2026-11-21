import { describe, expect, it } from "vitest";
import { generateApiKey, hashApiKey } from "../apiKeys";

describe("apiKeys helpers", () => {
  it("generates unique prefixed keys and deterministic SHA-256 hashes", () => {
    const k1 = generateApiKey();
    const k2 = generateApiKey();

    expect(k1.rawKey.startsWith("cad_live_")).toBe(true);
    expect(k1.keyPrefix).toBe(k1.rawKey.slice(0, 16));
    expect(k1.keyHash).toBe(hashApiKey(k1.rawKey));
    expect(k1.rawKey).not.toBe(k2.rawKey);
    expect(k1.keyHash).not.toBe(k2.keyHash);
  });
});
