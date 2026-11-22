import crypto from "node:crypto";
import { Platform } from "@prisma/client";
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getAppUrl, getGoogleOAuthConfig } from "@/lib/env";
import { getUserUsageSummary } from "@/lib/plans";
import { getPlatformAdapter } from "@/lib/platforms";
import { prisma } from "@/lib/prisma";

const PLATFORM_MAP: Record<string, Platform> = {
  youtube: Platform.YOUTUBE,
  instagram: Platform.INSTAGRAM,
};

function createSignedOAuthState(
  userId: string,
  platform: string,
  isMobile: boolean
): string {
  const secret = process.env.ENCRYPTION_KEY;
  if (!secret || secret.length < 32) {
    throw new Error("ENCRYPTION_KEY must be configured for OAuth state signing.");
  }
  const nonce = crypto.randomBytes(12).toString("hex");
  const ts = Date.now().toString(36);
  const mode = isMobile ? "m" : "w";
  const payload = `${userId}.${platform}.${ts}.${mode}_${nonce}`;
  const sig = crypto
    .createHmac("sha256", secret)
    .update(payload)
    .digest("hex")
    .slice(0, 32);
  return `${payload}.${sig}`;
}

export async function GET(
  request: Request,
  context: { params: Promise<{ platform: string }> }
) {
  const { platform: rawPlatform } = await context.params;
  const key = rawPlatform.toLowerCase();
  const platform = PLATFORM_MAP[key];
  if (!platform) {
    return NextResponse.json({ error: "Unsupported platform" }, { status: 404 });
  }

  const reqOrigin = new URL(request.url).origin;
  const fallbackOrigin =
    platform === Platform.YOUTUBE
      ? new URL(getGoogleOAuthConfig().redirectUri).origin
      : reqOrigin || getAppUrl();

  let user = await getCurrentUser();
  if (!user) {
    const mobileSession = new URL(request.url).searchParams.get("session")?.trim();
    if (mobileSession) {
      const foundSession = await prisma.session.findUnique({
        where: { token: mobileSession },
        include: { user: true },
      });
      if (
        foundSession &&
        foundSession.expiresAt.getTime() > Date.now() &&
        !foundSession.user.isSuspended
      ) {
        user = foundSession.user;
      }
    }
  }
  if (!user) {
    return NextResponse.redirect(new URL("/login", fallbackOrigin));
  }

  const usage = await getUserUsageSummary(prisma, user.id, user.plan);
  if (!usage.canConnectMoreChannels) {
    const redirectUrl = new URL("/accounts", fallbackOrigin);
    redirectUrl.searchParams.set(
      "error",
      `You've reached your ${usage.plan.name} limit of ${usage.plan.maxChannels} channels. Upgrade to Creator Pro for unlimited channels.`
    );
    return NextResponse.redirect(redirectUrl);
  }

  try {
    const isMobile = new URL(request.url).searchParams.get("mobile") === "1";
    const state = createSignedOAuthState(user.id, key, isMobile);
    const adapter = getPlatformAdapter(platform);
    const authUrl = adapter.getAuthUrl(state);

    return NextResponse.redirect(authUrl);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to initialize OAuth";
    const redirectUrl = new URL("/accounts", fallbackOrigin);
    redirectUrl.searchParams.set("error", message);
    return NextResponse.redirect(redirectUrl);
  }
}
