"use client";

import {
  ArrowLeftRight,
  Eye,
  Heart,
  MessageCircle,
  Play,
  Sparkles,
} from "lucide-react";
import { PlatformBadge } from "@/components/PlatformBadge";
import {
  formatCompactNumber,
  formatRelativeDate,
  type CrossPlatformPair,
  type PostEngagementDTO,
} from "@/lib/analytics";

export function CrossPlatformComparison({
  pairs,
  onPreviewPost,
  scopeLabel,
}: {
  pairs: CrossPlatformPair[];
  onPreviewPost: (post: PostEngagementDTO) => void;
  scopeLabel?: string;
}) {
  if (pairs.length === 0) {
    return (
      <section className="rounded-2xl border border-dashed border-slate-200 bg-white p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <ArrowLeftRight className="h-4 w-4 text-indigo-600" />
            <h2 className="text-sm font-semibold text-slate-900">
              Cross-Platform Post Comparison
              {scopeLabel ? ` · ${scopeLabel}` : ""}
            </h2>
          </div>
          <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-medium text-slate-500">
            0 matched pairs yet
          </span>
        </div>
        <p className="mt-1.5 text-xs text-slate-500">
          Cross-post a video to both YouTube and Instagram from Compose (or publish matching titles within 30 days) to compare YouTube Shorts vs. Instagram Reels side-by-side here.
        </p>
      </section>
    );
  }

  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <div className="flex items-center gap-2">
            <ArrowLeftRight className="h-4 w-4 text-indigo-600" />
            <h2 className="text-sm font-semibold text-slate-900">
              Cross-Platform Post Comparison{" "}
              <span className="font-normal text-slate-400">
                ({pairs.length} matched)
              </span>
            </h2>
          </div>
          <p className="mt-0.5 text-xs text-slate-500">
            Side-by-side YouTube Shorts vs. Instagram Reels performance for the same video
          </p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {pairs.slice(0, 6).map((pair) => {
          const igShare = 100 - pair.ytEngagementShare;
          return (
            <div
              key={pair.id}
              className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs"
            >
              {/* Header: Thumbnail + Shared Title */}
              <div className="flex items-start gap-3">
                {pair.thumbnailUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={pair.thumbnailUrl}
                    alt={pair.title}
                    className="h-14 w-24 shrink-0 rounded-lg border border-slate-200 object-cover"
                  />
                ) : (
                  <div className="flex h-14 w-24 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-[11px] text-slate-400">
                    No thumb
                  </div>
                )}

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                        pair.matchType === "cadence"
                          ? "bg-indigo-50 text-indigo-700"
                          : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      <Sparkles className="h-2.5 w-2.5" />
                      {pair.matchType === "cadence"
                        ? "Cadence Cross-Post"
                        : "Auto-Matched"}
                    </span>
                    <span className="text-[11px] text-slate-400">
                      {formatRelativeDate(pair.publishedAt)}
                    </span>
                  </div>
                  <p className="mt-1 line-clamp-2 text-sm font-semibold text-slate-900">
                    {pair.title}
                  </p>
                </div>
              </div>

              {/* Side-by-Side Platform Boxes (click to watch inside Cadence) */}
              <div className="mt-4 grid grid-cols-2 gap-2.5">
                {/* YouTube */}
                <button
                  type="button"
                  onClick={() => onPreviewPost(pair.youtube)}
                  className="group rounded-xl border border-rose-100 bg-rose-50/40 p-3 text-left transition hover:border-rose-300"
                >
                  <div className="flex items-center justify-between gap-1">
                    <PlatformBadge platform="YOUTUBE" />
                    <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-rose-600 opacity-80 group-hover:opacity-100">
                      <Play className="h-2.5 w-2.5 fill-current" />
                      Watch
                    </span>
                  </div>
                  <p className="mt-1 truncate text-[11px] font-medium text-slate-600">
                    {pair.youtube.accountName}
                  </p>
                  <div className="mt-2 flex flex-wrap items-center gap-2.5 text-xs font-bold text-slate-900">
                    {pair.youtube.views !== null && (
                      <span className="inline-flex items-center gap-1" title="Views">
                        <Eye className="h-3 w-3 text-emerald-600" />
                        {formatCompactNumber(pair.youtube.views)}
                      </span>
                    )}
                    <span className="inline-flex items-center gap-1" title="Likes">
                      <Heart className="h-3 w-3 text-pink-500" />
                      {formatCompactNumber(pair.youtube.likes)}
                    </span>
                    <span className="inline-flex items-center gap-1" title="Comments">
                      <MessageCircle className="h-3 w-3 text-amber-500" />
                      {formatCompactNumber(pair.youtube.comments)}
                    </span>
                  </div>
                </button>

                {/* Instagram */}
                <button
                  type="button"
                  onClick={() => onPreviewPost(pair.instagram)}
                  className="group rounded-xl border border-fuchsia-100 bg-fuchsia-50/40 p-3 text-left transition hover:border-fuchsia-300"
                >
                  <div className="flex items-center justify-between gap-1">
                    <PlatformBadge platform="INSTAGRAM" />
                    <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-fuchsia-600 opacity-80 group-hover:opacity-100">
                      <Play className="h-2.5 w-2.5 fill-current" />
                      Watch
                    </span>
                  </div>
                  <p className="mt-1 truncate text-[11px] font-medium text-slate-600">
                    {pair.instagram.accountName}
                  </p>
                  <div className="mt-2 flex flex-wrap items-center gap-2.5 text-xs font-bold text-slate-900">
                    <span className="inline-flex items-center gap-1" title="Likes">
                      <Heart className="h-3 w-3 text-pink-500" />
                      {formatCompactNumber(pair.instagram.likes)}
                    </span>
                    <span className="inline-flex items-center gap-1" title="Comments">
                      <MessageCircle className="h-3 w-3 text-amber-500" />
                      {formatCompactNumber(pair.instagram.comments)}
                    </span>
                  </div>
                </button>
              </div>

              {/* Engagement Split Bar */}
              <div className="mt-3 border-t border-slate-100 pt-3">
                <div className="flex items-center justify-between text-[11px] font-medium text-slate-500">
                  <span>
                    YouTube <strong className="text-rose-600">{pair.ytEngagementShare}%</strong>
                  </span>
                  <span className="text-slate-600">
                    {formatCompactNumber(pair.combinedLikes)} likes ·{" "}
                    {formatCompactNumber(pair.combinedComments)} comments total
                  </span>
                  <span>
                    <strong className="text-fuchsia-600">{igShare}%</strong> IG
                  </span>
                </div>
                <div className="mt-1.5 flex h-2 w-full overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full bg-rose-500 transition-all"
                    style={{ width: `${pair.ytEngagementShare}%` }}
                  />
                  <div
                    className="h-full bg-fuchsia-500 transition-all"
                    style={{ width: `${igShare}%` }}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
