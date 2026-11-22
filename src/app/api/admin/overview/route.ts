import { Platform, PostStatus, TargetStatus } from "@prisma/client";
import { NextResponse } from "next/server";
import { getPlatformSettings, requireFounder } from "@/lib/admin";
import {
  getGoogleOAuthConfig,
  getMetaOAuthConfig,
  getPublicMediaBaseUrl,
  isS3Configured,
} from "@/lib/env";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const founder = await requireFounder();
  if (!founder) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const [
    totalUsers,
    betaUsers,
    proUsers,
    ytChannels,
    igChannels,
    totalPosts,
    publishedPosts,
    scheduledPosts,
    failedPosts,
    totalApiKeys,
    users,
    betaInvites,
    failedTargets,
    settings,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { isBetaTester: true } }),
    prisma.user.count({ where: { plan: "PRO" } }),
    prisma.socialAccount.count({ where: { platform: Platform.YOUTUBE } }),
    prisma.socialAccount.count({ where: { platform: Platform.INSTAGRAM } }),
    prisma.post.count(),
    prisma.post.count({ where: { status: PostStatus.PUBLISHED } }),
    prisma.post.count({ where: { status: PostStatus.SCHEDULED } }),
    prisma.post.count({
      where: { status: { in: [PostStatus.FAILED, PostStatus.PARTIAL_FAILURE] } },
    }),
    prisma.apiKey.count(),
    prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        email: true,
        plan: true,
        isBetaTester: true,
        isSuspended: true,
        createdAt: true,
        _count: {
          select: {
            socialAccounts: true,
            posts: true,
            apiKeys: true,
          },
        },
      },
    }),
    prisma.betaInvite.findMany({
      orderBy: { createdAt: "desc" },
    }),
    prisma.postTarget.findMany({
      where: { status: TargetStatus.FAILED },
      orderBy: { post: { updatedAt: "desc" } },
      take: 15,
      include: {
        account: {
          select: { platform: true, displayName: true, username: true },
        },
        post: {
          select: {
            id: true,
            title: true,
            updatedAt: true,
            user: { select: { email: true, name: true } },
          },
        },
      },
    }),
    getPlatformSettings(),
  ]);

  const googleCfg = getGoogleOAuthConfig();
  const metaCfg = getMetaOAuthConfig();

  return NextResponse.json({
    metrics: {
      totalUsers,
      betaUsers,
      proUsers,
      totalChannels: ytChannels + igChannels,
      ytChannels,
      igChannels,
      totalPosts,
      publishedPosts,
      scheduledPosts,
      failedPosts,
      totalApiKeys,
    },
    system: {
      youtubeOAuthConfigured: googleCfg.isConfigured,
      youtubeRedirectUri: googleCfg.redirectUri,
      instagramOAuthConfigured: metaCfg.isConfigured,
      instagramRedirectUri: metaCfg.redirectUri,
      storageKind: isS3Configured() ? "s3" : "local",
      publicMediaBaseUrl: getPublicMediaBaseUrl(),
    },
    settings,
    users,
    betaInvites,
    failedTargets: failedTargets.map((t) => ({
      id: t.id,
      postId: t.post.id,
      postTitle: t.post.title || "Untitled Post",
      userEmail: t.post.user.email,
      userName: t.post.user.name,
      platform: t.account.platform,
      channelName: t.account.displayName,
      errorMessage: t.errorMessage,
      retryCount: t.retryCount,
      updatedAt: t.post.updatedAt,
    })),
  });
}
