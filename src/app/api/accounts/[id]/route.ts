import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const patchSchema = z.object({
  isActive: z.boolean().optional(),
  defaults: z.record(z.unknown()).optional(),
});

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  const body = await request.json().catch(() => null);
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const existing = await prisma.socialAccount.findFirst({
    where: { id, userId: user.id },
    select: { id: true, metadata: true },
  });
  if (!existing) {
    return NextResponse.json({ error: "Account not found" }, { status: 404 });
  }

  const currentMeta =
    existing.metadata && typeof existing.metadata === "object"
      ? (existing.metadata as Record<string, unknown>)
      : {};

  const nextMeta =
    parsed.data.defaults !== undefined
      ? ({
          ...currentMeta,
          defaults: parsed.data.defaults,
        } as Prisma.InputJsonValue)
      : undefined;

  const updated = await prisma.socialAccount.update({
    where: { id: existing.id },
    data: {
      ...(parsed.data.isActive !== undefined
        ? { isActive: parsed.data.isActive }
        : {}),
      ...(nextMeta !== undefined ? { metadata: nextMeta } : {}),
    },
    select: {
      id: true,
      isActive: true,
      metadata: true,
    },
  });

  return NextResponse.json({ account: updated });
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  await prisma.socialAccount.deleteMany({
    where: { id, userId: user.id },
  });
  return NextResponse.json({ deleted: true });
}
