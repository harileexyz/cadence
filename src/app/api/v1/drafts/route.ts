import crypto from "node:crypto";
import path from "node:path";
import { Platform, PostStatus, Prisma, TargetStatus } from "@prisma/client";
import { NextResponse } from "next/server";
import { authenticateApiRequest } from "@/lib/apiKeys";
import { getAppUrl } from "@/lib/env";
import { probeMediaBuffer } from "@/lib/media/probe";
import { getUserUsageSummary, PLAN_SPECS } from "@/lib/plans";
import type { AccountDefaults } from "@/lib/platforms/types";
import { prisma } from "@/lib/prisma";
import { getStorageProvider } from "@/lib/storage";

function safeParseJson(raw: FormDataEntryValue | null): Record<string, unknown> {
  if (typeof raw !== "string" || !raw.trim()) return {};
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object"
      ? (parsed as Record<string, unknown>)
      : {};
  } catch {
    return {};
  }
}

export async function POST(request: Request) {
  try {
    const user = await authenticateApiRequest(request);
    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized. Provide Authorization: Bearer cad_live_..." },
        { status: 401 }
      );
    }

    const usage = await getUserUsageSummary(prisma, user.id, user.plan);
    if (!usage.canCreateMorePosts) {
      return NextResponse.json(
        {
          error: `Monthly post limit (${usage.plan.maxPostsPerMonth}) reached on your ${usage.plan.name} plan.`,
        },
        { status: 403 }
      );
    }

    const planSpec = PLAN_SPECS[user.plan];
    const maxFileSizeBytes = planSpec.maxFileSizeMb * 1024 * 1024;

    const formData = await request.formData();
    const file = formData.get("file");
    const thumbnailFile = formData.get("thumbnail");

    const title = String(formData.get("title") || "").trim() || null;
    const caption = String(formData.get("caption") || "").trim();
    const channelsRaw = String(formData.get("channels") || "all").trim();
    const requestedStatus = String(formData.get("status") || "DRAFT")
      .trim()
      .toUpperCase();
    const scheduledAtRaw = String(formData.get("scheduledAt") || "").trim();

    const youtubeOpts = safeParseJson(formData.get("youtube"));
    const instagramOpts = safeParseJson(formData.get("instagram"));

    if (!(file instanceof File) || file.size === 0) {
      return NextResponse.json(
        { error: "Missing required 'file' field (MP4, MOV, JPG, or PNG)." },
        { status: 400 }
      );
    }

    if (file.size > maxFileSizeBytes) {
      return NextResponse.json(
        {
          error: `File exceeds your ${planSpec.name} limit of ${planSpec.maxFileSizeMb} MB.`,
        },
        { status: 400 }
      );
    }

    const ALLOWED_MIME_TYPES = new Set([
      "video/mp4",
      "video/quicktime",
      "video/webm",
      "video/x-m4v",
      "image/jpeg",
      "image/jpg",
      "image/png",
      "image/webp",
    ]);
    if (!ALLOWED_MIME_TYPES.has(file.type.toLowerCase())) {
      return NextResponse.json(
        {
          error: `Unsupported file type (${file.type || "unknown"}). Upload MP4, MOV, WebM, JPG, PNG, or WebP.`,
        },
        { status: 400 }
      );
    }

    // Resolve target channels (supports "all", channel IDs, @usernames, or displayNames)
    const activeAccounts = await prisma.socialAccount.findMany({
      where: { userId: user.id, isActive: true },
    });

    if (activeAccounts.length === 0) {
      return NextResponse.json(
        { error: "No active connected channels found on your Cadence account." },
        { status: 400 }
      );
    }

    let matchedAccounts = activeAccounts;
    if (channelsRaw.toLowerCase() !== "all") {
      const tokens = channelsRaw
        .split(",")
        .map((t) => t.trim().toLowerCase())
        .filter(Boolean);

      matchedAccounts = activeAccounts.filter((acc) => {
        const idMatch = tokens.includes(acc.id.toLowerCase());
        const userNorm = (acc.username || "").toLowerCase();
        const userNoAt = userNorm.replace(/^@/, "");
        const nameNorm = acc.displayName.toLowerCase();
        return (
          idMatch ||
          (userNorm && tokens.includes(userNorm)) ||
          (userNoAt && tokens.includes(userNoAt)) ||
          tokens.includes(nameNorm)
        );
      });

      if (matchedAccounts.length === 0) {
        return NextResponse.json(
          {
            error: `No active channels matched '${channelsRaw}'. Call GET /api/v1/channels to list valid IDs/handles.`,
          },
          { status: 400 }
        );
      }
    }

    // Upload main media asset
    const mainBuffer = Buffer.from(await file.arrayBuffer());
    const mainExt = path.extname(file.name).replace(/^\./, "") || "mp4";
    const mainKey = `${user.id}/${Date.now()}-${crypto.randomUUID()}.${mainExt}`;

    const [mainMeta, mainStored] = await Promise.all([
      probeMediaBuffer(mainBuffer, mainExt),
      getStorageProvider().upload({
        key: mainKey,
        buffer: mainBuffer,
        contentType: file.type,
      }),
    ]);

    const mainAsset = await prisma.mediaAsset.create({
      data: {
        userId: user.id,
        filename: file.name,
        mimeType: file.type,
        sizeBytes: file.size,
        width: mainMeta.width,
        height: mainMeta.height,
        durationSec: mainMeta.durationSec,
        storageKey: mainStored.key,
        publicUrl: mainStored.publicUrl,
      },
    });

    // Optional custom thumbnail upload
    let thumbnailAssetId: string | undefined;
    if (
      thumbnailFile instanceof File &&
      thumbnailFile.size > 0 &&
      thumbnailFile.type.startsWith("image/")
    ) {
      const thumbBuf = Buffer.from(await thumbnailFile.arrayBuffer());
      const thumbExt =
        path.extname(thumbnailFile.name).replace(/^\./, "") || "jpg";
      const thumbKey = `${user.id}/${Date.now()}-${crypto.randomUUID()}.${thumbExt}`;
      const [thumbMeta, thumbStored] = await Promise.all([
        probeMediaBuffer(thumbBuf, thumbExt),
        getStorageProvider().upload({
          key: thumbKey,
          buffer: thumbBuf,
          contentType: thumbnailFile.type,
        }),
      ]);
      const thumbAsset = await prisma.mediaAsset.create({
        data: {
          userId: user.id,
          filename: thumbnailFile.name,
          mimeType: thumbnailFile.type,
          sizeBytes: thumbnailFile.size,
          width: thumbMeta.width,
          height: thumbMeta.height,
          durationSec: null,
          storageKey: thumbStored.key,
          publicUrl: thumbStored.publicUrl,
        },
      });
      thumbnailAssetId = thumbAsset.id;
    }

    const postStatus: PostStatus =
      requestedStatus === "SCHEDULED" ? PostStatus.SCHEDULED : PostStatus.DRAFT;
    const scheduledAt =
      postStatus === "SCHEDULED"
        ? scheduledAtRaw
          ? new Date(scheduledAtRaw)
          : new Date()
        : null;

    if (scheduledAt && Number.isNaN(scheduledAt.getTime())) {
      return NextResponse.json(
        { error: "Invalid scheduledAt ISO timestamp." },
        { status: 400 }
      );
    }

    // Create post + targets with per-channel saved defaults merged
    const post = await prisma.post.create({
      data: {
        userId: user.id,
        title,
        baseCaption: caption,
        status: postStatus,
        scheduledAt,
        media: {
          create: [{ mediaAssetId: mainAsset.id, orderIndex: 0 }],
        },
        targets: {
          create: matchedAccounts.map((acc) => {
            const savedDefaults = (
              acc.metadata as { defaults?: AccountDefaults } | null
            )?.defaults;

            if (acc.platform === Platform.YOUTUBE) {
              const mergedYt: Record<string, unknown> = {
                privacyStatus: savedDefaults?.privacyStatus || "private",
                categoryId: savedDefaults?.categoryId || "24",
                tags: savedDefaults?.tags || [],
                defaultLanguage: savedDefaults?.defaultLanguage || "en",
                license: savedDefaults?.license || "youtube",
                playlistId: savedDefaults?.playlistId || undefined,
                madeForKids: savedDefaults?.madeForKids ?? false,
                containsSyntheticMedia:
                  savedDefaults?.containsSyntheticMedia ?? false,
                notifySubscribers: savedDefaults?.notifySubscribers ?? true,
                embeddable: savedDefaults?.embeddable ?? true,
                isShort: true,
                ...(thumbnailAssetId ? { thumbnailAssetId } : {}),
                ...youtubeOpts,
              };
              return {
                account: { connect: { id: acc.id } },
                status: TargetStatus.PENDING,
                customTitle:
                  typeof youtubeOpts.customTitle === "string"
                    ? youtubeOpts.customTitle
                    : title,
                customCaption:
                  typeof youtubeOpts.customCaption === "string"
                    ? youtubeOpts.customCaption
                    : caption,
                platformOptions: mergedYt as Prisma.InputJsonValue,
              };
            }

            const mergedIg: Record<string, unknown> = {
              mediaType: "AUTO",
              shareToFeed: true,
              thumbOffsetMs: 0,
              ...(thumbnailAssetId ? { coverAssetId: thumbnailAssetId } : {}),
              ...instagramOpts,
            };
            return {
              account: { connect: { id: acc.id } },
              status: TargetStatus.PENDING,
              customTitle: null,
              customCaption:
                typeof instagramOpts.customCaption === "string"
                  ? instagramOpts.customCaption
                  : caption,
              platformOptions: mergedIg as Prisma.InputJsonValue,
            };
          }),
        },
      },
      include: {
        targets: {
          include: {
            account: {
              select: { id: true, platform: true, displayName: true, username: true },
            },
          },
        },
      },
    });

    const appUrl = getAppUrl();

    return NextResponse.json(
      {
        postId: post.id,
        status: post.status,
        scheduledAt: post.scheduledAt,
        reviewUrl: `${appUrl}/`,
        mediaAsset: {
          id: mainAsset.id,
          filename: mainAsset.filename,
          width: mainAsset.width,
          height: mainAsset.height,
          durationSec: mainAsset.durationSec,
        },
        targets: post.targets.map((t) => ({
          targetId: t.id,
          accountId: t.account.id,
          platform: t.account.platform,
          displayName: t.account.displayName,
          username: t.account.username,
          status: t.status,
        })),
      },
      { status: 201 }
    );
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to create draft via API";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
