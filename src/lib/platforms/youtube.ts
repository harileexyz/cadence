import { Platform, type SocialAccount } from "@prisma/client";
import { getGoogleOAuthConfig } from "@/lib/env";
import {
  PlatformError,
  type ConnectedAccountInput,
  type PlatformAdapter,
  type PublishInput,
  type PublishResult,
  type RefreshedTokens,
  type ValidationInput,
  type ValidationResult,
  type YouTubeOptions,
} from "./types";

const GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const YOUTUBE_CHANNELS_URL =
  "https://www.googleapis.com/youtube/v3/channels?part=snippet&mine=true";
const YOUTUBE_RESUMABLE_UPLOAD_BASE =
  "https://www.googleapis.com/upload/youtube/v3/videos";
const YOUTUBE_THUMBNAIL_UPLOAD_URL =
  "https://www.googleapis.com/upload/youtube/v3/thumbnails/set";
const YOUTUBE_PLAYLIST_ITEMS_URL =
  "https://www.googleapis.com/youtube/v3/playlistItems?part=snippet";
const YOUTUBE_COMMENT_THREADS_URL =
  "https://www.googleapis.com/youtube/v3/commentThreads?part=snippet";

const YOUTUBE_SCOPES = [
  "https://www.googleapis.com/auth/youtube.upload",
  "https://www.googleapis.com/auth/youtube.readonly",
  "https://www.googleapis.com/auth/youtube.force-ssl",
];

interface GoogleTokenResponse {
  access_token: string;
  expires_in?: number;
  refresh_token?: string;
  scope?: string;
  token_type?: string;
  error?: string;
  error_description?: string;
}

interface YouTubeChannelsResponse {
  items?: Array<{
    id: string;
    snippet?: {
      title?: string;
      customUrl?: string;
      thumbnails?: {
        default?: { url?: string };
        medium?: { url?: string };
      };
    };
  }>;
}

function isRetryableStatus(status: number): boolean {
  return status === 429 || status >= 500;
}

export function createYouTubeAdapter(fetchFn: typeof fetch = fetch): PlatformAdapter {
  return {
    platform: Platform.YOUTUBE,

    getAuthUrl(state: string): string {
      const { clientId, redirectUri, isConfigured } = getGoogleOAuthConfig();
      if (!isConfigured) {
        throw new Error(
          "Google OAuth is not configured. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET."
        );
      }
      const params = new URLSearchParams({
        client_id: clientId,
        redirect_uri: redirectUri,
        response_type: "code",
        scope: YOUTUBE_SCOPES.join(" "),
        access_type: "offline",
        prompt: "select_account consent",
        include_granted_scopes: "true",
        state,
      });
      return `${GOOGLE_AUTH_URL}?${params.toString()}`;
    },

    async exchangeCodeForAccounts(code: string): Promise<ConnectedAccountInput[]> {
      const { clientId, clientSecret, redirectUri } = getGoogleOAuthConfig();
      const body = new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      });

      const tokenRes = await fetchFn(GOOGLE_TOKEN_URL, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: body.toString(),
      });
      const tokenData = (await tokenRes.json()) as GoogleTokenResponse;
      if (!tokenRes.ok || !tokenData.access_token) {
        throw new Error(
          `Google OAuth token exchange failed: ${tokenData.error_description || tokenData.error || tokenRes.statusText}`
        );
      }

      const channelsRes = await fetchFn(YOUTUBE_CHANNELS_URL, {
        headers: { Authorization: `Bearer ${tokenData.access_token}` },
      });
      if (!channelsRes.ok) {
        const text = await channelsRes.text();
        throw new Error(`Failed to fetch YouTube channels: ${text}`);
      }

      const channelsData = (await channelsRes.json()) as YouTubeChannelsResponse;
      const items = channelsData.items ?? [];
      if (items.length === 0) {
        throw new Error(
          "No YouTube channels found for this Google account. Create a channel on YouTube first."
        );
      }

      const expiresAt = tokenData.expires_in
        ? new Date(Date.now() + tokenData.expires_in * 1000)
        : null;

      return items.map((channel) => ({
        platform: Platform.YOUTUBE,
        externalAccountId: channel.id,
        displayName: channel.snippet?.title || "YouTube Channel",
        username: channel.snippet?.customUrl || null,
        avatarUrl:
          channel.snippet?.thumbnails?.medium?.url ||
          channel.snippet?.thumbnails?.default?.url ||
          null,
        accessToken: tokenData.access_token,
        refreshToken: tokenData.refresh_token || null,
        tokenExpiresAt: expiresAt,
        metadata: {
          channelUrl: `https://www.youtube.com/channel/${channel.id}`,
        },
      }));
    },

    async refreshAccessToken(
      _account: SocialAccount,
      decryptedRefreshToken: string | null
    ): Promise<RefreshedTokens | null> {
      if (!decryptedRefreshToken) {
        return null;
      }
      const { clientId, clientSecret } = getGoogleOAuthConfig();
      const body = new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: decryptedRefreshToken,
        grant_type: "refresh_token",
      });

      const res = await fetchFn(GOOGLE_TOKEN_URL, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: body.toString(),
      });
      const data = (await res.json()) as GoogleTokenResponse;
      if (!res.ok || !data.access_token) {
        throw new PlatformError(
          `YouTube token refresh failed: ${data.error_description || data.error || res.statusText}`,
          { retryable: isRetryableStatus(res.status), statusCode: res.status }
        );
      }

      return {
        accessToken: data.access_token,
        refreshToken: data.refresh_token || decryptedRefreshToken,
        tokenExpiresAt: data.expires_in
          ? new Date(Date.now() + data.expires_in * 1000)
          : null,
      };
    },

    validateTarget(input: ValidationInput): ValidationResult {
      const errors: string[] = [];
      const warnings: string[] = [];

      const title = (input.target.customTitle || input.post.title || "").trim();
      const description = (
        input.target.customCaption ||
        input.post.baseCaption ||
        ""
      ).trim();

      if (!title) {
        errors.push("YouTube requires a video title.");
      } else if (title.length > 100) {
        errors.push("YouTube video titles cannot exceed 100 characters.");
      }

      if (description.length > 5000) {
        errors.push("YouTube video description cannot exceed 5,000 characters.");
      }

      if (input.media.length === 0) {
        errors.push("YouTube requires a video file.");
      } else if (input.media.length > 1) {
        errors.push("YouTube accepts 1 video per post.");
      } else if (!input.media[0].mimeType.startsWith("video/")) {
        errors.push(
          `YouTube only supports video uploads (got ${input.media[0].mimeType}).`
        );
      }

      const opts = (input.target.platformOptions || {}) as YouTubeOptions;
      if (opts.privacyStatus && opts.privacyStatus !== "private") {
        warnings.push(
          "Note: Unverified Google OAuth apps lock uploaded YouTube videos to 'private' until Google API verification completes."
        );
      }

      return { valid: errors.length === 0, errors, warnings };
    },

    async publishTarget(input: PublishInput): Promise<PublishResult> {
      const validation = this.validateTarget({
        post: input.post,
        target: input.target,
        media: input.media,
      });
      if (!validation.valid) {
        throw new PlatformError(validation.errors.join(" "), {
          retryable: false,
          statusCode: 400,
        });
      }

      const asset = input.media[0];
      const opts = (input.target.platformOptions || {}) as YouTubeOptions;
      const rawTitle = (input.target.customTitle || input.post.title || "").trim();
      const title =
        opts.isShort && !rawTitle.toLowerCase().includes("#shorts")
          ? `${rawTitle} #Shorts`.slice(0, 100)
          : rawTitle;
      const description = (
        input.target.customCaption ||
        input.post.baseCaption ||
        ""
      ).trim();

      const language = opts.defaultLanguage?.trim() || undefined;

      const metadataBody = {
        snippet: {
          title,
          description,
          tags: opts.tags ?? (opts.isShort ? ["Shorts"] : undefined),
          categoryId: opts.categoryId || "22",
          ...(language
            ? {
                defaultLanguage: language,
                defaultAudioLanguage: language,
              }
            : {}),
        },
        status: {
          privacyStatus: opts.privacyStatus || "private",
          selfDeclaredMadeForKids: Boolean(opts.madeForKids),
          embeddable: opts.embeddable !== false,
          license: opts.license || "youtube",
          ...(opts.containsSyntheticMedia !== undefined
            ? { containsSyntheticMedia: Boolean(opts.containsSyntheticMedia) }
            : {}),
        },
      };

      const notifySubscribers =
        opts.notifySubscribers === false ? "false" : "true";
      const initUrl = `${YOUTUBE_RESUMABLE_UPLOAD_BASE}?uploadType=resumable&part=snippet,status&notifySubscribers=${notifySubscribers}`;

      const initRes = await fetchFn(initUrl, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${input.accessToken}`,
          "Content-Type": "application/json; charset=UTF-8",
          "X-Upload-Content-Length": String(asset.sizeBytes),
          "X-Upload-Content-Type": asset.mimeType,
        },
        body: JSON.stringify(metadataBody),
      });

      if (!initRes.ok) {
        const errText = await initRes.text();
        throw new PlatformError(
          `YouTube resumable upload initiation failed (${initRes.status}): ${errText}`,
          { retryable: isRetryableStatus(initRes.status), statusCode: initRes.status }
        );
      }

      const uploadUrl = initRes.headers.get("location");
      if (!uploadUrl) {
        throw new PlatformError(
          "YouTube did not return a resumable upload Location header.",
          { retryable: true }
        );
      }

      const videoBuffer = await input.storage.getBuffer(asset.storageKey);
      const uploadRes = await fetchFn(uploadUrl, {
        method: "PUT",
        headers: {
          "Content-Type": asset.mimeType,
          "Content-Length": String(videoBuffer.byteLength),
        },
        body: new Uint8Array(videoBuffer),
      });

      if (!uploadRes.ok) {
        const errText = await uploadRes.text();
        throw new PlatformError(
          `YouTube video binary upload failed (${uploadRes.status}): ${errText}`,
          { retryable: isRetryableStatus(uploadRes.status), statusCode: uploadRes.status }
        );
      }

      const uploaded = (await uploadRes.json()) as { id?: string };
      if (!uploaded.id) {
        throw new PlatformError("YouTube upload succeeded without a video ID.", {
          retryable: false,
        });
      }

      const videoId = uploaded.id;

      // Optional 1: Upload custom thumbnail if thumbnailAssetId is provided
      if (opts.thumbnailAssetId && input.getMediaAssetById) {
        try {
          const thumbAsset = await input.getMediaAssetById(opts.thumbnailAssetId);
          if (thumbAsset) {
            const thumbBuffer = await input.storage.getBuffer(thumbAsset.storageKey);
            await fetchFn(
              `${YOUTUBE_THUMBNAIL_UPLOAD_URL}?videoId=${encodeURIComponent(videoId)}&uploadType=media`,
              {
                method: "POST",
                headers: {
                  Authorization: `Bearer ${input.accessToken}`,
                  "Content-Type": thumbAsset.mimeType,
                  "Content-Length": String(thumbBuffer.byteLength),
                },
                body: new Uint8Array(thumbBuffer),
              }
            );
          }
        } catch (err) {
          console.warn(
            `[youtube] Custom thumbnail upload warning for video ${videoId}:`,
            err
          );
        }
      }

      // Optional 2: Add video to playlist if playlistId is provided
      if (opts.playlistId?.trim()) {
        try {
          await fetchFn(YOUTUBE_PLAYLIST_ITEMS_URL, {
            method: "POST",
            headers: {
              Authorization: `Bearer ${input.accessToken}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              snippet: {
                playlistId: opts.playlistId.trim(),
                resourceId: {
                  kind: "youtube#video",
                  videoId,
                },
              },
            }),
          });
        } catch (err) {
          console.warn(
            `[youtube] Playlist insertion warning for video ${videoId}:`,
            err
          );
        }
      }

      // Optional 3: Post first comment if firstComment is provided
      if (opts.firstComment?.trim()) {
        try {
          await fetchFn(YOUTUBE_COMMENT_THREADS_URL, {
            method: "POST",
            headers: {
              Authorization: `Bearer ${input.accessToken}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              snippet: {
                videoId,
                topLevelComment: {
                  snippet: {
                    textOriginal: opts.firstComment.trim(),
                  },
                },
              },
            }),
          });
        } catch (err) {
          console.warn(
            `[youtube] First comment warning for video ${videoId}:`,
            err
          );
        }
      }

      return {
        externalPostId: videoId,
        externalPostUrl: `https://www.youtube.com/watch?v=${videoId}`,
      };
    },
  };
}

export const youtubeAdapter = createYouTubeAdapter();
