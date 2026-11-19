import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getGoogleOAuthConfig, getMetaOAuthConfig, isS3Configured } from "@/lib/env";
import { getUserUsageSummary } from "@/lib/plans";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [accounts, usage] = await Promise.all([
    prisma.socialAccount.findMany({
      where: { userId: user.id },
      orderBy: [{ platform: "asc" }, { createdAt: "desc" }],
      select: {
        id: true,
        platform: true,
        externalAccountId: true,
        displayName: true,
        username: true,
        avatarUrl: true,
        tokenExpiresAt: true,
        metadata: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    }),
    getUserUsageSummary(prisma, user.id, user.plan),
  ]);

  return NextResponse.json({
    accounts,
    usage,
    config: {
      youtubeOAuthConfigured: getGoogleOAuthConfig().isConfigured,
      instagramOAuthConfigured: getMetaOAuthConfig().isConfigured,
      storageKind: isS3Configured() ? "s3" : "local",
    },
  });
}
