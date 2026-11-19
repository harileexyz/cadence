import type { MediaAsset, Platform, Post, PostTarget, SocialAccount } from "@prisma/client";
import type { StorageProvider } from "@/lib/storage";

export const YOUTUBE_CATEGORIES = [
  { id: "1", label: "Film & Animation" },
  { id: "2", label: "Autos & Vehicles" },
  { id: "10", label: "Music" },
  { id: "15", label: "Pets & Animals" },
  { id: "17", label: "Sports" },
  { id: "19", label: "Travel & Events" },
  { id: "20", label: "Gaming" },
  { id: "22", label: "People & Blogs" },
  { id: "23", label: "Comedy" },
  { id: "24", label: "Entertainment" },
  { id: "25", label: "News & Politics" },
  { id: "26", label: "Howto & Style" },
  { id: "27", label: "Education" },
  { id: "28", label: "Science & Technology" },
] as const;

export interface YouTubeOptions {
  privacyStatus?: "private" | "unlisted" | "public";
  isShort?: boolean;
  tags?: string[];
  categoryId?: string;
  madeForKids?: boolean;
  containsSyntheticMedia?: boolean;
  defaultLanguage?: string;
  notifySubscribers?: boolean;
  embeddable?: boolean;
  license?: "youtube" | "creativeCommon";
  playlistId?: string;
  thumbnailAssetId?: string;
  firstComment?: string;
}

export interface InstagramUserTag {
  username: string;
  x?: number;
  y?: number;
}

export interface InstagramOptions {
  mediaType?: "AUTO" | "REELS" | "IMAGE" | "CAROUSEL";
  shareToFeed?: boolean;
  coverAssetId?: string;
  thumbOffsetMs?: number;
  collaborators?: string[];
  audioName?: string;
  locationId?: string;
  userTags?: InstagramUserTag[];
  firstComment?: string;
}

export interface AccountDefaults {
  // YouTube defaults
  categoryId?: string;
  privacyStatus?: "private" | "unlisted" | "public";
  isShort?: boolean;
  tags?: string[];
  madeForKids?: boolean;
  containsSyntheticMedia?: boolean;
  defaultLanguage?: string;
  notifySubscribers?: boolean;
  embeddable?: boolean;
  license?: "youtube" | "creativeCommon";
  playlistId?: string;
  // Instagram defaults
  mediaType?: "AUTO" | "REELS" | "IMAGE" | "CAROUSEL";
  shareToFeed?: boolean;
  collaborators?: string[];
  audioName?: string;
}

export interface ConnectedAccountInput {
  platform: Platform;
  externalAccountId: string;
  displayName: string;
  username?: string | null;
  avatarUrl?: string | null;
  accessToken: string;
  refreshToken?: string | null;
  tokenExpiresAt?: Date | null;
  metadata?: Record<string, unknown>;
}

export interface RefreshedTokens {
  accessToken: string;
  refreshToken?: string | null;
  tokenExpiresAt?: Date | null;
}

export interface ValidationInput {
  post: Pick<Post, "title" | "baseCaption">;
  target: Pick<PostTarget, "customTitle" | "customCaption" | "platformOptions">;
  media: MediaAsset[];
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export interface PublishInput {
  account: SocialAccount;
  accessToken: string;
  post: Post;
  target: PostTarget;
  media: MediaAsset[];
  storage: StorageProvider;
  getMediaAssetById?: (id: string) => Promise<MediaAsset | null>;
}

export interface PublishResult {
  externalPostId: string;
  externalPostUrl: string;
}

export class PlatformError extends Error {
  readonly retryable: boolean;
  readonly statusCode?: number;

  constructor(message: string, options: { retryable: boolean; statusCode?: number }) {
    super(message);
    this.name = "PlatformError";
    this.retryable = options.retryable;
    this.statusCode = options.statusCode;
  }
}

export interface PlatformAdapter {
  readonly platform: Platform;
  getAuthUrl(state: string): string;
  exchangeCodeForAccounts(code: string): Promise<ConnectedAccountInput[]>;
  refreshAccessToken(
    account: SocialAccount,
    decryptedRefreshToken: string | null,
    decryptedAccessToken: string
  ): Promise<RefreshedTokens | null>;
  validateTarget(input: ValidationInput): ValidationResult;
  publishTarget(input: PublishInput): Promise<PublishResult>;
}
