import crypto from "node:crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getGoogleOAuthConfig } from "@/lib/env";

const GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";

export async function GET(request: Request) {
  const { clientId, isConfigured, redirectUri } = getGoogleOAuthConfig();
  const origin = new URL(redirectUri).origin || new URL(request.url).origin;

  if (!isConfigured) {
    const loginUrl = new URL("/login", origin);
    loginUrl.searchParams.set("error", "Google Sign-In is not configured.");
    return NextResponse.redirect(loginUrl);
  }

  const state = crypto.randomBytes(20).toString("hex");
  const cookieStore = await cookies();
  cookieStore.set("google_signin_state", state, {
    httpOnly: true,
    sameSite: "lax",
    maxAge: 600,
    path: "/",
  });

  const googleUserRedirectUri = `${origin}/api/user/google/callback`;
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: googleUserRedirectUri,
    response_type: "code",
    scope: "openid email profile",
    prompt: "select_account",
    state,
  });

  return NextResponse.redirect(`${GOOGLE_AUTH_URL}?${params.toString()}`);
}
