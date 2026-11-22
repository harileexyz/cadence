import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getStorageProvider } from "@/lib/storage";

const SECURITY_HEADERS = {
  "Cache-Control": "public, max-age=31536000, immutable",
  "Accept-Ranges": "bytes",
  "X-Content-Type-Options": "nosniff",
  "Content-Security-Policy":
    "default-src 'none'; media-src 'self'; img-src 'self'; style-src 'unsafe-inline'",
};

async function resolveMediaBuffer(storageKey: string): Promise<{
  buffer: Buffer;
  mimeType: string;
} | null> {
  const asset = await prisma.mediaAsset.findUnique({
    where: { storageKey },
    select: {
      mimeType: true,
      sizeBytes: true,
      fileData: true,
    },
  });

  if (!asset) return null;

  const storage = getStorageProvider();

  try {
    const diskBuf = await storage.getBuffer(storageKey);
    return { buffer: diskBuf, mimeType: asset.mimeType };
  } catch {
    // Fallback to Postgres bytea backup if container disk was wiped by a Render redeploy
    if (asset.fileData && asset.fileData.byteLength > 0) {
      const restored = Buffer.from(asset.fileData);
      await storage
        .upload({
          key: storageKey,
          buffer: restored,
          contentType: asset.mimeType,
        })
        .catch(() => {});
      return { buffer: restored, mimeType: asset.mimeType };
    }
    return null;
  }
}

function decodeSegments(segments: string[]): string {
  return segments.map((s) => decodeURIComponent(s)).join("/");
}

export async function HEAD(
  _request: Request,
  context: { params: Promise<{ key: string[] }> }
) {
  const { key } = await context.params;
  const decodedKey = decodeSegments(key);

  const resolved = await resolveMediaBuffer(decodedKey);
  if (!resolved) {
    return new NextResponse(null, { status: 404 });
  }

  return new NextResponse(null, {
    status: 200,
    headers: {
      ...SECURITY_HEADERS,
      "Content-Type": resolved.mimeType,
      "Content-Length": String(resolved.buffer.byteLength),
    },
  });
}

export async function GET(
  request: Request,
  context: { params: Promise<{ key: string[] }> }
) {
  const { key } = await context.params;
  const decodedKey = decodeSegments(key);

  const resolved = await resolveMediaBuffer(decodedKey);
  if (!resolved) {
    return NextResponse.json({ error: "Media file not found" }, { status: 404 });
  }

  const { buffer, mimeType } = resolved;
  const totalSize = buffer.byteLength;
  const rangeHeader = request.headers.get("range");

  if (rangeHeader) {
    const match = rangeHeader.match(/bytes=(\d*)-(\d*)/i);
    if (match) {
      const start = match[1] ? Number.parseInt(match[1], 10) : 0;
      const end = match[2]
        ? Math.min(Number.parseInt(match[2], 10), totalSize - 1)
        : totalSize - 1;

      if (start >= 0 && start < totalSize && start <= end) {
        const chunk = buffer.subarray(start, end + 1);
        return new NextResponse(new Uint8Array(chunk), {
          status: 206,
          headers: {
            ...SECURITY_HEADERS,
            "Content-Type": mimeType,
            "Content-Length": String(chunk.byteLength),
            "Content-Range": `bytes ${start}-${end}/${totalSize}`,
          },
        });
      }
    }
  }

  return new NextResponse(new Uint8Array(buffer), {
    status: 200,
    headers: {
      ...SECURITY_HEADERS,
      "Content-Type": mimeType,
      "Content-Length": String(totalSize),
    },
  });
}
