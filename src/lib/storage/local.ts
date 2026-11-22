import fs from "node:fs/promises";
import { createReadStream, createWriteStream } from "node:fs";
import path from "node:path";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import type { ReadableStream as NodeWebReadableStream } from "node:stream/web";
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
    const encodedPath = safeKey
      .split("/")
      .map((seg) => encodeURIComponent(seg))
      .join("/");
    return `${getPublicMediaBaseUrl()}/api/media/${encodedPath}`;
  }

  resolveFilePath(key: string): string {
    return this.resolvePath(key);
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

  async uploadStream(params: {
    key: string;
    stream: ReadableStream<Uint8Array>;
    contentType: string;
  }): Promise<{ key: string; publicUrl: string; filePath: string; sizeBytes: number }> {
    const safeKey = sanitizeKey(params.key);
    const targetPath = this.resolvePath(safeKey);
    await fs.mkdir(path.dirname(targetPath), { recursive: true });
    const nodeReadable = Readable.fromWeb(
      params.stream as unknown as NodeWebReadableStream
    );
    const writeStream = createWriteStream(targetPath);
    await pipeline(nodeReadable, writeStream);
    const stat = await fs.stat(targetPath);
    return {
      key: safeKey,
      publicUrl: this.getPublicUrl(safeKey),
      filePath: targetPath,
      sizeBytes: stat.size,
    };
  }

  async has(key: string): Promise<boolean> {
    try {
      const targetPath = this.resolvePath(key);
      const stat = await fs.stat(targetPath);
      return stat.isFile() && stat.size > 0;
    } catch {
      return false;
    }
  }

  async getBuffer(key: string): Promise<Buffer> {
    const targetPath = this.resolvePath(key);
    return fs.readFile(targetPath);
  }

  async getRange(
    key: string,
    start: number,
    end: number
  ): Promise<{ buffer: Buffer; totalSize: number }> {
    const targetPath = this.resolvePath(key);
    const stat = await fs.stat(targetPath);
    const totalSize = stat.size;
    const safeStart = Math.max(0, Math.min(start, totalSize - 1));
    const safeEnd = Math.max(safeStart, Math.min(end, totalSize - 1));
    const length = safeEnd - safeStart + 1;
    const handle = await fs.open(targetPath, "r");
    try {
      const buf = Buffer.allocUnsafe(length);
      const { bytesRead } = await handle.read(buf, 0, length, safeStart);
      return {
        buffer: bytesRead === length ? buf : buf.subarray(0, bytesRead),
        totalSize,
      };
    } finally {
      await handle.close();
    }
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
