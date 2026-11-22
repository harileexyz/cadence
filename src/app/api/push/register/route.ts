import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const registerPushSchema = z.object({
  token: z.string().min(10).max(512),
  platform: z.enum(["android", "ios", "web"]).default("android"),
});

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const parsed = registerPushSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid device token" }, { status: 400 });
  }

  await prisma.deviceToken.upsert({
    where: { token: parsed.data.token },
    update: {
      userId: user.id,
      platform: parsed.data.platform,
    },
    create: {
      userId: user.id,
      token: parsed.data.token,
      platform: parsed.data.platform,
    },
  });

  return NextResponse.json({ registered: true });
}
