import crypto from "node:crypto";

const RAZORPAY_API_BASE = "https://api.razorpay.com/v1";

export function getRazorpayConfig() {
  const keyId = process.env.RAZORPAY_KEY_ID?.trim() || "";
  const keySecret = process.env.RAZORPAY_KEY_SECRET?.trim() || "";
  const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET?.trim() || "";
  const planId = process.env.RAZORPAY_PLAN_ID?.trim() || "";
  const currency = (process.env.RAZORPAY_CURRENCY?.trim() || "INR").toUpperCase();
  const amountSubunits = Number.parseInt(
    process.env.RAZORPAY_PRO_AMOUNT_SUBUNITS?.trim() ||
      (currency === "INR" ? "74900" : "900"),
    10
  );

  return {
    keyId,
    keySecret,
    webhookSecret,
    planId,
    currency,
    amountSubunits: Number.isFinite(amountSubunits) && amountSubunits > 0
      ? amountSubunits
      : 74900,
    isConfigured: Boolean(keyId && keySecret),
  };
}

function getBasicAuthHeader(keyId: string, keySecret: string): string {
  return `Basic ${Buffer.from(`${keyId}:${keySecret}`).toString("base64")}`;
}

export async function createRazorpayOrder(params: {
  amountSubunits: number;
  currency: string;
  receipt: string;
  notes: Record<string, string>;
}): Promise<{ id: string; amount: number; currency: string }> {
  const { keyId, keySecret, isConfigured } = getRazorpayConfig();
  if (!isConfigured) {
    throw new Error("Razorpay is not configured (missing RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET).");
  }

  const res = await fetch(`${RAZORPAY_API_BASE}/orders`, {
    method: "POST",
    headers: {
      Authorization: getBasicAuthHeader(keyId, keySecret),
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      amount: params.amountSubunits,
      currency: params.currency,
      receipt: params.receipt.slice(0, 40),
      notes: params.notes,
    }),
  });

  const data = (await res.json()) as {
    id?: string;
    amount?: number;
    currency?: string;
    error?: { description?: string };
  };
  if (!res.ok || !data.id) {
    throw new Error(
      data.error?.description || `Razorpay order creation failed (${res.status})`
    );
  }

  return {
    id: data.id,
    amount: data.amount ?? params.amountSubunits,
    currency: data.currency ?? params.currency,
  };
}

export async function createRazorpaySubscription(params: {
  planId: string;
  notes: Record<string, string>;
}): Promise<{ id: string }> {
  const { keyId, keySecret, isConfigured } = getRazorpayConfig();
  if (!isConfigured) {
    throw new Error("Razorpay is not configured (missing RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET).");
  }

  const res = await fetch(`${RAZORPAY_API_BASE}/subscriptions`, {
    method: "POST",
    headers: {
      Authorization: getBasicAuthHeader(keyId, keySecret),
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      plan_id: params.planId,
      total_count: 120,
      quantity: 1,
      customer_notify: 1,
      notes: params.notes,
    }),
  });

  const data = (await res.json()) as {
    id?: string;
    error?: { description?: string };
  };
  if (!res.ok || !data.id) {
    throw new Error(
      data.error?.description ||
        `Razorpay subscription creation failed (${res.status})`
    );
  }

  return { id: data.id };
}

function timingSafeHexEqual(a: string, b: string): boolean {
  if (!a || !b || a.length !== b.length) return false;
  return crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
}

export function verifyRazorpayPaymentSignature(params: {
  orderId?: string | null;
  subscriptionId?: string | null;
  paymentId: string;
  signature: string;
  keySecretOverride?: string;
}): boolean {
  const secret = params.keySecretOverride ?? getRazorpayConfig().keySecret;
  if (!secret || !params.paymentId || !params.signature) {
    return false;
  }

  const payload = params.subscriptionId
    ? `${params.paymentId}|${params.subscriptionId}`
    : params.orderId
      ? `${params.orderId}|${params.paymentId}`
      : null;

  if (!payload) return false;

  const expected = crypto
    .createHmac("sha256", secret)
    .update(payload)
    .digest("hex");

  return timingSafeHexEqual(expected, params.signature);
}

export function verifyRazorpayWebhookSignature(params: {
  rawBody: string;
  signature: string;
  webhookSecretOverride?: string;
}): boolean {
  const secret =
    params.webhookSecretOverride ?? getRazorpayConfig().webhookSecret;
  if (!secret || !params.signature) {
    return false;
  }

  const expected = crypto
    .createHmac("sha256", secret)
    .update(params.rawBody)
    .digest("hex");

  return timingSafeHexEqual(expected, params.signature);
}
