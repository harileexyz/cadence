import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getUserUsageSummary } from "@/lib/plans";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ user: null, usage: null });
  }

  const usage = await getUserUsageSummary(prisma, user.id, user.plan);

  return NextResponse.json({
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      plan: user.plan,
      createdAt: user.createdAt,
    },
    usage,
  });
}
