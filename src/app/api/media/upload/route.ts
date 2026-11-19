import crypto from "node:crypto";
import path from "node:path";
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { probeMediaBuffer } from "@/lib/media/probe";
import { PLAN_SPECS } from "@/lib/plans";
import { prisma } from "@/lib/prisma";
import { getStorageProvider } from "@/lib/storage";

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const planSpec = PLAN_SPECS[user.plan];
    const maxFileSizeBytes = planSpec.maxFileSizeMb * 1024 * 1024;

    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json(
        { error: "Missing 'file' field in multipart form data." },
        { status: 400 }
      );
    }

    if (file.size === 0) {
      return NextResponse.json({ error: "Uploaded file is empty." }, { status: 400 });
    }

    if (file.size > maxFileSizeBytes) {
      return NextResponse.json(
        {
          error: `File exceeds your ${planSpec.name} limit of ${planSpec.maxFileSizeMb} MB.${
            user.plan === "FREE"
              ? " Upgrade to Creator Pro for 250 MB uploads."
              : ""
          }`,
        },
        { status: 400 }
      );
    }

    const isAllowed =
      file.type.startsWith("video/") || file.type.startsWith("image/");
    if (!isAllowed) {
      return NextResponse.json(
        { error: `Unsupported file type: ${file.type || "unknown"}` },
        { status: 400 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const ext = path.extname(file.name).replace(/^\./, "") || "bin";
    const key = `${user.id}/${Date.now()}-${crypto.randomUUID()}.${ext}`;

    const [metadata, stored] = await Promise.all([
      probeMediaBuffer(buffer, ext),
      getStorageProvider().upload({
        key,
        buffer,
        contentType: file.type,
      }),
    ]);

    const asset = await prisma.mediaAsset.create({
      data: {
        userId: user.id,
        filename: file.name,
        mimeType: file.type,
        sizeBytes: file.size,
        width: metadata.width,
        height: metadata.height,
        durationSec: metadata.durationSec,
        storageKey: stored.key,
        publicUrl: stored.publicUrl,
      },
    });

    return NextResponse.json({ asset, metadata }, { status: 201 });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to process media upload";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
