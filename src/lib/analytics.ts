export interface PostEngagementDTO {
  id: string;
  platform: "YOUTUBE" | "INSTAGRAM";
  accountId: string;
  accountName: string;
  title: string;
  description?: string | null;
  thumbnailUrl: string | null;
  mediaUrl?: string | null;
  mediaType?: string | null;
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

export interface CrossPostLinkDTO {
  postId: string;
  title: string | null;
  youtubeExternalId: string;
  instagramExternalId: string;
}

export interface CrossPlatformPair {
  id: string;
  title: string;
  thumbnailUrl: string | null;
  publishedAt: string;
  matchType: "cadence" | "auto";
  youtube: PostEngagementDTO;
  instagram: PostEngagementDTO;
  combinedLikes: number;
  combinedComments: number;
  ytEngagementShare: number;
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
  crossPostLinks?: CrossPostLinkDTO[];
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

function normalizeTitleTokens(raw: string): { normalized: string; tokens: Set<string> } {
  const cleaned = raw
    .toLowerCase()
    .replace(/#[a-z0-9_]+/g, " ")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  const stopWords = new Set([
    "the",
    "and",
    "for",
    "with",
    "this",
    "that",
    "from",
    "into",
    "your",
    "what",
    "when",
    "how",
    "why",
    "shorts",
    "reels",
    "video",
  ]);

  const tokens = new Set(
    cleaned
      .split(" ")
      .filter((w) => w.length >= 3 && !stopWords.has(w))
  );

  return { normalized: cleaned, tokens };
}

function titleSimilarity(a: PostEngagementDTO, b: PostEngagementDTO): number {
  const textA = `${a.title} ${(a.description || "").slice(0, 180)}`;
  const textB = `${b.title} ${(b.description || "").slice(0, 180)}`;
  const na = normalizeTitleTokens(textA);
  const nb = normalizeTitleTokens(textB);
  const titleA = normalizeTitleTokens(a.title);
  const titleB = normalizeTitleTokens(b.title);

  if (titleA.normalized.length >= 12 && titleB.normalized.length >= 12) {
    if (
      titleA.normalized.includes(titleB.normalized.slice(0, 16)) ||
      titleB.normalized.includes(titleA.normalized.slice(0, 16))
    ) {
      return 0.95;
    }
  }

  if (na.tokens.size === 0 || nb.tokens.size === 0) return 0;

  let overlap = 0;
  for (const t of na.tokens) {
    if (nb.tokens.has(t)) overlap++;
  }
  const minSize = Math.min(na.tokens.size, nb.tokens.size);
  const union = new Set([...na.tokens, ...nb.tokens]).size;
  const jaccard = union > 0 ? overlap / union : 0;
  const containment = minSize > 0 ? overlap / minSize : 0;

  // Strong match if at least 2 meaningful keywords overlap and either Jaccard >= 0.22 or containment >= 0.4
  if (overlap >= 2 && (jaccard >= 0.22 || containment >= 0.4)) {
    return Math.max(jaccard, containment * 0.8);
  }
  return jaccard;
}

export function matchCrossPostedPairs(
  posts: PostEngagementDTO[],
  crossPostLinks: CrossPostLinkDTO[] = []
): CrossPlatformPair[] {
  const ytPosts = posts.filter((p) => p.platform === "YOUTUBE");
  const igPosts = posts.filter((p) => p.platform === "INSTAGRAM");
  if (ytPosts.length === 0 || igPosts.length === 0) return [];

  const ytById = new Map(ytPosts.map((p) => [p.id, p]));
  const igById = new Map(igPosts.map((p) => [p.id, p]));
  const usedYt = new Set<string>();
  const usedIg = new Set<string>();
  const pairs: CrossPlatformPair[] = [];

  const buildPair = (
    id: string,
    yt: PostEngagementDTO,
    ig: PostEngagementDTO,
    matchType: "cadence" | "auto",
    explicitTitle?: string | null
  ): CrossPlatformPair => {
    const ytEng = yt.likes + yt.comments;
    const igEng = ig.likes + ig.comments;
    const totalEng = ytEng + igEng;
    return {
      id,
      title: explicitTitle || yt.title || ig.title,
      thumbnailUrl: yt.thumbnailUrl || ig.thumbnailUrl,
      publishedAt:
        new Date(yt.publishedAt).getTime() >= new Date(ig.publishedAt).getTime()
          ? yt.publishedAt
          : ig.publishedAt,
      matchType,
      youtube: yt,
      instagram: ig,
      combinedLikes: yt.likes + ig.likes,
      combinedComments: yt.comments + ig.comments,
      ytEngagementShare:
        totalEng > 0 ? Math.round((ytEng / totalEng) * 100) : 50,
    };
  };

  // 1. Exact Cadence cross-post links
  for (const link of crossPostLinks) {
    const yt = ytById.get(link.youtubeExternalId);
    const ig = igById.get(link.instagramExternalId);
    if (yt && ig && !usedYt.has(yt.id) && !usedIg.has(ig.id)) {
      usedYt.add(yt.id);
      usedIg.add(ig.id);
      pairs.push(buildPair(`cad-${link.postId}`, yt, ig, "cadence", link.title));
    }
  }

  // 2. Smart fuzzy title/caption + 30-day window matching for manually cross-posted videos
  const MAX_DIFF_MS = 30 * 24 * 60 * 60 * 1000;
  for (const yt of ytPosts) {
    if (usedYt.has(yt.id)) continue;
    const ytTime = new Date(yt.publishedAt).getTime();

    let bestIg: PostEngagementDTO | null = null;
    let bestScore = 0;

    for (const ig of igPosts) {
      if (usedIg.has(ig.id)) continue;
      const igTime = new Date(ig.publishedAt).getTime();
      if (Math.abs(ytTime - igTime) > MAX_DIFF_MS) continue;

      const score = titleSimilarity(yt, ig);
      if (score >= 0.22 && score > bestScore) {
        bestScore = score;
        bestIg = ig;
      }
    }

    if (bestIg) {
      usedYt.add(yt.id);
      usedIg.add(bestIg.id);
      pairs.push(buildPair(`auto-${yt.id}-${bestIg.id}`, yt, bestIg, "auto"));
    }
  }

  return pairs.sort(
    (a, b) =>
      new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
  );
}
