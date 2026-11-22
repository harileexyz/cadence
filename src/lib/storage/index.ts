import { isS3Configured } from "@/lib/env";
import { LocalStorageProvider } from "./local";
import { S3StorageProvider } from "./s3";

export interface StorageProvider {
  readonly kind: "s3" | "local";
  upload(params: {
    key: string;
    buffer: Buffer;
    contentType: string;
  }): Promise<{ key: string; publicUrl: string }>;
  uploadStream?(params: {
    key: string;
    stream: ReadableStream<Uint8Array>;
    contentType: string;
  }): Promise<{ key: string; publicUrl: string; filePath?: string; sizeBytes: number }>;
  resolveFilePath?(key: string): string;
  getPublicUrl(key: string): string;
  has?(key: string): Promise<boolean>;
  getBuffer(key: string): Promise<Buffer>;
  getRange?(
    key: string,
    start: number,
    end: number
  ): Promise<{ buffer: Buffer; totalSize: number }>;
  getReadableStream(key: string): Promise<{
    stream: ReadableStream<Uint8Array>;
    sizeBytes?: number;
  }>;
  delete(key: string): Promise<void>;
}

let cachedProvider: StorageProvider | null = null;

export function getStorageProvider(): StorageProvider {
  if (cachedProvider) {
    return cachedProvider;
  }
  cachedProvider = isS3Configured()
    ? new S3StorageProvider()
    : new LocalStorageProvider();
  return cachedProvider;
}
