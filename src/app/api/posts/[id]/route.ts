import { PostStatus } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const patchPostSchema = z.object({
  title: z.string().nullable().optional(),
  baseCaption: z.string().optional(),
  scheduledAt: z.string().datetime().nullable().optional(),
  status: z.enum(["DRAFT", "SCHEDULED"]).optional(),
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
  const parsed = patchPostSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request payload" }, { status: 400 });
  }

  const existing = await prisma.post.findFirst({
    where: { id, userId: user.id },
  });
  if (!existing) {
    return NextResponse.json({ error: "Post not found" }, { status: 404 });
  }

  const updated = await prisma.post.update({
    where: { id: existing.id },
    data: {
      ...(parsed.data.title !== undefined ? { title: parsed.data.title } : {}),
      ...(parsed.data.baseCaption !== undefined
        ? { baseCaption: parsed.data.baseCaption }
        : {}),
      ...(parsed.data.scheduledAt !== undefined
        ? {
            scheduledAt: parsed.data.scheduledAt
              ? new Date(parsed.data.scheduledAt)
              : null,
          }
        : {}),
      ...(parsed.data.status !== undefined
        ? { status: parsed.data.status as PostStatus }
        : {}),
    },
  });

  return NextResponse.json({ post: updated });
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
  await prisma.post.deleteMany({ where: { id, userId: user.id } });
  return NextResponse.json({ deleted: true });
}
