import type { PrismaClient } from "@prisma/client";
import { describe, expect, it, vi } from "vitest";
import { getUserUsageSummary, PLAN_SPECS } from "./plans";

describe("SaaS plan tiers & usage limits", () => {
  it("gives FREE tier 6 channels (2x Buffer's 3-channel limit) and PRO unlimited", () => {
    expect(PLAN_SPECS.FREE.maxChannels).toBe(6);
    expect(PLAN_SPECS.FREE.maxPostsPerMonth).toBe(30);
    expect(PLAN_SPECS.PRO.maxChannels).toBeNull();
    expect(PLAN_SPECS.PRO.maxPostsPerMonth).toBeNull();
  });

  it("blocks connecting a 7th channel on FREE tier", async () => {
    const fakePrisma = {
      socialAccount: { count: vi.fn().mockResolvedValue(6) },
      post: { count: vi.fn().mockResolvedValue(5) },
    } as unknown as PrismaClient;

    const usage = await getUserUsageSummary(fakePrisma, "user_1", "FREE");
    expect(usage.canConnectMoreChannels).toBe(false);
    expect(usage.canCreateMorePosts).toBe(true);
  });

  it("allows unlimited channels and posts on PRO tier", async () => {
    const fakePrisma = {
      socialAccount: { count: vi.fn().mockResolvedValue(25) },
      post: { count: vi.fn().mockResolvedValue(500) },
    } as unknown as PrismaClient;

    const usage = await getUserUsageSummary(fakePrisma, "user_1", "PRO");
    expect(usage.canConnectMoreChannels).toBe(true);
    expect(usage.canCreateMorePosts).toBe(true);
  });
});
