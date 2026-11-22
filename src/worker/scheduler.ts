import {
  Platform,
  PostStatus,
  TargetStatus,
  type PrismaClient,
  type SocialAccount,
} from "@prisma/client";
import { decryptToken, encryptToken } from "@/lib/crypto";
import {
  getPlatformAdapter,
  PlatformError,
  type PlatformAdapter,
} from "@/lib/platforms";
import { getStorageProvider, type StorageProvider } from "@/lib/storage";

export const MAX_RETRY_COUNT = 3;
const RETRY_DELAYS_MS = [60_000, 5 * 60_000, 15 * 60_000];
const TOKEN_REFRESH_BUFFER_MS = 5 * 60_000;
const PROACTIVE_IG_REFRESH_WINDOW_MS = 14 * 24 * 60 * 60 * 1000;

export function computeNextRetryAt(
  retryCount: number,
  now: Date = new Date()
): Date {
  const idx = Math.min(Math.max(retryCount - 1, 0), RETRY_DELAYS_MS.length - 1);
  return new Date(now.getTime() + RETRY_DELAYS_MS[idx]);
}

export function computeParentPostStatus(
  statuses: TargetStatus[]
): PostStatus {
  if (statuses.length === 0) {
    return PostStatus.FAILED;
  }

  const hasPending = statuses.includes(TargetStatus.PENDING);
  const hasProcessing = statuses.includes(TargetStatus.PROCESSING);
  if (hasPending || hasProcessing) {
    return PostStatus.PROCESSING;
  }

  const publishedCount = statuses.filter(
    (s) => s === TargetStatus.PUBLISHED
  ).length;
  const failedCount = statuses.filter((s) => s === TargetStatus.FAILED).length;

  if (publishedCount === statuses.length) {
    return PostStatus.PUBLISHED;
  }
  if (failedCount === statuses.length) {
    return PostStatus.FAILED;
  }
  return PostStatus.PARTIAL_FAILURE;
}

export async function ensureFreshAccessToken(
  account: SocialAccount,
  prismaClient: PrismaClient,
  adapterLookup: (platform: Platform) => PlatformAdapter = getPlatformAdapter,
  now: Date = new Date()
): Promise<string> {
  const currentAccessToken = decryptToken(account.accessTokenEncrypted);
  const currentRefreshToken = account.refreshTokenEncrypted
    ? decryptToken(account.refreshTokenEncrypted)
    : null;

  const isExpiringSoon =
    account.tokenExpiresAt !== null &&
    account.tokenExpiresAt.getTime() <= now.getTime() + TOKEN_REFRESH_BUFFER_MS;

  if (!isExpiringSoon) {
    return currentAccessToken;
  }

  const adapter = adapterLookup(account.platform);
  const refreshed = await adapter.refreshAccessToken(
    account,
    currentRefreshToken,
    currentAccessToken
  );

  if (!refreshed) {
    return currentAccessToken;
  }

  await prismaClient.socialAccount.update({
    where: { id: account.id },
    data: {
      accessTokenEncrypted: encryptToken(refreshed.accessToken),
      ...(refreshed.refreshToken !== undefined
        ? {
            refreshTokenEncrypted: refreshed.refreshToken
              ? encryptToken(refreshed.refreshToken)
              : null,
          }
        : {}),
      ...(refreshed.tokenExpiresAt !== undefined
        ? { tokenExpiresAt: refreshed.tokenExpiresAt }
        : {}),
    },
  });

  return refreshed.accessToken;
}

export async function claimDueTargetIds(
  prismaClient: PrismaClient,
  limit = 5
): Promise<string[]> {
  return prismaClient.$transaction(async (tx) => {
    const rows = await tx.$queryRaw<Array<{ id: string }>>`
      SELECT pt."id"
      FROM "PostTarget" pt
      INNER JOIN "Post" p ON p."id" = pt."postId"
      WHERE pt."status" = 'PENDING'::"TargetStatus"
        AND p."status" IN ('SCHEDULED'::"PostStatus", 'PROCESSING'::"PostStatus")
        AND (
          (pt."nextRetryAt" IS NULL AND p."scheduledAt" <= NOW())
          OR (pt."nextRetryAt" IS NOT NULL AND pt."nextRetryAt" <= NOW())
        )
      ORDER BY COALESCE(pt."nextRetryAt", p."scheduledAt") ASC
      LIMIT ${limit}
      FOR UPDATE OF pt SKIP LOCKED
    `;

    if (rows.length === 0) {
      return [];
    }

    const ids = rows.map((r) => r.id);
    await tx.postTarget.updateMany({
      where: { id: { in: ids } },
      data: { status: TargetStatus.PROCESSING },
    });

    await tx.post.updateMany({
      where: {
        targets: { some: { id: { in: ids } } },
        status: PostStatus.SCHEDULED,
      },
      data: { status: PostStatus.PROCESSING },
    });

    return ids;
  });
}

export interface ProcessTargetDeps {
  prismaClient: PrismaClient;
  adapterLookup?: (platform: Platform) => PlatformAdapter;
  storageProvider?: StorageProvider;
  now?: Date;
}

export async function processTarget(
  targetId: string,
  deps: ProcessTargetDeps
): Promise<void> {
  const {
    prismaClient,
    adapterLookup = getPlatformAdapter,
    storageProvider = getStorageProvider(),
    now = new Date(),
  } = deps;

  const target = await prismaClient.postTarget.findUnique({
    where: { id: targetId },
    include: {
      account: true,
      post: {
        include: {
          media: {
            include: { mediaAsset: true },
            orderBy: { orderIndex: "asc" },
          },
        },
      },
    },
  });

  if (!target) {
    return;
  }

  try {
    if (!target.account.isActive) {
      throw new PlatformError("Connected social account is disabled.", {
        retryable: false,
      });
    }

    const accessToken = await ensureFreshAccessToken(
      target.account,
      prismaClient,
      adapterLookup,
      now
    );

    const adapter = adapterLookup(target.account.platform);
    const mediaAssets = target.post.media.map((m) => m.mediaAsset);

    // If using local storage, restore any missing files from Postgres fileData backup
    // (survives Render container redeploys) and refresh publicUrl to current APP_URL.
    if (storageProvider.kind === "local") {
      for (const asset of mediaAssets) {
        asset.publicUrl = storageProvider.getPublicUrl(asset.storageKey);
        try {
          await storageProvider.getBuffer(asset.storageKey);
        } catch {
          if (asset.fileData && asset.fileData.byteLength > 0) {
            await storageProvider.upload({
              key: asset.storageKey,
              buffer: Buffer.from(asset.fileData),
              contentType: asset.mimeType,
            });
          }
        }
      }
    }

    const result = await adapter.publishTarget({
      account: target.account,
      accessToken,
      post: target.post,
      target,
      media: mediaAssets,
      storage: storageProvider,
      getMediaAssetById: (id: string) =>
        prismaClient.mediaAsset.findUnique({ where: { id } }),
    });

    await prismaClient.postTarget.update({
      where: { id: target.id },
      data: {
        status: TargetStatus.PUBLISHED,
        externalPostId: result.externalPostId,
        externalPostUrl: result.externalPostUrl,
        errorMessage: null,
        nextRetryAt: null,
        publishedAt: new Date(),
      },
    });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Unknown publishing error";
    const isRetryable =
      err instanceof PlatformError
        ? err.retryable && target.retryCount < MAX_RETRY_COUNT
        : target.retryCount < MAX_RETRY_COUNT;

    if (isRetryable) {
      const nextRetryCount = target.retryCount + 1;
      await prismaClient.postTarget.update({
        where: { id: target.id },
        data: {
          status: TargetStatus.PENDING,
          retryCount: nextRetryCount,
          nextRetryAt: computeNextRetryAt(nextRetryCount, now),
          errorMessage: message,
        },
      });
    } else {
      await prismaClient.postTarget.update({
        where: { id: target.id },
        data: {
          status: TargetStatus.FAILED,
          nextRetryAt: null,
          errorMessage: message,
        },
      });
    }
  }

  const siblingTargets = await prismaClient.postTarget.findMany({
    where: { postId: target.postId },
    select: { status: true },
  });

  const nextPostStatus = computeParentPostStatus(
    siblingTargets.map((t) => t.status)
  );

  await prismaClient.post.update({
    where: { id: target.postId },
    data: { status: nextPostStatus },
  });
}

const STALE_PROCESSING_TIMEOUT_MS = 4 * 60 * 1000; // 4 minutes

export async function recoverStaleProcessingTargets(
  prismaClient: PrismaClient,
  now: Date = new Date()
): Promise<number> {
  const cutoff = new Date(now.getTime() - STALE_PROCESSING_TIMEOUT_MS);
  const staleTargets = await prismaClient.postTarget.findMany({
    where: {
      status: TargetStatus.PROCESSING,
      post: { updatedAt: { lte: cutoff } },
    },
    select: { id: true, postId: true },
  });

  if (staleTargets.length === 0) return 0;

  const affectedPostIds = new Set<string>();
  for (const t of staleTargets) {
    affectedPostIds.add(t.postId);
    await prismaClient.postTarget.update({
      where: { id: t.id },
      data: {
        status: TargetStatus.FAILED,
        nextRetryAt: null,
        errorMessage:
          "Publishing was interrupted by a server restart or container redeploy. Click Retry to publish.",
      },
    });
  }

  for (const postId of affectedPostIds) {
    const siblings = await prismaClient.postTarget.findMany({
      where: { postId },
      select: { status: true },
    });
    const nextStatus = computeParentPostStatus(siblings.map((s) => s.status));
    await prismaClient.post.update({
      where: { id: postId },
      data: { status: nextStatus },
    });
  }

  return staleTargets.length;
}

export async function runSchedulerTick(
  deps: ProcessTargetDeps
): Promise<number> {
  await recoverStaleProcessingTargets(deps.prismaClient, deps.now).catch(
    () => {}
  );
  const dueIds = await claimDueTargetIds(deps.prismaClient, 5);
  for (const id of dueIds) {
    await processTarget(id, deps);
  }
  return dueIds.length;
}

export async function refreshExpiringInstagramTokens(
  prismaClient: PrismaClient,
  adapterLookup: (platform: Platform) => PlatformAdapter = getPlatformAdapter
): Promise<number> {
  const cutoff = new Date(Date.now() + PROACTIVE_IG_REFRESH_WINDOW_MS);
  const accounts = await prismaClient.socialAccount.findMany({
    where: {
      platform: Platform.INSTAGRAM,
      isActive: true,
      OR: [{ tokenExpiresAt: null }, { tokenExpiresAt: { lte: cutoff } }],
    },
  });

  let refreshedCount = 0;
  const adapter = adapterLookup(Platform.INSTAGRAM);

  for (const account of accounts) {
    try {
      const accessToken = decryptToken(account.accessTokenEncrypted);
      const refreshed = await adapter.refreshAccessToken(
        account,
        null,
        accessToken
      );
      if (refreshed) {
        await prismaClient.socialAccount.update({
          where: { id: account.id },
          data: {
            accessTokenEncrypted: encryptToken(refreshed.accessToken),
            ...(refreshed.tokenExpiresAt
              ? { tokenExpiresAt: refreshed.tokenExpiresAt }
              : {}),
          },
        });
        refreshedCount++;
      }
    } catch (err) {
      console.error(
        `[worker] Proactive token refresh failed for account ${account.id}:`,
        err
      );
    }
  }

  return refreshedCount;
}

const MEDIA_CLEANUP_AGE_MS = 60 * 60 * 1000; // 1 hour after publish

export async function cleanupPublishedMediaAssets(
  prismaClient: PrismaClient,
  storageProvider: StorageProvider = getStorageProvider(),
  now: Date = new Date()
): Promise<number> {
  const cutoff = new Date(now.getTime() - MEDIA_CLEANUP_AGE_MS);

  const candidates = await prismaClient.mediaAsset.findMany({
    where: {
      storageDeleted: false,
      posts: {
        some: {},
        every: {
          post: {
            status: PostStatus.PUBLISHED,
            updatedAt: { lte: cutoff },
          },
        },
      },
    },
    take: 25,
  });

  let deletedCount = 0;
  for (const asset of candidates) {
    try {
      await storageProvider.delete(asset.storageKey);
      await prismaClient.mediaAsset.update({
        where: { id: asset.id },
        data: { storageDeleted: true, fileData: null },
      });
      deletedCount++;
    } catch (err) {
      console.warn(
        `[worker] Failed to auto-purge published media asset ${asset.id}:`,
        err
      );
    }
  }

  return deletedCount;
}
