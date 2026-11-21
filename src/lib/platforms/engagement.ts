import { Platform, type SocialAccount } from "@prisma/client";

const YOUTUBE_API_BASE = "https://www.googleapis.com/youtube/v3";
const FB_GRAPH_BASE = "https://graph.facebook.com/v22.0";

export interface PostEngagement {
  id: string;
  platform: Platform;
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
      { headers }
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

    // 2. Fetch up to 10 most recent uploaded videos (1 unit) + their statistics (1 unit)
    if (uploadsPlaylistId) {
      const plRes = await fetchFn(
        `${YOUTUBE_API_BASE}/playlistItems?part=contentDetails&playlistId=${encodeURIComponent(
          uploadsPlaylistId
        )}&maxResults=10`,
        { headers }
      );
      if (plRes.ok) {
        const plData = (await plRes.json()) as {
          items?: Array<{ contentDetails?: { videoId?: string } }>;
        };
        const videoIds = (plData.items ?? [])
          .map((i) => i.contentDetails?.videoId)
          .filter((id): id is string => Boolean(id));

        if (videoIds.length > 0) {
          const vidRes = await fetchFn(
            `${YOUTUBE_API_BASE}/videos?part=snippet,statistics&id=${encodeURIComponent(
              videoIds.join(",")
            )}`,
            { headers }
          );
          if (vidRes.ok) {
            const vidData = (await vidRes.json()) as {
              items?: Array<{
                id: string;
                snippet?: {
                  title?: string;
                  publishedAt?: string;
                  thumbnails?: {
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

            base.recentPosts = (vidData.items ?? []).map((v) => ({
              id: v.id,
              platform: Platform.YOUTUBE,
              accountId: account.id,
              accountName: account.displayName,
              title: v.snippet?.title || "Untitled Video",
              thumbnailUrl:
                v.snippet?.thumbnails?.medium?.url ||
                v.snippet?.thumbnails?.default?.url ||
                null,
              url: `https://www.youtube.com/watch?v=${v.id}`,
              publishedAt: v.snippet?.publishedAt || new Date().toISOString(),
              views: toInt(v.statistics?.viewCount),
              likes: toInt(v.statistics?.likeCount),
              comments: toInt(v.statistics?.commentCount),
            }));
          }
        }
      }
    }

    // 3. Fetch recent comments across the channel (1 unit, best-effort)
    try {
      const cmtRes = await fetchFn(
        `${YOUTUBE_API_BASE}/commentThreads?part=snippet&allThreadsRelatedToChannelId=${encodeURIComponent(
          account.externalAccountId
        )}&maxResults=8&order=time`,
        { headers }
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
      )}`
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

    // 2. Recent media posts with like_count and comments_count
    const mediaRes = await fetchFn(
      `${graphBase}/${encodeURIComponent(
        igId
      )}/media?fields=id,caption,media_type,media_url,thumbnail_url,permalink,timestamp,like_count,comments_count&limit=10&access_token=${encodeURIComponent(
        accessToken
      )}`
    );

    if (mediaRes.ok) {
      const mediaData = (await mediaRes.json()) as {
        data?: Array<{
          id: string;
          caption?: string;
          media_type?: string;
          media_url?: string;
          thumbnail_url?: string;
          permalink?: string;
          timestamp?: string;
          like_count?: number;
          comments_count?: number;
        }>;
      };

      base.recentPosts = (mediaData.data ?? []).map((m) => ({
        id: m.id,
        platform: Platform.INSTAGRAM,
        accountId: account.id,
        accountName: account.displayName,
        title: m.caption
          ? m.caption.split("\n")[0].slice(0, 90)
          : `Instagram ${m.media_type || "Post"}`,
        thumbnailUrl: m.thumbnail_url || m.media_url || null,
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
            )}`
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
    }

    return base;
  } catch (err) {
    return {
      ...base,
      error: err instanceof Error ? err.message : "Failed to load Instagram stats",
    };
  }
}
