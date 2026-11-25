import crypto from "node:crypto";

export function getDodoConfig() {
  const apiKey = process.env.DODO_PAYMENTS_API_KEY?.trim() || "";
  const webhookSecret = process.env.DODO_PAYMENTS_WEBHOOK_SECRET?.trim() || "";
  const productId = process.env.DODO_PAYMENTS_PRODUCT_ID?.trim() || "";
  const envMode = (process.env.DODO_PAYMENTS_ENV?.trim() || "live_mode").toLowerCase();
  const baseUrl =
    envMode === "test" || envMode === "test_mode"
      ? "https://test.dodopayments.com"
      : "https://live.dodopayments.com";

  return {
    apiKey,
    webhookSecret,
    productId,
    baseUrl,
    isConfigured: Boolean(apiKey && productId),
  };
}

export async function createDodoCheckoutSession(params: {
  userId: string;
  email: string;
  name: string;
  returnUrl: string;
}): Promise<{ checkoutUrl: string; sessionId: string }> {
  const { apiKey, productId, baseUrl, isConfigured } = getDodoConfig();
  if (!isConfigured) {
    throw new Error(
      "Dodo Payments is not configured yet. Add DODO_PAYMENTS_API_KEY and DODO_PAYMENTS_PRODUCT_ID in Render Environment."
    );
  }

  const res = await fetch(`${baseUrl}/checkouts`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      product_cart: [{ product_id: productId, quantity: 1 }],
      customer: {
        email: params.email,
        name: params.name,
      },
      metadata: {
        userId: params.userId,
        email: params.email,
        plan: "PRO",
      },
      return_url: params.returnUrl,
    }),
  });

  const data = (await res.json().catch(() => ({}))) as {
    checkout_url?: string;
    session_id?: string;
    message?: string;
    error?: string;
  };

  if (!res.ok || !data.checkout_url) {
    throw new Error(
      data.message ||
        data.error ||
        `Dodo Payments checkout creation failed (${res.status})`
    );
  }

  return {
    checkoutUrl: data.checkout_url,
    sessionId: data.session_id || "",
  };
}

/**
 * Standard Webhooks HMAC-SHA256 verification (used by Dodo Payments).
 * Secret format: `whsec_<base64-key>` (or raw base64/utf8 fallback).
 * Signature header format: `v1,<base64-sig> [v1,<base64-sig2> ...]`
 */
export function verifyDodoWebhookSignature(params: {
  rawBody: string;
  webhookId: string;
  webhookTimestamp: string;
  webhookSignature: string;
  secretOverride?: string;
  nowSec?: number;
}): boolean {
  const secret = params.secretOverride ?? getDodoConfig().webhookSecret;
  if (
    !secret ||
    !params.webhookId ||
    !params.webhookTimestamp ||
    !params.webhookSignature
  ) {
    return false;
  }

  const tsNum = Number.parseInt(params.webhookTimestamp, 10);
  if (!Number.isFinite(tsNum)) return false;
  const nowSec = params.nowSec ?? Math.floor(Date.now() / 1000);
  if (Math.abs(nowSec - tsNum) > 300) {
    return false;
  }

  const secretBytes = secret.startsWith("whsec_")
    ? Buffer.from(secret.slice("whsec_".length), "base64")
    : Buffer.from(secret, "base64");

  const signedContent = `${params.webhookId}.${params.webhookTimestamp}.${params.rawBody}`;
  const expectedB64 = crypto
    .createHmac("sha256", secretBytes)
    .update(signedContent)
    .digest("base64");

  const candidates = params.webhookSignature.split(" ");
  for (const entry of candidates) {
    const [version, sig] = entry.split(",");
    if (version !== "v1" || !sig) continue;
    const expectedBuf = Buffer.from(expectedB64);
    const actualBuf = Buffer.from(sig);
    if (
      expectedBuf.length === actualBuf.length &&
      crypto.timingSafeEqual(expectedBuf, actualBuf)
    ) {
      return true;
    }
  }

  return false;
}
