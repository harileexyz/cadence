import fs from "node:fs/promises";
import { createReadStream } from "node:fs";
import path from "node:path";
import { Readable } from "node:stream";
import type { StorageProvider } from "./index";
import { getPublicMediaBaseUrl } from "@/lib/env";

const UPLOADS_DIR = path.resolve(process.cwd(), "uploads");

function sanitizeKey(key: string): string {
  const cleaned = key.replace(/^\/+/, "").replace(/\.\./g, "");
  if (!cleaned) {
    throw new Error("Invalid storage key");
  }
  return cleaned;
}

export class LocalStorageProvider implements StorageProvider {
  readonly kind = "local" as const;

  private resolvePath(key: string): string {
    const safeKey = sanitizeKey(key);
    const fullPath = path.resolve(UPLOADS_DIR, safeKey);
    if (!fullPath.startsWith(UPLOADS_DIR)) {
      throw new Error("Path traversal detected");
    }
    return fullPath;
  }

  getPublicUrl(key: string): string {
    const safeKey = sanitizeKey(key);
    return `${getPublicMediaBaseUrl()}/api/media/${encodeURIComponent(safeKey)}`;
  }

  async upload(params: {
    key: string;
    buffer: Buffer;
    contentType: string;
  }): Promise<{ key: string; publicUrl: string }> {
    const safeKey = sanitizeKey(params.key);
    const targetPath = this.resolvePath(safeKey);
    await fs.mkdir(path.dirname(targetPath), { recursive: true });
    await fs.writeFile(targetPath, params.buffer);
    return {
      key: safeKey,
      publicUrl: this.getPublicUrl(safeKey),
    };
  }

  async getBuffer(key: string): Promise<Buffer> {
    const targetPath = this.resolvePath(key);
    return fs.readFile(targetPath);
  }

  async getReadableStream(key: string): Promise<{
    stream: ReadableStream<Uint8Array>;
    sizeBytes?: number;
  }> {
    const targetPath = this.resolvePath(key);
    const stat = await fs.stat(targetPath);
    const nodeStream = createReadStream(targetPath);
    return {
      stream: Readable.toWeb(nodeStream) as ReadableStream<Uint8Array>,
      sizeBytes: stat.size,
    };
  }

  async delete(key: string): Promise<void> {
    const targetPath = this.resolvePath(key);
    await fs.rm(targetPath, { force: true });
  }
}
