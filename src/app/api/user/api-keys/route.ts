import { NextResponse } from "next/server";
import { z } from "zod";
import { generateApiKey } from "@/lib/apiKeys";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const CreateKeySchema = z.object({
  name: z.string().trim().min(1, "Key name is required").max(60),
});

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const keys = await prisma.apiKey.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      keyPrefix: true,
      lastUsedAt: true,
      createdAt: true,
    },
  });

  return NextResponse.json({ keys });
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const parsed = CreateKeySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || "Invalid key name" },
      { status: 400 }
    );
  }

  const existingCount = await prisma.apiKey.count({
    where: { userId: user.id },
  });
  if (existingCount >= 10) {
    return NextResponse.json(
      { error: "Maximum of 10 active API keys reached. Revoke an unused key first." },
      { status: 400 }
    );
  }

  const { rawKey, keyPrefix, keyHash } = generateApiKey();

  const created = await prisma.apiKey.create({
    data: {
      userId: user.id,
      name: parsed.data.name,
      keyPrefix,
      keyHash,
    },
    select: {
      id: true,
      name: true,
      keyPrefix: true,
      lastUsedAt: true,
      createdAt: true,
    },
  });

  return NextResponse.json({ key: created, rawKey }, { status: 201 });
}
