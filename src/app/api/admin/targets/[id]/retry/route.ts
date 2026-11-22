import { PostStatus, TargetStatus } from "@prisma/client";
import { NextResponse } from "next/server";
import { requireFounder } from "@/lib/admin";
import { prisma } from "@/lib/prisma";

export async function POST(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const founder = await requireFounder();
  if (!founder) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await context.params;
  const target = await prisma.postTarget.findUnique({ where: { id } });
  if (!target) {
    return NextResponse.json({ error: "Target not found" }, { status: 404 });
  }

  await prisma.$transaction([
    prisma.postTarget.update({
      where: { id },
      data: {
        status: TargetStatus.PENDING,
        errorMessage: null,
        retryCount: 0,
      },
    }),
    prisma.post.update({
      where: { id: target.postId },
      data: {
        status: PostStatus.SCHEDULED,
        scheduledAt: new Date(),
      },
    }),
  ]);

  return NextResponse.json({ ok: true });
}
