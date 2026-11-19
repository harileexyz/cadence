import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import {
  getGoogleOAuthConfig,
  getMetaOAuthConfig,
  getPublicMediaBaseUrl,
  isS3Configured,
} from "@/lib/env";
import { prisma } from "@/lib/prisma";

const FOUNDER_EMAILS = new Set(["leehari007@gmail.com"]);

export async function GET() {
  const user = await getCurrentUser();
  if (!user || !FOUNDER_EMAILS.has(user.email.toLowerCase())) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const [totalUsers, totalChannels, totalPosts, users] = await Promise.all([
    prisma.user.count(),
    prisma.socialAccount.count(),
    prisma.post.count(),
    prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        email: true,
        plan: true,
        createdAt: true,
        _count: {
          select: {
            socialAccounts: true,
            posts: true,
          },
        },
      },
    }),
  ]);

  const googleCfg = getGoogleOAuthConfig();
  const metaCfg = getMetaOAuthConfig();

  return NextResponse.json({
    metrics: {
      totalUsers,
      totalChannels,
      totalPosts,
    },
    system: {
      youtubeOAuthConfigured: googleCfg.isConfigured,
      youtubeRedirectUri: googleCfg.redirectUri,
      instagramOAuthConfigured: metaCfg.isConfigured,
      instagramRedirectUri: metaCfg.redirectUri,
      storageKind: isS3Configured() ? "s3" : "local",
      publicMediaBaseUrl: getPublicMediaBaseUrl(),
    },
    users,
  });
}
