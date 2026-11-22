"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import {
  AlertCircle,
  CalendarClock,
  Check,
  CheckCircle2,
  Clock,
  ExternalLink,
  Film,
  Globe,
  Image as ImageIcon,
  Instagram,
  Loader2,
  PenSquare,
  Play,
  RefreshCw,
  Send,
  Sparkles,
  Trash2,
  X,
  Youtube,
} from "lucide-react";
import { MarketingLanding } from "@/components/MarketingLanding";
import { OnboardingChecklist } from "@/components/OnboardingChecklist";
import { PlatformBadge } from "@/components/PlatformBadge";

interface MediaAssetDTO {
  id: string;
  filename: string;
  mimeType: string;
  publicUrl: string;
  width: number | null;
  height: number | null;
  durationSec: number | null;
}

interface PostTargetDTO {
  id: string;
  status: "PENDING" | "PROCESSING" | "PUBLISHED" | "FAILED";
  externalPostUrl: string | null;
  errorMessage: string | null;
  retryCount: number;
  publishedAt: string | null;
  account: {
    id: string;
    platform: "YOUTUBE" | "INSTAGRAM";
    displayName: string;
    username: string | null;
  };
}

interface PostDTO {
  id: string;
  title: string | null;
  baseCaption: string;
  scheduledAt: string | null;
  status:
    | "DRAFT"
    | "SCHEDULED"
    | "PROCESSING"
    | "PUBLISHED"
    | "PARTIAL_FAILURE"
    | "FAILED";
  createdAt: string;
  media: Array<{ mediaAsset: MediaAssetDTO }>;
  targets: PostTargetDTO[];
}

const FILTERS = ["ALL", "SCHEDULED", "PUBLISHED", "DRAFT", "FAILED"] as const;
type FilterTab = (typeof FILTERS)[number];

function StatusPill({ status }: { status: PostDTO["status"] }) {
  const styles: Record<PostDTO["status"], string> = {
    DRAFT: "bg-slate-100 text-slate-700",
    SCHEDULED: "bg-indigo-50 text-indigo-700",
    PROCESSING: "bg-amber-50 text-amber-700",
    PUBLISHED: "bg-emerald-50 text-emerald-700",
    PARTIAL_FAILURE: "bg-orange-50 text-orange-700",
    FAILED: "bg-red-50 text-red-700",
  };
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${styles[status]}`}
    >
      {status.replace("_", " ")}
    </span>
  );
}

export default function QueuePage() {
  const [posts, setPosts] = useState<PostDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [isUnauthenticated, setIsUnauthenticated] = useState(false);
  const [showPublicWebsite, setShowPublicWebsite] = useState(false);
  const [filter, setFilter] = useState<FilterTab>("ALL");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [previewPost, setPreviewPost] = useState<PostDTO | null>(null);

  const loadPosts = useCallback(async () => {
    try {
      const res = await fetch("/api/posts");
      if (res.status === 401) {
        setIsUnauthenticated(true);
        return;
      }
      if (res.ok) {
        setIsUnauthenticated(false);
        const data = (await res.json()) as { posts: PostDTO[] };
        setPosts(data.posts);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadPosts();
    const timer = setInterval(() => void loadPosts(), 10_000);
    return () => clearInterval(timer);
  }, [loadPosts]);

  async function handleRetryTarget(targetId: string) {
    setBusyId(targetId);
    try {
      await fetch(`/api/targets/${targetId}/retry`, { method: "POST" });
      await loadPosts();
    } finally {
      setBusyId(null);
    }
  }

  async function handlePublishDraftNow(postId: string) {
    setBusyId(postId);
    try {
      await fetch(`/api/posts/${postId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "SCHEDULED",
          scheduledAt: new Date().toISOString(),
        }),
      });
      await loadPosts();
    } finally {
      setBusyId(null);
    }
  }

  async function handleDeletePost(postId: string) {
    setBusyId(postId);
    try {
      await fetch(`/api/posts/${postId}`, { method: "DELETE" });
      await loadPosts();
    } finally {
      setBusyId(null);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center rounded-xl border border-slate-200 bg-white py-16 text-slate-500">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
        <span>Loading...</span>
      </div>
    );
  }

  if (isUnauthenticated || showPublicWebsite) {
    return (
      <MarketingLanding
        isLoggedIn={!isUnauthenticated}
        onBackToDashboard={
          !isUnauthenticated ? () => setShowPublicWebsite(false) : undefined
        }
      />
    );
  }

  const filtered = posts.filter((p) => {
    if (filter === "ALL") return true;
    if (filter === "FAILED") {
      return p.status === "FAILED" || p.status === "PARTIAL_FAILURE";
    }
    return p.status === filter;
  });

  const scheduledCount = posts.filter(
    (p) => p.status === "SCHEDULED" || p.status === "PROCESSING"
  ).length;
  const publishedCount = posts.filter((p) => p.status === "PUBLISHED").length;
  const failedCount = posts.filter(
    (p) => p.status === "FAILED" || p.status === "PARTIAL_FAILURE"
  ).length;
  const hasYouTubeConnected = posts.some((p) =>
    p.targets.some((t) => t.account.platform === "YOUTUBE")
  );
  const hasInstagramConnected = posts.some((p) =>
    p.targets.some((t) => t.account.platform === "INSTAGRAM")
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Publishing Queue
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Track scheduled cross-posts, live publishing progress, and per-channel results.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setShowPublicWebsite(true)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-indigo-200 bg-indigo-50/70 px-3 py-2 text-xs font-semibold text-indigo-700 hover:bg-indigo-100"
          >
            <Globe className="h-3.5 w-3.5" />
            <span>Preview Public Website</span>
          </button>
          <button
            type="button"
            onClick={() => void loadPosts()}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            <RefreshCw className="h-4 w-4" />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Interactive Getting-Started Onboarding Checklist (dismissible) */}
      <OnboardingChecklist postsCount={posts.length} />

      {/* SaaS Overview Metrics & Getting Started Checklist */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs">
          <p className="text-xs font-medium text-slate-500">Scheduled in Queue</p>
          <p className="mt-1 text-2xl font-bold text-slate-900">
            {scheduledCount}
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs">
          <p className="text-xs font-medium text-slate-500">Published Posts</p>
          <p className="mt-1 text-2xl font-bold text-emerald-700">
            {publishedCount}
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs">
          <p className="text-xs font-medium text-slate-500">Needs Attention</p>
          <p className="mt-1 text-2xl font-bold text-slate-900">
            {failedCount}
          </p>
        </div>
        <Link
          href="/accounts"
          className="flex flex-col justify-between rounded-xl border border-indigo-200 bg-indigo-50/60 p-4 transition hover:bg-indigo-50"
        >
          <p className="text-xs font-semibold text-indigo-700">
            Next Step: Connect Instagram
          </p>
          <p className="mt-1 text-xs text-slate-600">
            YouTube is active · Click to add your Instagram handles →
          </p>
          <span className="mt-1 hidden">
            {String(hasYouTubeConnected)}-{String(hasInstagramConnected)}
          </span>
        </Link>
      </div>

      <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-3">
        {FILTERS.map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setFilter(tab)}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
              filter === tab
                ? "bg-slate-900 text-white"
                : "bg-white text-slate-600 hover:bg-slate-100"
            }`}
          >
            {tab.charAt(0) + tab.slice(1).toLowerCase()}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white p-12 text-center">
          <CalendarClock className="mx-auto h-10 w-10 text-slate-400" />
          <h2 className="mt-3 text-base font-semibold text-slate-900">
            No posts in this view
          </h2>
          <p className="mt-1 text-sm text-slate-600">
            Create a cross-post for your connected YouTube and Instagram accounts.
          </p>
          <Link
            href="/compose"
            className="mt-5 inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
          >
            <PenSquare className="h-4 w-4" />
            <span>Compose a Post</span>
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((post) => {
            const firstAsset = post.media[0]?.mediaAsset;
            const isVideo = firstAsset?.mimeType.startsWith("video/");

            return (
              <div
                key={post.id}
                className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
              >
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="flex gap-4">
                    <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-slate-200 bg-slate-100">
                      {firstAsset ? (
                        isVideo ? (
                          <Film className="h-7 w-7 text-slate-500" />
                        ) : (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={firstAsset.publicUrl}
                            alt={firstAsset.filename}
                            className="h-full w-full object-cover"
                          />
                        )
                      ) : (
                        <ImageIcon className="h-7 w-7 text-slate-400" />
                      )}
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <StatusPill status={post.status} />
                        {post.scheduledAt && (
                          <span className="inline-flex items-center gap-1 text-xs text-slate-500">
                            <Clock className="h-3.5 w-3.5" />
                            {new Date(post.scheduledAt).toLocaleString()}
                          </span>
                        )}
                        {post.media.length > 0 && (
                          <span className="text-xs text-slate-500">
                            {post.media.length} media file
                            {post.media.length > 1 ? "s" : ""}
                          </span>
                        )}
                      </div>

                      {post.title && (
                        <h3 className="text-base font-semibold text-slate-900">
                          {post.title}
                        </h3>
                      )}

                      <p className="line-clamp-2 whitespace-pre-wrap text-sm text-slate-600">
                        {post.baseCaption || "No caption"}
                      </p>
                    </div>
                  </div>

                  <div className="flex shrink-0 items-center gap-2">
                    {firstAsset && (
                      <button
                        type="button"
                        onClick={() => setPreviewPost(post)}
                        className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-700"
                      >
                        <Play className="h-3.5 w-3.5" />
                        <span>Preview</span>
                      </button>
                    )}
                    {post.status === "DRAFT" && (
                      <button
                        type="button"
                        disabled={busyId === post.id}
                        onClick={() => void handlePublishDraftNow(post.id)}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
                      >
                        <Send className="h-3.5 w-3.5" />
                        <span>Post Now</span>
                      </button>
                    )}
                    <button
                      type="button"
                      disabled={busyId === post.id}
                      onClick={() => void handleDeletePost(post.id)}
                      className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-red-50 hover:text-red-700 disabled:opacity-50"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      <span>Delete</span>
                    </button>
                  </div>
                </div>

                <div className="mt-4 border-t border-slate-100 pt-3">
                  <div className="grid gap-2 sm:grid-cols-2">
                    {post.targets.map((target) => (
                      <div
                        key={target.id}
                        className="flex items-start justify-between gap-3 rounded-lg border border-slate-100 bg-slate-50 px-3 py-2.5"
                      >
                        <div className="min-w-0 space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <PlatformBadge platform={target.account.platform} />
                            <span className="truncate text-sm font-medium text-slate-800">
                              {target.account.displayName}
                            </span>
                          </div>

                          {target.errorMessage && (
                            <p className="flex items-start gap-1 text-xs text-red-600">
                              <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                              <span className="break-words">
                                {target.errorMessage}
                              </span>
                            </p>
                          )}
                        </div>

                        <div className="flex shrink-0 items-center gap-2">
                          {target.status === "PUBLISHED" && (
                            <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700">
                              <CheckCircle2 className="h-3.5 w-3.5" />
                              {target.externalPostUrl ? (
                                <a
                                  href={target.externalPostUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="inline-flex items-center gap-0.5 underline"
                                >
                                  View
                                  <ExternalLink className="h-3 w-3" />
                                </a>
                              ) : (
                                "Published"
                              )}
                            </span>
                          )}

                          {target.status === "PROCESSING" && (
                            <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-700">
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              Publishing
                            </span>
                          )}

                          {target.status === "PENDING" && (
                            <span className="text-xs font-medium text-slate-500">
                              {target.retryCount > 0
                                ? `Retry #${target.retryCount}`
                                : "Queued"}
                            </span>
                          )}

                          {target.status === "FAILED" && (
                            <button
                              type="button"
                              disabled={busyId === target.id}
                              onClick={() => void handleRetryTarget(target.id)}
                              className="inline-flex items-center gap-1 rounded bg-red-600 px-2 py-1 text-xs font-medium text-white hover:bg-red-700 disabled:opacity-50"
                            >
                              <RefreshCw className="h-3 w-3" />
                              Retry
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* In-App Queue Media Preview Modal */}
      {previewPost && previewPost.media[0]?.mediaAsset && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 p-4 backdrop-blur-xs"
          onClick={() => setPreviewPost(null)}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="relative flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-slate-900">
                  {previewPost.title || previewPost.media[0].mediaAsset.filename}
                </p>
                <p className="text-[11px] text-slate-500">
                  {previewPost.status.replace("_", " ")} ·{" "}
                  {previewPost.targets.map((t) => t.account.displayName).join(", ")}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setPreviewPost(null)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="flex items-center justify-center bg-slate-950">
              {previewPost.media[0].mediaAsset.mimeType.startsWith("video/") ? (
                <video
                  src={previewPost.media[0].mediaAsset.publicUrl}
                  controls
                  autoPlay
                  playsInline
                  className="max-h-[62vh] w-full object-contain"
                />
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={previewPost.media[0].mediaAsset.publicUrl}
                  alt={previewPost.title || "Post preview"}
                  className="max-h-[62vh] w-full object-contain"
                />
              )}
            </div>

            {previewPost.baseCaption && (
              <div className="max-h-32 overflow-y-auto border-t border-slate-100 bg-slate-50 px-4 py-3 text-xs whitespace-pre-wrap text-slate-700">
                {previewPost.baseCaption}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
