import crypto from "node:crypto";
import { Platform, Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { encryptToken } from "@/lib/crypto";
import { getGoogleOAuthConfig } from "@/lib/env";
import { PLAN_SPECS } from "@/lib/plans";
import { getPlatformAdapter } from "@/lib/platforms";
import { prisma } from "@/lib/prisma";

const PLATFORM_MAP: Record<string, Platform> = {
  youtube: Platform.YOUTUBE,
  instagram: Platform.INSTAGRAM,
};

const MAX_STATE_AGE_MS = 15 * 60 * 1000; // 15 minutes

function verifySignedOAuthState(
  state: string,
  expectedPlatform: string
): { userId: string } | null {
  const parts = state.split(".");
  if (parts.length !== 5) return null;
  const [userId, platform, tsBase36, nonce, sig] = parts;
  if (platform !== expectedPlatform) return null;

  const ts = Number.parseInt(tsBase36, 36);
  if (!Number.isFinite(ts) || Date.now() - ts > MAX_STATE_AGE_MS) {
    return null;
  }

  const secret = process.env.ENCRYPTION_KEY || "fallback-state-secret";
  const payload = `${userId}.${platform}.${tsBase36}.${nonce}`;
  const expectedSig = crypto
    .createHmac("sha256", secret)
    .update(payload)
    .digest("hex")
    .slice(0, 32);

  if (sig.length !== expectedSig.length) return null;
  const valid = crypto.timingSafeEqual(
    Buffer.from(sig),
    Buffer.from(expectedSig)
  );
  return valid ? { userId } : null;
}

export async function GET(
  request: Request,
  context: { params: Promise<{ platform: string }> }
) {
  const { platform: rawPlatform } = await context.params;
  const key = rawPlatform.toLowerCase();
  const platform = PLATFORM_MAP[key];
  const localOrigin = new URL(getGoogleOAuthConfig().redirectUri).origin;
  const accountsUrl = new URL("/accounts", localOrigin);

  if (!platform) {
    accountsUrl.searchParams.set("error", "Unsupported platform");
    return NextResponse.redirect(accountsUrl);
  }

  const url = new URL(request.url);
  const errorParam = url.searchParams.get("error");
  if (errorParam) {
    accountsUrl.searchParams.set(
      "error",
      url.searchParams.get("error_description") || errorParam
    );
    return NextResponse.redirect(accountsUrl);
  }

  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  if (!code || !state) {
    accountsUrl.searchParams.set(
      "error",
      "Missing OAuth authorization code or state."
    );
    return NextResponse.redirect(accountsUrl);
  }

  const verifiedState = verifySignedOAuthState(state, key);
  const cookieUser = await getCurrentUser();
  const userId = verifiedState?.userId ?? cookieUser?.id;

  if (!userId || !verifiedState) {
    accountsUrl.searchParams.set(
      "error",
      "Invalid or expired OAuth state. Please try connecting again."
    );
    return NextResponse.redirect(accountsUrl);
  }

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    return NextResponse.redirect(new URL("/login", localOrigin));
  }

  try {
    const adapter = getPlatformAdapter(platform);
    const connectedAccounts = await adapter.exchangeCodeForAccounts(code);
    const maxChannels = PLAN_SPECS[user.plan].maxChannels;
    let currentCount = await prisma.socialAccount.count({
      where: { userId: user.id },
    });

    let addedOrUpdatedCount = 0;

    for (const acc of connectedAccounts) {
      const existing = await prisma.socialAccount.findUnique({
        where: {
          userId_platform_externalAccountId: {
            userId: user.id,
            platform: acc.platform,
            externalAccountId: acc.externalAccountId,
          },
        },
        select: { id: true, metadata: true },
      });

      if (!existing && maxChannels !== null && currentCount >= maxChannels) {
        continue;
      }

      const accessTokenEncrypted = encryptToken(acc.accessToken);
      const refreshTokenEncrypted = acc.refreshToken
        ? encryptToken(acc.refreshToken)
        : undefined;

      const existingMeta =
        existing?.metadata && typeof existing.metadata === "object"
          ? (existing.metadata as Record<string, unknown>)
          : {};
      const mergedMeta = {
        ...existingMeta,
        ...(acc.metadata ?? {}),
      } as Prisma.InputJsonValue;

      await prisma.socialAccount.upsert({
        where: {
          userId_platform_externalAccountId: {
            userId: user.id,
            platform: acc.platform,
            externalAccountId: acc.externalAccountId,
          },
        },
        update: {
          displayName: acc.displayName,
          username: acc.username ?? null,
          avatarUrl: acc.avatarUrl ?? null,
          accessTokenEncrypted,
          ...(refreshTokenEncrypted !== undefined
            ? { refreshTokenEncrypted }
            : {}),
          tokenExpiresAt: acc.tokenExpiresAt ?? null,
          metadata: mergedMeta,
          isActive: true,
        },
        create: {
          userId: user.id,
          platform: acc.platform,
          externalAccountId: acc.externalAccountId,
          displayName: acc.displayName,
          username: acc.username ?? null,
          avatarUrl: acc.avatarUrl ?? null,
          accessTokenEncrypted,
          refreshTokenEncrypted: refreshTokenEncrypted ?? null,
          tokenExpiresAt: acc.tokenExpiresAt ?? null,
          metadata: mergedMeta,
          isActive: true,
        },
      });

      if (!existing) {
        currentCount++;
      }
      addedOrUpdatedCount++;
    }

    accountsUrl.searchParams.set(
      "connected",
      `${rawPlatform}:${addedOrUpdatedCount}`
    );
    return NextResponse.redirect(accountsUrl);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "OAuth connection failed";
    accountsUrl.searchParams.set("error", message);
    return NextResponse.redirect(accountsUrl);
  }
}
