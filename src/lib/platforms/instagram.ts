import { Platform, type MediaAsset, type SocialAccount } from "@prisma/client";
import { getMetaOAuthConfig } from "@/lib/env";
import {
  PlatformError,
  type ConnectedAccountInput,
  type InstagramOptions,
  type PlatformAdapter,
  type PublishInput,
  type PublishResult,
  type RefreshedTokens,
  type ValidationInput,
  type ValidationResult,
} from "./types";

const FB_OAUTH_DIALOG_URL = "https://www.facebook.com/v22.0/dialog/oauth";
const IG_GRAPH_BASE = "https://graph.instagram.com/v22.0";
const FB_GRAPH_BASE = "https://graph.facebook.com/v22.0";
const IG_TOKEN_BASE = "https://graph.instagram.com";

/**
 * Self-serve customer scopes for connecting Instagram Professional (Creator / Business)
 * accounts via Meta's User Access Token OAuth flow (same flow used by Buffer / Later).
 */
const FB_IG_USER_SCOPES = [
  "instagram_basic",
  "instagram_content_publish",
  "instagram_manage_comments",
  "pages_show_list",
  "pages_read_engagement",
  "business_management",
];

interface LongTokenResponse {
  access_token?: string;
  token_type?: string;
  expires_in?: number;
  error?: { message?: string };
}

interface IGProfileResponse {
  id?: string;
  user_id?: string;
  username?: string;
  name?: string;
  account_type?: string;
  profile_picture_url?: string;
  error?: { message?: string };
}

interface DebugTokenResponse {
  data?: {
    granular_scopes?: Array<{
      scope: string;
      target_ids?: string[];
    }>;
  };
}

interface FBPagesResponse {
  data?: Array<{
    id: string;
    name?: string;
    instagram_business_account?: {
      id: string;
      username?: string;
      name?: string;
      profile_picture_url?: string;
    };
    connected_instagram_account?: {
      id: string;
      username?: string;
      name?: string;
      profile_picture_url?: string;
    };
  }>;
}

interface FBBusinessesResponse {
  data?: Array<{
    id: string;
    name?: string;
    instagram_business_accounts?: {
      data?: Array<{
        id: string;
        username?: string;
        name?: string;
        profile_picture_url?: string;
      }>;
    };
  }>;
}

interface IGContainerResponse {
  id?: string;
  error?: { message?: string; code?: number };
}

interface IGStatusResponse {
  status_code?: "EXPIRED" | "ERROR" | "FINISHED" | "IN_PROGRESS" | "PUBLISHED";
  status?: string;
  error?: { message?: string };
}

function isRetryableStatus(status: number): boolean {
  return status === 429 || status >= 500;
}

function isPublicHttpsUrl(urlStr: string): boolean {
  try {
    const parsed = new URL(urlStr);
    if (parsed.protocol !== "https:") return false;
    const host = parsed.hostname.toLowerCase();
    return host !== "localhost" && host !== "127.0.0.1" && !host.endsWith(".local");
  } catch {
    return false;
  }
}

function resolveMediaMode(
  media: MediaAsset[],
  opts: InstagramOptions
): "REELS" | "IMAGE" | "CAROUSEL" {
  if (opts.mediaType && opts.mediaType !== "AUTO") {
    return opts.mediaType;
  }
  if (media.length > 1) return "CAROUSEL";
  if (media[0]?.mimeType.startsWith("video/")) return "REELS";
  return "IMAGE";
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

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export interface InstagramAdapterDeps {
  fetchFn?: typeof fetch;
  pollIntervalMs?: number;
  maxPollAttempts?: number;
}

export function createInstagramAdapter(
  deps: InstagramAdapterDeps = {}
): PlatformAdapter {
  const fetchFn = deps.fetchFn ?? fetch;
  const pollIntervalMs = deps.pollIntervalMs ?? 3000;
  const maxPollAttempts = deps.maxPollAttempts ?? 40;

  async function waitForContainerReady(
    graphBase: string,
    containerId: string,
    accessToken: string
  ): Promise<void> {
    for (let attempt = 0; attempt < maxPollAttempts; attempt++) {
      const url = `${graphBase}/${containerId}?fields=status_code,status&access_token=${encodeURIComponent(
        accessToken
      )}`;
      const res = await fetchFn(url);
      const data = (await res.json()) as IGStatusResponse;

      if (!res.ok) {
        throw new PlatformError(
          `Failed to poll Instagram container ${containerId}: ${data.error?.message || res.statusText}`,
          { retryable: isRetryableStatus(res.status), statusCode: res.status }
        );
      }

      if (data.status_code === "FINISHED" || data.status_code === "PUBLISHED") {
        return;
      }

      if (data.status_code === "ERROR" || data.status_code === "EXPIRED") {
        throw new PlatformError(
          `Instagram media processing failed (${data.status_code}): ${data.status || "Unknown container error"}`,
          { retryable: false }
        );
      }

      await sleep(pollIntervalMs);
    }

    throw new PlatformError(
      `Timed out waiting for Instagram media container ${containerId} to finish processing.`,
      { retryable: true }
    );
  }

  async function createMediaContainer(
    graphBase: string,
    igUserId: string,
    accessToken: string,
    params: Record<string, string>
  ): Promise<string> {
    const body = new URLSearchParams({
      ...params,
      access_token: accessToken,
    });

    const res = await fetchFn(`${graphBase}/${igUserId}/media`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: body.toString(),
    });
    const data = (await res.json()) as IGContainerResponse;
    if (!res.ok || !data.id) {
      throw new PlatformError(
        `Instagram container creation failed: ${data.error?.message || res.statusText}`,
        { retryable: isRetryableStatus(res.status), statusCode: res.status }
      );
    }
    return data.id;
  }

  return {
    platform: Platform.INSTAGRAM,

    getAuthUrl(state: string): string {
      const { appId, redirectUri, isConfigured } = getMetaOAuthConfig();
      if (!isConfigured) {
        throw new Error(
          "Meta/Instagram OAuth is not configured. Set META_APP_ID and META_APP_SECRET."
        );
      }

      // Standard self-serve customer OAuth flow (User Access Token mode, no B2B System-User Business Portfolio picker)
      const params = new URLSearchParams({
        client_id: appId,
        redirect_uri: redirectUri,
        response_type: "code",
        auth_type: "rerequest",
        scope: FB_IG_USER_SCOPES.join(","),
        state,
      });
      return `${FB_OAUTH_DIALOG_URL}?${params.toString()}`;
    },

    async exchangeCodeForAccounts(code: string): Promise<ConnectedAccountInput[]> {
      const { appId, appSecret, redirectUri } = getMetaOAuthConfig();

      // 1. Exchange authorization code for User Access Token
      const tokenUrl = new URL(`${FB_GRAPH_BASE}/oauth/access_token`);
      tokenUrl.searchParams.set("client_id", appId);
      tokenUrl.searchParams.set("client_secret", appSecret);
      tokenUrl.searchParams.set("redirect_uri", redirectUri);
      tokenUrl.searchParams.set("code", code);

      const tokenRes = await fetchFn(tokenUrl.toString());
      const tokenData = (await tokenRes.json()) as LongTokenResponse;
      if (!tokenRes.ok || !tokenData.access_token) {
        throw new Error(
          `Instagram OAuth token exchange failed: ${tokenData.error?.message || tokenRes.statusText}`
        );
      }

      // 2. Upgrade to 60-day long-lived user access token
      let accessToken = tokenData.access_token;
      let expiresIn = tokenData.expires_in;

      try {
        const longUrl = new URL(`${FB_GRAPH_BASE}/oauth/access_token`);
        longUrl.searchParams.set("grant_type", "fb_exchange_token");
        longUrl.searchParams.set("client_id", appId);
        longUrl.searchParams.set("client_secret", appSecret);
        longUrl.searchParams.set("fb_exchange_token", accessToken);

        const longRes = await fetchFn(longUrl.toString());
        if (longRes.ok) {
          const longData = (await longRes.json()) as LongTokenResponse;
          if (longData.access_token) {
            accessToken = longData.access_token;
            expiresIn = longData.expires_in ?? expiresIn;
          }
        }
      } catch {
        // Keep short-lived/original token if exchange is skipped
      }

      const expiresAt = expiresIn
        ? new Date(Date.now() + expiresIn * 1000)
        : new Date(Date.now() + 60 * 24 * 60 * 60 * 1000);

      const discoveredById = new Map<string, ConnectedAccountInput>();

      // 3A. Discover via Facebook Pages (/me/accounts -> instagram_business_account or connected_instagram_account)
      try {
        const pagesUrl = new URL(`${FB_GRAPH_BASE}/me/accounts`);
        pagesUrl.searchParams.set(
          "fields",
          "id,name,instagram_business_account{id,username,name,profile_picture_url},connected_instagram_account{id,username,name,profile_picture_url}"
        );
        pagesUrl.searchParams.set("access_token", accessToken);
        const pagesRes = await fetchFn(pagesUrl.toString());
        if (pagesRes.ok) {
          const pagesData = (await pagesRes.json()) as FBPagesResponse;
          for (const page of pagesData.data ?? []) {
            const ig =
              page.instagram_business_account ||
              page.connected_instagram_account;
            if (ig?.id) {
              discoveredById.set(ig.id, {
                platform: Platform.INSTAGRAM,
                externalAccountId: ig.id,
                displayName:
                  ig.name || ig.username || page.name || "Instagram Account",
                username: ig.username ? `@${ig.username}` : null,
                avatarUrl: ig.profile_picture_url || null,
                accessToken,
                refreshToken: null,
                tokenExpiresAt: expiresAt,
                metadata: {
                  graphBase: FB_GRAPH_BASE,
                  facebookPageId: page.id,
                  profileUrl: ig.username
                    ? `https://www.instagram.com/${ig.username}/`
                    : null,
                },
              });
            }
          }
        }
      } catch {
        // Continue to next discovery method
      }

      // 3B. Discover via /me/businesses -> instagram_business_accounts
      try {
        const bizUrl = new URL(`${FB_GRAPH_BASE}/me/businesses`);
        bizUrl.searchParams.set(
          "fields",
          "id,name,instagram_business_accounts{id,username,name,profile_picture_url}"
        );
        bizUrl.searchParams.set("access_token", accessToken);
        const bizRes = await fetchFn(bizUrl.toString());
        if (bizRes.ok) {
          const bizData = (await bizRes.json()) as FBBusinessesResponse;
          for (const biz of bizData.data ?? []) {
            for (const ig of biz.instagram_business_accounts?.data ?? []) {
              if (ig.id && !discoveredById.has(ig.id)) {
                discoveredById.set(ig.id, {
                  platform: Platform.INSTAGRAM,
                  externalAccountId: ig.id,
                  displayName:
                    ig.name || ig.username || biz.name || "Instagram Account",
                  username: ig.username ? `@${ig.username}` : null,
                  avatarUrl: ig.profile_picture_url || null,
                  accessToken,
                  refreshToken: null,
                  tokenExpiresAt: expiresAt,
                  metadata: {
                    graphBase: FB_GRAPH_BASE,
                    businessId: biz.id,
                    profileUrl: ig.username
                      ? `https://www.instagram.com/${ig.username}/`
                      : null,
                  },
                });
              }
            }
          }
        }
      } catch {
        // Continue to granular_scopes discovery
      }

      // 3C. Discover via debug_token granular_scopes (finds target_ids granted during OAuth)
      try {
        const debugUrl = new URL(`${FB_GRAPH_BASE}/debug_token`);
        debugUrl.searchParams.set("input_token", accessToken);
        debugUrl.searchParams.set("access_token", `${appId}|${appSecret}`);
        const debugRes = await fetchFn(debugUrl.toString());
        if (debugRes.ok) {
          const debugData = (await debugRes.json()) as DebugTokenResponse;
          const targetIds = new Set<string>();
          for (const gs of debugData.data?.granular_scopes ?? []) {
            if (gs.scope.startsWith("instagram_")) {
              for (const tid of gs.target_ids ?? []) {
                targetIds.add(tid);
              }
            }
          }

          for (const igId of targetIds) {
            if (discoveredById.has(igId)) continue;
            const igUrl = new URL(`${FB_GRAPH_BASE}/${igId}`);
            igUrl.searchParams.set(
              "fields",
              "id,username,name,profile_picture_url"
            );
            igUrl.searchParams.set("access_token", accessToken);
            const igRes = await fetchFn(igUrl.toString());
            if (igRes.ok) {
              const ig = (await igRes.json()) as IGProfileResponse;
              discoveredById.set(igId, {
                platform: Platform.INSTAGRAM,
                externalAccountId: igId,
                displayName: ig.name || ig.username || "Instagram Account",
                username: ig.username ? `@${ig.username}` : null,
                avatarUrl: ig.profile_picture_url || null,
                accessToken,
                refreshToken: null,
                tokenExpiresAt: expiresAt,
                metadata: {
                  graphBase: FB_GRAPH_BASE,
                  profileUrl: ig.username
                    ? `https://www.instagram.com/${ig.username}/`
                    : null,
                },
              });
            }
          }
        }
      } catch {
        // Ignore fallback errors
      }

      const results = Array.from(discoveredById.values());
      if (results.length === 0) {
        throw new Error(
          "No Instagram Creator or Business account was found on your Meta login. Make sure your Instagram account is switched to a Professional (Creator or Business) account and linked to a Facebook Page or Meta account, then click '+ Connect Instagram' again."
        );
      }

      return results;
    },

    async refreshAccessToken(
      account: SocialAccount,
      _decryptedRefreshToken: string | null,
      decryptedAccessToken: string
    ): Promise<RefreshedTokens | null> {
      const graphBase = getAccountGraphBase(account);
      if (graphBase === FB_GRAPH_BASE) {
        const { appId, appSecret } = getMetaOAuthConfig();
        const fbRefreshUrl = new URL(`${FB_GRAPH_BASE}/oauth/access_token`);
        fbRefreshUrl.searchParams.set("grant_type", "fb_exchange_token");
        fbRefreshUrl.searchParams.set("client_id", appId);
        fbRefreshUrl.searchParams.set("client_secret", appSecret);
        fbRefreshUrl.searchParams.set("fb_exchange_token", decryptedAccessToken);

        const res = await fetchFn(fbRefreshUrl.toString());
        const data = (await res.json()) as LongTokenResponse;
        if (!res.ok || !data.access_token) {
          return null;
        }
        return {
          accessToken: data.access_token,
          tokenExpiresAt: data.expires_in
            ? new Date(Date.now() + data.expires_in * 1000)
            : new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
        };
      }

      const refreshUrl = new URL(`${IG_TOKEN_BASE}/refresh_access_token`);
      refreshUrl.searchParams.set("grant_type", "ig_refresh_token");
      refreshUrl.searchParams.set("access_token", decryptedAccessToken);

      const res = await fetchFn(refreshUrl.toString());
      const data = (await res.json()) as LongTokenResponse;
      if (!res.ok || !data.access_token) {
        throw new PlatformError(
          `Instagram token refresh failed: ${data.error?.message || res.statusText}`,
          { retryable: isRetryableStatus(res.status), statusCode: res.status }
        );
      }

      return {
        accessToken: data.access_token,
        tokenExpiresAt: data.expires_in
          ? new Date(Date.now() + data.expires_in * 1000)
          : new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
      };
    },

    validateTarget(input: ValidationInput): ValidationResult {
      const errors: string[] = [];
      const warnings: string[] = [];

      const caption = (
        input.target.customCaption ||
        input.post.baseCaption ||
        ""
      ).trim();

      if (caption.length > 2200) {
        errors.push("Instagram captions cannot exceed 2,200 characters.");
      }

      if (input.media.length === 0) {
        errors.push("Instagram requires at least 1 image or video.");
      } else if (input.media.length > 10) {
        errors.push("Instagram carousels support a maximum of 10 media items.");
      }

      for (const item of input.media) {
        if (!isPublicHttpsUrl(item.publicUrl)) {
          errors.push(
            `Instagram requires a public HTTPS media URL (got "${item.publicUrl}").`
          );
          break;
        }
      }

      const opts = (input.target.platformOptions || {}) as InstagramOptions;
      if (opts.collaborators && opts.collaborators.length > 3) {
        errors.push("Instagram allows up to 3 collaborator usernames per post.");
      }

      const mode = resolveMediaMode(input.media, opts);

      if (mode === "REELS") {
        if (input.media.length !== 1 || !input.media[0].mimeType.startsWith("video/")) {
          errors.push("Instagram Reels require exactly 1 video file.");
        } else if (
          input.media[0].durationSec &&
          input.media[0].durationSec > 900
        ) {
          errors.push("Instagram Reels cannot exceed 15 minutes (900 seconds).");
        }
      } else if (mode === "IMAGE") {
        if (input.media.length !== 1 || !input.media[0].mimeType.startsWith("image/")) {
          errors.push("Instagram single-image posts require 1 image file.");
        }
      } else if (mode === "CAROUSEL" && input.media.length < 2) {
        errors.push("Instagram Carousels require at least 2 media items.");
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

      const graphBase = getAccountGraphBase(input.account);
      const igUserId = input.account.externalAccountId;
      const opts = (input.target.platformOptions || {}) as InstagramOptions;
      const mode = resolveMediaMode(input.media, opts);
      const caption = (
        input.target.customCaption ||
        input.post.baseCaption ||
        ""
      ).trim();

      const sharedContainerExtras: Record<string, string> = {};
      if (opts.locationId?.trim()) {
        sharedContainerExtras.location_id = opts.locationId.trim();
      }
      if (opts.collaborators && opts.collaborators.length > 0) {
        const cleanCollabs = opts.collaborators
          .map((c) => c.replace(/^@/, "").trim())
          .filter(Boolean)
          .slice(0, 3);
        if (cleanCollabs.length > 0) {
          sharedContainerExtras.collaborators = JSON.stringify(cleanCollabs);
        }
      }
      if (opts.userTags && opts.userTags.length > 0) {
        const cleanTags = opts.userTags
          .map((t) => ({
            username: t.username.replace(/^@/, "").trim(),
            x: t.x ?? 0.5,
            y: t.y ?? 0.5,
          }))
          .filter((t) => Boolean(t.username));
        if (cleanTags.length > 0) {
          sharedContainerExtras.user_tags = JSON.stringify(cleanTags);
        }
      }

      let coverUrl: string | undefined;
      if (opts.coverAssetId && input.getMediaAssetById) {
        const coverAsset = await input.getMediaAssetById(opts.coverAssetId);
        if (coverAsset && isPublicHttpsUrl(coverAsset.publicUrl)) {
          coverUrl = coverAsset.publicUrl;
        }
      }

      let masterContainerId: string;

      if (mode === "IMAGE") {
        masterContainerId = await createMediaContainer(
          graphBase,
          igUserId,
          input.accessToken,
          {
            image_url: input.media[0].publicUrl,
            caption,
            ...sharedContainerExtras,
          }
        );
        await waitForContainerReady(graphBase, masterContainerId, input.accessToken);
      } else if (mode === "REELS") {
        const reelParams: Record<string, string> = {
          media_type: "REELS",
          video_url: input.media[0].publicUrl,
          caption,
          share_to_feed: opts.shareToFeed === false ? "false" : "true",
          ...sharedContainerExtras,
        };
        if (coverUrl) {
          reelParams.cover_url = coverUrl;
        } else if (
          opts.thumbOffsetMs !== undefined &&
          Number.isFinite(opts.thumbOffsetMs) &&
          opts.thumbOffsetMs >= 0
        ) {
          reelParams.thumb_offset = String(Math.round(opts.thumbOffsetMs));
        }
        if (opts.audioName?.trim()) {
          reelParams.audio_name = opts.audioName.trim();
        }

        masterContainerId = await createMediaContainer(
          graphBase,
          igUserId,
          input.accessToken,
          reelParams
        );
        await waitForContainerReady(graphBase, masterContainerId, input.accessToken);
      } else {
        // CAROUSEL
        const childIds: string[] = [];
        for (const item of input.media) {
          const isVideo = item.mimeType.startsWith("video/");
          const childId = await createMediaContainer(
            graphBase,
            igUserId,
            input.accessToken,
            {
              is_carousel_item: "true",
              ...(isVideo
                ? { media_type: "VIDEO", video_url: item.publicUrl }
                : { image_url: item.publicUrl }),
            }
          );
          await waitForContainerReady(graphBase, childId, input.accessToken);
          childIds.push(childId);
        }

        masterContainerId = await createMediaContainer(
          graphBase,
          igUserId,
          input.accessToken,
          {
            media_type: "CAROUSEL",
            children: childIds.join(","),
            caption,
            ...sharedContainerExtras,
          }
        );
        await waitForContainerReady(graphBase, masterContainerId, input.accessToken);
      }

      const publishBody = new URLSearchParams({
        creation_id: masterContainerId,
        access_token: input.accessToken,
      });
      const publishRes = await fetchFn(`${graphBase}/${igUserId}/media_publish`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: publishBody.toString(),
      });
      const publishData = (await publishRes.json()) as IGContainerResponse;
      if (!publishRes.ok || !publishData.id) {
        throw new PlatformError(
          `Instagram media_publish failed: ${publishData.error?.message || publishRes.statusText}`,
          { retryable: isRetryableStatus(publishRes.status), statusCode: publishRes.status }
        );
      }

      const publishedMediaId = publishData.id;

      // Optional: Post first comment if configured
      if (opts.firstComment?.trim()) {
        try {
          const commentBody = new URLSearchParams({
            message: opts.firstComment.trim(),
            access_token: input.accessToken,
          });
          await fetchFn(`${graphBase}/${publishedMediaId}/comments`, {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: commentBody.toString(),
          });
        } catch (err) {
          console.warn(
            `[instagram] First comment warning for media ${publishedMediaId}:`,
            err
          );
        }
      }

      let permalink = "https://www.instagram.com/";
      try {
        const permalinkRes = await fetchFn(
          `${graphBase}/${publishedMediaId}?fields=permalink&access_token=${encodeURIComponent(
            input.accessToken
          )}`
        );
        if (permalinkRes.ok) {
          const permalinkData = (await permalinkRes.json()) as { permalink?: string };
          if (permalinkData.permalink) {
            permalink = permalinkData.permalink;
          }
        }
      } catch {
        // Non-fatal: keep fallback Instagram URL
      }

      return {
        externalPostId: publishedMediaId,
        externalPostUrl: permalink,
      };
    },
  };
}

export const instagramAdapter = createInstagramAdapter();
