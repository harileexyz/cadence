import crypto from "node:crypto";
import path from "node:path";
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { isS3Configured } from "@/lib/env";
import { probeMediaBuffer, probeMediaFile } from "@/lib/media/probe";
import { PLAN_SPECS } from "@/lib/plans";
import { prisma } from "@/lib/prisma";
import { getStorageProvider } from "@/lib/storage";

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

// Keep Postgres bytea backup under 22 MB to prevent Render Free 512MB container OOM spikes
const MAX_POSTGRES_BACKUP_BYTES = 22 * 1024 * 1024;

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const planSpec = PLAN_SPECS[user.plan];
    const maxFileSizeBytes = planSpec.maxFileSizeMb * 1024 * 1024;
    const storage = getStorageProvider();

    const rawFilenameHeader = request.headers.get("x-file-name");
    const rawMimeHeader = request.headers.get("x-file-type");
    const contentTypeHeader = request.headers.get("content-type") || "";
    const isDirectBinaryStream =
      Boolean(rawFilenameHeader) &&
      !contentTypeHeader.toLowerCase().includes("multipart/form-data");

    let filename: string;
    let mimeType: string;
    let sizeBytes: number;
    let storedKey: string;
    let publicUrl: string;
    let metadata: Awaited<ReturnType<typeof probeMediaFile>>;

    if (isDirectBinaryStream && request.body && storage.uploadStream) {
      // Zero-Buffer Streaming Path: streams directly from HTTP request socket to disk
      filename = decodeURIComponent(rawFilenameHeader || "upload.mp4");
      mimeType = (rawMimeHeader || contentTypeHeader || "video/mp4")
        .split(";")[0]
        .trim()
        .toLowerCase();

      if (!ALLOWED_MIME_TYPES.has(mimeType)) {
        return NextResponse.json(
          {
            error: `Unsupported file type (${mimeType || "unknown"}). Upload MP4, MOV, WebM, JPG, PNG, or WebP.`,
          },
          { status: 400 }
        );
      }

      const declaredSize = Number.parseInt(
        request.headers.get("x-file-size") ||
          request.headers.get("content-length") ||
          "0",
        10
      );
      if (declaredSize > maxFileSizeBytes) {
        return NextResponse.json(
          {
            error: `File exceeds your ${planSpec.name} limit of ${planSpec.maxFileSizeMb} MB.`,
          },
          { status: 400 }
        );
      }

      const ext = path.extname(filename).replace(/^\./, "") || "mp4";
      const key = `${user.id}-${Date.now()}-${crypto.randomUUID()}.${ext}`;

      const streamed = await storage.uploadStream({
        key,
        stream: request.body,
        contentType: mimeType,
      });

      if (streamed.sizeBytes === 0) {
        await storage.delete(streamed.key).catch(() => {});
        return NextResponse.json(
          { error: "Uploaded file is empty." },
          { status: 400 }
        );
      }

      if (streamed.sizeBytes > maxFileSizeBytes) {
        await storage.delete(streamed.key).catch(() => {});
        return NextResponse.json(
          {
            error: `File exceeds your ${planSpec.name} limit of ${planSpec.maxFileSizeMb} MB.`,
          },
          { status: 400 }
        );
      }

      storedKey = streamed.key;
      publicUrl = streamed.publicUrl;
      sizeBytes = streamed.sizeBytes;
      metadata = streamed.filePath
        ? await probeMediaFile(streamed.filePath)
        : {
            width: null,
            height: null,
            durationSec: null,
            videoCodec: null,
            audioCodec: null,
            formatName: null,
          };
    } else {
      // Standard multipart/form-data path
      const formData = await request.formData();
      const file = formData.get("file");

      if (!(file instanceof File)) {
        return NextResponse.json(
          { error: "Missing 'file' field in multipart form data." },
          { status: 400 }
        );
      }

      if (file.size === 0) {
        return NextResponse.json(
          { error: "Uploaded file is empty." },
          { status: 400 }
        );
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

      mimeType = file.type.toLowerCase();
      if (!ALLOWED_MIME_TYPES.has(mimeType)) {
        return NextResponse.json(
          {
            error: `Unsupported file type (${file.type || "unknown"}). Upload MP4, MOV, WebM, JPG, PNG, or WebP.`,
          },
          { status: 400 }
        );
      }

      filename = file.name;
      sizeBytes = file.size;
      const ext = path.extname(filename).replace(/^\./, "") || "bin";
      const key = `${user.id}-${Date.now()}-${crypto.randomUUID()}.${ext}`;

      if (storage.uploadStream) {
        const streamed = await storage.uploadStream({
          key,
          stream: file.stream(),
          contentType: mimeType,
        });
        storedKey = streamed.key;
        publicUrl = streamed.publicUrl;
        metadata = streamed.filePath
          ? await probeMediaFile(streamed.filePath)
          : {
              width: null,
              height: null,
              durationSec: null,
              videoCodec: null,
              audioCodec: null,
              formatName: null,
            };
      } else {
        const buffer = Buffer.from(await file.arrayBuffer());
        const [probed, stored] = await Promise.all([
          probeMediaBuffer(buffer, ext),
          storage.upload({
            key,
            buffer,
            contentType: mimeType,
          }),
        ]);
        metadata = probed;
        storedKey = stored.key;
        publicUrl = stored.publicUrl;
      }
    }

    // Create MediaAsset row FIRST without bytea payload so the row is lightweight
    const asset = await prisma.mediaAsset.create({
      data: {
        userId: user.id,
        filename,
        mimeType,
        sizeBytes,
        width: metadata.width,
        height: metadata.height,
        durationSec: metadata.durationSec,
        storageKey: storedKey,
        publicUrl,
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

    // Store Postgres bytea backup after disk stream closes (only for files <= 22 MB)
    if (!isS3Configured() && sizeBytes <= MAX_POSTGRES_BACKUP_BYTES) {
      try {
        const diskBuf = await storage.getBuffer(storedKey);
        await prisma.mediaAsset.update({
          where: { id: asset.id },
          data: { fileData: new Uint8Array(diskBuf) },
          select: { id: true },
        });
      } catch {
        // Non-fatal: file is already persisted on container disk
      }
    }

    return NextResponse.json({ asset, metadata }, { status: 201 });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to process media upload";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
