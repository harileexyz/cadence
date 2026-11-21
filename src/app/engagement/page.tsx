"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  BarChart3,
  ExternalLink,
  Eye,
  Heart,
  Loader2,
  MessageCircle,
  RefreshCw,
  Users,
} from "lucide-react";
import { PlatformBadge } from "@/components/PlatformBadge";

interface PostEngagementDTO {
  id: string;
  platform: "YOUTUBE" | "INSTAGRAM";
  accountId: string;
  accountName: string;
  title: string;
  thumbnailUrl: string | null;
  url: string;
  publishedAt: string;
  views: number | null;
  likes: number;
  comments: number;
}

interface CommentDTO {
  id: string;
  platform: "YOUTUBE" | "INSTAGRAM";
  accountId: string;
  accountName: string;
  authorName: string;
  text: string;
  postTitle: string;
  postUrl: string;
  publishedAt: string;
}

interface ChannelEngagementDTO {
  accountId: string;
  platform: "YOUTUBE" | "INSTAGRAM";
  displayName: string;
  username: string | null;
  avatarUrl: string | null;
  followersCount: number;
  totalViews: number | null;
  totalPosts: number;
  error?: string;
}

interface EngagementResponse {
  totals: {
    totalFollowers: number;
    totalViews: number;
    recentLikes: number;
    recentComments: number;
    totalPosts: number;
  };
  channels: ChannelEngagementDTO[];
  recentPosts: PostEngagementDTO[];
  recentComments: CommentDTO[];
  fetchedAt: string;
}

function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString();
}

export default function EngagementPage() {
  const [data, setData] = useState<EngagementResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [selectedAccountId, setSelectedAccountId] = useState<string>("ALL");
  const [sortBy, setSortBy] = useState<"latest" | "views" | "likes">("latest");

  const loadEngagement = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    setError(null);
    try {
      const res = await fetch("/api/engagement");
      if (res.status === 401) {
        window.location.href = "/login";
        return;
      }
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error || "Failed to load engagement stats");
      }
      setData((await res.json()) as EngagementResponse);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load engagement stats"
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void loadEngagement(false);
  }, [loadEngagement]);

  const filteredPosts = useMemo(() => {
    if (!data) return [];
    const list =
      selectedAccountId === "ALL"
        ? data.recentPosts
        : data.recentPosts.filter((p) => p.accountId === selectedAccountId);

    return [...list].sort((a, b) => {
      if (sortBy === "views") return (b.views ?? 0) - (a.views ?? 0);
      if (sortBy === "likes") return b.likes - a.likes;
      return (
        new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
      );
    });
  }, [data, selectedAccountId, sortBy]);

  const filteredComments = useMemo(() => {
    if (!data) return [];
    return selectedAccountId === "ALL"
      ? data.recentComments
      : data.recentComments.filter((c) => c.accountId === selectedAccountId);
  }, [data, selectedAccountId]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Engagement & Analytics
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Live audience growth, views, likes, and recent comments across all your connected channels in one place.
          </p>
        </div>

        <button
          type="button"
          disabled={refreshing}
          onClick={() => void loadEngagement(true)}
          className="inline-flex items-center gap-2 self-start rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-sm font-medium text-slate-700 shadow-2xs hover:bg-slate-50 disabled:opacity-50"
        >
          <RefreshCw
            className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`}
          />
          <span>{refreshing ? "Refreshing..." : "Refresh Live Stats"}</span>
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center rounded-xl border border-slate-200 bg-white py-20 text-slate-500">
          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
          <span>Fetching live metrics from your connected channels...</span>
        </div>
      ) : !data || data.channels.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center">
          <BarChart3 className="mx-auto h-10 w-10 text-slate-400" />
          <h2 className="mt-3 text-base font-semibold text-slate-900">
            No connected channels yet
          </h2>
          <p className="mt-1 text-sm text-slate-600">
            Connect your YouTube channels or Instagram accounts to see all your engagement metrics here.
          </p>
          <Link
            href="/accounts"
            className="mt-5 inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
          >
            <span>Connect Channels</span>
          </Link>
        </div>
      ) : (
        <>
          {/* Top Cross-Platform KPI Cards */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-2xs">
              <div className="flex items-center justify-between text-xs font-medium text-slate-500">
                <span>Total Audience</span>
                <Users className="h-4 w-4 text-indigo-600" />
              </div>
              <p className="mt-2 text-2xl font-bold text-slate-900">
                {formatNumber(data.totals.totalFollowers)}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                Subscribers & followers across {data.channels.length} channels
              </p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-2xs">
              <div className="flex items-center justify-between text-xs font-medium text-slate-500">
                <span>Total Channel Views</span>
                <Eye className="h-4 w-4 text-emerald-600" />
              </div>
              <p className="mt-2 text-2xl font-bold text-slate-900">
                {formatNumber(data.totals.totalViews)}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                Lifetime views across connected channels
              </p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-2xs">
              <div className="flex items-center justify-between text-xs font-medium text-slate-500">
                <span>Recent Post Likes</span>
                <Heart className="h-4 w-4 text-pink-600" />
              </div>
              <p className="mt-2 text-2xl font-bold text-slate-900">
                {formatNumber(data.totals.recentLikes)}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                Across {data.recentPosts.length} latest posts
              </p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-2xs">
              <div className="flex items-center justify-between text-xs font-medium text-slate-500">
                <span>Recent Comments</span>
                <MessageCircle className="h-4 w-4 text-amber-600" />
              </div>
              <p className="mt-2 text-2xl font-bold text-slate-900">
                {formatNumber(data.totals.recentComments)}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                Updated {new Date(data.fetchedAt).toLocaleTimeString()}
              </p>
            </div>
          </div>

          {/* Per-Channel Overview Cards (click to filter) */}
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
                Channels Breakdown (click a channel to filter)
              </h2>
              {selectedAccountId !== "ALL" && (
                <button
                  type="button"
                  onClick={() => setSelectedAccountId("ALL")}
                  className="text-xs font-medium text-indigo-600 hover:underline"
                >
                  Show all channels
                </button>
              )}
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {data.channels.map((ch) => {
                const isSelected = selectedAccountId === ch.accountId;
                return (
                  <button
                    key={ch.accountId}
                    type="button"
                    onClick={() =>
                      setSelectedAccountId(isSelected ? "ALL" : ch.accountId)
                    }
                    className={`flex flex-col rounded-xl border p-4 text-left transition ${
                      isSelected
                        ? "border-indigo-500 bg-indigo-50/40 ring-1 ring-indigo-500"
                        : "border-slate-200 bg-white hover:border-slate-300"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      {ch.avatarUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={ch.avatarUrl}
                          alt={ch.displayName}
                          className="h-10 w-10 rounded-full object-cover"
                        />
                      ) : (
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-sm font-semibold text-slate-600">
                          {ch.displayName.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <PlatformBadge platform={ch.platform} />
                        </div>
                        <p className="mt-0.5 truncate text-sm font-semibold text-slate-900">
                          {ch.displayName}
                        </p>
                      </div>
                    </div>

                    {ch.error ? (
                      <p className="mt-3 text-xs text-red-600">{ch.error}</p>
                    ) : (
                      <div className="mt-4 grid grid-cols-3 gap-2 border-t border-slate-100 pt-3 text-center">
                        <div>
                          <p className="text-[11px] text-slate-500">
                            {ch.platform === "YOUTUBE" ? "Subs" : "Followers"}
                          </p>
                          <p className="text-sm font-bold text-slate-900">
                            {formatNumber(ch.followersCount)}
                          </p>
                        </div>
                        <div>
                          <p className="text-[11px] text-slate-500">Views</p>
                          <p className="text-sm font-bold text-slate-900">
                            {ch.totalViews !== null
                              ? formatNumber(ch.totalViews)
                              : "—"}
                          </p>
                        </div>
                        <div>
                          <p className="text-[11px] text-slate-500">Posts</p>
                          <p className="text-sm font-bold text-slate-900">
                            {formatNumber(ch.totalPosts)}
                          </p>
                        </div>
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </section>

          {/* Main 2-Column Content: Recent Posts Performance + Unified Comments Inbox */}
          <div className="grid gap-6 lg:grid-cols-3">
            {/* Recent Posts Performance (2 cols) */}
            <section className="space-y-3 lg:col-span-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
                  Recent Posts Performance ({filteredPosts.length})
                </h2>

                <div className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white p-0.5 text-xs">
                  {(["latest", "views", "likes"] as const).map((mode) => (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => setSortBy(mode)}
                      className={`rounded-md px-2.5 py-1 font-medium capitalize transition ${
                        sortBy === mode
                          ? "bg-slate-900 text-white"
                          : "text-slate-600 hover:bg-slate-100"
                      }`}
                    >
                      {mode}
                    </button>
                  ))}
                </div>
              </div>

              {filteredPosts.length === 0 ? (
                <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
                  No recent published posts found on the selected channel(s).
                </div>
              ) : (
                <div className="divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white shadow-2xs">
                  {filteredPosts.map((post) => (
                    <div
                      key={`${post.platform}-${post.id}`}
                      className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="flex min-w-0 items-center gap-3.5">
                        {post.thumbnailUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={post.thumbnailUrl}
                            alt={post.title}
                            className="h-14 w-24 shrink-0 rounded-lg border border-slate-200 object-cover"
                          />
                        ) : (
                          <div className="flex h-14 w-24 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-xs text-slate-400">
                            No thumb
                          </div>
                        )}

                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <PlatformBadge platform={post.platform} />
                            <span className="text-xs font-medium text-slate-600">
                              {post.accountName}
                            </span>
                            <span className="text-xs text-slate-400">
                              · {new Date(post.publishedAt).toLocaleDateString()}
                            </span>
                          </div>
                          <a
                            href={post.url}
                            target="_blank"
                            rel="noreferrer"
                            className="mt-1 inline-flex items-center gap-1 truncate text-sm font-semibold text-slate-900 hover:text-indigo-600"
                          >
                            <span className="truncate">{post.title}</span>
                            <ExternalLink className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                          </a>
                        </div>
                      </div>

                      <div className="flex shrink-0 items-center gap-4 text-xs font-medium text-slate-700">
                        {post.views !== null && (
                          <span className="inline-flex items-center gap-1" title="Views">
                            <Eye className="h-3.5 w-3.5 text-slate-400" />
                            {formatNumber(post.views)}
                          </span>
                        )}
                        <span className="inline-flex items-center gap-1" title="Likes">
                          <Heart className="h-3.5 w-3.5 text-pink-500" />
                          {formatNumber(post.likes)}
                        </span>
                        <span className="inline-flex items-center gap-1" title="Comments">
                          <MessageCircle className="h-3.5 w-3.5 text-amber-500" />
                          {formatNumber(post.comments)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* Unified Recent Comments Inbox (1 col) */}
            <section className="space-y-3">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
                Recent Comments ({filteredComments.length})
              </h2>

              {filteredComments.length === 0 ? (
                <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-xs text-slate-500">
                  No recent comments across the selected channel(s) yet.
                </div>
              ) : (
                <div className="divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white shadow-2xs">
                  {filteredComments.map((cmt) => (
                    <div key={`${cmt.platform}-${cmt.id}`} className="space-y-1.5 p-4">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5">
                          <PlatformBadge platform={cmt.platform} />
                          <span className="text-xs font-semibold text-slate-900">
                            {cmt.authorName}
                          </span>
                        </div>
                        <span className="text-[11px] text-slate-400">
                          {new Date(cmt.publishedAt).toLocaleDateString()}
                        </span>
                      </div>

                      <p className="text-xs leading-relaxed text-slate-700">
                        {cmt.text}
                      </p>

                      <a
                        href={cmt.postUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-[11px] font-medium text-indigo-600 hover:underline"
                      >
                        <span className="truncate">
                          on {cmt.accountName}: {cmt.postTitle}
                        </span>
                        <ExternalLink className="h-3 w-3 shrink-0" />
                      </a>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>
        </>
      )}
    </div>
  );
}
