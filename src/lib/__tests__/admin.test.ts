import { describe, expect, it } from "vitest";
import { generateInviteCode, isFounderEmail } from "../admin";

describe("admin helpers", () => {
  it("identifies founder email case-insensitively", () => {
    expect(isFounderEmail("leehari007@gmail.com")).toBe(true);
    expect(isFounderEmail("  LEEHARI007@GMAIL.COM ")).toBe(true);
    expect(isFounderEmail("tester@example.com")).toBe(false);
  });

  it("generates unique CAD-XXXX-XXXX beta invite codes", () => {
    const c1 = generateInviteCode();
    const c2 = generateInviteCode();
    expect(c1).toMatch(/^CAD-[A-F0-9]{4}-[A-F0-9]{4}$/);
    expect(c1).not.toBe(c2);
  });
});
