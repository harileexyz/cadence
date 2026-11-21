import crypto from "node:crypto";
import type { User } from "@prisma/client";
import { prisma } from "@/lib/prisma";

const API_KEY_PREFIX = "cad_live_";

export function hashApiKey(rawKey: string): string {
  return crypto.createHash("sha256").update(rawKey).digest("hex");
}

export function generateApiKey(): {
  rawKey: string;
  keyPrefix: string;
  keyHash: string;
} {
  const randomPart = crypto.randomBytes(24).toString("hex");
  const rawKey = `${API_KEY_PREFIX}${randomPart}`;
  const keyPrefix = rawKey.slice(0, 16);
  const keyHash = hashApiKey(rawKey);
  return { rawKey, keyPrefix, keyHash };
}

export async function authenticateApiRequest(
  request: Request
): Promise<User | null> {
  const authHeader = request.headers.get("authorization") || "";
  const match = authHeader.match(/^Bearer\s+(.+)$/i);
  if (!match) return null;

  const rawKey = match[1].trim();
  if (!rawKey.startsWith(API_KEY_PREFIX)) return null;

  const keyHash = hashApiKey(rawKey);
  const record = await prisma.apiKey.findUnique({
    where: { keyHash },
    include: { user: true },
  });

  if (!record) return null;

  // Update lastUsedAt asynchronously (non-blocking)
  void prisma.apiKey
    .update({
      where: { id: record.id },
      data: { lastUsedAt: new Date() },
    })
    .catch(() => {});

  return record.user;
}
