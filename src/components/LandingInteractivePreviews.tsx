"use client";

import {
  ArrowLeftRight,
  BarChart3,
  BookOpen,
  CalendarClock,
  Camera,
  Check,
  CheckCircle2,
  CreditCard,
  Eye,
  Film,
  Heart,
  Instagram,
  Layers,
  MessageCircle,
  Pause,
  PenSquare,
  Play,
  Reply,
  Send,
  Sliders,
  Sparkles,
  TrendingUp,
  UserCircle2,
  Users,
  Youtube,
} from "lucide-react";

function MiniSidebar({ active }: { active: "queue" | "compose" | "engagement" | "channels" }) {
  const nav = [
    { id: "queue", label: "Publishing Queue", icon: CalendarClock },
    { id: "compose", label: "Compose", icon: PenSquare },
    { id: "engagement", label: "Engagement", icon: BarChart3 },
    { id: "channels", label: "Channels", icon: Users },
  ] as const;

  return (
    <div className="hidden w-52 shrink-0 flex-col justify-between border-r border-slate-200 bg-white p-3.5 md:flex">
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-600 text-white">
              <Layers className="h-3.5 w-3.5" />
            </span>
            <span className="text-sm font-bold text-slate-900">Cadence</span>
          </div>
          <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-[10px] font-semibold text-indigo-700">
            FREE
          </span>
        </div>

        <div className="flex items-center justify-center gap-1.5 rounded-xl bg-indigo-600 py-2 text-xs font-semibold text-white shadow-2xs">
          <PenSquare className="h-3.5 w-3.5" />
          <span>New Post</span>
        </div>

        <div className="space-y-1 pt-1">
          <p className="px-2 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
            Workspace
          </p>
          {nav.map((item) => {
            const Icon = item.icon;
            const isActive = item.id === active;
            return (
              <div
                key={item.id}
                className={`flex items-center gap-2.5 rounded-xl px-2.5 py-2 text-xs font-medium ${
                  isActive
                    ? "bg-indigo-50 font-semibold text-indigo-700"
                    : "text-slate-600"
                }`}
              >
                <Icon
                  className={`h-4 w-4 ${
                    isActive ? "text-indigo-600" : "text-slate-400"
                  }`}
                />
                <span>{item.label}</span>
              </div>
            );
          })}
        </div>

        <div className="space-y-1 pt-2">
          <p className="px-2 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
            Account
          </p>
          {[
            { label: "Help & Guide", icon: BookOpen },
            { label: "Plan & Billing", icon: CreditCard },
            { label: "Profile & API Keys", icon: UserCircle2 },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.label}
                className="flex items-center gap-2.5 rounded-xl px-2.5 py-1.5 text-xs font-medium text-slate-600"
              >
                <Icon className="h-4 w-4 text-slate-400" />
                <span>{item.label}</span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="space-y-2.5 border-t border-slate-100 pt-3">
        <div className="rounded-xl border border-slate-200/80 bg-slate-50 p-2.5">
          <div className="flex items-center justify-between text-[11px] font-semibold">
            <span className="text-slate-700">Generous Free</span>
            <span className="text-indigo-600">6/6</span>
          </div>
          <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-slate-200">
            <div className="h-full w-full rounded-full bg-indigo-600" />
          </div>
        </div>

        <div className="flex items-center gap-2 px-1">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-[11px] font-bold text-white">
            AR
          </span>
          <div className="min-w-0">
            <p className="truncate text-xs font-semibold text-slate-900">
              Alex Rivera
            </p>
            <p className="truncate text-[10px] text-slate-400">
              alex@novastudio.io
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Screen 1: Per-Platform & Account Analytics Dashboard (Dummy Data)
 */
export function PreviewAnalyticsDashboard() {
  const bars = [
    { date: "02 Nov", h: 38, active: false },
    { date: "05 Nov", h: 52, active: false },
    { date: "08 Nov", h: 44, active: false },
    { date: "11 Nov", h: 74, active: false },
    { date: "14 Nov", h: 61, active: false },
    { date: "17 Nov", h: 88, active: false },
    { date: "19 Nov", h: 68, active: false },
    { date: "21 Nov", h: 96, active: true },
  ];

  return (
    <div className="flex min-h-[480px] w-full bg-slate-50 text-left">
      <MiniSidebar active="engagement" />

      <div className="flex-1 space-y-4 p-4 sm:p-6">
        {/* Top Bar */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-bold text-slate-900">
                Analytics & Engagement
              </h3>
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                Live
              </span>
            </div>
            <p className="text-xs text-slate-500">
              Track cross-channel growth or drill into any individual account&apos;s performance.
            </p>
          </div>

          <span className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 shadow-2xs">
            Updated just now
          </span>
        </div>

        {/* Platform Switcher + Scoped Account Pills */}
        <div className="space-y-2.5 rounded-2xl border border-slate-200 bg-white p-3 shadow-2xs">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="inline-flex flex-wrap items-center gap-1 rounded-xl bg-slate-100 p-1 text-xs font-semibold">
              <span className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1 text-slate-600">
                <Layers className="h-3.5 w-3.5" />
                All Platforms
                <span className="rounded-full bg-white px-1.5 py-0.2 text-[10px] text-slate-500">
                  6
                </span>
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-lg bg-red-600 px-3 py-1 text-white shadow-xs">
                <Youtube className="h-3.5 w-3.5" />
                YouTube
                <span className="rounded-full bg-white/20 px-1.5 py-0.2 text-[10px]">
                  3
                </span>
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1 text-slate-600">
                <Instagram className="h-3.5 w-3.5 text-fuchsia-600" />
                Instagram
                <span className="rounded-full bg-white px-1.5 py-0.2 text-[10px] text-slate-500">
                  3
                </span>
              </span>
            </div>

            <span className="hidden text-[11px] text-slate-400 sm:inline">
              Showing YouTube channels (3)
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2 border-t border-slate-100 pt-2.5 text-xs font-semibold">
            <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-slate-600">
              All YouTube (3)
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-red-600 px-3 py-1 text-white shadow-xs">
              <span className="flex h-4 w-4 items-center justify-center rounded-full bg-white/20 text-[9px] font-bold">
                N
              </span>
              Nova Tech
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1 text-slate-700">
              <span className="flex h-4 w-4 items-center justify-center rounded-full bg-purple-100 text-[9px] font-bold text-purple-700">
                P
              </span>
              Pixel Stories
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1 text-slate-700">
              <span className="flex h-4 w-4 items-center justify-center rounded-full bg-amber-100 text-[9px] font-bold text-amber-800">
                A
              </span>
              Apex Clips
            </span>
          </div>
        </div>

        {/* 4 KPI Strip */}
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-3.5 shadow-2xs">
            <span className="text-[11px] font-medium text-slate-500">
              Subscribers
            </span>
            <p className="mt-1 text-2xl font-extrabold text-slate-900">
              48.2K
            </p>
            <p className="mt-0.5 text-[11px] text-emerald-600">
              @novatech · 142 published videos
            </p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-3.5 shadow-2xs">
            <span className="text-[11px] font-medium text-slate-500">
              Channel Views
            </span>
            <p className="mt-1 text-2xl font-extrabold text-slate-900">
              1.84M
            </p>
            <p className="mt-0.5 text-[11px] text-slate-500">
              Avg <strong className="text-emerald-700">42.1K</strong> / recent post
            </p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-3.5 shadow-2xs">
            <span className="text-[11px] font-medium text-slate-500">
              Recent Interactions
            </span>
            <p className="mt-1 text-2xl font-extrabold text-slate-900">
              31.4K
            </p>
            <p className="mt-0.5 text-[11px] text-slate-500">
              29.8K likes · 1.6K comments
            </p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-3.5 shadow-2xs">
            <span className="text-[11px] font-medium text-slate-500">
              Engagement Rate
            </span>
            <p className="mt-1 text-2xl font-extrabold text-indigo-700">
              8.42%
            </p>
            <p className="mt-0.5 text-[11px] text-slate-500">
              Likes & comments / views
            </p>
          </div>
        </div>

        {/* Momentum Bar Chart + Top Performing Post */}
        <div className="grid gap-4 lg:grid-cols-5">
          <div className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs lg:col-span-3">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-1.5">
                  <TrendingUp className="h-4 w-4 text-indigo-600" />
                  <span className="text-xs font-bold text-slate-900">
                    Recent Posts Momentum
                  </span>
                </div>
                <p className="text-[11px] text-slate-500">
                  Last 8 uploads (Nova Tech) ·{" "}
                  <strong className="text-indigo-600">Avg 42.1K views</strong>
                </p>
              </div>
              <div className="flex gap-1 rounded-lg bg-slate-100 p-0.5 text-[11px] font-semibold">
                <span className="rounded-md bg-white px-2 py-0.5 text-slate-900 shadow-2xs">
                  Views
                </span>
                <span className="px-2 py-0.5 text-slate-500">Likes</span>
                <span className="px-2 py-0.5 text-slate-500">Eng. %</span>
              </div>
            </div>

            <div className="relative mt-4 flex h-36 items-end gap-2.5 border-b border-slate-100 px-2 pt-4">
              {/* Average benchmark dashed line */}
              <div
                className="pointer-events-none absolute inset-x-0 border-t border-dashed border-indigo-400"
                style={{ bottom: "56%" }}
              />
              {bars.map((b) => (
                <div
                  key={b.date}
                  className="flex h-full flex-1 flex-col items-center justify-end"
                >
                  <div
                    className={`w-full rounded-t-md ${
                      b.active
                        ? "bg-indigo-600 ring-2 ring-indigo-200"
                        : "bg-rose-400/85"
                    }`}
                    style={{ height: `${b.h}%` }}
                  />
                  <span
                    className={`mt-1 text-[9px] ${
                      b.active
                        ? "font-bold text-indigo-700"
                        : "text-slate-400"
                    }`}
                  >
                    {b.date}
                  </span>
                </div>
              ))}
            </div>

            <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-xl bg-slate-50 px-3 py-2 text-xs">
              <span className="truncate font-semibold text-slate-900">
                How We Built a 120fps WebGL Shader Engine in 60s #shorts
              </span>
              <div className="flex items-center gap-3 font-bold text-slate-700">
                <span className="inline-flex items-center gap-1">
                  <Eye className="h-3.5 w-3.5 text-emerald-600" /> 84.5K
                </span>
                <span className="inline-flex items-center gap-1">
                  <Heart className="h-3.5 w-3.5 text-pink-500" /> 7.9K
                </span>
                <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-[10px] text-indigo-700">
                  9.6% eng
                </span>
              </div>
            </div>
          </div>

          <div className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs lg:col-span-2">
            <div>
              <span className="text-xs font-bold text-slate-900">
                🏆 Top Performing Post
              </span>
              <p className="text-[11px] text-slate-500">
                Best recent upload on Nova Tech
              </p>

              <div className="mt-3 overflow-hidden rounded-xl border border-slate-200 bg-slate-900">
                <div className="relative flex h-28 items-center justify-center bg-gradient-to-br from-indigo-900 via-slate-900 to-fuchsia-900">
                  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white/95 text-slate-900 shadow-md">
                    <Play className="ml-0.5 h-4 w-4 fill-current" />
                  </span>
                  <span className="absolute right-2 bottom-2 rounded bg-black/70 px-1.5 py-0.5 font-mono text-[10px] text-white">
                    0:54
                  </span>
                </div>
                <div className="bg-white p-3">
                  <p className="line-clamp-1 text-xs font-bold text-slate-900">
                    How We Built a 120fps WebGL Shader Engine in 60s #shorts
                  </p>
                  <div className="mt-1.5 flex items-center gap-3 text-xs font-bold text-slate-700">
                    <span className="inline-flex items-center gap-1">
                      <Eye className="h-3 w-3 text-emerald-600" /> 84.5K
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <Heart className="h-3 w-3 text-pink-500" /> 7.9K
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <MessageCircle className="h-3 w-3 text-amber-500" /> 214
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
              <div className="rounded-lg bg-slate-50 p-1.5">
                <p className="text-[10px] text-slate-500">Avg Views</p>
                <p className="font-bold text-slate-900">42.1K</p>
              </div>
              <div className="rounded-lg bg-slate-50 p-1.5">
                <p className="text-[10px] text-slate-500">Avg Likes</p>
                <p className="font-bold text-slate-900">3.7K</p>
              </div>
              <div className="rounded-lg bg-slate-50 p-1.5">
                <p className="text-[10px] text-slate-500">Sampled</p>
                <p className="font-bold text-slate-900">25 posts</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Screen 2: Cross-Platform Post Comparison (Shorts vs. Reels)
 */
export function PreviewCrossPlatformComparison() {
  const pairs = [
    {
      title: "How We Built a 120fps WebGL Shader Engine in 60s #shorts",
      badge: "Cadence Cross-Post",
      age: "14h ago",
      gradient: "from-indigo-600 via-violet-600 to-fuchsia-600",
      ytAccount: "Nova Tech (@novatech)",
      ytViews: "84.5K",
      ytLikes: "7.9K",
      ytComments: "214",
      igAccount: "Nova Tech (@novatech.io)",
      igLikes: "11.2K",
      igComments: "340",
      totalLikes: "19.1K",
      totalComments: "554",
      ytShare: 41,
    },
    {
      title: "Why Rust Is Replacing C++ in Modern Game Engines",
      badge: "Cadence Cross-Post",
      age: "2d ago",
      gradient: "from-emerald-600 via-teal-600 to-cyan-700",
      ytAccount: "Nova Tech (@novatech)",
      ytViews: "142.0K",
      ytLikes: "12.4K",
      ytComments: "480",
      igAccount: "Nova Tech (@novatech.io)",
      igLikes: "6.8K",
      igComments: "190",
      totalLikes: "19.2K",
      totalComments: "670",
      ytShare: 65,
    },
    {
      title: "3 Blender Lighting Tricks Pixar Artists Use Every Day",
      badge: "Auto-Matched",
      age: "4d ago",
      gradient: "from-amber-500 via-orange-600 to-rose-600",
      ytAccount: "Pixel Stories (@pixelstories)",
      ytViews: "64.2K",
      ytLikes: "5.1K",
      ytComments: "128",
      igAccount: "Pixel Stories (@pixelstories.art)",
      igLikes: "9.4K",
      igComments: "265",
      totalLikes: "14.5K",
      totalComments: "393",
      ytShare: 35,
    },
    {
      title: "Inside the $200 Home Server Running Our Entire Studio",
      badge: "Cadence Cross-Post",
      age: "6d ago",
      gradient: "from-blue-600 via-indigo-700 to-slate-900",
      ytAccount: "Apex Clips (@apexclips)",
      ytViews: "98.7K",
      ytLikes: "8.3K",
      ytComments: "312",
      igAccount: "Apex Clips (@apexclips.tv)",
      igLikes: "7.9K",
      igComments: "240",
      totalLikes: "16.2K",
      totalComments: "552",
      ytShare: 51,
    },
  ];

  return (
    <div className="flex min-h-[480px] w-full bg-slate-50 text-left">
      <MiniSidebar active="engagement" />

      <div className="flex-1 space-y-4 p-4 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <div className="flex items-center gap-2">
              <ArrowLeftRight className="h-4 w-4 text-indigo-600" />
              <h3 className="text-base font-bold text-slate-900">
                Cross-Platform Post Comparison (12 matched)
              </h3>
            </div>
            <p className="text-xs text-slate-500">
              Side-by-side YouTube Shorts vs. Instagram Reels performance for the exact same video
            </p>
          </div>
          <span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700">
            All 6 Channels Active
          </span>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {pairs.map((p) => (
            <div
              key={p.title}
              className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs"
            >
              <div className="flex items-start gap-3">
                <div
                  className={`flex h-14 w-24 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${p.gradient} text-white shadow-xs`}
                >
                  <Play className="h-5 w-5 fill-current" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="inline-flex items-center gap-1 rounded-full bg-indigo-50 px-2 py-0.5 text-[10px] font-semibold text-indigo-700">
                      <Sparkles className="h-2.5 w-2.5" />
                      {p.badge}
                    </span>
                    <span className="text-[11px] text-slate-400">{p.age}</span>
                  </div>
                  <p className="mt-1 line-clamp-2 text-xs font-bold text-slate-900 sm:text-sm">
                    {p.title}
                  </p>
                </div>
              </div>

              <div className="mt-3.5 grid grid-cols-2 gap-2.5">
                <div className="rounded-xl border border-rose-100 bg-rose-50/40 p-2.5">
                  <div className="flex items-center justify-between text-[11px] font-bold text-rose-700">
                    <span className="inline-flex items-center gap-1">
                      <Youtube className="h-3.5 w-3.5" /> YouTube
                    </span>
                    <span className="text-[10px]">▶ Watch</span>
                  </div>
                  <p className="mt-0.5 truncate text-[10px] text-slate-500">
                    {p.ytAccount}
                  </p>
                  <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs font-bold text-slate-900">
                    <span className="inline-flex items-center gap-0.5">
                      <Eye className="h-3 w-3 text-emerald-600" /> {p.ytViews}
                    </span>
                    <span className="inline-flex items-center gap-0.5">
                      <Heart className="h-3 w-3 text-pink-500" /> {p.ytLikes}
                    </span>
                    <span className="inline-flex items-center gap-0.5">
                      <MessageCircle className="h-3 w-3 text-amber-500" />{" "}
                      {p.ytComments}
                    </span>
                  </div>
                </div>

                <div className="rounded-xl border border-fuchsia-100 bg-fuchsia-50/40 p-2.5">
                  <div className="flex items-center justify-between text-[11px] font-bold text-fuchsia-700">
                    <span className="inline-flex items-center gap-1">
                      <Instagram className="h-3.5 w-3.5" /> Instagram
                    </span>
                    <span className="text-[10px]">▶ Watch</span>
                  </div>
                  <p className="mt-0.5 truncate text-[10px] text-slate-500">
                    {p.igAccount}
                  </p>
                  <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs font-bold text-slate-900">
                    <span className="inline-flex items-center gap-0.5">
                      <Heart className="h-3 w-3 text-pink-500" /> {p.igLikes}
                    </span>
                    <span className="inline-flex items-center gap-0.5">
                      <MessageCircle className="h-3 w-3 text-amber-500" />{" "}
                      {p.igComments}
                    </span>
                  </div>
                </div>
              </div>

              <div className="mt-3 border-t border-slate-100 pt-2.5">
                <div className="flex items-center justify-between text-[10px] font-semibold text-slate-500">
                  <span>
                    YouTube <strong className="text-rose-600">{p.ytShare}%</strong>
                  </span>
                  <span>
                    {p.totalLikes} likes · {p.totalComments} comments total
                  </span>
                  <span>
                    <strong className="text-fuchsia-600">
                      {100 - p.ytShare}%
                    </strong>{" "}
                    IG
                  </span>
                </div>
                <div className="mt-1 flex h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full bg-rose-500"
                    style={{ width: `${p.ytShare}%` }}
                  />
                  <div
                    className="h-full bg-fuchsia-500"
                    style={{ width: `${100 - p.ytShare}%` }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/**
 * Screen 3: Compose Studio + Visual Reel Cover Scrubber & Pre-Flight Guardrails
 */
export function PreviewComposeStudio() {
  return (
    <div className="flex min-h-[480px] w-full bg-slate-50 text-left">
      <MiniSidebar active="compose" />

      <div className="flex-1 space-y-4 p-4 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="text-lg font-bold text-slate-900">
              Compose & Cross-Post Studio
            </h3>
            <p className="text-xs text-slate-500">
              Upload once, scrub your Reel cover frame, and publish across YouTube & Instagram.
            </p>
          </div>
          <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
            ● Per-Channel Presets Auto-Applied
          </span>
        </div>

        {/* Selected Channels */}
        <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-slate-200 bg-white p-3 shadow-2xs">
          <span className="text-xs font-semibold text-slate-500">
            Target Channels:
          </span>
          {[
            { name: "Nova Tech", platform: "YOUTUBE" },
            { name: "Nova Tech IG", platform: "INSTAGRAM" },
            { name: "Pixel Stories", platform: "YOUTUBE" },
            { name: "Pixel Stories IG", platform: "INSTAGRAM" },
          ].map((c) => (
            <span
              key={c.name}
              className="inline-flex items-center gap-1.5 rounded-full border border-indigo-200 bg-indigo-50/70 px-3 py-1 text-xs font-semibold text-indigo-900"
            >
              {c.platform === "YOUTUBE" ? (
                <Youtube className="h-3.5 w-3.5 text-red-600" />
              ) : (
                <Instagram className="h-3.5 w-3.5 text-fuchsia-600" />
              )}
              <span>{c.name}</span>
              <Check className="h-3 w-3 text-indigo-600" />
            </span>
          ))}
        </div>

        {/* Visual Cover Scrubber & Pre-Flight Checks */}
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Film className="h-4 w-4 text-indigo-600" />
              <span className="text-xs font-bold uppercase tracking-wide text-slate-700">
                Visual Cover Scrubber & Pre-Flight Guardrails
              </span>
            </div>
            <span className="rounded-full bg-slate-100 px-2.5 py-0.5 font-mono text-[11px] font-semibold text-slate-700">
              01.8s / 48.0s
            </span>
          </div>

          <div className="mt-3 grid gap-4 md:grid-cols-12">
            {/* 9:16 Video Frame Preview */}
            <div className="flex items-center justify-center rounded-xl bg-slate-950 p-3 md:col-span-4">
              <div className="relative flex aspect-[9/14] w-36 flex-col justify-between rounded-lg bg-gradient-to-br from-indigo-600 via-purple-700 to-pink-600 p-3 text-white shadow-lg">
                <span className="self-start rounded bg-black/40 px-1.5 py-0.5 font-mono text-[9px]">
                  FRAME 01.8s
                </span>
                <div>
                  <p className="text-xs font-extrabold leading-tight">
                    120FPS WEBGL SHADER ENGINE
                  </p>
                  <p className="mt-0.5 text-[9px] text-indigo-100">
                    @novatech · 1080×1920
                  </p>
                </div>
              </div>
            </div>

            <div className="flex flex-col justify-between space-y-3 md:col-span-8">
              <div className="space-y-2.5">
                <div className="flex items-center gap-2">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-slate-700">
                    <Pause className="h-3.5 w-3.5" />
                  </span>
                  <div className="relative h-2.5 flex-1 rounded-full bg-slate-200">
                    <div className="h-full w-1/3 rounded-full bg-gradient-to-r from-indigo-600 to-pink-600" />
                    <span className="absolute top-1/2 left-1/3 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-indigo-600 shadow" />
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
                  <span className="text-slate-400">Quick jump:</span>
                  {["0.0s", "1.8s (Active)", "3.0s", "Mid (24.0s)"].map(
                    (t, idx) => (
                      <span
                        key={t}
                        className={`rounded-md border px-2 py-0.5 font-medium ${
                          idx === 1
                            ? "border-indigo-300 bg-indigo-50 text-indigo-700"
                            : "border-slate-200 bg-white text-slate-600"
                        }`}
                      >
                        {t}
                      </span>
                    )
                  )}
                </div>

                <div className="flex flex-wrap gap-2 pt-1">
                  <span className="inline-flex items-center gap-1.5 rounded-lg bg-pink-600 px-3 py-1.5 text-xs font-semibold text-white shadow-2xs">
                    <Sparkles className="h-3.5 w-3.5" />
                    Reel Cover Set (1.8s)
                  </span>
                  <span className="inline-flex items-center gap-1.5 rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-xs font-semibold text-indigo-700">
                    <Camera className="h-3.5 w-3.5" />
                    Captured as YouTube Thumbnail ✓
                  </span>
                </div>
              </div>

              <div className="border-t border-slate-100 pt-2.5">
                <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                  Pre-Flight Spec Guardrails
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    "9:16 Vertical (1080×1920) · Shorts & Reels Ready",
                    "48.0s duration · Within 60s/90s limits",
                    "24.6 MB · H.264 + AAC",
                  ].map((g) => (
                    <span
                      key={g}
                      className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-medium text-emerald-700"
                    >
                      <CheckCircle2 className="h-3 w-3" />
                      {g}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Screen 4: Unified Comment Reply Inbox + Saved Replies
 */
export function PreviewCommentInbox() {
  const comments = [
    {
      author: "@dev_marcus",
      platform: "YOUTUBE" as const,
      channel: "Nova Tech",
      post: "How We Built a 120fps WebGL Shader Engine in 60s #shorts",
      age: "18m ago",
      text: "The breakdown of the fragment shader pipeline at 0:24 is the clearest explanation I've seen all year. Are you open-sourcing the starter template?",
      replied: "Yes! Full starter repo is linked in the pinned comment — enjoy building! 🚀",
    },
    {
      author: "@elena.motion",
      platform: "INSTAGRAM" as const,
      channel: "Pixel Stories IG",
      post: "3 Blender Lighting Tricks Pixar Artists Use Every Day",
      age: "1h ago",
      text: "Trick #2 with the rim light gobos completely changed my render today. Please do a part 2 on volumetric fog!",
      replied: null,
    },
  ];

  return (
    <div className="flex min-h-[480px] w-full bg-slate-50 text-left">
      <MiniSidebar active="engagement" />

      <div className="flex-1 space-y-4 p-4 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <div className="flex items-center gap-2">
              <MessageCircle className="h-4 w-4 text-amber-500" />
              <h3 className="text-base font-bold text-slate-900">
                Unified Comment Reply Inbox (28)
              </h3>
            </div>
            <p className="text-xs text-slate-500">
              Read and reply live to YouTube & Instagram comments across all 6 channels in one place
            </p>
          </div>

          <div className="flex gap-1 rounded-lg border border-slate-200 bg-white p-0.5 text-xs font-semibold">
            <span className="rounded-md bg-slate-900 px-2.5 py-1 text-white">
              All (28)
            </span>
            <span className="px-2.5 py-1 text-slate-600">YouTube (16)</span>
            <span className="px-2.5 py-1 text-slate-600">Instagram (12)</span>
          </div>
        </div>

        <div className="space-y-3">
          {comments.map((c) => (
            <div
              key={c.author}
              className="space-y-2.5 rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-indigo-100 text-xs font-bold text-indigo-700">
                    {c.author.slice(1, 2).toUpperCase()}
                  </span>
                  <span className="text-xs font-bold text-slate-900">
                    {c.author}
                  </span>
                  <span
                    className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                      c.platform === "YOUTUBE"
                        ? "bg-red-50 text-red-700"
                        : "bg-fuchsia-50 text-fuchsia-700"
                    }`}
                  >
                    {c.platform === "YOUTUBE" ? (
                      <Youtube className="h-3 w-3" />
                    ) : (
                      <Instagram className="h-3 w-3" />
                    )}
                    {c.channel}
                  </span>
                </div>
                <span className="text-[11px] text-slate-400">{c.age}</span>
              </div>

              <p className="text-xs leading-relaxed text-slate-700 sm:text-sm">
                {c.text}
              </p>

              <p className="text-[11px] font-medium text-indigo-600">
                on {c.post}
              </p>

              {c.replied ? (
                <div className="rounded-xl border-l-2 border-emerald-400 bg-emerald-50/70 px-3 py-2 text-xs text-emerald-950">
                  <div className="flex items-center gap-1 font-semibold text-emerald-700">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    <span>You replied live as {c.channel}</span>
                  </div>
                  <p className="mt-0.5 text-slate-800">{c.replied}</p>
                </div>
              ) : (
                <div className="space-y-2 rounded-xl border border-indigo-100 bg-indigo-50/40 p-3">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-[10px] font-semibold text-slate-500">
                      1-Click Saved Replies:
                    </span>
                    {[
                      "Thank you so much! 🙏",
                      "Part 2 drops tomorrow! 🔥",
                      "Glad that trick helped!",
                      "Appreciate the support ❤️",
                    ].map((chip, idx) => (
                      <span
                        key={chip}
                        className={`rounded-full border px-2.5 py-0.5 text-[10px] font-medium ${
                          idx === 1
                            ? "border-indigo-600 bg-indigo-600 text-white"
                            : "border-indigo-200 bg-white text-indigo-700"
                        }`}
                      >
                        {chip}
                      </span>
                    ))}
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-800">
                      Part 2 drops tomorrow! 🔥 Covering volumetric fog + god rays.
                    </div>
                    <span className="inline-flex items-center gap-1 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white">
                      <Send className="h-3 w-3" />
                      Send Reply
                    </span>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
