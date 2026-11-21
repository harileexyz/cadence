import { Platform } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import {
  replyToInstagramComment,
  replyToYouTubeComment,
} from "@/lib/platforms/engagement";
import { prisma } from "@/lib/prisma";
import { ensureFreshAccessToken } from "@/worker/scheduler";

const ReplySchema = z.object({
  accountId: z.string().min(1),
  commentId: z.string().min(1),
  text: z.string().trim().min(1, "Reply cannot be empty").max(1000),
});

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json().catch(() => null);
    const parsed = ReplySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Invalid reply payload" },
        { status: 400 }
      );
    }

    const { accountId, commentId, text } = parsed.data;

    const account = await prisma.socialAccount.findFirst({
      where: { id: accountId, userId: user.id, isActive: true },
    });

    if (!account) {
      return NextResponse.json(
        { error: "Connected channel not found or inactive." },
        { status: 404 }
      );
    }

    const accessToken = await ensureFreshAccessToken(account, prisma);

    const result =
      account.platform === Platform.YOUTUBE
        ? await replyToYouTubeComment(accessToken, commentId, text)
        : await replyToInstagramComment(account, accessToken, commentId, text);

    return NextResponse.json({
      ok: true,
      replyId: result.replyId,
      platform: account.platform,
      accountName: account.displayName,
      text,
      repliedAt: new Date().toISOString(),
    });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to send comment reply";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
