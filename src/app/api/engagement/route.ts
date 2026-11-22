import { Platform } from "@prisma/client";
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import {
  fetchInstagramEngagement,
  fetchYouTubeEngagement,
  type ChannelEngagement,
} from "@/lib/platforms/engagement";
import { prisma } from "@/lib/prisma";
import { ensureFreshAccessToken } from "@/worker/scheduler";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [accounts, publishedCrossPosts] = await Promise.all([
    prisma.socialAccount.findMany({
      where: { userId: user.id, isActive: true },
      orderBy: [{ platform: "asc" }, { createdAt: "desc" }],
    }),
    prisma.post.findMany({
      where: {
        userId: user.id,
        status: { in: ["PUBLISHED", "PARTIAL_FAILURE"] },
      },
      orderBy: { createdAt: "desc" },
      take: 30,
      include: {
        targets: {
          where: { status: "PUBLISHED", externalPostId: { not: null } },
          include: { account: { select: { platform: true } } },
        },
      },
    }),
  ]);

  const crossPostLinks: Array<{
    postId: string;
    title: string | null;
    youtubeExternalId: string;
    instagramExternalId: string;
  }> = [];

  for (const post of publishedCrossPosts) {
    const yt = post.targets.find(
      (t) => t.account.platform === Platform.YOUTUBE && t.externalPostId
    );
    const ig = post.targets.find(
      (t) => t.account.platform === Platform.INSTAGRAM && t.externalPostId
    );
    if (yt?.externalPostId && ig?.externalPostId) {
      crossPostLinks.push({
        postId: post.id,
        title: post.title,
        youtubeExternalId: yt.externalPostId,
        instagramExternalId: ig.externalPostId,
      });
    }
  }

  const channelResults: ChannelEngagement[] = await Promise.all(
    accounts.map(async (account) => {
      try {
        const accessToken = await ensureFreshAccessToken(account, prisma);
        if (account.platform === Platform.YOUTUBE) {
          return await fetchYouTubeEngagement(account, accessToken);
        }
        return await fetchInstagramEngagement(account, accessToken);
      } catch (err) {
        return {
          accountId: account.id,
          platform: account.platform,
          displayName: account.displayName,
          username: account.username,
          avatarUrl: account.avatarUrl,
          followersCount: 0,
          totalViews: account.platform === Platform.YOUTUBE ? 0 : null,
          totalPosts: 0,
          recentPosts: [],
          recentComments: [],
          error:
            err instanceof Error ? err.message : "Failed to refresh token",
        };
      }
    })
  );

  const allPosts = channelResults
    .flatMap((c) => c.recentPosts)
    .sort(
      (a, b) =>
        new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
    );

  const allComments = channelResults
    .flatMap((c) => c.recentComments)
    .sort(
      (a, b) =>
        new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
    );

  const totals = {
    totalFollowers: channelResults.reduce((sum, c) => sum + c.followersCount, 0),
    totalViews: channelResults.reduce((sum, c) => sum + (c.totalViews ?? 0), 0),
    recentLikes: allPosts.reduce((sum, p) => sum + p.likes, 0),
    recentComments: allPosts.reduce((sum, p) => sum + p.comments, 0),
    totalPosts: channelResults.reduce((sum, c) => sum + c.totalPosts, 0),
  };

  return NextResponse.json({
    totals,
    channels: channelResults,
    recentPosts: allPosts,
    recentComments: allComments,
    crossPostLinks,
    fetchedAt: new Date().toISOString(),
  });
}
