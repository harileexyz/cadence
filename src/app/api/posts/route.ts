import { PostStatus, Prisma, TargetStatus } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { getUserUsageSummary } from "@/lib/plans";
import { getPlatformAdapter } from "@/lib/platforms";
import { prisma } from "@/lib/prisma";

const targetInputSchema = z.object({
  accountId: z.string().min(1),
  customTitle: z.string().nullable().optional(),
  customCaption: z.string().nullable().optional(),
  platformOptions: z.record(z.unknown()).optional(),
});

const createPostSchema = z.object({
  title: z.string().nullable().optional(),
  baseCaption: z.string().default(""),
  mediaAssetIds: z.array(z.string().min(1)).default([]),
  targets: z.array(targetInputSchema).min(1, "Select at least one target account."),
  mode: z.enum(["draft", "now", "schedule"]).default("schedule"),
  scheduledAt: z.string().datetime().nullable().optional(),
});

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const posts = await prisma.post.findMany({
    where: { userId: user.id },
    orderBy: [{ scheduledAt: "desc" }, { createdAt: "desc" }],
    include: {
      media: {
        include: { mediaAsset: true },
        orderBy: { orderIndex: "asc" },
      },
      targets: {
        include: {
          account: {
            select: {
              id: true,
              platform: true,
              displayName: true,
              username: true,
              avatarUrl: true,
            },
          },
        },
        orderBy: { id: "asc" },
      },
    },
  });

  return NextResponse.json({ posts });
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const usage = await getUserUsageSummary(prisma, user.id, user.plan);
  if (!usage.canCreateMorePosts) {
    return NextResponse.json(
      {
        error: `You've used all ${usage.plan.maxPostsPerMonth} monthly posts on the ${usage.plan.name} plan. Upgrade to Creator Pro for unlimited posts.`,
      },
      { status: 403 }
    );
  }

  const body = await request.json().catch(() => null);
  const parsed = createPostSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || "Invalid request payload" },
      { status: 400 }
    );
  }

  const data = parsed.data;
  if (data.mode === "schedule" && !data.scheduledAt) {
    return NextResponse.json(
      { error: "scheduledAt is required when mode is 'schedule'." },
      { status: 400 }
    );
  }

  const accountIds = data.targets.map((t) => t.accountId);
  const accounts = await prisma.socialAccount.findMany({
    where: { id: { in: accountIds }, userId: user.id, isActive: true },
  });
  const accountMap = new Map(accounts.map((a) => [a.id, a]));

  for (const target of data.targets) {
    if (!accountMap.has(target.accountId)) {
      return NextResponse.json(
        { error: `Connected account not found or inactive: ${target.accountId}` },
        { status: 400 }
      );
    }
  }

  const mediaAssets =
    data.mediaAssetIds.length > 0
      ? await prisma.mediaAsset.findMany({
          where: { id: { in: data.mediaAssetIds }, userId: user.id },
        })
      : [];
  const mediaById = new Map(mediaAssets.map((m) => [m.id, m]));
  const orderedMedia = data.mediaAssetIds
    .map((id) => mediaById.get(id))
    .filter((m): m is NonNullable<typeof m> => Boolean(m));

  if (orderedMedia.length !== data.mediaAssetIds.length) {
    return NextResponse.json(
      { error: "One or more media assets could not be found." },
      { status: 400 }
    );
  }

  const validationWarnings: string[] = [];
  if (data.mode !== "draft") {
    const validationErrors: string[] = [];
    for (const target of data.targets) {
      const account = accountMap.get(target.accountId)!;
      const adapter = getPlatformAdapter(account.platform);
      const res = adapter.validateTarget({
        post: {
          title: data.title ?? null,
          baseCaption: data.baseCaption,
        },
        target: {
          customTitle: target.customTitle ?? null,
          customCaption: target.customCaption ?? null,
          platformOptions: (target.platformOptions ?? {}) as Prisma.JsonValue,
        },
        media: orderedMedia,
      });

      if (!res.valid) {
        validationErrors.push(
          `${account.displayName} (${account.platform}): ${res.errors.join(" ")}`
        );
      }
      if (res.warnings.length > 0) {
        validationWarnings.push(
          `${account.displayName}: ${res.warnings.join(" ")}`
        );
      }
    }

    if (validationErrors.length > 0) {
      return NextResponse.json(
        { error: validationErrors.join(" | "), errors: validationErrors },
        { status: 422 }
      );
    }
  }

  const scheduledAt =
    data.mode === "now"
      ? new Date()
      : data.mode === "schedule" && data.scheduledAt
        ? new Date(data.scheduledAt)
        : null;

  const status =
    data.mode === "draft" ? PostStatus.DRAFT : PostStatus.SCHEDULED;

  const created = await prisma.post.create({
    data: {
      userId: user.id,
      title: data.title?.trim() || null,
      baseCaption: data.baseCaption,
      scheduledAt,
      status,
      media: {
        create: orderedMedia.map((asset, idx) => ({
          mediaAssetId: asset.id,
          orderIndex: idx,
        })),
      },
      targets: {
        create: data.targets.map((t) => ({
          accountId: t.accountId,
          customTitle: t.customTitle?.trim() || null,
          customCaption: t.customCaption?.trim() || null,
          platformOptions: (t.platformOptions ?? {}) as Prisma.InputJsonValue,
          status: TargetStatus.PENDING,
        })),
      },
    },
    include: {
      media: { include: { mediaAsset: true }, orderBy: { orderIndex: "asc" } },
      targets: {
        include: {
          account: {
            select: {
              id: true,
              platform: true,
              displayName: true,
              username: true,
            },
          },
        },
      },
    },
  });

  return NextResponse.json(
    { post: created, warnings: validationWarnings },
    { status: 201 }
  );
}
