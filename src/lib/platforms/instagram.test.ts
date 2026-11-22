import type { MediaAsset, Post, PostTarget, SocialAccount } from "@prisma/client";
import { describe, expect, it, vi } from "vitest";
import type { StorageProvider } from "@/lib/storage";
import { createInstagramAdapter } from "./instagram";

function makeMedia(overrides: Partial<MediaAsset> = {}): MediaAsset {
  return {
    id: "asset_1",
    userId: "user_1",
    filename: "reel.mp4",
    mimeType: "video/mp4",
    sizeBytes: 2048,
    width: 1080,
    height: 1920,
    durationSec: 20,
    storageKey: "reel.mp4",
    publicUrl: "https://cdn.example.com/reel.mp4",
    fileData: null,
    storageDeleted: false,
    createdAt: new Date(),
    ...overrides,
  };
}

const mockStorage = {} as StorageProvider;

describe("instagramAdapter", () => {
  it("rejects localhost URLs during validation", () => {
    const adapter = createInstagramAdapter();
    const res = adapter.validateTarget({
      post: { title: null, baseCaption: "Hi IG" },
      target: { customTitle: null, customCaption: null, platformOptions: {} },
      media: [
        makeMedia({ publicUrl: "http://localhost:3000/api/media/reel.mp4" }),
      ],
    });

    expect(res.valid).toBe(false);
    expect(res.errors[0]).toMatch(/public HTTPS media URL/);
  });

  it("creates Reel container, polls until FINISHED, and publishes", async () => {
    const mockFetch = vi
      .fn<typeof fetch>()
      // 1. Create container
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ id: "creation_123" }), { status: 200 })
      )
      // 2. Poll IN_PROGRESS
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ status_code: "IN_PROGRESS" }), {
          status: 200,
        })
      )
      // 3. Poll FINISHED
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ status_code: "FINISHED" }), {
          status: 200,
        })
      )
      // 4. Publish container
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ id: "ig_media_777" }), { status: 200 })
      )
      // 5. Fetch permalink
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({ permalink: "https://www.instagram.com/reel/ABC/" }),
          { status: 200 }
        )
      );

    const adapter = createInstagramAdapter({
      fetchFn: mockFetch,
      pollIntervalMs: 1,
      maxPollAttempts: 5,
    });

    const result = await adapter.publishTarget({
      account: { id: "acc_ig", externalAccountId: "178414000" } as SocialAccount,
      accessToken: "ig_token_abc",
      post: { id: "p1", title: null, baseCaption: "Reel caption" } as Post,
      target: {
        id: "t1",
        customTitle: null,
        customCaption: null,
        platformOptions: { mediaType: "REELS", shareToFeed: true },
      } as unknown as PostTarget,
      media: [makeMedia()],
      storage: mockStorage,
    });

    expect(result).toEqual({
      externalPostId: "ig_media_777",
      externalPostUrl: "https://www.instagram.com/reel/ABC/",
    });
    expect(mockFetch).toHaveBeenCalledTimes(5);
  });

  it("passes cover_url, collaborators, audio_name, user_tags, and posts first comment", async () => {
    const mockFetch = vi
      .fn<typeof fetch>()
      // 1. Create container
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ id: "creation_full" }), { status: 200 })
      )
      // 2. Poll FINISHED
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ status_code: "FINISHED" }), {
          status: 200,
        })
      )
      // 3. Publish
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ id: "ig_media_888" }), { status: 200 })
      )
      // 4. First comment
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ id: "ig_comment_1" }), { status: 200 })
      )
      // 5. Permalink
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({ permalink: "https://www.instagram.com/reel/XYZ/" }),
          { status: 200 }
        )
      );

    const adapter = createInstagramAdapter({
      fetchFn: mockFetch,
      pollIntervalMs: 1,
      maxPollAttempts: 3,
    });

    await adapter.publishTarget({
      account: { id: "acc_ig", externalAccountId: "178414000" } as SocialAccount,
      accessToken: "ig_token_abc",
      post: { id: "p1", title: null, baseCaption: "Full IG Reel" } as Post,
      target: {
        id: "t1",
        customTitle: null,
        customCaption: null,
        platformOptions: {
          mediaType: "REELS",
          shareToFeed: true,
          coverAssetId: "cover_1",
          collaborators: ["@collab1", "collab2"],
          userTags: [{ username: "@taggeduser", x: 0.5, y: 0.5 }],
          audioName: "Custom Beat",
          locationId: "123456",
          firstComment: "#reels #viral",
        },
      } as unknown as PostTarget,
      media: [makeMedia()],
      storage: mockStorage,
      getMediaAssetById: vi.fn().mockResolvedValue(
        makeMedia({
          id: "cover_1",
          mimeType: "image/jpeg",
          publicUrl: "https://cdn.example.com/cover.jpg",
        })
      ),
    });

    expect(mockFetch).toHaveBeenCalledTimes(5);
    const containerParams = new URLSearchParams(
      String(mockFetch.mock.calls[0][1]?.body)
    );
    expect(containerParams.get("cover_url")).toBe(
      "https://cdn.example.com/cover.jpg"
    );
    expect(containerParams.get("audio_name")).toBe("Custom Beat");
    expect(containerParams.get("collaborators")).toBe(
      JSON.stringify(["collab1", "collab2"])
    );
    expect(String(mockFetch.mock.calls[3][0])).toContain(
      "/ig_media_888/comments"
    );
  });

  it("fails immediately without retrying when container reports ERROR", async () => {
    const mockFetch = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ id: "creation_err" }), { status: 200 })
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({ status_code: "ERROR", status: "Unsupported codec" }),
          { status: 200 }
        )
      );

    const adapter = createInstagramAdapter({
      fetchFn: mockFetch,
      pollIntervalMs: 1,
      maxPollAttempts: 3,
    });

    await expect(
      adapter.publishTarget({
        account: {
          id: "acc_ig",
          externalAccountId: "178414000",
        } as SocialAccount,
        accessToken: "ig_token_abc",
        post: { id: "p1", title: null, baseCaption: "Reel caption" } as Post,
        target: {
          id: "t1",
          customTitle: null,
          customCaption: null,
          platformOptions: {},
        } as unknown as PostTarget,
        media: [makeMedia()],
        storage: mockStorage,
      })
    ).rejects.toMatchObject({ retryable: false });
  });
});
