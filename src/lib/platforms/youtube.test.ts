import type { MediaAsset, Post, PostTarget, SocialAccount } from "@prisma/client";
import { describe, expect, it, vi } from "vitest";
import type { StorageProvider } from "@/lib/storage";
import { createYouTubeAdapter } from "./youtube";

function makeMedia(overrides: Partial<MediaAsset> = {}): MediaAsset {
  return {
    id: "asset_1",
    userId: "user_1",
    filename: "clip.mp4",
    mimeType: "video/mp4",
    sizeBytes: 1024,
    width: 1080,
    height: 1920,
    durationSec: 25,
    storageKey: "clip.mp4",
    publicUrl: "https://cdn.example.com/clip.mp4",
    storageDeleted: false,
    createdAt: new Date(),
    ...overrides,
  };
}

describe("youtubeAdapter", () => {
  it("validates missing title and non-video media", () => {
    const adapter = createYouTubeAdapter();
    const res = adapter.validateTarget({
      post: { title: "", baseCaption: "Desc" },
      target: { customTitle: null, customCaption: null, platformOptions: {} },
      media: [makeMedia({ mimeType: "image/png" })],
    });

    expect(res.valid).toBe(false);
    expect(res.errors).toContain("YouTube requires a video title.");
    expect(res.errors[1]).toMatch(/only supports video uploads/);
  });

  it("warns when non-private visibility is selected", () => {
    const adapter = createYouTubeAdapter();
    const res = adapter.validateTarget({
      post: { title: "My Short", baseCaption: "Hello" },
      target: {
        customTitle: null,
        customCaption: null,
        platformOptions: { privacyStatus: "public" },
      },
      media: [makeMedia()],
    });

    expect(res.valid).toBe(true);
    expect(res.warnings.length).toBe(1);
  });

  it("executes resumable upload and returns YouTube watch URL", async () => {
    const mockFetch = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        new Response(null, {
          status: 200,
          headers: { location: "https://upload.youtube.example/session123" },
        })
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ id: "yt_vid_999" }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        })
      );

    const mockStorage: StorageProvider = {
      kind: "local",
      upload: vi.fn(),
      getPublicUrl: vi.fn(),
      getBuffer: vi.fn().mockResolvedValue(Buffer.from("video-bytes")),
      getReadableStream: vi.fn(),
      delete: vi.fn(),
    };

    const adapter = createYouTubeAdapter(mockFetch);
    const result = await adapter.publishTarget({
      account: { id: "acc_1" } as SocialAccount,
      accessToken: "ya29.test",
      post: {
        id: "post_1",
        title: "Demo Short",
        baseCaption: "Watch this!",
      } as Post,
      target: {
        id: "target_1",
        customTitle: null,
        customCaption: null,
        platformOptions: { privacyStatus: "private", isShort: true },
      } as unknown as PostTarget,
      media: [makeMedia()],
      storage: mockStorage,
    });

    expect(result).toEqual({
      externalPostId: "yt_vid_999",
      externalPostUrl: "https://www.youtube.com/watch?v=yt_vid_999",
    });
    expect(mockFetch).toHaveBeenCalledTimes(2);
    const firstCallBody = JSON.parse(String(mockFetch.mock.calls[0][1]?.body));
    expect(firstCallBody.snippet.title).toBe("Demo Short #Shorts");
    expect(firstCallBody.status.privacyStatus).toBe("private");
  });

  it("uploads custom thumbnail, inserts into playlist, and posts first comment when configured", async () => {
    const mockFetch = vi
      .fn<typeof fetch>()
      // 1. Resumable init
      .mockResolvedValueOnce(
        new Response(null, {
          status: 200,
          headers: { location: "https://upload.youtube.example/session456" },
        })
      )
      // 2. Binary upload
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ id: "yt_vid_full" }), { status: 200 })
      )
      // 3. Thumbnail upload
      .mockResolvedValueOnce(new Response("{}", { status: 200 }))
      // 4. Playlist insert
      .mockResolvedValueOnce(new Response("{}", { status: 200 }))
      // 5. First comment
      .mockResolvedValueOnce(new Response("{}", { status: 200 }));

    const mockStorage: StorageProvider = {
      kind: "local",
      upload: vi.fn(),
      getPublicUrl: vi.fn(),
      getBuffer: vi.fn().mockResolvedValue(Buffer.from("bytes")),
      getReadableStream: vi.fn(),
      delete: vi.fn(),
    };

    const adapter = createYouTubeAdapter(mockFetch);
    await adapter.publishTarget({
      account: { id: "acc_1" } as SocialAccount,
      accessToken: "ya29.test",
      post: { id: "post_1", title: "Full Studio Video", baseCaption: "Desc" } as Post,
      target: {
        id: "target_1",
        customTitle: null,
        customCaption: null,
        platformOptions: {
          privacyStatus: "private",
          categoryId: "28",
          defaultLanguage: "en",
          license: "creativeCommon",
          madeForKids: false,
          containsSyntheticMedia: true,
          notifySubscribers: false,
          embeddable: true,
          thumbnailAssetId: "thumb_1",
          playlistId: "PL_TEST_123",
          firstComment: "Check out our links below!",
        },
      } as unknown as PostTarget,
      media: [makeMedia()],
      storage: mockStorage,
      getMediaAssetById: vi.fn().mockResolvedValue(
        makeMedia({
          id: "thumb_1",
          mimeType: "image/png",
          storageKey: "thumb.png",
        })
      ),
    });

    expect(mockFetch).toHaveBeenCalledTimes(5);
    expect(String(mockFetch.mock.calls[0][0])).toContain(
      "notifySubscribers=false"
    );
    const initBody = JSON.parse(String(mockFetch.mock.calls[0][1]?.body));
    expect(initBody.snippet.categoryId).toBe("28");
    expect(initBody.snippet.defaultLanguage).toBe("en");
    expect(initBody.status.containsSyntheticMedia).toBe(true);
    expect(initBody.status.license).toBe("creativeCommon");
  });
});
