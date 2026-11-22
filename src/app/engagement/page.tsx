"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Activity,
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Award,
  BarChart3,
  ExternalLink,
  Eye,
  Heart,
  Instagram,
  Layers,
  Loader2,
  MessageCircle,
  PenSquare,
  Play,
  RefreshCw,
  Search,
  Sparkles,
  Users,
  Youtube,
} from "lucide-react";
import { ContentViewerModal } from "@/components/ContentViewerModal";
import { CrossPlatformComparison } from "@/components/CrossPlatformComparison";
import {
  ChannelComparisonChart,
  MiniSparkline,
  PostsPerformanceChart,
} from "@/components/EngagementCharts";
import { PlatformBadge } from "@/components/PlatformBadge";
import { UnifiedCommentInbox } from "@/components/UnifiedCommentInbox";
import {
  computeChannelStats,
  computeScopedSummary,
  formatCompactNumber,
  formatPercent,
  formatRelativeDate,
  getPostEngagementRate,
  matchCrossPostedPairs,
  type EngagementResponse,
  type PostEngagementDTO,
} from "@/lib/analytics";

type SortMode = "latest" | "views" | "likes" | "rate";

export default function EngagementPage() {
  const [data, setData] = useState<EngagementResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [selectedAccountId, setSelectedAccountId] = useState<string>("ALL");
  const [sortBy, setSortBy] = useState<SortMode>("latest");
  const [postQuery, setPostQuery] = useState("");
  const [previewPost, setPreviewPost] = useState<PostEngagementDTO | null>(null);

  // Read optional ?account=<id> query param on initial load
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const acc = params.get("account");
    if (acc) setSelectedAccountId(acc);
  }, []);

  const selectAccount = useCallback((accountId: string) => {
    setSelectedAccountId(accountId);
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      if (accountId === "ALL") {
        url.searchParams.delete("account");
      } else {
        url.searchParams.set("account", accountId);
      }
      window.history.replaceState({}, "", url.toString());
    }
  }, []);

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
      const payload = (await res.json()) as EngagementResponse;
      setData(payload);
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

  // Ensure selectedAccountId still exists in loaded channels
  const activeChannel = useMemo(() => {
    if (!data || selectedAccountId === "ALL") return null;
    return (
      data.channels.find((c) => c.accountId === selectedAccountId) ?? null
    );
  }, [data, selectedAccountId]);

  const effectiveAccountId = activeChannel ? activeChannel.accountId : "ALL";

  const channelStats = useMemo(() => {
    if (!data) return [];
    return data.channels.map((ch) => computeChannelStats(ch, data.recentPosts));
  }, [data]);

  const scopedChannels = useMemo(() => {
    if (!data) return [];
    return activeChannel ? [activeChannel] : data.channels;
  }, [data, activeChannel]);

  const scopedPosts = useMemo(() => {
    if (!data) return [];
    return activeChannel
      ? data.recentPosts.filter((p) => p.accountId === activeChannel.accountId)
      : data.recentPosts;
  }, [data, activeChannel]);

  const scopedSummary = useMemo(
    () => computeScopedSummary(scopedChannels, scopedPosts),
    [scopedChannels, scopedPosts]
  );

  const filteredPosts = useMemo(() => {
    const q = postQuery.trim().toLowerCase();
    const list = q
      ? scopedPosts.filter(
          (p) =>
            p.title.toLowerCase().includes(q) ||
            p.accountName.toLowerCase().includes(q)
        )
      : scopedPosts;

    return [...list].sort((a, b) => {
      if (sortBy === "views") return (b.views ?? 0) - (a.views ?? 0);
      if (sortBy === "likes") return b.likes - a.likes;
      if (sortBy === "rate") {
        return (getPostEngagementRate(b) ?? -1) - (getPostEngagementRate(a) ?? -1);
      }
      return (
        new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
      );
    });
  }, [scopedPosts, postQuery, sortBy]);

  const maxPostMetric = useMemo(() => {
    if (filteredPosts.length === 0) return 1;
    return Math.max(
      ...filteredPosts.map((p) =>
        p.views !== null ? p.views : p.likes + p.comments
      ),
      1
    );
  }, [filteredPosts]);

  const filteredComments = useMemo(() => {
    if (!data) return [];
    return activeChannel
      ? data.recentComments.filter(
          (c) => c.accountId === activeChannel.accountId
        )
      : data.recentComments;
  }, [data, activeChannel]);

  const crossPostPairs = useMemo(() => {
    if (!data) return [];
    return matchCrossPostedPairs(data.recentPosts, data.crossPostLinks);
  }, [data]);

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Analytics & Engagement
            </h1>
            {data && (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-700">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                Live
              </span>
            )}
          </div>
          <p className="mt-1 text-sm text-slate-600">
            Track cross-channel growth or drill into any individual account&apos;s performance.
          </p>
        </div>

        <div className="flex items-center gap-2.5 self-start sm:self-auto">
          {data && (
            <span className="hidden text-xs text-slate-400 sm:inline">
              Updated {new Date(data.fetchedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            </span>
          )}
          <button
            type="button"
            disabled={refreshing}
            onClick={() => void loadEngagement(true)}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm font-medium text-slate-700 shadow-2xs transition hover:bg-slate-50 disabled:opacity-50"
          >
            <RefreshCw
              className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`}
            />
            <span>{refreshing ? "Refreshing..." : "Refresh"}</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {loading ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white py-24 text-slate-500">
          <Loader2 className="h-6 w-6 animate-spin text-indigo-600" />
          <p className="mt-3 text-sm font-medium text-slate-700">
            Loading live analytics from your channels...
          </p>
          <p className="mt-1 text-xs text-slate-400">
            Fetching subscribers, views, recent posts, and comments
          </p>
        </div>
      ) : !data || data.channels.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center">
          <BarChart3 className="mx-auto h-10 w-10 text-slate-400" />
          <h2 className="mt-3 text-base font-semibold text-slate-900">
            No connected channels yet
          </h2>
          <p className="mt-1 text-sm text-slate-600">
            Connect your YouTube channels or Instagram accounts to unlock your live analytics dashboard.
          </p>
          <Link
            href="/accounts"
            className="mt-5 inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-2xs hover:bg-indigo-700"
          >
            <span>Connect Channels</span>
          </Link>
        </div>
      ) : (
        <>
          {/* Account Switcher Bar — Grouped by Platform with unmistakable YT / IG badges */}
          <div className="space-y-2.5 rounded-2xl border border-slate-200 bg-white p-3.5 shadow-2xs">
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => selectAccount("ALL")}
                className={`inline-flex shrink-0 items-center gap-2 rounded-full border px-3.5 py-1.5 text-xs font-semibold transition ${
                  effectiveAccountId === "ALL"
                    ? "border-slate-900 bg-slate-900 text-white shadow-xs"
                    : "border-slate-200 bg-slate-50 text-slate-700 hover:border-slate-300 hover:bg-slate-100"
                }`}
              >
                <Layers className="h-3.5 w-3.5" />
                <span>All Channels</span>
                <span
                  className={`rounded-full px-1.5 py-0.5 text-[10px] ${
                    effectiveAccountId === "ALL"
                      ? "bg-white/20 text-white"
                      : "bg-white text-slate-600"
                  }`}
                >
                  {data.channels.length}
                </span>
              </button>

              {(["YOUTUBE", "INSTAGRAM"] as const).map((platform) => {
                const group = data.channels.filter(
                  (c) => c.platform === platform
                );
                if (group.length === 0) return null;
                const isYt = platform === "YOUTUBE";

                return (
                  <div
                    key={platform}
                    className="flex flex-wrap items-center gap-1.5"
                  >
                    <span className="hidden h-5 w-px bg-slate-200 sm:inline-block" />
                    <span
                      className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-[10px] font-bold uppercase tracking-wide ${
                        isYt
                          ? "bg-red-50 text-red-700"
                          : "bg-fuchsia-50 text-fuchsia-700"
                      }`}
                    >
                      {isYt ? (
                        <Youtube className="h-3 w-3" />
                      ) : (
                        <Instagram className="h-3 w-3" />
                      )}
                      <span>{isYt ? "YouTube" : "Instagram"}</span>
                    </span>

                    {group.map((ch) => {
                      const isSelected = effectiveAccountId === ch.accountId;
                      return (
                        <button
                          key={ch.accountId}
                          type="button"
                          onClick={() => selectAccount(ch.accountId)}
                          className={`inline-flex shrink-0 items-center gap-2 rounded-full border py-1 pr-3 pl-1.5 text-xs font-semibold transition ${
                            isSelected
                              ? isYt
                                ? "border-red-600 bg-red-600 text-white shadow-xs"
                                : "border-fuchsia-600 bg-gradient-to-r from-fuchsia-600 to-pink-600 text-white shadow-xs"
                              : isYt
                                ? "border-red-200/80 bg-red-50/40 text-slate-800 hover:border-red-300 hover:bg-red-50"
                                : "border-fuchsia-200/80 bg-fuchsia-50/40 text-slate-800 hover:border-fuchsia-300 hover:bg-fuchsia-50"
                          }`}
                        >
                          {ch.avatarUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={ch.avatarUrl}
                              alt={ch.displayName}
                              referrerPolicy="no-referrer"
                              className="h-5 w-5 shrink-0 rounded-full object-cover ring-1 ring-white/80"
                            />
                          ) : (
                            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-slate-200 text-[10px] font-bold text-slate-700">
                              {ch.displayName.charAt(0).toUpperCase()}
                            </span>
                          )}
                          <span className="max-w-[130px] truncate">
                            {ch.displayName}
                          </span>
                          {isYt ? (
                            <Youtube
                              className={`h-3.5 w-3.5 shrink-0 ${
                                isSelected ? "text-white/90" : "text-red-600"
                              }`}
                            />
                          ) : (
                            <Instagram
                              className={`h-3.5 w-3.5 shrink-0 ${
                                isSelected ? "text-white/90" : "text-fuchsia-600"
                              }`}
                            />
                          )}
                        </button>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Dedicated Single-Account Header Banner */}
          {activeChannel && (
            <div className="flex flex-col gap-4 rounded-2xl border border-indigo-200/80 bg-gradient-to-r from-indigo-50/80 via-white to-white p-5 shadow-2xs sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-4">
                {activeChannel.avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={activeChannel.avatarUrl}
                    alt={activeChannel.displayName}
                    referrerPolicy="no-referrer"
                    className="h-14 w-14 rounded-2xl object-cover ring-2 ring-white shadow-xs"
                  />
                ) : (
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-100 text-lg font-bold text-indigo-700">
                    {activeChannel.displayName.charAt(0).toUpperCase()}
                  </div>
                )}

                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <PlatformBadge platform={activeChannel.platform} />
                    {activeChannel.username && (
                      <span className="text-xs font-medium text-slate-500">
                        {activeChannel.username}
                      </span>
                    )}
                    <span className="text-xs text-slate-400">
                      · {formatCompactNumber(activeChannel.totalPosts)} total posts
                    </span>
                  </div>
                  <h2 className="mt-1 truncate text-lg font-bold text-slate-900">
                    {activeChannel.displayName}
                  </h2>
                  {activeChannel.error && (
                    <p className="mt-1 text-xs text-red-600">
                      {activeChannel.error}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => selectAccount("ALL")}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                  <span>All Channels</span>
                </button>
                <Link
                  href="/compose"
                  className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-3.5 py-2 text-xs font-semibold text-white shadow-2xs hover:bg-indigo-700"
                >
                  <PenSquare className="h-3.5 w-3.5" />
                  <span>New Post</span>
                </Link>
              </div>
            </div>
          )}

          {/* Scoped KPI Summary Strip (Updates Automatically per Account!) */}
          <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs sm:p-5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-500">
                  {activeChannel
                    ? activeChannel.platform === "YOUTUBE"
                      ? "Subscribers"
                      : "Followers"
                    : "Total Audience"}
                </span>
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
                  <Users className="h-4 w-4" />
                </span>
              </div>
              <p className="mt-2.5 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
                {formatCompactNumber(scopedSummary.followers)}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                {activeChannel
                  ? `${formatCompactNumber(scopedSummary.totalPosts)} published posts`
                  : `Across ${data.channels.length} connected channels`}
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs sm:p-5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-500">
                  {activeChannel ? "Channel Views" : "Lifetime Views"}
                </span>
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
                  <Eye className="h-4 w-4" />
                </span>
              </div>
              <p className="mt-2.5 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
                {scopedSummary.totalViews !== null
                  ? formatCompactNumber(scopedSummary.totalViews)
                  : "—"}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                {scopedSummary.avgViewsPerPost !== null ? (
                  <>
                    Avg{" "}
                    <span className="font-semibold text-emerald-700">
                      {formatCompactNumber(scopedSummary.avgViewsPerPost)}
                    </span>{" "}
                    / recent post
                  </>
                ) : (
                  "Views tracked on YouTube"
                )}
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs sm:p-5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-500">
                  Recent Interactions
                </span>
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-pink-50 text-pink-600">
                  <Heart className="h-4 w-4" />
                </span>
              </div>
              <p className="mt-2.5 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
                {formatCompactNumber(
                  scopedSummary.recentLikes + scopedSummary.recentComments
                )}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                {formatCompactNumber(scopedSummary.recentLikes)} likes ·{" "}
                {formatCompactNumber(scopedSummary.recentComments)} comments
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs sm:p-5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-500">
                  Engagement Rate
                </span>
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-50 text-amber-600">
                  <Activity className="h-4 w-4" />
                </span>
              </div>
              <p className="mt-2.5 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
                {formatPercent(scopedSummary.engagementRate)}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                {scopedSummary.engagementRateLabel}
              </p>
            </div>
          </div>

          {/* Visual Analytics Row: Performance Chart + Comparison / Top Post Spotlight */}
          <div className="grid items-stretch gap-5 lg:grid-cols-5">
            <div className="min-w-0 lg:col-span-3">
              <PostsPerformanceChart
                posts={scopedPosts}
                scopeLabel={
                  activeChannel ? activeChannel.displayName : "All Channels"
                }
              />
            </div>

            <div className="min-w-0 lg:col-span-2">
              {activeChannel ? (
                /* Single-Account Mode: Top Performing Post Spotlight + Benchmarks */
                <div className="flex h-full flex-col justify-between rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs">
                  <div>
                    <div className="flex items-center gap-2">
                      <Award className="h-4 w-4 text-amber-500" />
                      <h2 className="text-sm font-semibold text-slate-900">
                        Top Performing Post
                      </h2>
                    </div>
                    <p className="mt-0.5 text-xs text-slate-500">
                      Best recent upload on {activeChannel.displayName}
                    </p>

                    {scopedSummary.topPost ? (
                      <div className="mt-4 overflow-hidden rounded-xl border border-slate-200 bg-slate-50/70">
                        {scopedSummary.topPost.thumbnailUrl && (
                          <button
                            type="button"
                            onClick={() => setPreviewPost(scopedSummary.topPost)}
                            className="group relative block w-full overflow-hidden"
                          >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={scopedSummary.topPost.thumbnailUrl}
                              alt={scopedSummary.topPost.title}
                              className="h-36 w-full object-cover transition group-hover:scale-105"
                            />
                            <span className="absolute inset-0 flex items-center justify-center bg-slate-950/30 transition group-hover:bg-slate-950/45">
                              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white/95 text-slate-900 shadow-md">
                                <Play className="ml-0.5 h-4 w-4 fill-current" />
                              </span>
                            </span>
                          </button>
                        )}
                        <div className="p-3.5">
                          <button
                            type="button"
                            onClick={() => setPreviewPost(scopedSummary.topPost)}
                            className="line-clamp-2 text-left text-sm font-semibold text-slate-900 hover:text-indigo-600"
                          >
                            {scopedSummary.topPost.title}
                          </button>
                          <div className="mt-2.5 flex flex-wrap items-center gap-3 text-xs font-semibold text-slate-700">
                            {scopedSummary.topPost.views !== null && (
                              <span className="inline-flex items-center gap-1">
                                <Eye className="h-3.5 w-3.5 text-emerald-500" />
                                {formatCompactNumber(
                                  scopedSummary.topPost.views
                                )}
                              </span>
                            )}
                            <span className="inline-flex items-center gap-1">
                              <Heart className="h-3.5 w-3.5 text-pink-500" />
                              {formatCompactNumber(scopedSummary.topPost.likes)}
                            </span>
                            <span className="inline-flex items-center gap-1">
                              <MessageCircle className="h-3.5 w-3.5 text-amber-500" />
                              {formatCompactNumber(
                                scopedSummary.topPost.comments
                              )}
                            </span>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="mt-6 rounded-xl border border-dashed border-slate-200 p-6 text-center text-xs text-slate-400">
                        No recent posts yet on this channel.
                      </div>
                    )}
                  </div>

                  {/* Mini Benchmarks */}
                  <div className="mt-4 grid grid-cols-3 gap-2 border-t border-slate-100 pt-4 text-center">
                    <div className="rounded-lg bg-slate-50 p-2">
                      <p className="text-[10px] font-medium text-slate-500">
                        Avg Views
                      </p>
                      <p className="mt-0.5 text-xs font-bold text-slate-900">
                        {scopedSummary.avgViewsPerPost !== null
                          ? formatCompactNumber(scopedSummary.avgViewsPerPost)
                          : "—"}
                      </p>
                    </div>
                    <div className="rounded-lg bg-slate-50 p-2">
                      <p className="text-[10px] font-medium text-slate-500">
                        Avg Likes
                      </p>
                      <p className="mt-0.5 text-xs font-bold text-slate-900">
                        {scopedSummary.avgLikesPerPost}
                      </p>
                    </div>
                    <div className="rounded-lg bg-slate-50 p-2">
                      <p className="text-[10px] font-medium text-slate-500">
                        Sampled
                      </p>
                      <p className="mt-0.5 text-xs font-bold text-slate-900">
                        {scopedSummary.recentPostsCount} posts
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                /* All-Channels Mode: Channel Comparison Bars */
                <ChannelComparisonChart
                  channelStats={channelStats}
                  onSelectChannel={(id) => selectAccount(id)}
                />
              )}
            </div>
          </div>

          {/* Per-Account Scorecards Grid (Shown in All Channels Overview) */}
          {!activeChannel && (
            <section className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-semibold text-slate-900">
                    Per-Account Performance Scorecards
                  </h2>
                  <p className="text-xs text-slate-500">
                    Click any account to open its dedicated analytics view
                  </p>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {channelStats.map((cs) => {
                  const ch = cs.channel;
                  const sparkColor =
                    ch.platform === "YOUTUBE" ? "#ef4444" : "#ec4899";

                  return (
                    <button
                      key={ch.accountId}
                      type="button"
                      onClick={() => {
                        selectAccount(ch.accountId);
                        window.scrollTo({ top: 0, behavior: "smooth" });
                      }}
                      className="group flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-2xs transition hover:border-indigo-300 hover:shadow-sm"
                    >
                      <div>
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex min-w-0 items-center gap-3">
                            {ch.avatarUrl ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={ch.avatarUrl}
                                alt={ch.displayName}
                                referrerPolicy="no-referrer"
                                className="h-11 w-11 shrink-0 rounded-xl object-cover ring-1 ring-slate-200"
                              />
                            ) : (
                              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-sm font-bold text-slate-600">
                                {ch.displayName.charAt(0).toUpperCase()}
                              </div>
                            )}
                            <div className="min-w-0">
                              <PlatformBadge platform={ch.platform} />
                              <p className="mt-1 truncate text-sm font-bold text-slate-900 group-hover:text-indigo-600">
                                {ch.displayName}
                              </p>
                              {ch.username && (
                                <p className="truncate text-[11px] text-slate-400">
                                  {ch.username}
                                </p>
                              )}
                            </div>
                          </div>

                          <span className="rounded-lg bg-slate-50 px-2 py-1 text-[11px] font-semibold text-slate-600">
                            {formatCompactNumber(ch.totalPosts)} posts
                          </span>
                        </div>

                        {ch.error ? (
                          <p className="mt-4 rounded-lg bg-red-50 p-2.5 text-xs text-red-600">
                            {ch.error}
                          </p>
                        ) : (
                          <>
                            <div className="mt-4 grid grid-cols-2 gap-2.5">
                              <div className="rounded-xl bg-slate-50/80 px-3 py-2">
                                <p className="text-[10px] font-medium text-slate-500">
                                  {ch.platform === "YOUTUBE"
                                    ? "Subscribers"
                                    : "Followers"}
                                </p>
                                <p className="mt-0.5 text-sm font-bold text-slate-900">
                                  {formatCompactNumber(ch.followersCount)}
                                </p>
                              </div>
                              <div className="rounded-xl bg-slate-50/80 px-3 py-2">
                                <p className="text-[10px] font-medium text-slate-500">
                                  Total Views
                                </p>
                                <p className="mt-0.5 text-sm font-bold text-slate-900">
                                  {ch.totalViews !== null
                                    ? formatCompactNumber(
                                        Math.max(ch.totalViews, cs.recentViews)
                                      )
                                    : "—"}
                                </p>
                              </div>
                              <div className="rounded-xl bg-slate-50/80 px-3 py-2">
                                <p className="text-[10px] font-medium text-slate-500">
                                  Avg Views / Post
                                </p>
                                <p className="mt-0.5 text-sm font-bold text-slate-900">
                                  {cs.avgViewsPerPost !== null
                                    ? formatCompactNumber(cs.avgViewsPerPost)
                                    : "—"}
                                </p>
                              </div>
                              <div className="rounded-xl bg-slate-50/80 px-3 py-2">
                                <p className="text-[10px] font-medium text-slate-500">
                                  Eng. Rate
                                </p>
                                <p className="mt-0.5 text-sm font-bold text-indigo-700">
                                  {formatPercent(cs.engagementRate)}
                                </p>
                              </div>
                            </div>

                            {/* Recent Trend Sparkline */}
                            <div className="mt-4">
                              <div className="mb-1 flex items-center justify-between text-[10px] font-medium text-slate-400">
                                <span>Recent upload trend</span>
                                <span>
                                  {formatCompactNumber(cs.recentLikes)} recent likes
                                </span>
                              </div>
                              <MiniSparkline
                                values={cs.sparklineValues}
                                color={sparkColor}
                              />
                            </div>
                          </>
                        )}
                      </div>

                      <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3 text-xs font-semibold text-indigo-600">
                        <span>View account dashboard</span>
                        <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                      </div>
                    </button>
                  );
                })}
              </div>
            </section>
          )}

          {/* Cross-Platform Side-by-Side Post Comparison (All Channels Overview) */}
          {!activeChannel && (
            <CrossPlatformComparison
              pairs={crossPostPairs}
              onPreviewPost={(p) => setPreviewPost(p)}
            />
          )}

          {/* Bottom 2-Column Content: Posts Performance + Recent Comments Inbox */}
          <div className="grid gap-6 lg:grid-cols-3">
            {/* Posts Performance (2 cols) */}
            <section className="space-y-3 lg:col-span-2">
              <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-indigo-600" />
                  <h2 className="text-sm font-semibold text-slate-900">
                    {activeChannel
                      ? `${activeChannel.displayName} Posts`
                      : "Recent Posts Performance"}{" "}
                    <span className="font-normal text-slate-400">
                      ({filteredPosts.length})
                    </span>
                  </h2>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <div className="relative flex-1 sm:w-44 sm:flex-none">
                    <Search className="pointer-events-none absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      value={postQuery}
                      onChange={(e) => setPostQuery(e.target.value)}
                      placeholder="Filter posts..."
                      className="w-full rounded-lg border border-slate-200 bg-white py-1.5 pr-2.5 pl-8 text-xs text-slate-700 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none"
                    />
                  </div>

                  <div className="flex items-center gap-0.5 rounded-lg border border-slate-200 bg-white p-0.5 text-xs">
                    {(
                      [
                        { id: "latest", label: "Latest" },
                        { id: "views", label: "Views" },
                        { id: "likes", label: "Likes" },
                        { id: "rate", label: "Eng %" },
                      ] as const
                    ).map((mode) => (
                      <button
                        key={mode.id}
                        type="button"
                        onClick={() => setSortBy(mode.id)}
                        className={`rounded-md px-2 py-1 font-medium transition ${
                          sortBy === mode.id
                            ? "bg-slate-900 text-white"
                            : "text-slate-600 hover:bg-slate-100"
                        }`}
                      >
                        {mode.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {filteredPosts.length === 0 ? (
                <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
                  No matching published posts found.
                </div>
              ) : (
                <div className="divide-y divide-slate-100 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xs">
                  {filteredPosts.map((post) => {
                    const rate = getPostEngagementRate(post);
                    const metricVal =
                      post.views !== null
                        ? post.views
                        : post.likes + post.comments;
                    const barPct = Math.max(
                      4,
                      Math.round((metricVal / maxPostMetric) * 100)
                    );

                    return (
                      <div
                        key={`${post.platform}-${post.id}`}
                        className="flex flex-col gap-3 p-4 transition hover:bg-slate-50/70 sm:flex-row sm:items-center sm:justify-between"
                      >
                        <div className="flex min-w-0 flex-1 items-center gap-3.5">
                          <button
                            type="button"
                            onClick={() => setPreviewPost(post)}
                            title="Watch inside Cadence"
                            className="group relative h-14 w-24 shrink-0 overflow-hidden rounded-lg border border-slate-200 bg-slate-100"
                          >
                            {post.thumbnailUrl ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={post.thumbnailUrl}
                                alt={post.title}
                                className="h-full w-full object-cover transition group-hover:scale-105"
                              />
                            ) : (
                              <span className="flex h-full w-full items-center justify-center text-xs text-slate-400">
                                Preview
                              </span>
                            )}
                            <span className="absolute inset-0 flex items-center justify-center bg-slate-950/25 opacity-0 transition group-hover:opacity-100">
                              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white/95 text-slate-900 shadow-xs">
                                <Play className="ml-0.5 h-3.5 w-3.5 fill-current" />
                              </span>
                            </span>
                          </button>

                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-1.5">
                              {!activeChannel && (
                                <>
                                  <PlatformBadge platform={post.platform} />
                                  <button
                                    type="button"
                                    onClick={() => selectAccount(post.accountId)}
                                    className="text-xs font-medium text-slate-600 hover:text-indigo-600 hover:underline"
                                  >
                                    {post.accountName}
                                  </button>
                                  <span className="text-xs text-slate-300">
                                    ·
                                  </span>
                                </>
                              )}
                              <span className="text-xs text-slate-400">
                                {formatRelativeDate(post.publishedAt)}
                              </span>
                            </div>

                            <div className="mt-1 flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => setPreviewPost(post)}
                                className="min-w-0 truncate text-left text-sm font-semibold text-slate-900 hover:text-indigo-600"
                              >
                                {post.title}
                              </button>
                              <a
                                href={post.url}
                                target="_blank"
                                rel="noreferrer"
                                title={`Open on ${post.platform === "YOUTUBE" ? "YouTube" : "Instagram"}`}
                                className="shrink-0 text-slate-400 hover:text-indigo-600"
                              >
                                <ExternalLink className="h-3.5 w-3.5" />
                              </a>
                            </div>

                            {/* Relative performance bar */}
                            <div className="mt-2 h-1.5 w-full max-w-[220px] overflow-hidden rounded-full bg-slate-100">
                              <div
                                className={`h-full rounded-full ${
                                  post.platform === "YOUTUBE"
                                    ? "bg-rose-500/80"
                                    : "bg-fuchsia-500/80"
                                }`}
                                style={{ width: `${barPct}%` }}
                              />
                            </div>
                          </div>
                        </div>

                        <div className="flex shrink-0 flex-wrap items-center gap-3 text-xs font-semibold text-slate-700">
                          {post.views !== null && (
                            <span
                              className="inline-flex items-center gap-1"
                              title="Views"
                            >
                              <Eye className="h-3.5 w-3.5 text-emerald-500" />
                              {formatCompactNumber(post.views)}
                            </span>
                          )}
                          <span
                            className="inline-flex items-center gap-1"
                            title="Likes"
                          >
                            <Heart className="h-3.5 w-3.5 text-pink-500" />
                            {formatCompactNumber(post.likes)}
                          </span>
                          <span
                            className="inline-flex items-center gap-1"
                            title="Comments"
                          >
                            <MessageCircle className="h-3.5 w-3.5 text-amber-500" />
                            {formatCompactNumber(post.comments)}
                          </span>
                          {rate !== null && (
                            <span
                              className="rounded-full bg-indigo-50 px-2 py-0.5 text-[11px] font-semibold text-indigo-700"
                              title="Engagement rate"
                            >
                              {formatPercent(rate)}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>

            {/* Unified Comment Reply Inbox (1 col) */}
            <UnifiedCommentInbox
              comments={filteredComments}
              showPlatformFilter={!activeChannel}
              scopeName={activeChannel?.displayName}
            />
          </div>
        </>
      )}

      {/* In-App Content Viewer Modal (YouTube Embed + Instagram Video/Photo Player) */}
      <ContentViewerModal
        post={previewPost}
        onClose={() => setPreviewPost(null)}
      />
    </div>
  );
}
