import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { FIREBASE_STORAGE_BUCKET } from "@/lib/firebase/client";
import { PLAN_SPECS } from "@/lib/plans";
import { prisma } from "@/lib/prisma";

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

const registerMediaSchema = z.object({
  filename: z.string().min(1).max(255),
  mimeType: z.string().min(1),
  sizeBytes: z.number().int().positive(),
  storageKey: z.string().min(1),
  publicUrl: z.string().url(),
  width: z.number().int().positive().nullable().optional(),
  height: z.number().int().positive().nullable().optional(),
  durationSec: z.number().nonnegative().nullable().optional(),
});

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json().catch(() => null);
    const parsed = registerMediaSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Invalid media registration payload." },
        { status: 400 }
      );
    }

    const data = parsed.data;
    const planSpec = PLAN_SPECS[user.plan];
    const maxFileSizeBytes = planSpec.maxFileSizeMb * 1024 * 1024;

    if (data.sizeBytes > maxFileSizeBytes) {
      return NextResponse.json(
        {
          error: `File exceeds your ${planSpec.name} limit of ${planSpec.maxFileSizeMb} MB.${
            user.plan === "FREE" ? " Upgrade to Creator Pro for 250 MB uploads." : ""
          }`,
        },
        { status: 400 }
      );
    }

    const mimeType = data.mimeType.toLowerCase();
    if (!ALLOWED_MIME_TYPES.has(mimeType)) {
      return NextResponse.json(
        { error: `Unsupported file type (${data.mimeType}).` },
        { status: 400 }
      );
    }

    const expectedPrefix = `https://firebasestorage.googleapis.com/v0/b/${FIREBASE_STORAGE_BUCKET}/`;
    if (
      !data.publicUrl.startsWith(expectedPrefix) ||
      !data.storageKey.startsWith(`media/${user.id}/`)
    ) {
      return NextResponse.json(
        { error: "Invalid Firebase Storage asset reference." },
        { status: 400 }
      );
    }

    const asset = await prisma.mediaAsset.create({
      data: {
        userId: user.id,
        filename: data.filename,
        mimeType,
        sizeBytes: data.sizeBytes,
        width: data.width ?? null,
        height: data.height ?? null,
        durationSec: data.durationSec ?? null,
        storageKey: data.storageKey,
        publicUrl: data.publicUrl,
        fileData: null,
      },
      select: {
        id: true,
        userId: true,
        filename: true,
        mimeType: true,
        sizeBytes: true,
        width: true,
        height: true,
        durationSec: true,
        storageKey: true,
        publicUrl: true,
        storageDeleted: true,
        createdAt: true,
      },
    });

    return NextResponse.json({ asset }, { status: 201 });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to register Firebase media asset";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
