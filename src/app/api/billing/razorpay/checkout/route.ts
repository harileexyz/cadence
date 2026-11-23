import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import {
  createRazorpayOrder,
  createRazorpaySubscription,
  getRazorpayConfig,
} from "@/lib/razorpay";

export async function POST() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (user.plan === "PRO") {
      return NextResponse.json(
        { error: "You are already on the Creator Pro plan." },
        { status: 400 }
      );
    }

    const config = getRazorpayConfig();
    if (!config.isConfigured) {
      return NextResponse.json(
        {
          error:
            "Razorpay billing is not configured yet. Add RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in Render Environment.",
        },
        { status: 503 }
      );
    }

    const notes = {
      userId: user.id,
      email: user.email,
      plan: "PRO",
    };

    if (config.planId) {
      const sub = await createRazorpaySubscription({
        planId: config.planId,
        notes,
      });
      return NextResponse.json({
        mode: "subscription",
        keyId: config.keyId,
        subscriptionId: sub.id,
        name: "Cadence",
        description: "Creator Pro — Unlimited Channels & Posts",
        prefill: {
          name: user.name,
          email: user.email,
        },
      });
    }

    const order = await createRazorpayOrder({
      amountSubunits: config.amountSubunits,
      currency: config.currency,
      receipt: `cad_${user.id.slice(0, 12)}_${Date.now()}`,
      notes,
    });

    return NextResponse.json({
      mode: "order",
      keyId: config.keyId,
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      name: "Cadence",
      description: "Creator Pro — Unlimited Channels & Posts",
      prefill: {
        name: user.name,
        email: user.email,
      },
    });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to initialize Razorpay checkout";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
