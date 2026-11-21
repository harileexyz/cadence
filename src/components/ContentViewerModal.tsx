"use client";

import { useEffect } from "react";
import {
  ExternalLink,
  Eye,
  Heart,
  MessageCircle,
  X,
} from "lucide-react";
import { PlatformBadge } from "@/components/PlatformBadge";
import {
  formatCompactNumber,
  formatPercent,
  getPostEngagementRate,
  type PostEngagementDTO,
} from "@/lib/analytics";

function getInstagramEmbedUrl(permalink: string): string | null {
  const match = permalink.match(
    /instagram\.com\/(?:p|reel|tv)\/([A-Za-z0-9_-]+)/i
  );
  if (!match) return null;
  return `https://www.instagram.com/p/${match[1]}/embed`;
}

export function ContentViewerModal({
  post,
  onClose,
}: {
  post: PostEngagementDTO | null;
  onClose: () => void;
}) {
  useEffect(() => {
    if (!post) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [post, onClose]);

  if (!post) return null;

  const rate = getPostEngagementRate(post);
  const isYouTube = post.platform === "YOUTUBE";
  const isIgVideo =
    post.platform === "INSTAGRAM" &&
    (post.mediaType === "VIDEO" ||
      post.mediaType === "REELS" ||
      (post.mediaUrl?.includes(".mp4") ?? false));
  const igEmbedUrl =
    post.platform === "INSTAGRAM" ? getInstagramEmbedUrl(post.url) : null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 p-3 backdrop-blur-xs sm:p-6"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={`Preview ${post.title}`}
    >
      <div
        className="relative flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl lg:flex-row"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          aria-label="Close preview"
          className="absolute top-3 right-3 z-20 flex h-9 w-9 items-center justify-center rounded-full bg-slate-900/75 text-white transition hover:bg-slate-900"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Left: Media Player */}
        <div className="flex min-h-[300px] flex-1 items-center justify-center bg-slate-950 lg:min-h-[520px]">
          {isYouTube ? (
            <iframe
              src={`https://www.youtube.com/embed/${encodeURIComponent(
                post.id
              )}?autoplay=1&rel=0`}
              title={post.title}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              className="aspect-video h-full max-h-[65vh] w-full lg:max-h-[560px]"
            />
          ) : isIgVideo && post.mediaUrl ? (
            <video
              src={post.mediaUrl}
              poster={post.thumbnailUrl || undefined}
              controls
              autoPlay
              playsInline
              className="max-h-[65vh] w-full object-contain lg:max-h-[560px]"
            />
          ) : post.mediaUrl && post.mediaType === "IMAGE" ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={post.mediaUrl}
              alt={post.title}
              className="max-h-[65vh] w-full object-contain lg:max-h-[560px]"
            />
          ) : igEmbedUrl ? (
            <iframe
              src={igEmbedUrl}
              title={post.title}
              className="h-[520px] w-full max-w-[400px] bg-white"
            />
          ) : post.thumbnailUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={post.thumbnailUrl}
              alt={post.title}
              className="max-h-[65vh] w-full object-contain lg:max-h-[560px]"
            />
          ) : (
            <p className="text-xs text-slate-400">
              Preview unavailable — open directly on {post.platform}.
            </p>
          )}
        </div>

        {/* Right: Metadata & Live Metrics */}
        <div className="flex w-full flex-col justify-between border-t border-slate-200 bg-white p-5 lg:w-80 lg:shrink-0 lg:border-t-0 lg:border-l">
          <div className="space-y-4 overflow-y-auto pr-1">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <PlatformBadge platform={post.platform} />
                <span className="text-xs font-semibold text-slate-700">
                  {post.accountName}
                </span>
              </div>
              <p className="mt-1 text-[11px] text-slate-400">
                Published{" "}
                {new Date(post.publishedAt).toLocaleString(undefined, {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
            </div>

            <h3 className="text-sm font-bold leading-snug text-slate-900">
              {post.title}
            </h3>

            {/* Live Stats Grid */}
            <div className="grid grid-cols-3 gap-2 rounded-xl border border-slate-100 bg-slate-50 p-3 text-center">
              <div>
                <p className="flex items-center justify-center gap-1 text-[10px] font-medium text-slate-500">
                  <Eye className="h-3 w-3 text-emerald-500" />
                  Views
                </p>
                <p className="mt-0.5 text-sm font-bold text-slate-900">
                  {post.views !== null ? formatCompactNumber(post.views) : "—"}
                </p>
              </div>
              <div>
                <p className="flex items-center justify-center gap-1 text-[10px] font-medium text-slate-500">
                  <Heart className="h-3 w-3 text-pink-500" />
                  Likes
                </p>
                <p className="mt-0.5 text-sm font-bold text-slate-900">
                  {formatCompactNumber(post.likes)}
                </p>
              </div>
              <div>
                <p className="flex items-center justify-center gap-1 text-[10px] font-medium text-slate-500">
                  <MessageCircle className="h-3 w-3 text-amber-500" />
                  Comments
                </p>
                <p className="mt-0.5 text-sm font-bold text-slate-900">
                  {formatCompactNumber(post.comments)}
                </p>
              </div>
            </div>

            {rate !== null && (
              <div className="flex items-center justify-between rounded-lg bg-indigo-50 px-3 py-2 text-xs">
                <span className="font-medium text-indigo-700">
                  Engagement Rate
                </span>
                <span className="font-bold text-indigo-900">
                  {formatPercent(rate)}
                </span>
              </div>
            )}

            {post.description && post.description.trim() !== post.title.trim() && (
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                  Caption / Description
                </p>
                <p className="mt-1 max-h-40 overflow-y-auto whitespace-pre-wrap text-xs leading-relaxed text-slate-600">
                  {post.description}
                </p>
              </div>
            )}
          </div>

          <div className="mt-4 border-t border-slate-100 pt-4">
            <a
              href={post.url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex w-full items-center justify-center gap-1.5 rounded-xl bg-slate-900 px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-slate-800"
            >
              <span>
                Open on {isYouTube ? "YouTube" : "Instagram"}
              </span>
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
