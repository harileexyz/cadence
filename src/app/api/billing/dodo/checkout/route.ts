import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { createDodoCheckoutSession, getDodoConfig } from "@/lib/dodo";
import { getAppUrl } from "@/lib/env";

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

    const config = getDodoConfig();
    if (!config.isConfigured) {
      return NextResponse.json(
        {
          error:
            "Dodo Payments is not configured yet. Add DODO_PAYMENTS_API_KEY and DODO_PAYMENTS_PRODUCT_ID in Render Environment.",
        },
        { status: 503 }
      );
    }

    const appUrl = getAppUrl() || "https://cadences.in";
    const session = await createDodoCheckoutSession({
      userId: user.id,
      email: user.email,
      name: user.name,
      returnUrl: `${appUrl}/pricing?checkout=success`,
    });

    return NextResponse.json({
      checkoutUrl: session.checkoutUrl,
      sessionId: session.sessionId,
    });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to initialize Dodo checkout";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
