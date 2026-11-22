import type { PlanTier, PrismaClient } from "@prisma/client";

export interface PlanSpec {
  tier: PlanTier;
  name: string;
  priceMonthlyUsd: number;
  maxChannels: number | null; // null = unlimited
  maxPostsPerMonth: number | null; // null = unlimited
  maxFileSizeMb: number;
  features: string[];
}

export const PLAN_SPECS: Record<PlanTier, PlanSpec> = {
  FREE: {
    tier: "FREE",
    name: "Generous Free",
    priceMonthlyUsd: 0,
    maxChannels: 6, // 2x the standard 3-channel free limit
    maxPostsPerMonth: 30,
    maxFileSizeMb: 100,
    features: [
      "Up to 6 connected channels (double the standard 3-channel free limit)",
      "30 scheduled or immediate cross-posts / month",
      "Full YouTube Studio & Instagram Reels settings",
      "Per-channel defaults & overrides",
      "Up to 100 MB per video upload",
    ],
  },
  PRO: {
    tier: "PRO",
    name: "Creator Pro",
    priceMonthlyUsd: 9,
    maxChannels: null,
    maxPostsPerMonth: null,
    maxFileSizeMb: 250,
    features: [
      "Unlimited YouTube & Instagram channels",
      "Unlimited scheduled & immediate posts",
      "Custom thumbnails, playlists & auto first comments",
      "Up to 250 MB per video upload",
      "Priority background publishing queue",
    ],
  },
};

export function getStartOfCurrentMonth(now: Date = new Date()): Date {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0));
}

export interface UserUsageSummary {
  plan: PlanSpec;
  connectedChannels: number;
  postsThisMonth: number;
  canConnectMoreChannels: boolean;
  canCreateMorePosts: boolean;
}

export async function getUserUsageSummary(
  prismaClient: PrismaClient,
  userId: string,
  planTier: PlanTier,
  now: Date = new Date()
): Promise<UserUsageSummary> {
  const plan = PLAN_SPECS[planTier];
  const monthStart = getStartOfCurrentMonth(now);

  const [connectedChannels, postsThisMonth] = await Promise.all([
    prismaClient.socialAccount.count({
      where: { userId },
    }),
    prismaClient.post.count({
      where: {
        userId,
        createdAt: { gte: monthStart },
      },
    }),
  ]);

  const canConnectMoreChannels =
    plan.maxChannels === null || connectedChannels < plan.maxChannels;
  const canCreateMorePosts =
    plan.maxPostsPerMonth === null || postsThisMonth < plan.maxPostsPerMonth;

  return {
    plan,
    connectedChannels,
    postsThisMonth,
    canConnectMoreChannels,
    canCreateMorePosts,
  };
}
