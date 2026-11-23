import { PlanTier } from "@prisma/client";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyRazorpayWebhookSignature } from "@/lib/razorpay";

interface RazorpayWebhookPayload {
  event?: string;
  payload?: {
    payment?: {
      entity?: {
        id?: string;
        notes?: Record<string, string>;
      };
    };
    order?: {
      entity?: {
        id?: string;
        notes?: Record<string, string>;
      };
    };
    subscription?: {
      entity?: {
        id?: string;
        notes?: Record<string, string>;
      };
    };
  };
}

export async function POST(request: Request) {
  const signature = request.headers.get("x-razorpay-signature") || "";
  const rawBody = await request.text();

  if (!verifyRazorpayWebhookSignature({ rawBody, signature })) {
    return NextResponse.json({ error: "Invalid webhook signature" }, { status: 400 });
  }

  let data: RazorpayWebhookPayload;
  try {
    data = JSON.parse(rawBody) as RazorpayWebhookPayload;
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
  }

  const event = data.event || "";
  const subEntity = data.payload?.subscription?.entity;
  const orderEntity = data.payload?.order?.entity;
  const paymentEntity = data.payload?.payment?.entity;

  const userId =
    subEntity?.notes?.userId ||
    orderEntity?.notes?.userId ||
    paymentEntity?.notes?.userId ||
    null;

  const subscriptionId = subEntity?.id || null;

  const upgradeEvents = new Set([
    "payment.captured",
    "order.paid",
    "subscription.activated",
    "subscription.charged",
  ]);
  const downgradeEvents = new Set([
    "subscription.cancelled",
    "subscription.halted",
    "subscription.completed",
    "subscription.paused",
  ]);

  if (upgradeEvents.has(event)) {
    if (userId) {
      await prisma.user
        .update({
          where: { id: userId },
          data: {
            plan: PlanTier.PRO,
            ...(paymentEntity?.id ? { stripeCustomerId: paymentEntity.id } : {}),
            ...(subscriptionId || orderEntity?.id
              ? { stripeSubscriptionId: subscriptionId || orderEntity?.id }
              : {}),
          },
        })
        .catch(() => {});
    } else if (subscriptionId) {
      await prisma.user.updateMany({
        where: { stripeSubscriptionId: subscriptionId },
        data: { plan: PlanTier.PRO },
      });
    }
  } else if (downgradeEvents.has(event)) {
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
    }
  }

  return NextResponse.json({ received: true });
}
