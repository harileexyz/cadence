import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { getGoogleOAuthConfig } from "@/lib/env";

const GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";

function createSignedGoogleSignInState(isMobile: boolean): string {
  const secret = process.env.ENCRYPTION_KEY;
  if (!secret || secret.length < 32) {
    throw new Error("ENCRYPTION_KEY must be configured for OAuth state signing.");
  }
  const nonce = crypto.randomBytes(12).toString("hex");
  const ts = Date.now().toString(36);
  const mode = isMobile ? "g_mobile" : "g_login";
  const payload = `${mode}.${ts}.${nonce}`;
  const sig = crypto
    .createHmac("sha256", secret)
    .update(payload)
    .digest("hex")
    .slice(0, 32);
  return `${payload}.${sig}`;
}

export async function GET(request: Request) {
  const { clientId, isConfigured, redirectUri } = getGoogleOAuthConfig();
  const origin = new URL(redirectUri).origin || new URL(request.url).origin;
  const reqUrl = new URL(request.url);
  const isMobile = reqUrl.searchParams.get("mobile") === "1";

  if (!isConfigured) {
    const loginUrl = new URL("/login", origin);
    loginUrl.searchParams.set("error", "Google Sign-In is not configured.");
    return NextResponse.redirect(loginUrl);
  }

  const state = createSignedGoogleSignInState(isMobile);

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
