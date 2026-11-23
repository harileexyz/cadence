import { PlanTier } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { getUserUsageSummary } from "@/lib/plans";
import { prisma } from "@/lib/prisma";
import { verifyRazorpayPaymentSignature } from "@/lib/razorpay";

const verifySchema = z.object({
  razorpay_payment_id: z.string().min(1),
  razorpay_order_id: z.string().optional(),
  razorpay_subscription_id: z.string().optional(),
  razorpay_signature: z.string().min(1),
});

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const parsed = verifySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid Razorpay payment verification payload." },
      { status: 400 }
    );
  }

  const {
    razorpay_payment_id,
    razorpay_order_id,
    razorpay_subscription_id,
    razorpay_signature,
  } = parsed.data;

  const isValid = verifyRazorpayPaymentSignature({
    orderId: razorpay_order_id,
    subscriptionId: razorpay_subscription_id,
    paymentId: razorpay_payment_id,
    signature: razorpay_signature,
  });

  if (!isValid) {
    return NextResponse.json(
      { error: "Invalid Razorpay payment signature." },
      { status: 400 }
    );
  }

  const updated = await prisma.user.update({
    where: { id: user.id },
    data: {
      plan: PlanTier.PRO,
      stripeCustomerId: razorpay_payment_id,
      stripeSubscriptionId: razorpay_subscription_id || razorpay_order_id || null,
    },
  });

  const usage = await getUserUsageSummary(prisma, updated.id, updated.plan);

  return NextResponse.json({
    verified: true,
    user: {
      id: updated.id,
      email: updated.email,
      name: updated.name,
      plan: updated.plan,
    },
    usage,
  });
}
