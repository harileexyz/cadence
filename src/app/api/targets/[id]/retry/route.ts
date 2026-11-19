import { PostStatus, TargetStatus } from "@prisma/client";
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;

  const target = await prisma.postTarget.findFirst({
    where: { id, post: { userId: user.id } },
    select: { id: true, postId: true, status: true },
  });

  if (!target) {
    return NextResponse.json({ error: "Post target not found" }, { status: 404 });
  }

  const [updatedTarget] = await prisma.$transaction([
    prisma.postTarget.update({
      where: { id: target.id },
      data: {
        status: TargetStatus.PENDING,
        errorMessage: null,
        retryCount: 0,
        nextRetryAt: new Date(),
      },
    }),
    prisma.post.update({
      where: { id: target.postId },
      data: { status: PostStatus.SCHEDULED },
    }),
  ]);

  return NextResponse.json({ target: updatedTarget });
}
