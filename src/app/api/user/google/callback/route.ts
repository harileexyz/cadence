import crypto from "node:crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { evaluateRegistrationAccess } from "@/lib/admin";
import { createSession, hashPassword } from "@/lib/auth";
import { getGoogleOAuthConfig } from "@/lib/env";
import { prisma } from "@/lib/prisma";

const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_USERINFO_URL = "https://www.googleapis.com/oauth2/v3/userinfo";
const MAX_STATE_AGE_MS = 15 * 60 * 1000;

function verifySignedGoogleSignInState(state: string): boolean {
  const parts = state.split(".");
  if (parts.length !== 4) return false;
  const [prefix, tsBase36, nonce, sig] = parts;
  if (prefix !== "g_login") return false;

  const ts = Number.parseInt(tsBase36, 36);
  if (!Number.isFinite(ts) || Date.now() - ts > MAX_STATE_AGE_MS) {
    return false;
  }

  const secret = process.env.ENCRYPTION_KEY;
  if (!secret || secret.length < 32) return false;
  const payload = `${prefix}.${tsBase36}.${nonce}`;
  const expectedSig = crypto
    .createHmac("sha256", secret)
    .update(payload)
    .digest("hex")
    .slice(0, 32);

  if (sig.length !== expectedSig.length) return false;
  return crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expectedSig));
}

export async function GET(request: Request) {
  const { clientId, clientSecret, redirectUri } = getGoogleOAuthConfig();
  const origin = new URL(redirectUri).origin || new URL(request.url).origin;
  const loginUrl = new URL("/login", origin);

  const url = new URL(request.url);
  const errorParam = url.searchParams.get("error");
  if (errorParam) {
    loginUrl.searchParams.set(
      "error",
      url.searchParams.get("error_description") || errorParam
    );
    return NextResponse.redirect(loginUrl);
  }

  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const cookieStore = await cookies();
  const expectedState = cookieStore.get("google_signin_state")?.value;
  cookieStore.delete("google_signin_state");

  const isStateValid =
    Boolean(state) &&
    (verifySignedGoogleSignInState(state!) ||
      (Boolean(expectedState) && state === expectedState));

  if (!code || !isStateValid) {
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
