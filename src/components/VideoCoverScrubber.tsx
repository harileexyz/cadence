"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  Camera,
  CheckCircle2,
  Film,
  Loader2,
  Pause,
  Play,
  Sparkles,
} from "lucide-react";

export interface ScrubberVideoAsset {
  id: string;
  filename: string;
  mimeType: string;
  sizeBytes: number;
  width: number | null;
  height: number | null;
  durationSec: number | null;
  publicUrl: string;
}

export function VideoCoverScrubber({
  asset,
  currentReelOffsetSec,
  hasYouTube,
  hasInstagram,
  ytIsShort,
  onSetReelOffsetSec,
  onCaptureYouTubeThumbnail,
}: {
  asset: ScrubberVideoAsset;
  currentReelOffsetSec: string;
  hasYouTube: boolean;
  hasInstagram: boolean;
  ytIsShort: boolean;
  onSetReelOffsetSec: (sec: string) => void;
  onCaptureYouTubeThumbnail: (file: File) => Promise<void>;
}) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [duration, setDuration] = useState<number>(asset.durationSec ?? 0);
  const [currentTime, setCurrentTime] = useState<number>(
    Number.parseFloat(currentReelOffsetSec) || 0
  );
  const [playing, setPlaying] = useState(false);
  const [capturing, setCapturing] = useState(false);
  const [captureMsg, setCaptureMsg] = useState<string | null>(null);

  useEffect(() => {
    setDuration(asset.durationSec ?? 0);
    setCurrentTime(0);
    setPlaying(false);
    setCaptureMsg(null);
  }, [asset.id, asset.durationSec]);

  function seekTo(sec: number) {
    const clamped = Math.max(0, Math.min(sec, duration || sec));
    setCurrentTime(clamped);
    if (videoRef.current) {
      videoRef.current.currentTime = clamped;
    }
  }

  function togglePlay() {
    const vid = videoRef.current;
    if (!vid) return;
    if (vid.paused) {
      void vid.play();
      setPlaying(true);
    } else {
      vid.pause();
      setPlaying(false);
    }
  }

  async function handleCaptureFrame() {
    const vid = videoRef.current;
    if (!vid || vid.videoWidth === 0 || vid.videoHeight === 0) return;

    setCapturing(true);
    setCaptureMsg(null);
    try {
      const canvas = document.createElement("canvas");
      canvas.width = vid.videoWidth;
      canvas.height = vid.videoHeight;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Canvas unavailable");
      ctx.drawImage(vid, 0, 0, canvas.width, canvas.height);

      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, "image/jpeg", 0.92)
      );
      if (!blob) throw new Error("Could not capture video frame");

      const file = new File(
        [blob],
        `frame-${currentTime.toFixed(1)}s.jpg`,
        { type: "image/jpeg" }
      );
      await onCaptureYouTubeThumbnail(file);
      setCaptureMsg(`Captured frame at ${currentTime.toFixed(1)}s as YouTube thumbnail`);
    } catch (err) {
      setCaptureMsg(
        err instanceof Error ? err.message : "Failed to capture frame"
      );
    } finally {
      setCapturing(false);
    }
  }

  // Pre-flight spec guardrails
  const guardrails = useMemo(() => {
    const checks: Array<{ ok: boolean; label: string }> = [];
    const w = asset.width;
    const h = asset.height;
    const dur = duration || asset.durationSec || 0;

    if (w && h) {
      const ratio = w / h;
      if (ratio >= 0.52 && ratio <= 0.62) {
        checks.push({ ok: true, label: `9:16 Vertical (${w}×${h}) · Shorts & Reels Ready` });
      } else if (ratio >= 1.7 && ratio <= 1.85) {
        checks.push({
          ok: !hasInstagram,
          label: hasInstagram
            ? `16:9 Landscape (${w}×${h}) · Reels perform best in 9:16`
            : `16:9 Landscape (${w}×${h}) · YouTube HD`,
        });
      } else {
        checks.push({
          ok: true,
          label: `${w}×${h} (${ratio.toFixed(2)}:1)`,
        });
      }
    }

    if (dur > 0) {
      if (hasYouTube && ytIsShort && dur > 60) {
        checks.push({
          ok: false,
          label: `${Math.round(dur)}s · Over 60s (may publish as standard YouTube video)`,
        });
      } else if (hasInstagram && dur > 90) {
        checks.push({
          ok: false,
          label: `${Math.round(dur)}s · Over 90s Reels limit`,
        });
      } else {
        checks.push({ ok: true, label: `${dur.toFixed(1)}s duration · Within limits` });
      }
    }

    const sizeMb = asset.sizeBytes / (1024 * 1024);
    checks.push({
      ok: sizeMb <= 100,
      label: `${sizeMb.toFixed(1)} MB`,
    });

    return checks;
  }, [asset, duration, hasYouTube, hasInstagram, ytIsShort]);

  const formattedCurrent = currentTime.toFixed(1);
  const formattedDuration = (duration || 0).toFixed(1);
  const isReelMatched =
    Math.abs((Number.parseFloat(currentReelOffsetSec) || 0) - currentTime) < 0.15;

  return (
    <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Film className="h-4 w-4 text-indigo-600" />
          <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-700">
            Visual Cover Scrubber & Pre-Flight Checks
          </h3>
        </div>
        <span className="rounded-full bg-white px-2.5 py-0.5 text-[11px] font-semibold text-slate-600 ring-1 ring-slate-200">
          {formattedCurrent}s / {formattedDuration}s
        </span>
      </div>

      <div className="mt-3 grid gap-4 md:grid-cols-12">
        {/* Video Preview */}
        <div className="flex items-center justify-center overflow-hidden rounded-xl bg-slate-950 md:col-span-5">
          <video
            ref={videoRef}
            src={asset.publicUrl}
            crossOrigin="anonymous"
            playsInline
            muted
            preload="metadata"
            onLoadedMetadata={(e) => {
              const d = e.currentTarget.duration;
              if (Number.isFinite(d) && d > 0) setDuration(d);
            }}
            onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
            onEnded={() => setPlaying(false)}
            className="max-h-64 w-auto object-contain"
          />
        </div>

        {/* Scrubber & Actions */}
        <div className="flex flex-col justify-between space-y-3 md:col-span-7">
          <div className="space-y-2.5">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={togglePlay}
                className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-100"
                title={playing ? "Pause preview" : "Play preview"}
              >
                {playing ? (
                  <Pause className="h-3.5 w-3.5" />
                ) : (
                  <Play className="h-3.5 w-3.5" />
                )}
              </button>

              <input
                type="range"
                min={0}
                max={Math.max(duration, 0.1)}
                step={0.1}
                value={Math.min(currentTime, Math.max(duration, 0.1))}
                onChange={(e) => seekTo(Number.parseFloat(e.target.value))}
                aria-label="Scrub video frame"
                className="h-2 flex-1 cursor-pointer accent-indigo-600"
              />
            </div>

            {/* Quick jump buttons */}
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[11px] font-medium text-slate-500">
                Quick jump:
              </span>
              {[
                { label: "0.0s", val: 0 },
                { label: "1.0s", val: 1 },
                { label: "3.0s", val: 3 },
                ...(duration > 4
                  ? [{ label: `Mid (${(duration / 2).toFixed(1)}s)`, val: duration / 2 }]
                  : []),
              ].map((preset) => (
                <button
                  key={preset.label}
                  type="button"
                  onClick={() => seekTo(preset.val)}
                  className="rounded-md border border-slate-200 bg-white px-2 py-0.5 text-[11px] font-medium text-slate-600 hover:border-indigo-300 hover:text-indigo-700"
                >
                  {preset.label}
                </button>
              ))}
            </div>

            {/* Action buttons */}
            <div className="flex flex-wrap items-center gap-2 pt-1">
              {hasInstagram && (
                <button
                  type="button"
                  onClick={() => onSetReelOffsetSec(formattedCurrent)}
                  className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                    isReelMatched
                      ? "bg-pink-600 text-white shadow-2xs"
                      : "border border-pink-200 bg-pink-50 text-pink-700 hover:bg-pink-100"
                  }`}
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  <span>
                    {isReelMatched
                      ? `Reel Cover Set (${formattedCurrent}s)`
                      : `Set Reel Cover (${formattedCurrent}s)`}
                  </span>
                </button>
              )}

              {hasYouTube && (
                <button
                  type="button"
                  disabled={capturing}
                  onClick={() => void handleCaptureFrame()}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-700 disabled:opacity-50"
                >
                  {capturing ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Camera className="h-3.5 w-3.5" />
                  )}
                  <span>Use Frame as YouTube Thumbnail</span>
                </button>
              )}
            </div>

            {captureMsg && (
              <p className="text-[11px] font-medium text-emerald-700">
                {captureMsg}
              </p>
            )}
          </div>

          {/* Pre-flight Spec Guardrails */}
          <div className="border-t border-slate-200/80 pt-3">
            <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
              Pre-Flight Guardrails
            </p>
            <div className="flex flex-wrap gap-1.5">
              {guardrails.map((g, idx) => (
                <span
                  key={idx}
                  className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-medium ${
                    g.ok
                      ? "bg-emerald-50 text-emerald-700"
                      : "bg-amber-50 text-amber-800"
                  }`}
                >
                  {g.ok ? (
                    <CheckCircle2 className="h-3 w-3 shrink-0" />
                  ) : (
                    <AlertTriangle className="h-3 w-3 shrink-0" />
                  )}
                  <span>{g.label}</span>
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
