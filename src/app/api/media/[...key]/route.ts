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

async function ensureMediaOnStorage(storageKey: string): Promise<{
  mimeType: string;
  sizeBytes: number;
} | null> {
  // 1. Query metadata only (never pull the multi-MB fileData bytea column unless file is missing)
  const meta = await prisma.mediaAsset.findUnique({
    where: { storageKey },
    select: {
      id: true,
      mimeType: true,
      sizeBytes: true,
    },
  });

  if (!meta) return null;

  const storage = getStorageProvider();
  const existsOnDisk = storage.has
    ? await storage.has(storageKey)
    : false;

  if (!existsOnDisk) {
    // Only pull fileData backup from Postgres when the local file was wiped by a container redeploy
    const backup = await prisma.mediaAsset.findUnique({
      where: { id: meta.id },
      select: { fileData: true },
    });
    if (!backup?.fileData || backup.fileData.byteLength === 0) {
      return null;
    }
    const restored = Buffer.from(backup.fileData);
    await storage
      .upload({
        key: storageKey,
        buffer: restored,
        contentType: meta.mimeType,
      })
      .catch(() => {});
    return {
      mimeType: meta.mimeType,
      sizeBytes: restored.byteLength,
    };
  }

  return {
    mimeType: meta.mimeType,
    sizeBytes: meta.sizeBytes,
  };
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

  const meta = await ensureMediaOnStorage(decodedKey);
  if (!meta) {
    return new NextResponse(null, { status: 404 });
  }

  return new NextResponse(null, {
    status: 200,
    headers: {
      ...SECURITY_HEADERS,
      "Content-Type": meta.mimeType,
      "Content-Length": String(meta.sizeBytes),
    },
  });
}

export async function GET(
  request: Request,
  context: { params: Promise<{ key: string[] }> }
) {
  const { key } = await context.params;
  const decodedKey = decodeSegments(key);

  const meta = await ensureMediaOnStorage(decodedKey);
  if (!meta) {
    return NextResponse.json({ error: "Media file not found" }, { status: 404 });
  }

  const storage = getStorageProvider();
  const rangeHeader = request.headers.get("range");

  if (rangeHeader) {
    const match = rangeHeader.match(/bytes=(\d*)-(\d*)/i);
    if (match) {
      const totalSize = meta.sizeBytes;
      const start = match[1] ? Number.parseInt(match[1], 10) : 0;
      const end = match[2]
        ? Math.min(Number.parseInt(match[2], 10), totalSize - 1)
        : totalSize - 1;

      if (start >= 0 && start < totalSize && start <= end) {
        if (storage.getRange) {
          const { buffer: chunk, totalSize: actualTotal } =
            await storage.getRange(decodedKey, start, end);
          return new NextResponse(new Uint8Array(chunk), {
            status: 206,
            headers: {
              ...SECURITY_HEADERS,
              "Content-Type": meta.mimeType,
              "Content-Length": String(chunk.byteLength),
              "Content-Range": `bytes ${start}-${start + chunk.byteLength - 1}/${actualTotal}`,
            },
          });
        }

        const fullBuf = await storage.getBuffer(decodedKey);
        const chunk = fullBuf.subarray(start, end + 1);
        return new NextResponse(new Uint8Array(chunk), {
          status: 206,
          headers: {
            ...SECURITY_HEADERS,
            "Content-Type": meta.mimeType,
            "Content-Length": String(chunk.byteLength),
            "Content-Range": `bytes ${start}-${end}/${fullBuf.byteLength}`,
          },
        });
      }
    }
  }

  try {
    const { stream, sizeBytes } = await storage.getReadableStream(decodedKey);
    return new NextResponse(stream, {
      status: 200,
      headers: {
        ...SECURITY_HEADERS,
        "Content-Type": meta.mimeType,
        "Content-Length": String(sizeBytes ?? meta.sizeBytes),
      },
    });
  } catch {
    const buffer = await storage.getBuffer(decodedKey);
    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        ...SECURITY_HEADERS,
        "Content-Type": meta.mimeType,
        "Content-Length": String(buffer.byteLength),
      },
    });
  }
}
