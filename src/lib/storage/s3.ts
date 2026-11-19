import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import type { StorageProvider } from "./index";

export class S3StorageProvider implements StorageProvider {
  readonly kind = "s3" as const;
  private readonly client: S3Client;
  private readonly bucket: string;
  private readonly publicBaseUrl: string;

  constructor() {
    this.bucket = process.env.S3_BUCKET || "";
    this.publicBaseUrl = (process.env.S3_PUBLIC_BASE_URL || "").replace(/\/+$/, "");

    this.client = new S3Client({
      region: process.env.S3_REGION || "auto",
      endpoint: process.env.S3_ENDPOINT || undefined,
      credentials: {
        accessKeyId: process.env.S3_ACCESS_KEY_ID || "",
        secretAccessKey: process.env.S3_SECRET_ACCESS_KEY || "",
      },
    });
  }

  getPublicUrl(key: string): string {
    const cleaned = key.replace(/^\/+/, "");
    return `${this.publicBaseUrl}/${cleaned}`;
  }

  async upload(params: {
    key: string;
    buffer: Buffer;
    contentType: string;
  }): Promise<{ key: string; publicUrl: string }> {
    const cleaned = params.key.replace(/^\/+/, "");
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: cleaned,
        Body: params.buffer,
        ContentType: params.contentType,
      })
    );

    return {
      key: cleaned,
      publicUrl: this.getPublicUrl(cleaned),
    };
  }

  async getBuffer(key: string): Promise<Buffer> {
    const cleaned = key.replace(/^\/+/, "");
    const res = await this.client.send(
      new GetObjectCommand({ Bucket: this.bucket, Key: cleaned })
    );
    if (!res.Body) {
      throw new Error(`Empty response body for S3 key: ${cleaned}`);
    }
    const bytes = await res.Body.transformToByteArray();
    return Buffer.from(bytes);
  }

  async getReadableStream(key: string): Promise<{
    stream: ReadableStream<Uint8Array>;
    sizeBytes?: number;
  }> {
    const cleaned = key.replace(/^\/+/, "");
    const res = await this.client.send(
      new GetObjectCommand({ Bucket: this.bucket, Key: cleaned })
    );
    if (!res.Body) {
      throw new Error(`Empty response body for S3 key: ${cleaned}`);
    }
    return {
      stream: res.Body.transformToWebStream(),
      sizeBytes: res.ContentLength,
    };
  }

  async delete(key: string): Promise<void> {
    const cleaned = key.replace(/^\/+/, "");
    await this.client.send(
      new DeleteObjectCommand({ Bucket: this.bucket, Key: cleaned })
    );
  }
}
