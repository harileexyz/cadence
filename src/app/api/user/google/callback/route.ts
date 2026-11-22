import crypto from "node:crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { evaluateRegistrationAccess } from "@/lib/admin";
import { createSession, hashPassword } from "@/lib/auth";
import { getGoogleOAuthConfig } from "@/lib/env";
import { prisma } from "@/lib/prisma";

const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_USERINFO_URL = "https://www.googleapis.com/oauth2/v3/userinfo";

export async function GET(request: Request) {
  const { clientId, clientSecret, redirectUri } = getGoogleOAuthConfig();
  const origin = new URL(redirectUri).origin || new URL(request.url).origin;
  const loginUrl = new URL("/login", origin);

  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const cookieStore = await cookies();
  const expectedState = cookieStore.get("google_signin_state")?.value;
  cookieStore.delete("google_signin_state");

  if (!code || !state || !expectedState || state !== expectedState) {
    loginUrl.searchParams.set("error", "Google Sign-In session expired. Please try again.");
    return NextResponse.redirect(loginUrl);
  }

  try {
    const googleUserRedirectUri = `${origin}/api/user/google/callback`;
    const body = new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: googleUserRedirectUri,
      grant_type: "authorization_code",
    });

    const tokenRes = await fetch(GOOGLE_TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: body.toString(),
    });
    const tokenData = (await tokenRes.json()) as { access_token?: string };
    if (!tokenRes.ok || !tokenData.access_token) {
      throw new Error("Failed to exchange Google Sign-In code.");
    }

    const profileRes = await fetch(GOOGLE_USERINFO_URL, {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });
    const profile = (await profileRes.json()) as {
      email?: string;
      name?: string;
    };

    if (!profileRes.ok || !profile.email) {
      throw new Error("Could not retrieve email from Google account.");
    }

    const email = profile.email.toLowerCase().trim();
    let user = await prisma.user.findUnique({ where: { email } });

    if (user) {
      if (user.isSuspended) {
        throw new Error(
          "This account has been suspended. Contact the founder for assistance."
        );
      }
    } else {
      const access = await evaluateRegistrationAccess({ email });
      if (!access.allowed) {
        throw new Error(
          access.reason || "Cadence is currently in Private Beta."
        );
      }

      user = await prisma.user.create({
        data: {
          email,
          name: profile.name || email.split("@")[0],
          passwordHash: hashPassword(crypto.randomBytes(24).toString("hex")),
          plan: access.matchedInvite ? access.matchedInvite.grantPlan : "FREE",
          isBetaTester: Boolean(access.matchedInvite),
        },
      });

      if (access.matchedInvite) {
        await prisma.betaInvite.update({
          where: { id: access.matchedInvite.id },
          data: { usedAt: new Date(), usedByEmail: email },
        });
      }
    }

    await createSession(user.id);
    return NextResponse.redirect(new URL("/", origin));
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Google Sign-In failed.";
    loginUrl.searchParams.set("error", message);
    return NextResponse.redirect(loginUrl);
  }
}
