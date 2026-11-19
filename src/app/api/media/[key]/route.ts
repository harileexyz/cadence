import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getStorageProvider } from "@/lib/storage";

export async function GET(
  _request: Request,
  context: { params: Promise<{ key: string }> }
) {
  const { key } = await context.params;
  const decodedKey = decodeURIComponent(key);

  const asset = await prisma.mediaAsset.findUnique({
    where: { storageKey: decodedKey },
    select: { mimeType: true, sizeBytes: true },
  });

  if (!asset) {
    return NextResponse.json({ error: "Media not found" }, { status: 404 });
  }

  try {
    const storage = getStorageProvider();
    const { stream, sizeBytes } = await storage.getReadableStream(decodedKey);

    return new NextResponse(stream, {
      status: 200,
      headers: {
        "Content-Type": asset.mimeType,
        "Content-Length": String(sizeBytes ?? asset.sizeBytes),
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch {
    return NextResponse.json({ error: "Media file missing" }, { status: 404 });
  }
}
