"use client";

import { useMemo, useState } from "react";
import {
  ArrowUpRight,
  BarChart3,
  Eye,
  Heart,
  MessageCircle,
  TrendingUp,
} from "lucide-react";
import { PlatformBadge } from "@/components/PlatformBadge";
import {
  formatCompactNumber,
  formatPercent,
  getPostEngagementRate,
  type ChannelComputedStats,
  type PostEngagementDTO,
} from "@/lib/analytics";

type PostChartMetric = "views" | "likes" | "comments" | "rate";
type CompareMetric = "followers" | "totalViews" | "avgViews" | "recentLikes";

export function MiniSparkline({
  values,
  color = "#4f46e5",
}: {
  values: number[];
  color?: string;
}) {
  if (values.length < 2) {
    return (
      <div className="flex h-9 items-center text-[11px] text-slate-400">
        Not enough posts yet
      </div>
    );
  }

  const width = 120;
  const height = 34;
  const pad = 3;
  const max = Math.max(...values, 1);
  const min = Math.min(...values, 0);
  const range = Math.max(max - min, 1);

  const points = values.map((val, idx) => {
    const x = pad + (idx / (values.length - 1)) * (width - pad * 2);
    const y = height - pad - ((val - min) / range) * (height - pad * 2);
    return { x, y };
  });

  const polylinePoints = points.map((p) => `${p.x},${p.y}`).join(" ");
  const areaPath = `M ${points[0].x},${height} L ${points
    .map((p) => `${p.x},${p.y}`)
    .join(" L ")} L ${points[points.length - 1].x},${height} Z`;

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="h-9 w-full overflow-visible"
      aria-hidden="true"
    >
      <path d={areaPath} fill={color} fillOpacity="0.12" />
      <polyline
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={polylinePoints}
      />
      <circle
        cx={points[points.length - 1].x}
        cy={points[points.length - 1].y}
        r="2.8"
        fill={color}
      />
    </svg>
  );
}

export function PostsPerformanceChart({
  posts,
  scopeLabel,
}: {
  posts: PostEngagementDTO[];
  scopeLabel: string;
}) {
  const hasViews = useMemo(() => posts.some((p) => p.views !== null), [posts]);
  const [metric, setMetric] = useState<PostChartMetric>(
    hasViews ? "views" : "likes"
  );
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  const effectiveMetric: PostChartMetric =
    !hasViews && (metric === "views" || metric === "rate") ? "likes" : metric;

  // Show up to 12 most recent posts chronologically (oldest -> newest).
  // When viewing Views or Eng. %, exclude posts without view counts (e.g. Instagram)
  // so they don't render as misleading zero-height bars.
  const chartPosts = useMemo(() => {
    const eligible =
      effectiveMetric === "views" || effectiveMetric === "rate"
        ? posts.filter((p) => p.views !== null)
        : posts;

    return [...eligible]
      .sort(
        (a, b) =>
          new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
      )
      .slice(0, 12)
      .reverse();
  }, [posts, effectiveMetric]);

  const values = useMemo(() => {
    return chartPosts.map((p) => {
      if (effectiveMetric === "views") return p.views ?? 0;
      if (effectiveMetric === "likes") return p.likes;
      if (effectiveMetric === "comments") return p.comments;
      return getPostEngagementRate(p) ?? 0;
    });
  }, [chartPosts, effectiveMetric]);

  const maxValue = Math.max(...values, 1);
  const avgValue =
    values.length > 0
      ? values.reduce((s, v) => s + v, 0) / values.length
      : 0;
  const avgPct = Math.min(100, Math.max(0, (avgValue / maxValue) * 100));

  const selectedPost =
    activeIndex !== null && chartPosts[activeIndex]
      ? chartPosts[activeIndex]
      : chartPosts[chartPosts.length - 1] ?? null;

  const formatMetricVal = (val: number) =>
    effectiveMetric === "rate"
      ? formatPercent(val)
      : formatCompactNumber(Math.round(val));

  return (
    <div className="flex h-full flex-col justify-between rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-indigo-600" />
            <h2 className="text-sm font-semibold text-slate-900">
              Recent Posts Momentum
            </h2>
          </div>
          <p className="mt-0.5 text-xs text-slate-500">
            Last {chartPosts.length} uploads ({scopeLabel})
            {avgValue > 0 && (
              <>
                {" · "}
                <span className="font-semibold text-indigo-600">
                  Avg {formatMetricVal(avgValue)}
                </span>
              </>
            )}
          </p>
        </div>

        <div className="flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 p-0.5 text-xs">
          {(
            [
              { key: "views", label: "Views", disabled: !hasViews },
              { key: "likes", label: "Likes", disabled: false },
              { key: "comments", label: "Comments", disabled: false },
              { key: "rate", label: "Eng. %", disabled: !hasViews },
            ] as const
          )
            .filter((t) => !t.disabled)
            .map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => {
                  setMetric(tab.key);
                  setActiveIndex(null);
                }}
                className={`rounded-md px-2.5 py-1 font-medium transition ${
                  effectiveMetric === tab.key
                    ? "bg-white text-slate-900 shadow-2xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                {tab.label}
              </button>
            ))}
        </div>
      </div>

      {chartPosts.length === 0 ? (
        <div className="flex min-h-[220px] flex-1 items-center justify-center text-xs text-slate-400">
          No recent posts available to chart.
        </div>
      ) : (
        <div className="flex flex-1 flex-col justify-between">
          {/* Bar Chart Canvas */}
          <div className="relative mt-6 min-h-[210px] flex-1 pt-4">
            {/* Subtle horizontal gridlines */}
            <div className="pointer-events-none absolute inset-x-0 top-4 bottom-6 flex flex-col justify-between">
              {[1, 0.5, 0].map((ratio) => (
                <div
                  key={ratio}
                  className="flex items-center gap-2 border-b border-dashed border-slate-100"
                >
                  <span className="-mt-4 w-10 text-[10px] font-medium text-slate-400">
                    {formatMetricVal(maxValue * ratio)}
                  </span>
                </div>
              ))}
            </div>

            {/* Average benchmark line */}
            {avgValue > 0 && (
              <div
                className="pointer-events-none absolute right-0 left-11 z-10 border-t border-dashed border-indigo-400/80"
                style={{
                  bottom: `calc(1.5rem + ${avgPct * 0.78}%)`,
                }}
              />
            )}

            {/* Bars */}
            <div className="relative z-20 flex h-full min-h-[190px] items-end gap-1.5 pl-11 sm:gap-2">
              {chartPosts.map((post, idx) => {
                const val = values[idx];
                const heightPct = Math.max(4, (val / maxValue) * 100);
                const isActive =
                  activeIndex !== null
                    ? activeIndex === idx
                    : idx === chartPosts.length - 1;
                const barColor = isActive
                  ? "bg-indigo-600"
                  : post.platform === "YOUTUBE"
                    ? "bg-rose-400/80 hover:bg-rose-500"
                    : "bg-fuchsia-400/80 hover:bg-fuchsia-500";

                const shortDate = new Date(post.publishedAt).toLocaleDateString(
                  undefined,
                  { month: "short", day: "numeric" }
                );
                const showDateLabel =
                  chartPosts.length <= 7 ||
                  isActive ||
                  idx === 0 ||
                  idx === chartPosts.length - 1 ||
                  idx % 2 === 0;

                return (
                  <button
                    key={`${post.platform}-${post.id}`}
                    type="button"
                    onMouseEnter={() => setActiveIndex(idx)}
                    onFocus={() => setActiveIndex(idx)}
                    onClick={() => setActiveIndex(idx)}
                    className="group flex h-full min-w-0 flex-1 flex-col items-center justify-end focus:outline-none"
                    title={`${post.title} — ${formatMetricVal(val)}`}
                  >
                    <div className="flex w-full flex-1 items-end justify-center pb-1">
                      <div
                        className={`w-full max-w-[34px] rounded-t-md transition-all duration-200 ${barColor} ${
                          isActive ? "ring-2 ring-indigo-200" : ""
                        }`}
                        style={{ height: `${heightPct}%` }}
                      />
                    </div>
                    <span
                      className={`mt-1 h-3.5 w-full truncate text-center text-[9px] leading-none sm:text-[10px] ${
                        isActive
                          ? "font-semibold text-indigo-700"
                          : "text-slate-400"
                      }`}
                    >
                      {showDateLabel ? shortDate : ""}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Active Bar Detail Strip */}
          {selectedPost && (
            <div className="mt-4 flex flex-col gap-2 rounded-xl border border-slate-100 bg-slate-50/80 p-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <PlatformBadge platform={selectedPost.platform} />
                  <span className="truncate text-xs font-medium text-slate-600">
                    {selectedPost.accountName}
                  </span>
                  <span className="text-[11px] text-slate-400">
                    ·{" "}
                    {new Date(selectedPost.publishedAt).toLocaleDateString(
                      undefined,
                      { month: "short", day: "numeric", year: "numeric" }
                    )}
                  </span>
                </div>
                <a
                  href={selectedPost.url}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-1 inline-flex max-w-full items-center gap-1 text-xs font-semibold text-slate-900 hover:text-indigo-600"
                >
                  <span className="truncate">{selectedPost.title}</span>
                  <ArrowUpRight className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                </a>
              </div>

              <div className="flex shrink-0 flex-wrap items-center gap-3 text-xs font-semibold text-slate-700">
                {selectedPost.views !== null && (
                  <span className="inline-flex items-center gap-1">
                    <Eye className="h-3.5 w-3.5 text-emerald-500" />
                    {formatCompactNumber(selectedPost.views)}
                  </span>
                )}
                <span className="inline-flex items-center gap-1">
                  <Heart className="h-3.5 w-3.5 text-pink-500" />
                  {formatCompactNumber(selectedPost.likes)}
                </span>
                <span className="inline-flex items-center gap-1">
                  <MessageCircle className="h-3.5 w-3.5 text-amber-500" />
                  {formatCompactNumber(selectedPost.comments)}
                </span>
                {getPostEngagementRate(selectedPost) !== null && (
                  <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-[11px] font-semibold text-indigo-700">
                    {formatPercent(getPostEngagementRate(selectedPost))} eng
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function ChannelComparisonChart({
  channelStats,
  onSelectChannel,
}: {
  channelStats: ChannelComputedStats[];
  onSelectChannel: (accountId: string) => void;
}) {
  const [metric, setMetric] = useState<CompareMetric>("followers");

  const rows = useMemo(() => {
    const mapped = channelStats.map((cs) => {
      let value: number | null = 0;
      if (metric === "followers") value = cs.channel.followersCount;
      else if (metric === "totalViews") {
        value =
          cs.channel.totalViews !== null
            ? Math.max(cs.channel.totalViews, cs.recentViews)
            : null;
      } else if (metric === "avgViews") value = cs.avgViewsPerPost;
      else value = cs.recentLikes;
      return { ...cs, value };
    });
    return mapped.sort((a, b) => (b.value ?? -1) - (a.value ?? -1));
  }, [channelStats, metric]);

  const totalValue = rows.reduce((s, r) => s + (r.value ?? 0), 0);
  const maxValue = Math.max(...rows.map((r) => r.value ?? 0), 1);

  return (
    <div className="flex h-full flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <div className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-indigo-600" />
            <h2 className="text-sm font-semibold text-slate-900">
              Channel Comparison
            </h2>
          </div>
          <p className="mt-0.5 text-xs text-slate-500">
            Click any account to open its dashboard
          </p>
        </div>

        <select
          aria-label="Comparison metric"
          value={metric}
          onChange={(e) => setMetric(e.target.value as CompareMetric)}
          className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-medium text-slate-700 focus:border-indigo-500 focus:outline-none"
        >
          <option value="followers">Subscribers / Followers</option>
          <option value="recentLikes">Recent Likes</option>
          <option value="totalViews">Lifetime Views</option>
          <option value="avgViews">Avg Views / Post</option>
        </select>
      </div>

      <div className="mt-4 space-y-2">
        {rows.map((row) => {
          const numericVal = row.value ?? 0;
          const widthPct =
            row.value === null
              ? 0
              : Math.max(3, (numericVal / maxValue) * 100);
          const sharePct =
            totalValue > 0 && row.value !== null
              ? Math.round((numericVal / totalValue) * 100)
              : 0;
          const barGradient =
            row.channel.platform === "YOUTUBE"
              ? "from-rose-500 to-red-500"
              : "from-fuchsia-500 to-pink-500";

          return (
            <button
              key={row.channel.accountId}
              type="button"
              onClick={() => onSelectChannel(row.channel.accountId)}
              className="group block w-full rounded-xl p-1.5 text-left transition hover:bg-slate-50"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex min-w-0 items-center gap-2.5">
                  {row.channel.avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={row.channel.avatarUrl}
                      alt={row.channel.displayName}
                      referrerPolicy="no-referrer"
                      className="h-7 w-7 shrink-0 rounded-full object-cover ring-1 ring-slate-200"
                    />
                  ) : (
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold text-slate-600">
                      {row.channel.displayName.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="truncate text-xs font-semibold text-slate-900 group-hover:text-indigo-600">
                      {row.channel.displayName}
                    </p>
                    <p className="truncate text-[10px] text-slate-400">
                      {row.channel.platform === "YOUTUBE"
                        ? "YouTube"
                        : "Instagram"}
                      {row.channel.username ? ` · ${row.channel.username}` : ""}
                    </p>
                  </div>
                </div>

                <div className="shrink-0 text-right">
                  <p className="text-xs font-bold text-slate-900">
                    {row.value !== null ? formatCompactNumber(row.value) : "—"}
                  </p>
                  <p className="text-[10px] font-medium text-slate-400">
                    {row.value !== null ? `${sharePct}% share` : "N/A on IG"}
                  </p>
                </div>
              </div>

              <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                {widthPct > 0 && (
                  <div
                    className={`h-full rounded-full bg-gradient-to-r ${barGradient} transition-all duration-300`}
                    style={{ width: `${widthPct}%` }}
                  />
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
