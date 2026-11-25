import { PlanTier } from "@prisma/client";
import { NextResponse } from "next/server";
import { verifyDodoWebhookSignature } from "@/lib/dodo";
import { prisma } from "@/lib/prisma";

interface DodoWebhookPayload {
  type?: string;
  data?: {
    payment_id?: string;
    subscription_id?: string;
    customer?: {
      customer_id?: string;
      email?: string;
    };
    metadata?: Record<string, string>;
  };
}

export async function POST(request: Request) {
  const webhookId = request.headers.get("webhook-id") || "";
  const webhookTimestamp = request.headers.get("webhook-timestamp") || "";
  const webhookSignature = request.headers.get("webhook-signature") || "";
  const rawBody = await request.text();

  if (
    !verifyDodoWebhookSignature({
      rawBody,
      webhookId,
      webhookTimestamp,
      webhookSignature,
    })
  ) {
    return NextResponse.json(
      { error: "Invalid Dodo webhook signature" },
      { status: 400 }
    );
  }

  let payload: DodoWebhookPayload;
  try {
    payload = JSON.parse(rawBody) as DodoWebhookPayload;
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
  }

  const eventType = payload.type || "";
  const data = payload.data ?? {};
  const userId = data.metadata?.userId?.trim() || null;
  const email = data.customer?.email?.toLowerCase().trim() || null;
  const customerId = data.customer?.customer_id || data.payment_id || null;
  const subscriptionId = data.subscription_id || null;

  const upgradeEvents = new Set([
    "payment.succeeded",
    "subscription.active",
    "subscription.renewed",
  ]);
  const downgradeEvents = new Set([
    "subscription.cancelled",
    "subscription.expired",
    "subscription.failed",
    "subscription.on_hold",
  ]);

  if (upgradeEvents.has(eventType)) {
    if (userId) {
      await prisma.user
        .update({
          where: { id: userId },
          data: {
            plan: PlanTier.PRO,
            ...(customerId ? { stripeCustomerId: customerId } : {}),
            ...(subscriptionId ? { stripeSubscriptionId: subscriptionId } : {}),
          },
        })
        .catch(() => {});
    } else if (email) {
      await prisma.user.updateMany({
        where: { email },
        data: {
          plan: PlanTier.PRO,
          ...(customerId ? { stripeCustomerId: customerId } : {}),
          ...(subscriptionId ? { stripeSubscriptionId: subscriptionId } : {}),
        },
      });
    } else if (subscriptionId) {
      await prisma.user.updateMany({
        where: { stripeSubscriptionId: subscriptionId },
        data: { plan: PlanTier.PRO },
      });
    }
  } else if (downgradeEvents.has(eventType)) {
    if (subscriptionId) {
      await prisma.user.updateMany({
        where: { stripeSubscriptionId: subscriptionId },
        data: { plan: PlanTier.FREE },
      });
    } else if (userId) {
      await prisma.user
        .update({
          where: { id: userId },
          data: { plan: PlanTier.FREE },
        })
        .catch(() => {});
    } else if (email) {
      await prisma.user.updateMany({
        where: { email },
        data: { plan: PlanTier.FREE },
      });
    }
  }

  return NextResponse.json({ received: true });
}
