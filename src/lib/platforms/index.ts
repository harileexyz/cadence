import { Platform } from "@prisma/client";
import { instagramAdapter } from "./instagram";
import type { PlatformAdapter } from "./types";
import { youtubeAdapter } from "./youtube";

const adapters: Record<Platform, PlatformAdapter> = {
  [Platform.YOUTUBE]: youtubeAdapter,
  [Platform.INSTAGRAM]: instagramAdapter,
};

export function getPlatformAdapter(platform: Platform): PlatformAdapter {
  const adapter = adapters[platform];
  if (!adapter) {
    throw new Error(`Unsupported platform: ${platform}`);
  }
  return adapter;
}

export * from "./types";
