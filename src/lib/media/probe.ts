import { execFile } from "node:child_process";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

export interface MediaMetadata {
  width: number | null;
  height: number | null;
  durationSec: number | null;
  videoCodec: string | null;
  audioCodec: string | null;
  formatName: string | null;
}

interface FFprobeStream {
  codec_type?: string;
  codec_name?: string;
  width?: number;
  height?: number;
  duration?: string;
}

interface FFprobeOutput {
  streams?: FFprobeStream[];
  format?: {
    duration?: string;
    format_name?: string;
  };
}

export async function probeMediaFile(
  filePath: string
): Promise<MediaMetadata> {
  try {
    const { stdout } = await execFileAsync("ffprobe", [
      "-v",
      "quiet",
      "-print_format",
      "json",
      "-show_format",
      "-show_streams",
      filePath,
    ]);

    const parsed = JSON.parse(stdout) as FFprobeOutput;
    const streams = parsed.streams ?? [];
    const videoStream = streams.find((s) => s.codec_type === "video");
    const audioStream = streams.find((s) => s.codec_type === "audio");

    const rawDuration =
      parsed.format?.duration ?? videoStream?.duration ?? null;
    const durationNum = rawDuration ? Number.parseFloat(rawDuration) : NaN;

    return {
      width: videoStream?.width ?? null,
      height: videoStream?.height ?? null,
      durationSec: Number.isFinite(durationNum) ? durationNum : null,
      videoCodec: videoStream?.codec_name ?? null,
      audioCodec: audioStream?.codec_name ?? null,
      formatName: parsed.format?.format_name ?? null,
    };
  } catch {
    return {
      width: null,
      height: null,
      durationSec: null,
      videoCodec: null,
      audioCodec: null,
      formatName: null,
    };
  }
}

/**
 * Inspects a media buffer with `ffprobe` to extract dimensions, duration, and codecs.
 * Returns null fields gracefully if ffprobe is unavailable or fails on an unknown format.
 */
export async function probeMediaBuffer(
  buffer: Buffer,
  extension = "bin"
): Promise<MediaMetadata> {
  const tempPath = path.join(
    os.tmpdir(),
    `buffer-probe-${Date.now()}-${Math.random().toString(36).slice(2)}.${extension}`
  );

  try {
    await fs.writeFile(tempPath, buffer);
    return await probeMediaFile(tempPath);
  } catch {
    return {
      width: null,
      height: null,
      durationSec: null,
      videoCodec: null,
      audioCodec: null,
      formatName: null,
    };
  } finally {
    await fs.rm(tempPath, { force: true }).catch(() => {});
  }
}
