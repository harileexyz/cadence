import { PlanTier } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";
import { isFounderEmail } from "@/lib/admin";
import { getCurrentUser } from "@/lib/auth";
import { getUserUsageSummary } from "@/lib/plans";
import { prisma } from "@/lib/prisma";

const planSchema = z.object({
  plan: z.enum(["FREE", "PRO"]),
});

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const parsed = planSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid plan tier" }, { status: 400 });
  }

  // Prevent uninvited public users from self-upgrading to PRO without a Beta Invite or Founder grant
  if (
    parsed.data.plan === "PRO" &&
    user.plan !== "PRO" &&
    !user.isBetaTester &&
    !isFounderEmail(user.email)
  ) {
    return NextResponse.json(
      {
        error:
          "Creator Pro upgrades during beta require a Beta Tester invite or Founder approval.",
      },
      { status: 403 }
    );
  }

  const updated = await prisma.user.update({
    where: { id: user.id },
    data: { plan: parsed.data.plan as PlanTier },
  });

  const usage = await getUserUsageSummary(prisma, updated.id, updated.plan);

  return NextResponse.json({
    user: {
      id: updated.id,
      email: updated.email,
      name: updated.name,
      plan: updated.plan,
    },
    usage,
  });
}
