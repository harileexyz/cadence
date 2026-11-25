import { Platform, type SocialAccount } from "@prisma/client";

const YOUTUBE_API_BASE = "https://www.googleapis.com/youtube/v3";
const FB_GRAPH_BASE = "https://graph.facebook.com/v22.0";

export interface PostEngagement {
  id: string;
  platform: Platform;
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

export interface EngagementComment {
  id: string;
  platform: Platform;
  accountId: string;
  accountName: string;
  authorName: string;
  text: string;
  postTitle: string;
  postUrl: string;
  publishedAt: string;
}

export interface ChannelEngagement {
  accountId: string;
  platform: Platform;
  displayName: string;
  username: string | null;
  avatarUrl: string | null;
  followersCount: number;
  totalViews: number | null;
  totalPosts: number;
  recentPosts: PostEngagement[];
  recentComments: EngagementComment[];
  error?: string;
}

function toInt(val: string | number | undefined | null): number {
  if (typeof val === "number") return Number.isFinite(val) ? val : 0;
  if (typeof val === "string") {
    const n = Number.parseInt(val, 10);
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
}

function getAccountGraphBase(account: SocialAccount): string {
  if (account.metadata && typeof account.metadata === "object") {
    const meta = account.metadata as Record<string, unknown>;
    if (typeof meta.graphBase === "string" && meta.graphBase.startsWith("https://")) {
      return meta.graphBase;
    }
  }
  return FB_GRAPH_BASE;
}

export async function fetchYouTubeEngagement(
  account: SocialAccount,
  accessToken: string,
  fetchFn: typeof fetch = fetch
): Promise<ChannelEngagement> {
  const base: ChannelEngagement = {
    accountId: account.id,
    platform: Platform.YOUTUBE,
    displayName: account.displayName,
    username: account.username,
    avatarUrl: account.avatarUrl,
    followersCount: 0,
    totalViews: 0,
    totalPosts: 0,
    recentPosts: [],
    recentComments: [],
  };

  try {
    const headers = { Authorization: `Bearer ${accessToken}` };

    // 1. Channel statistics + uploads playlist ID (1 quota unit)
    const chRes = await fetchFn(
      `${YOUTUBE_API_BASE}/channels?part=snippet,statistics,contentDetails&id=${encodeURIComponent(
        account.externalAccountId
      )}`,
      { headers, cache: "no-store" }
    );
    if (!chRes.ok) {
      const txt = await chRes.text();
      return { ...base, error: `YouTube API error (${chRes.status}): ${txt.slice(0, 140)}` };
    }

    const chData = (await chRes.json()) as {
      items?: Array<{
        id: string;
        statistics?: {
          subscriberCount?: string;
          viewCount?: string;
          videoCount?: string;
        };
        contentDetails?: {
          relatedPlaylists?: {
            uploads?: string;
          };
        };
      }>;
    };

    const channel = chData.items?.[0];
    if (!channel) {
      return { ...base, error: "YouTube channel not found." };
    }

    base.followersCount = toInt(channel.statistics?.subscriberCount);
    base.totalViews = toInt(channel.statistics?.viewCount);
    base.totalPosts = toInt(channel.statistics?.videoCount);

    const uploadsPlaylistId = channel.contentDetails?.relatedPlaylists?.uploads;

    // 2. Fetch up to 200 most recent uploaded videos (paginated, max 50 per page) + their statistics
    if (uploadsPlaylistId) {
      const videoIds: string[] = [];
      let nextPageToken: string | undefined;
      const MAX_YT_PAGES = 4;

      for (let page = 0; page < MAX_YT_PAGES; page++) {
        const pageParam = nextPageToken
          ? `&pageToken=${encodeURIComponent(nextPageToken)}`
          : "";
        const plRes = await fetchFn(
          `${YOUTUBE_API_BASE}/playlistItems?part=contentDetails&playlistId=${encodeURIComponent(
            uploadsPlaylistId
          )}&maxResults=50${pageParam}`,
          { headers, cache: "no-store" }
        );
        if (!plRes.ok) break;

        const plData = (await plRes.json()) as {
          nextPageToken?: string;
          items?: Array<{ contentDetails?: { videoId?: string } }>;
        };
        for (const item of plData.items ?? []) {
          const vid = item.contentDetails?.videoId;
          if (vid) videoIds.push(vid);
        }
        if (!plData.nextPageToken) break;
        nextPageToken = plData.nextPageToken;
      }

      const uniqueVideoIds = Array.from(new Set(videoIds));
      if (uniqueVideoIds.length > 0) {
        const chunks: string[][] = [];
        for (let i = 0; i < uniqueVideoIds.length; i += 50) {
          chunks.push(uniqueVideoIds.slice(i, i + 50));
        }

        const collectedPosts: PostEngagement[] = [];
        for (const chunk of chunks) {
          const vidRes = await fetchFn(
            `${YOUTUBE_API_BASE}/videos?part=snippet,statistics&id=${encodeURIComponent(
              chunk.join(",")
            )}`,
            { headers, cache: "no-store" }
          );
          if (!vidRes.ok) continue;

          const vidData = (await vidRes.json()) as {
            items?: Array<{
              id: string;
              snippet?: {
                title?: string;
                description?: string;
                publishedAt?: string;
                thumbnails?: {
                  high?: { url?: string };
                  medium?: { url?: string };
                  default?: { url?: string };
                };
              };
              statistics?: {
                viewCount?: string;
                likeCount?: string;
                commentCount?: string;
              };
            }>;
          };

          for (const v of vidData.items ?? []) {
            collectedPosts.push({
              id: v.id,
              platform: Platform.YOUTUBE,
              accountId: account.id,
              accountName: account.displayName,
              title: v.snippet?.title || "Untitled Video",
              description: v.snippet?.description || null,
              thumbnailUrl:
                v.snippet?.thumbnails?.high?.url ||
                v.snippet?.thumbnails?.medium?.url ||
                v.snippet?.thumbnails?.default?.url ||
                null,
              mediaUrl: `https://www.youtube.com/embed/${v.id}`,
              mediaType: "YOUTUBE_VIDEO",
              url: `https://www.youtube.com/watch?v=${v.id}`,
              publishedAt: v.snippet?.publishedAt || new Date().toISOString(),
              views: toInt(v.statistics?.viewCount),
              likes: toInt(v.statistics?.likeCount),
              comments: toInt(v.statistics?.commentCount),
            });
          }
        }
        base.recentPosts = collectedPosts;
      }
    }

    // 3. Fetch recent comments across the channel (1 unit, best-effort)
    try {
      const cmtRes = await fetchFn(
        `${YOUTUBE_API_BASE}/commentThreads?part=snippet&allThreadsRelatedToChannelId=${encodeURIComponent(
          account.externalAccountId
        )}&maxResults=8&order=time`,
        { headers, cache: "no-store" }
      );
      if (cmtRes.ok) {
        const cmtData = (await cmtRes.json()) as {
          items?: Array<{
            id: string;
            snippet?: {
              videoId?: string;
              topLevelComment?: {
                snippet?: {
                  authorDisplayName?: string;
                  textOriginal?: string;
                  textDisplay?: string;
                  publishedAt?: string;
                };
              };
            };
          }>;
        };

        const titleByVideoId = new Map(base.recentPosts.map((p) => [p.id, p.title]));
        base.recentComments = (cmtData.items ?? []).map((c) => {
          const top = c.snippet?.topLevelComment?.snippet;
          const videoId = c.snippet?.videoId || "";
          return {
            id: c.id,
            platform: Platform.YOUTUBE,
            accountId: account.id,
            accountName: account.displayName,
            authorName: top?.authorDisplayName || "YouTube Viewer",
            text: top?.textOriginal || top?.textDisplay || "",
            postTitle: titleByVideoId.get(videoId) || "YouTube Video",
            postUrl: videoId
              ? `https://www.youtube.com/watch?v=${videoId}`
              : `https://www.youtube.com/channel/${account.externalAccountId}`,
            publishedAt: top?.publishedAt || new Date().toISOString(),
          };
        });
      }
    } catch {
      // Comments may be disabled on private/new channels; ignore silently
    }

    return base;
  } catch (err) {
    return {
      ...base,
      error: err instanceof Error ? err.message : "Failed to load YouTube stats",
    };
  }
}

export async function fetchInstagramEngagement(
  account: SocialAccount,
  accessToken: string,
  fetchFn: typeof fetch = fetch
): Promise<ChannelEngagement> {
  const base: ChannelEngagement = {
    accountId: account.id,
    platform: Platform.INSTAGRAM,
    displayName: account.displayName,
    username: account.username,
    avatarUrl: account.avatarUrl,
    followersCount: 0,
    totalViews: null,
    totalPosts: 0,
    recentPosts: [],
    recentComments: [],
  };

  try {
    const graphBase = getAccountGraphBase(account);
    const igId = account.externalAccountId;

    // 1. Profile stats
    const profileRes = await fetchFn(
      `${graphBase}/${encodeURIComponent(
        igId
      )}?fields=id,username,name,followers_count,media_count,profile_picture_url&access_token=${encodeURIComponent(
        accessToken
      )}`,
      { cache: "no-store" }
    );
    if (!profileRes.ok) {
      const txt = await profileRes.text();
      return { ...base, error: `Instagram API error (${profileRes.status}): ${txt.slice(0, 140)}` };
    }

    const profile = (await profileRes.json()) as {
      followers_count?: number;
      media_count?: number;
    };
    base.followersCount = toInt(profile.followers_count);
    base.totalPosts = toInt(profile.media_count);

    // 2. Recent media posts with like_count and comments_count (paginated up to 100)
    type IgMediaItem = {
      id: string;
      caption?: string;
      media_type?: string;
      media_url?: string;
      thumbnail_url?: string;
      permalink?: string;
      timestamp?: string;
      like_count?: number;
      comments_count?: number;
    };

    const rawMedia: IgMediaItem[] = [];
    let nextMediaUrl: string | undefined =
      `${graphBase}/${encodeURIComponent(
        igId
      )}/media?fields=id,caption,media_type,media_url,thumbnail_url,permalink,timestamp,like_count,comments_count&limit=50&access_token=${encodeURIComponent(
        accessToken
      )}`;

    const MAX_IG_PAGES = 2;
    for (let page = 0; page < MAX_IG_PAGES && nextMediaUrl; page++) {
      const mediaRes = await fetchFn(nextMediaUrl, { cache: "no-store" });
      if (!mediaRes.ok) break;
      const mediaData = (await mediaRes.json()) as {
        data?: IgMediaItem[];
        paging?: { next?: string };
      };
      if (mediaData.data) {
        rawMedia.push(...mediaData.data);
      }
      nextMediaUrl = mediaData.paging?.next;
    }

    if (rawMedia.length > 0) {
      base.recentPosts = rawMedia.map((m) => ({
        id: m.id,
        platform: Platform.INSTAGRAM,
        accountId: account.id,
        accountName: account.displayName,
        title: m.caption
          ? m.caption.split("\n")[0].slice(0, 90)
          : `Instagram ${m.media_type || "Post"}`,
        description: m.caption || null,
        thumbnailUrl: m.thumbnail_url || m.media_url || null,
        mediaUrl: m.media_url || null,
        mediaType: m.media_type || null,
        url: m.permalink || "https://www.instagram.com/",
        publishedAt: m.timestamp || new Date().toISOString(),
        views: null,
        likes: toInt(m.like_count),
        comments: toInt(m.comments_count),
      }));

      // 3. Recent comments on up to 3 latest posts that have comments
      const postsWithComments = base.recentPosts
        .filter((p) => p.comments > 0)
        .slice(0, 3);

      for (const post of postsWithComments) {
        try {
          const cmtRes = await fetchFn(
            `${graphBase}/${encodeURIComponent(
              post.id
            )}/comments?fields=id,text,username,timestamp&limit=5&access_token=${encodeURIComponent(
              accessToken
            )}`,
            { cache: "no-store" }
          );
          if (cmtRes.ok) {
            const cmtData = (await cmtRes.json()) as {
              data?: Array<{
                id: string;
                text?: string;
                username?: string;
                timestamp?: string;
              }>;
            };
            for (const c of cmtData.data ?? []) {
              base.recentComments.push({
                id: c.id,
                platform: Platform.INSTAGRAM,
                accountId: account.id,
                accountName: account.displayName,
                authorName: c.username ? `@${c.username}` : "Instagram User",
                text: c.text || "",
                postTitle: post.title,
                postUrl: post.url,
                publishedAt: c.timestamp || new Date().toISOString(),
              });
            }
          }
        } catch {
          // Ignore comment fetch errors on individual posts
        }
      }

      // 4. Best-effort post views via Instagram Insights API (requires instagram_manage_insights)
      // Graph API v22 supports `views` across Reels, Video, Image, and Carousel posts.
      const insightTargets = base.recentPosts.slice(0, 50);
      if (insightTargets.length > 0) {
        let lastInsightError: string | null = null;
        const viewsById = new Map<string, number>();

        const fetchPostViews = async (post: PostEngagement) => {
          const metrics =
            post.mediaType === "VIDEO" || post.mediaType === "REELS"
              ? [
                  "views",
                  "plays",
                  "ig_reels_aggregated_all_plays_count",
                  "video_views",
                  "impressions",
                ]
              : ["views", "impressions", "reach"];

          for (const metric of metrics) {
            const url = `${graphBase}/${encodeURIComponent(
              post.id
            )}/insights?metric=${metric}&access_token=${encodeURIComponent(
              accessToken
            )}`;
            let insRes = await fetchFn(url, { cache: "no-store" });
            if (insRes && (insRes.status === 429 || insRes.status >= 500)) {
              insRes = await fetchFn(url, { cache: "no-store" });
            }
            if (!insRes) continue;
            if (!insRes.ok) {
              if (!lastInsightError) {
                lastInsightError = `${insRes.status}: ${(await insRes.text().catch(() => "")).slice(0, 160)}`;
              }
              continue;
            }
            const insData = (await insRes.json()) as {
              data?: Array<{
                name?: string;
                values?: Array<{ value?: number }>;
                total_value?: { value?: number };
              }>;
            };
            const firstMetric = insData.data?.[0];
            const val =
              firstMetric?.values?.[0]?.value ??
              firstMetric?.total_value?.value;
            if (typeof val === "number" && Number.isFinite(val)) {
              return { id: post.id, views: val };
            }
          }
          return null;
        };

        const BATCH_SIZE = 5;
        for (let i = 0; i < insightTargets.length; i += BATCH_SIZE) {
          const batch = insightTargets.slice(i, i + BATCH_SIZE);
          const batchResults = await Promise.allSettled(
            batch.map((post) => fetchPostViews(post))
          );
          for (const r of batchResults) {
            if (r.status === "fulfilled" && r.value) {
              viewsById.set(r.value.id, r.value.views);
            }
          }
        }

        if (viewsById.size > 0) {
          let summedViews = 0;
          for (const v of viewsById.values()) summedViews += v;
          base.totalViews = summedViews;
          base.recentPosts = base.recentPosts.map((p) =>
            viewsById.has(p.id) ? { ...p, views: viewsById.get(p.id)! } : p
          );
        } else if (lastInsightError) {
          console.warn(
            `[engagement] Instagram insights unavailable for ${account.displayName}: ${lastInsightError}`
          );
        }
      }
    }

    return base;
  } catch (err) {
    return {
      ...base,
      error: err instanceof Error ? err.message : "Failed to load Instagram stats",
    };
  }
}

export async function replyToYouTubeComment(
  accessToken: string,
  parentCommentId: string,
  text: string,
  fetchFn: typeof fetch = fetch
): Promise<{ replyId: string }> {
  const res = await fetchFn(`${YOUTUBE_API_BASE}/comments?part=snippet`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      snippet: {
        parentId: parentCommentId,
        textOriginal: text,
      },
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`YouTube reply failed (${res.status}): ${body.slice(0, 180)}`);
  }

  const data = (await res.json()) as { id?: string };
  return { replyId: data.id || `yt-reply-${Date.now()}` };
}

export async function replyToInstagramComment(
  account: SocialAccount,
  accessToken: string,
  commentId: string,
  text: string,
  fetchFn: typeof fetch = fetch
): Promise<{ replyId: string }> {
  const graphBase = getAccountGraphBase(account);
  const body = new URLSearchParams({
    message: text,
    access_token: accessToken,
  });

  const res = await fetchFn(
    `${graphBase}/${encodeURIComponent(commentId)}/replies`,
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: body.toString(),
    }
  );

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(
      `Instagram reply failed (${res.status}): ${errText.slice(0, 180)}`
    );
  }

  const data = (await res.json()) as { id?: string };
  return { replyId: data.id || `ig-reply-${Date.now()}` };
}
