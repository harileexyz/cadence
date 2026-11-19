import {
  Platform,
  PostStatus,
  TargetStatus,
  type PrismaClient,
} from "@prisma/client";
import { describe, expect, it, vi } from "vitest";
import { encryptToken } from "@/lib/crypto";
import { PlatformError, type PlatformAdapter } from "@/lib/platforms";
import type { StorageProvider } from "@/lib/storage";
import {
  computeNextRetryAt,
  computeParentPostStatus,
  processTarget,
} from "./scheduler";

process.env.ENCRYPTION_KEY =
  "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";

describe("scheduler helpers", () => {
  it("computes parent post status across target states", () => {
    expect(
      computeParentPostStatus([TargetStatus.PUBLISHED, TargetStatus.PUBLISHED])
    ).toBe(PostStatus.PUBLISHED);
    expect(
      computeParentPostStatus([TargetStatus.FAILED, TargetStatus.FAILED])
    ).toBe(PostStatus.FAILED);
    expect(
      computeParentPostStatus([TargetStatus.PUBLISHED, TargetStatus.FAILED])
    ).toBe(PostStatus.PARTIAL_FAILURE);
    expect(
      computeParentPostStatus([TargetStatus.PUBLISHED, TargetStatus.PENDING])
    ).toBe(PostStatus.PROCESSING);
  });

  it("computes exponential retry backoff delays", () => {
    const base = new Date("2026-01-01T00:00:00.000Z");
    expect(computeNextRetryAt(1, base).toISOString()).toBe(
      "2026-01-01T00:01:00.000Z"
    );
    expect(computeNextRetryAt(2, base).toISOString()).toBe(
      "2026-01-01T00:05:00.000Z"
    );
    expect(computeNextRetryAt(3, base).toISOString()).toBe(
      "2026-01-01T00:15:00.000Z"
    );
  });

  it("schedules retry on retryable PlatformError and updates parent post", async () => {
    const encryptedToken = encryptToken("valid-token");
    const targetUpdateMock = vi.fn().mockResolvedValue({});
    const postUpdateMock = vi.fn().mockResolvedValue({});

    const fakePrisma = {
      postTarget: {
        findUnique: vi.fn().mockResolvedValue({
          id: "t1",
          postId: "p1",
          retryCount: 0,
          account: {
            id: "acc1",
            platform: Platform.YOUTUBE,
            isActive: true,
            accessTokenEncrypted: encryptedToken,
            refreshTokenEncrypted: null,
            tokenExpiresAt: new Date(Date.now() + 3600_000),
          },
          post: {
            id: "p1",
            title: "Test",
            baseCaption: "Cap",
            media: [],
          },
        }),
        update: targetUpdateMock,
        findMany: vi
          .fn()
          .mockResolvedValue([{ status: TargetStatus.PENDING }]),
      },
      post: {
        update: postUpdateMock,
      },
    } as unknown as PrismaClient;

    const failingAdapter: PlatformAdapter = {
      platform: Platform.YOUTUBE,
      getAuthUrl: vi.fn(),
      exchangeCodeForAccounts: vi.fn(),
      refreshAccessToken: vi.fn(),
      validateTarget: vi.fn(),
      publishTarget: vi
        .fn()
        .mockRejectedValue(
          new PlatformError("Rate limited", { retryable: true, statusCode: 429 })
        ),
    };

    await processTarget("t1", {
      prismaClient: fakePrisma,
      adapterLookup: () => failingAdapter,
      storageProvider: {} as StorageProvider,
      now: new Date("2026-01-01T00:00:00.000Z"),
    });

    expect(targetUpdateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "t1" },
        data: expect.objectContaining({
          status: TargetStatus.PENDING,
          retryCount: 1,
          errorMessage: "Rate limited",
        }),
      })
    );
    expect(postUpdateMock).toHaveBeenCalledWith({
      where: { id: "p1" },
      data: { status: PostStatus.PROCESSING },
    });
  });
});
