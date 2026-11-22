import { Platform, type SocialAccount } from "@prisma/client";
import { describe, expect, it, vi } from "vitest";
import {
  fetchInstagramEngagement,
  fetchYouTubeEngagement,
  replyToInstagramComment,
  replyToYouTubeComment,
} from "./engagement";

describe("engagement analytics fetchers", () => {
  it("fetches YouTube channel statistics, recent videos, and comments", async () => {
    const mockFetch = vi
      .fn<typeof fetch>()
      // 1. Channel stats
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            items: [
              {
                id: "UC_TEST",
                statistics: {
                  subscriberCount: "1250",
                  viewCount: "48200",
                  videoCount: "19",
                },
                contentDetails: {
                  relatedPlaylists: { uploads: "UU_TEST" },
                },
              },
            ],
          }),
          { status: 200 }
        )
      )
      // 2. Uploads playlist items
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            items: [{ contentDetails: { videoId: "vid_1" } }],
          }),
          { status: 200 }
        )
      )
      // 3. Video details
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            items: [
              {
                id: "vid_1",
                snippet: {
                  title: "My Viral Short",
                  publishedAt: "2026-11-18T10:00:00Z",
                  thumbnails: { medium: { url: "https://i.ytimg.com/1.jpg" } },
                },
                statistics: {
                  viewCount: "5400",
                  likeCount: "310",
                  commentCount: "12",
                },
              },
            ],
          }),
          { status: 200 }
        )
      )
      // 4. Recent channel comments
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            items: [
              {
                id: "cmt_1",
                snippet: {
                  videoId: "vid_1",
                  topLevelComment: {
                    snippet: {
                      authorDisplayName: "ViewerOne",
                      textOriginal: "Awesome video!",
                      publishedAt: "2026-11-18T11:00:00Z",
                    },
                  },
                },
              },
            ],
          }),
          { status: 200 }
        )
      );

    const account = {
      id: "acc_yt",
      platform: Platform.YOUTUBE,
      externalAccountId: "UC_TEST",
      displayName: "semicolon",
      username: "@semicolon613",
      avatarUrl: null,
      metadata: null,
    } as unknown as SocialAccount;

    const result = await fetchYouTubeEngagement(account, "yt_token", mockFetch);

    expect(result.error).toBeUndefined();
    expect(result.followersCount).toBe(1250);
    expect(result.totalViews).toBe(48200);
    expect(result.recentPosts).toHaveLength(1);
    expect(result.recentPosts[0].likes).toBe(310);
    expect(result.recentComments).toHaveLength(1);
    expect(result.recentComments[0].text).toBe("Awesome video!");
  });

  it("fetches Instagram profile metrics and recent media engagement", async () => {
    const mockFetch = vi
      .fn<typeof fetch>()
      // 1. IG profile
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            id: "178414000",
            followers_count: 3400,
            media_count: 42,
          }),
          { status: 200 }
        )
      )
      // 2. IG recent media
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            data: [
              {
                id: "ig_m_1",
                caption: "New Reel drop!",
                media_type: "REELS",
                permalink: "https://www.instagram.com/reel/123/",
                timestamp: "2026-11-18T09:00:00Z",
                like_count: 245,
                comments_count: 1,
              },
            ],
          }),
          { status: 200 }
        )
      )
      // 3. IG comments for post 1
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            data: [
              {
                id: "ig_c_1",
                username: "fan_account",
                text: "Fire reel!",
                timestamp: "2026-11-18T09:30:00Z",
              },
            ],
          }),
          { status: 200 }
        )
      )
      // 4. IG insights (views) for post 1
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            data: [{ name: "views", values: [{ value: 56 }] }],
          }),
          { status: 200 }
        )
      );

    const account = {
      id: "acc_ig",
      platform: Platform.INSTAGRAM,
      externalAccountId: "178414000",
      displayName: "My IG",
      username: "@myig",
      avatarUrl: null,
      metadata: { graphBase: "https://graph.facebook.com/v22.0" },
    } as unknown as SocialAccount;

    const result = await fetchInstagramEngagement(account, "ig_token", mockFetch);

    expect(result.error).toBeUndefined();
    expect(result.followersCount).toBe(3400);
    expect(result.totalPosts).toBe(42);
    expect(result.totalViews).toBe(56);
    expect(result.recentPosts[0].views).toBe(56);
    expect(result.recentPosts[0].likes).toBe(245);
    expect(result.recentComments[0].authorName).toBe("@fan_account");
  });

  it("posts replies to YouTube and Instagram comments", async () => {
    const ytFetch = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ id: "yt_reply_1" }), { status: 200 })
      );

    const ytRes = await replyToYouTubeComment(
      "yt_token",
      "cmt_1",
      "Thank you!",
      ytFetch
    );
    expect(ytRes.replyId).toBe("yt_reply_1");
    expect(ytFetch).toHaveBeenCalledWith(
      expect.stringContaining("/comments?part=snippet"),
      expect.objectContaining({ method: "POST" })
    );

    const igFetch = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ id: "ig_reply_1" }), { status: 200 })
      );
    const igAccount = {
      id: "acc_ig",
      platform: Platform.INSTAGRAM,
      metadata: { graphBase: "https://graph.facebook.com/v22.0" },
    } as unknown as SocialAccount;

    const igRes = await replyToInstagramComment(
      igAccount,
      "ig_token",
      "ig_cmt_99",
      "Appreciate it!",
      igFetch
    );
    expect(igRes.replyId).toBe("ig_reply_1");
    expect(igFetch).toHaveBeenCalledWith(
      expect.stringContaining("/ig_cmt_99/replies"),
      expect.objectContaining({ method: "POST" })
    );
  });
});
