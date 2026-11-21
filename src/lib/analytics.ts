export interface PostEngagementDTO {
  id: string;
  platform: "YOUTUBE" | "INSTAGRAM";
  accountId: string;
  accountName: string;
  title: string;
  thumbnailUrl: string | null;
  url: string;
  publishedAt: string;
  views: number | null;
  likes: number;
  comments: number;
}

export interface CommentDTO {
  id: string;
  platform: "YOUTUBE" | "INSTAGRAM";
  accountId: string;
  accountName: string;
  authorName: string;
  text: string;
  postTitle: string;
  postUrl: string;
  publishedAt: string;
}

export interface ChannelEngagementDTO {
  accountId: string;
  platform: "YOUTUBE" | "INSTAGRAM";
  displayName: string;
  username: string | null;
  avatarUrl: string | null;
  followersCount: number;
  totalViews: number | null;
  totalPosts: number;
  recentPosts?: PostEngagementDTO[];
  recentComments?: CommentDTO[];
  error?: string;
}

export interface EngagementResponse {
  totals: {
    totalFollowers: number;
    totalViews: number;
    recentLikes: number;
    recentComments: number;
    totalPosts: number;
  };
  channels: ChannelEngagementDTO[];
  recentPosts: PostEngagementDTO[];
  recentComments: CommentDTO[];
  fetchedAt: string;
}

export interface ScopedSummary {
  followers: number;
  totalViews: number | null;
  totalPosts: number;
  recentPostsCount: number;
  recentViews: number;
  recentLikes: number;
  recentComments: number;
  avgViewsPerPost: number | null;
  avgLikesPerPost: number;
  engagementRate: number | null;
  engagementRateLabel: string;
  topPost: PostEngagementDTO | null;
}

export interface ChannelComputedStats {
  channel: ChannelEngagementDTO;
  posts: PostEngagementDTO[];
  recentViews: number;
  recentLikes: number;
  recentComments: number;
  avgViewsPerPost: number | null;
  avgLikesPerPost: number;
  engagementRate: number | null;
  sparklineValues: number[];
}

export function formatCompactNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString();
}

export function getPostEngagementRate(post: PostEngagementDTO): number | null {
  if (post.views !== null && post.views > 0) {
    return ((post.likes + post.comments) / post.views) * 100;
  }
  return null;
}

export function formatPercent(rate: number | null): string {
  if (rate === null || !Number.isFinite(rate)) return "—";
  if (rate >= 10) return `${rate.toFixed(1)}%`;
  return `${rate.toFixed(2)}%`;
}

export function computeScopedSummary(
  channels: ChannelEngagementDTO[],
  posts: PostEngagementDTO[]
): ScopedSummary {
  const followers = channels.reduce((s, c) => s + c.followersCount, 0);
  const hasAnyTotalViews = channels.some((c) => c.totalViews !== null);
  const rawTotalViews = hasAnyTotalViews
    ? channels.reduce((s, c) => s + (c.totalViews ?? 0), 0)
    : null;
  const totalPosts = channels.reduce((s, c) => s + c.totalPosts, 0);

  const postsWithViews = posts.filter((p) => p.views !== null);
  const recentViews = postsWithViews.reduce((s, p) => s + (p.views ?? 0), 0);
  const totalViews =
    rawTotalViews !== null ? Math.max(rawTotalViews, recentViews) : null;
  const recentLikes = posts.reduce((s, p) => s + p.likes, 0);
  const recentComments = posts.reduce((s, p) => s + p.comments, 0);

  const avgViewsPerPost =
    postsWithViews.length > 0
      ? Math.round(recentViews / postsWithViews.length)
      : null;
  const avgLikesPerPost =
    posts.length > 0 ? Math.round((recentLikes / posts.length) * 10) / 10 : 0;

  let engagementRate: number | null = null;
  let engagementRateLabel = "Interactions / views";

  if (recentViews > 0) {
    engagementRate = ((recentLikes + recentComments) / recentViews) * 100;
    engagementRateLabel = "Likes & comments / views";
  } else if (followers > 0 && posts.length > 0) {
    const avgInteractions = (recentLikes + recentComments) / posts.length;
    engagementRate = (avgInteractions / followers) * 100;
    engagementRateLabel = "Avg interactions / followers";
  }

  let topPost: PostEngagementDTO | null = null;
  if (posts.length > 0) {
    topPost = [...posts].sort((a, b) => {
      const scoreA = a.views !== null ? a.views : a.likes * 20 + a.comments * 50;
      const scoreB = b.views !== null ? b.views : b.likes * 20 + b.comments * 50;
      return scoreB - scoreA;
    })[0];
  }

  return {
    followers,
    totalViews,
    totalPosts,
    recentPostsCount: posts.length,
    recentViews,
    recentLikes,
    recentComments,
    avgViewsPerPost,
    avgLikesPerPost,
    engagementRate,
    engagementRateLabel,
    topPost,
  };
}

export function computeChannelStats(
  channel: ChannelEngagementDTO,
  allPosts: PostEngagementDTO[]
): ChannelComputedStats {
  const posts = allPosts
    .filter((p) => p.accountId === channel.accountId)
    .sort(
      (a, b) =>
        new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
    );

  const summary = computeScopedSummary([channel], posts);

  // Chronological (oldest -> newest) sparkline values for up to 8 recent posts
  const chronological = [...posts].slice(0, 8).reverse();
  const sparklineValues = chronological.map((p) =>
    p.views !== null ? p.views : p.likes + p.comments
  );

  return {
    channel,
    posts,
    recentViews: summary.recentViews,
    recentLikes: summary.recentLikes,
    recentComments: summary.recentComments,
    avgViewsPerPost: summary.avgViewsPerPost,
    avgLikesPerPost: summary.avgLikesPerPost,
    engagementRate: summary.engagementRate,
    sparklineValues,
  };
}

export function formatRelativeDate(iso: string): string {
  const date = new Date(iso);
  const diffMs = Date.now() - date.getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  if (diffHours < 1) return "Just now";
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}
