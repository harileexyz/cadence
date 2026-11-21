import { describe, expect, it } from "vitest";
import {
  computeChannelStats,
  computeScopedSummary,
  formatCompactNumber,
  formatPercent,
  getPostEngagementRate,
  type ChannelEngagementDTO,
  type PostEngagementDTO,
} from "../analytics";

const ytChannel: ChannelEngagementDTO = {
  accountId: "acc-yt",
  platform: "YOUTUBE",
  displayName: "Myth Lantern",
  username: "@mythlanterntales",
  avatarUrl: null,
  followersCount: 250,
  totalViews: 12000,
  totalPosts: 15,
};

const igChannel: ChannelEngagementDTO = {
  accountId: "acc-ig",
  platform: "INSTAGRAM",
  displayName: "Standout Cuts IG",
  username: "@standoutcuts",
  avatarUrl: null,
  followersCount: 1000,
  totalViews: null,
  totalPosts: 20,
};

const samplePosts: PostEngagementDTO[] = [
  {
    id: "v1",
    platform: "YOUTUBE",
    accountId: "acc-yt",
    accountName: "Myth Lantern",
    title: "Zeus Story",
    thumbnailUrl: null,
    url: "https://youtube.com/watch?v=v1",
    publishedAt: "2026-11-18T10:00:00Z",
    views: 1000,
    likes: 45,
    comments: 5,
  },
  {
    id: "v2",
    platform: "YOUTUBE",
    accountId: "acc-yt",
    accountName: "Myth Lantern",
    title: "Odin Story",
    thumbnailUrl: null,
    url: "https://youtube.com/watch?v=v2",
    publishedAt: "2026-11-20T10:00:00Z",
    views: 500,
    likes: 20,
    comments: 5,
  },
  {
    id: "ig1",
    platform: "INSTAGRAM",
    accountId: "acc-ig",
    accountName: "Standout Cuts IG",
    title: "Viral Clip",
    thumbnailUrl: null,
    url: "https://instagram.com/p/ig1",
    publishedAt: "2026-11-19T10:00:00Z",
    views: null,
    likes: 80,
    comments: 20,
  },
];

describe("analytics helpers", () => {
  it("formats compact numbers and percentages cleanly", () => {
    expect(formatCompactNumber(950)).toBe("950");
    expect(formatCompactNumber(14300)).toBe("14.3K");
    expect(formatCompactNumber(2500000)).toBe("2.5M");
    expect(formatPercent(5)).toBe("5.00%");
    expect(formatPercent(12.34)).toBe("12.3%");
    expect(formatPercent(null)).toBe("—");
  });

  it("computes scoped summary for a single YouTube channel", () => {
    const ytPosts = samplePosts.filter((p) => p.accountId === "acc-yt");
    const summary = computeScopedSummary([ytChannel], ytPosts);

    expect(summary.followers).toBe(250);
    expect(summary.totalViews).toBe(12000);
    expect(summary.recentViews).toBe(1500);
    expect(summary.avgViewsPerPost).toBe(750);
    expect(summary.recentLikes).toBe(65);
    expect(summary.recentComments).toBe(10);
    // (65 + 10) / 1500 = 5%
    expect(summary.engagementRate).toBeCloseTo(5, 2);
    expect(summary.topPost?.id).toBe("v1");
  });

  it("computes follower-based engagement rate for Instagram without views", () => {
    const igPosts = samplePosts.filter((p) => p.accountId === "acc-ig");
    const summary = computeScopedSummary([igChannel], igPosts);

    expect(summary.totalViews).toBeNull();
    expect(summary.avgViewsPerPost).toBeNull();
    // (80 + 20) / 1000 followers = 10%
    expect(summary.engagementRate).toBeCloseTo(10, 2);
    expect(summary.engagementRateLabel).toContain("followers");
  });

  it("computes chronological sparkline values per channel", () => {
    const stats = computeChannelStats(ytChannel, samplePosts);
    // Oldest (v1: 1000) -> Newest (v2: 500)
    expect(stats.sparklineValues).toEqual([1000, 500]);
    expect(getPostEngagementRate(samplePosts[0])).toBeCloseTo(5, 2);
    expect(getPostEngagementRate(samplePosts[2])).toBeNull();
  });
});
