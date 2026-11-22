"use client";

import Link from "next/link";
import { useState } from "react";
import {
  ArrowLeftRight,
  ArrowRight,
  BarChart3,
  BookOpen,
  CalendarClock,
  Check,
  CheckCircle2,
  ChevronDown,
  Code2,
  Eye,
  Film,
  Heart,
  Instagram,
  Layers,
  MessageCircle,
  Play,
  ShieldCheck,
  Sliders,
  Sparkles,
  Users,
  X,
  Youtube,
  Zap,
} from "lucide-react";

const COMPARISON_ROWS = [
  {
    feature: "Free Connected Channels",
    cadence: "6 channels free forever",
    others: "3 channels max",
    highlight: true,
  },
  {
    feature: "Visual Reel Cover Frame Scrubber",
    cadence: "Scrub frame-by-frame + 1-click YT thumbnail capture",
    others: "Guess second offset or upload separate file",
    highlight: true,
  },
  {
    feature: "Cross-Platform Shorts vs. Reels Comparison",
    cadence: "Side-by-side metrics & engagement split bar",
    others: "Separate per-platform tabs only",
    highlight: true,
  },
  {
    feature: "Unified Comment Reply Inbox",
    cadence: "Reply live to YouTube & Instagram + Saved Replies",
    others: "Paid add-on or separate tool",
    highlight: false,
  },
  {
    feature: "Per-Channel Studio Presets & AI Disclosure",
    cadence: "Category, tags, playlist & AI/Synthetic flag saved per handle",
    others: "Basic caption templates only",
    highlight: false,
  },
  {
    feature: "Developer Draft-Upload REST API",
    cadence: "Included (POST /api/v1/drafts with Bearer API key)",
    others: "Enterprise plan only",
    highlight: true,
  },
  {
    feature: "In-App Content Player",
    cadence: "Watch YouTube Shorts & Instagram Reels inside Cadence",
    others: "Opens external tabs",
    highlight: false,
  },
  {
    feature: "Partial-Failure 1-Click Retry",
    cadence: "Retry only the failed channel without re-uploading",
    others: "Re-create entire post",
    highlight: false,
  },
  {
    feature: "Unlimited Pro Upgrade",
    cadence: "$9 / month flat (unlimited channels)",
    others: "$6–$15 per channel / month",
    highlight: true,
  },
];

const FEATURE_CARDS = [
  {
    badge: "Visual Studio",
    title: "Visual Reel Cover Scrubber & Pre-Flight Guardrails",
    desc: "Scrub your uploaded MP4 frame-by-frame to lock the exact Instagram Reel cover timestamp, or capture any video frame as a custom YouTube thumbnail in 1 click. Built-in ffprobe guardrails verify 9:16 aspect ratio, 60s/90s duration limits, and file size before publishing.",
    icon: Film,
    accent: "bg-indigo-50 text-indigo-600",
  },
  {
    badge: "Cross-Platform Analytics",
    title: "Side-by-Side Shorts vs. Reels Comparison",
    desc: "Stop guessing where your videos perform best. Cadence automatically pairs the same video across YouTube Shorts and Instagram Reels so you can compare views, likes, comments, and platform engagement share side-by-side.",
    icon: ArrowLeftRight,
    accent: "bg-rose-50 text-rose-600",
  },
  {
    badge: "Per-Account Dashboards",
    title: "1-Tap YouTube & Instagram Account Drilldowns",
    desc: "Switch cleanly between All Platforms, YouTube-only, or Instagram-only — or tap any individual handle to open its dedicated dashboard with momentum bar charts, average benchmarks, top-post spotlight, and trend sparklines.",
    icon: BarChart3,
    accent: "bg-emerald-50 text-emerald-600",
  },
  {
    badge: "Engagement",
    title: "Unified Comment Reply Inbox",
    desc: "Read and reply live to viewer comments across all 6 YouTube and Instagram channels from a single screen. Use 1-click Saved Reply chips to engage your community in seconds.",
    icon: MessageCircle,
    accent: "bg-amber-50 text-amber-600",
  },
  {
    badge: "Multi-Brand Presets",
    title: "Per-Channel Studio Presets & Auto First Comments",
    desc: "Run multiple themed channels? Save default YouTube categories, privacy, tags, playlists, and Altered/Synthetic AI disclosures per channel once — plus schedule an automatic first comment on both YouTube and Instagram.",
    icon: Sliders,
    accent: "bg-fuchsia-50 text-fuchsia-600",
  },
  {
    badge: "Automation API",
    title: "Developer Draft-Upload REST API",
    desc: "Generate a cad_live_... Bearer key and push finished MP4s + metadata straight from your local video scripts or AI studio pipelines into Cadence as Drafts for 1-click review and publish.",
    icon: Code2,
    accent: "bg-slate-900 text-indigo-300",
  },
];

const LANDING_FAQS = [
  {
    q: "Is the 6-channel Free plan really free forever?",
    a: "Yes. You can connect up to 6 YouTube and Instagram channels (for example, 3 YouTube channels + 3 Instagram accounts) and publish up to 30 cross-posts every month on the Generous Free plan with no credit card required.",
  },
  {
    q: "What types of YouTube and Instagram accounts are supported?",
    a: "Cadence supports all YouTube channels (including multiple Brand Channels under your Google login) for Videos & Shorts, and Instagram Professional (free Creator or Business) accounts for Reels, Single Images, and Multi-Image Carousels.",
  },
  {
    q: "How are my connected account tokens protected?",
    a: "Every Google and Meta OAuth token is encrypted at rest using AES-256-GCM with a unique initialization vector and authentication tag. Cadence also includes a proactive Token Health Monitor that alerts you before a 60-day Meta token expires.",
  },
  {
    q: "What happens if YouTube succeeds and Instagram fails on a cross-post?",
    a: "Each target channel is tracked independently. If one platform hits a temporary API hiccup, Cadence marks the post Partial Failure and lets you click Retry on just the failed channel without re-uploading your video.",
  },
  {
    q: "Can I automate uploads from my own scripts or AI video pipeline?",
    a: "Yes! Every account includes access to the Draft-Upload REST API (GET /api/v1/channels and POST /api/v1/drafts). Your local script uploads the MP4 and metadata, Cadence merges your saved channel presets, and the post appears in your Publishing Queue ready for 1-click review.",
  },
];

export function MarketingLanding({
  isLoggedIn = false,
  onBackToDashboard,
}: {
  isLoggedIn?: boolean;
  onBackToDashboard?: () => void;
}) {
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "SoftwareApplication",
        name: "Cadence",
        url: "https://cadences.in",
        applicationCategory: "BusinessApplication",
        operatingSystem: "Web",
        description:
          "Multi-channel social media scheduler, cross-poster, and analytics dashboard for YouTube Shorts and Instagram Reels with 6 free channels.",
        offers: [
          {
            "@type": "Offer",
            name: "Generous Free",
            price: "0",
            priceCurrency: "USD",
            description:
              "Up to 6 connected YouTube & Instagram channels and 30 cross-posts per month.",
          },
          {
            "@type": "Offer",
            name: "Creator Pro",
            price: "9",
            priceCurrency: "USD",
            description:
              "Unlimited connected YouTube & Instagram channels, unlimited posts, and 250 MB uploads.",
          },
        ],
      },
      {
        "@type": "FAQPage",
        mainEntity: LANDING_FAQS.map((item) => ({
          "@type": "Question",
          name: item.q,
          acceptedAnswer: {
            "@type": "Answer",
            text: item.a,
          },
        })),
      },
    ],
  };

  return (
    <div className="space-y-20 py-4 sm:space-y-24 sm:py-8">
      {/* Structured Data for Google Search Rich Snippets */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {isLoggedIn && onBackToDashboard && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-indigo-200 bg-indigo-50/80 px-4 py-3 text-xs text-indigo-950">
          <span className="font-medium">
            You are previewing the public <strong>cadences.in</strong> marketing website while signed in.
          </span>
          <button
            type="button"
            onClick={onBackToDashboard}
            className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-3.5 py-1.5 font-semibold text-white hover:bg-indigo-700"
          >
            <span>Back to Publishing Queue</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* 1. HERO SECTION */}
      <section className="relative overflow-hidden rounded-3xl border border-slate-200/90 bg-gradient-to-b from-indigo-50/70 via-white to-white px-5 pt-10 pb-12 shadow-xs sm:px-10 sm:pt-14 sm:pb-16">
        <div className="mx-auto max-w-4xl text-center">
          <div className="inline-flex flex-wrap items-center justify-center gap-2 rounded-full border border-indigo-200 bg-white px-4 py-1.5 text-xs font-semibold text-indigo-700 shadow-2xs">
            <Sparkles className="h-3.5 w-3.5 text-indigo-600" />
            <span>Connect 6 Channels Free Forever — 2× Buffer&apos;s 3-Channel Limit</span>
          </div>

          <h1 className="mt-6 text-4xl font-extrabold tracking-tight text-slate-900 sm:text-5xl lg:text-6xl">
            Cross-post{" "}
            <span className="bg-gradient-to-r from-red-600 to-rose-600 bg-clip-text text-transparent">
              YouTube Shorts
            </span>{" "}
            &{" "}
            <span className="bg-gradient-to-r from-fuchsia-600 to-pink-600 bg-clip-text text-transparent">
              Instagram Reels
            </span>{" "}
            in one click.
          </h1>

          <p className="mx-auto mt-5 max-w-2xl text-base leading-relaxed text-slate-600 sm:text-lg">
            Built for multi-channel creators. Upload once, scrub your exact Reel cover frame visually, auto-fill per-channel Studio presets, compare Shorts vs. Reels performance side-by-side, and reply to every comment from one unified inbox.
          </p>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-3.5">
            {isLoggedIn && onBackToDashboard ? (
              <button
                type="button"
                onClick={onBackToDashboard}
                className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-7 py-3.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700"
              >
                <span>Open Your Dashboard</span>
                <ArrowRight className="h-4 w-4" />
              </button>
            ) : (
              <>
                <Link
                  href="/register"
                  className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-7 py-3.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700"
                >
                  <span>Start Free (6 Channels)</span>
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  href="/login"
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-6 py-3.5 text-sm font-semibold text-slate-800 transition hover:bg-slate-50"
                >
                  <span>Sign In</span>
                </Link>
              </>
            )}
            <Link
              href="/guide"
              className="inline-flex items-center gap-1.5 rounded-xl px-4 py-3.5 text-sm font-semibold text-indigo-600 hover:bg-indigo-50"
            >
              <BookOpen className="h-4 w-4" />
              <span>Explore User Guide</span>
            </Link>
          </div>

          <div className="mt-6 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs font-medium text-slate-500">
            <span className="inline-flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              No credit card required
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Youtube className="h-4 w-4 text-red-600" />
              YouTube Videos & Shorts
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Instagram className="h-4 w-4 text-fuchsia-600" />
              Instagram Reels, Posts & Carousels
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Code2 className="h-4 w-4 text-indigo-600" />
              Draft-Upload REST API Included
            </span>
          </div>
        </div>

        {/* Interactive Product Preview Mockup */}
        <div className="mx-auto mt-12 max-w-5xl overflow-hidden rounded-2xl border border-slate-200/90 bg-slate-950 p-2 shadow-2xl sm:p-3">
          <div className="flex items-center justify-between border-b border-slate-800 px-3 py-2 text-xs text-slate-400">
            <div className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-rose-500" />
              <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
              <span className="ml-2 font-mono text-[11px] text-slate-300">
                cadences.in/engagement
              </span>
            </div>
            <span className="rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-[10px] font-semibold text-emerald-400">
              ● 6 / 6 Free Channels Connected
            </span>
          </div>

          <div className="grid gap-4 rounded-xl bg-slate-50 p-4 lg:grid-cols-12">
            {/* Left Mock: Cross-Platform Comparison + KPI Strip */}
            <div className="space-y-3 lg:col-span-7">
              <div className="grid grid-cols-3 gap-2.5">
                <div className="rounded-xl border border-slate-200 bg-white p-3">
                  <p className="text-[10px] font-medium text-slate-500">
                    Connected Channels
                  </p>
                  <p className="mt-1 text-lg font-extrabold text-slate-900">
                    3 YT + 3 IG
                  </p>
                  <p className="text-[10px] font-medium text-emerald-600">
                    Included on Free
                  </p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white p-3">
                  <p className="text-[10px] font-medium text-slate-500">
                    Cross-Platform Views
                  </p>
                  <p className="mt-1 text-lg font-extrabold text-slate-900">
                    14.7K+
                  </p>
                  <p className="text-[10px] font-medium text-indigo-600">
                    Live API sync
                  </p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white p-3">
                  <p className="text-[10px] font-medium text-slate-500">
                    Engagement Rate
                  </p>
                  <p className="mt-1 text-lg font-extrabold text-slate-900">
                    7.02%
                  </p>
                  <p className="text-[10px] font-medium text-pink-600">
                    Shorts vs. Reels
                  </p>
                </div>
              </div>

              {/* Side-by-Side Comparison Card Preview */}
              <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-2xs">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <ArrowLeftRight className="h-3.5 w-3.5 text-indigo-600" />
                    <span className="text-xs font-bold text-slate-900">
                      Cross-Platform Post Comparison
                    </span>
                  </div>
                  <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-[10px] font-semibold text-indigo-700">
                    Auto-Matched
                  </span>
                </div>

                <p className="mt-1.5 text-xs font-semibold text-slate-800">
                  Why Hanuman Carried an Entire Mountain (Valmiki Ramayana) #shorts
                </p>

                <div className="mt-2.5 grid grid-cols-2 gap-2">
                  <div className="rounded-lg border border-rose-100 bg-rose-50/50 p-2.5">
                    <div className="flex items-center justify-between text-[11px] font-bold text-rose-700">
                      <span className="inline-flex items-center gap-1">
                        <Youtube className="h-3.5 w-3.5" /> YouTube Short
                      </span>
                      <span className="inline-flex items-center gap-0.5 text-[10px]">
                        <Play className="h-2.5 w-2.5 fill-current" /> Watch
                      </span>
                    </div>
                    <div className="mt-1.5 flex items-center gap-3 text-xs font-bold text-slate-900">
                      <span className="inline-flex items-center gap-1">
                        <Eye className="h-3 w-3 text-emerald-600" /> 376
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <Heart className="h-3 w-3 text-pink-500" /> 20
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <MessageCircle className="h-3 w-3 text-amber-500" /> 1
                      </span>
                    </div>
                  </div>

                  <div className="rounded-lg border border-fuchsia-100 bg-fuchsia-50/50 p-2.5">
                    <div className="flex items-center justify-between text-[11px] font-bold text-fuchsia-700">
                      <span className="inline-flex items-center gap-1">
                        <Instagram className="h-3.5 w-3.5" /> Instagram Reel
                      </span>
                      <span className="inline-flex items-center gap-0.5 text-[10px]">
                        <Play className="h-2.5 w-2.5 fill-current" /> Watch
                      </span>
                    </div>
                    <div className="mt-1.5 flex items-center gap-3 text-xs font-bold text-slate-900">
                      <span className="inline-flex items-center gap-1">
                        <Heart className="h-3 w-3 text-pink-500" /> 34
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <MessageCircle className="h-3 w-3 text-amber-500" /> 3
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Mock: Visual Cover Scrubber + Comment Reply Inbox */}
            <div className="space-y-3 lg:col-span-5">
              <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-2xs">
                <div className="flex items-center justify-between">
                  <span className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-900">
                    <Film className="h-3.5 w-3.5 text-indigo-600" />
                    Visual Reel Cover Scrubber
                  </span>
                  <span className="rounded bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
                    9:16 · 45.2s Ready
                  </span>
                </div>
                <div className="mt-2.5 flex items-center gap-2">
                  <span className="rounded-md bg-slate-900 px-2 py-1 font-mono text-[10px] text-white">
                    01.4s
                  </span>
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
                    <div className="h-full w-1/3 rounded-full bg-gradient-to-r from-indigo-600 to-pink-600" />
                  </div>
                  <span className="rounded-md bg-pink-600 px-2 py-1 text-[10px] font-semibold text-white">
                    Cover Locked
                  </span>
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-2xs">
                <div className="flex items-center justify-between">
                  <span className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-900">
                    <MessageCircle className="h-3.5 w-3.5 text-amber-500" />
                    Unified Comment Reply Inbox
                  </span>
                  <span className="text-[10px] font-medium text-slate-400">
                    YT + IG Live
                  </span>
                </div>
                <p className="mt-1.5 text-[11px] text-slate-600">
                  &ldquo;The animation and pacing on this episode was incredible!&rdquo;
                </p>
                <div className="mt-2 flex flex-wrap gap-1">
                  {["Thank you so much! 🙏", "Part 2 coming soon! 🔥"].map(
                    (chip) => (
                      <span
                        key={chip}
                        className="rounded-full border border-indigo-200 bg-indigo-50/60 px-2 py-0.5 text-[10px] font-medium text-indigo-700"
                      >
                        {chip}
                      </span>
                    )
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. WHY CREATORS SWITCH (CADENCE VS. BUFFER / TRADITIONAL SCHEDULERS) */}
      <section id="compare" className="space-y-6">
        <div className="mx-auto max-w-3xl text-center">
          <span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700">
            Why Creators Switch to Cadence
          </span>
          <h2 className="mt-3 text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">
            Stop hitting 3-channel walls and per-channel fees
          </h2>
          <p className="mt-2 text-sm text-slate-600 sm:text-base">
            If you run 3 brands across YouTube and Instagram, traditional schedulers force you onto a paid plan on day one. Cadence gives you all 6 channels free.
          </p>
        </div>

        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/80 text-slate-600">
                  <th className="px-4 py-3.5 font-semibold sm:px-6">Capability</th>
                  <th className="px-4 py-3.5 font-bold text-indigo-700 sm:px-6">
                    Cadence (cadences.in)
                  </th>
                  <th className="px-4 py-3.5 font-semibold text-slate-500 sm:px-6">
                    Buffer / Traditional Schedulers
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {COMPARISON_ROWS.map((row) => (
                  <tr
                    key={row.feature}
                    className={row.highlight ? "bg-indigo-50/25" : ""}
                  >
                    <td className="px-4 py-3.5 font-semibold text-slate-900 sm:px-6">
                      {row.feature}
                    </td>
                    <td className="px-4 py-3.5 font-semibold text-slate-900 sm:px-6">
                      <span className="inline-flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
                        <span>{row.cadence}</span>
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-slate-500 sm:px-6">
                      <span className="inline-flex items-center gap-2">
                        <X className="h-4 w-4 shrink-0 text-slate-400" />
                        <span>{row.others}</span>
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* 3. DEEP FEATURE SHOWCASE */}
      <section id="features" className="space-y-8">
        <div className="mx-auto max-w-3xl text-center">
          <span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700">
            Built for Short-Form & Long-Form Video Creators
          </span>
          <h2 className="mt-3 text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">
            Every Studio control, analytics chart, and inbox in one place
          </h2>
          <p className="mt-2 text-sm text-slate-600 sm:text-base">
            No stripped-down mobile wrappers. Cadence speaks directly to the official YouTube Data API v3 and Meta Graph API v22.0.
          </p>
        </div>

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURE_CARDS.map((card) => {
            const Icon = card.icon;
            return (
              <div
                key={card.title}
                className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-6 shadow-2xs transition hover:border-indigo-300 hover:shadow-sm"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span
                      className={`flex h-10 w-10 items-center justify-center rounded-xl ${card.accent}`}
                    >
                      <Icon className="h-5 w-5" />
                    </span>
                    <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-semibold text-slate-600">
                      {card.badge}
                    </span>
                  </div>
                  <h3 className="mt-4 text-base font-bold text-slate-900">
                    {card.title}
                  </h3>
                  <p className="mt-2 text-xs leading-relaxed text-slate-600 sm:text-sm">
                    {card.desc}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* 4. HOW IT WORKS (4 STEPS) */}
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-2xs sm:p-10">
        <div className="mx-auto max-w-2xl text-center">
          <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
            How Cadence Works
          </span>
          <h2 className="mt-3 text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">
            From finished MP4 to published everywhere in 60 seconds
          </h2>
        </div>

        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {[
            {
              step: "01",
              title: "Connect Your Channels",
              desc: "Link up to 6 YouTube channels and Instagram Creator/Business accounts with 1-click OAuth and live token health tracking.",
              icon: Users,
            },
            {
              step: "02",
              title: "Save Per-Channel Presets",
              desc: "Set each brand's default YouTube category, privacy, tags, playlist, and AI disclosure flag once — Cadence remembers them forever.",
              icon: Sliders,
            },
            {
              step: "03",
              title: "Upload & Scrub Cover",
              desc: "Drop your video in Compose (or push via REST API), scrub the exact Reel cover frame, add Auto First Comments, and schedule or post now.",
              icon: CalendarClock,
            },
            {
              step: "04",
              title: "Compare & Reply",
              desc: "Watch your Shorts & Reels inside Cadence, compare cross-platform metrics side-by-side, and reply to comments from one inbox.",
              icon: Zap,
            },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.step}
                className="rounded-2xl border border-slate-100 bg-slate-50/70 p-5"
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-bold text-indigo-600">
                    STEP {item.step}
                  </span>
                  <Icon className="h-4 w-4 text-slate-400" />
                </div>
                <h3 className="mt-3 text-sm font-bold text-slate-900">
                  {item.title}
                </h3>
                <p className="mt-1.5 text-xs leading-relaxed text-slate-600">
                  {item.desc}
                </p>
              </div>
            );
          })}
        </div>
      </section>

      {/* 5. TRANSPARENT PRICING PREVIEW */}
      <section id="pricing" className="space-y-8">
        <div className="mx-auto max-w-2xl text-center">
          <span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700">
            Simple, Creator-Friendly Pricing
          </span>
          <h2 className="mt-3 text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">
            Start free with 6 channels. Upgrade only when you outgrow it.
          </h2>
        </div>

        <div className="mx-auto grid max-w-4xl gap-6 md:grid-cols-2">
          {/* Free Tier */}
          <div className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-7 shadow-2xs">
            <div>
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-slate-900">
                  Generous Free
                </h3>
                <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700">
                  2× Buffer Free
                </span>
              </div>
              <p className="mt-3 flex items-baseline gap-1">
                <span className="text-4xl font-extrabold text-slate-900">
                  $0
                </span>
                <span className="text-xs text-slate-500">/ forever</span>
              </p>
              <p className="mt-2 text-xs text-slate-600">
                Perfect for creators running up to 3 brands across YouTube & Instagram.
              </p>

              <ul className="mt-6 space-y-2.5 text-xs text-slate-700">
                {[
                  "Up to 6 connected YouTube & Instagram channels",
                  "30 scheduled or immediate cross-posts / month",
                  "Visual Reel Cover Scrubber & Pre-Flight Guardrails",
                  "Per-channel Studio presets & Auto First Comments",
                  "Side-by-side Shorts vs. Reels Analytics & Comment Inbox",
                  "Developer Draft-Upload REST API access",
                  "Up to 100 MB per video upload",
                ].map((f) => (
                  <li key={f} className="flex items-start gap-2">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
            </div>

            <Link
              href={isLoggedIn ? "/accounts" : "/register"}
              className="mt-8 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-900 transition hover:bg-slate-50"
            >
              <span>
                {isLoggedIn ? "Manage Your Channels" : "Start Free — No Card Needed"}
              </span>
            </Link>
          </div>

          {/* Creator Pro Tier */}
          <div className="flex flex-col justify-between rounded-2xl border-2 border-indigo-600 bg-white p-7 shadow-md">
            <div>
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-slate-900">
                  Creator Pro
                </h3>
                <span className="rounded-full bg-indigo-600 px-2.5 py-0.5 text-xs font-semibold text-white">
                  Unlimited
                </span>
              </div>
              <p className="mt-3 flex items-baseline gap-1">
                <span className="text-4xl font-extrabold text-slate-900">
                  $9
                </span>
                <span className="text-xs text-slate-500">
                  / month flat (not per channel)
                </span>
              </p>
              <p className="mt-2 text-xs text-slate-600">
                For studios, clipping networks, and multi-brand creators scaling daily.
              </p>

              <ul className="mt-6 space-y-2.5 text-xs text-slate-700">
                {[
                  "Unlimited YouTube & Instagram channels",
                  "Unlimited scheduled & immediate cross-posts",
                  "Up to 250 MB per video upload",
                  "Full Visual Cover Scrubber & custom YouTube thumbnails",
                  "Unlimited Unified Comment Replies & Saved Replies",
                  "Priority background publishing queue & API automation",
                ].map((f) => (
                  <li key={f} className="flex items-start gap-2">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-indigo-600" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
            </div>

            <Link
              href={isLoggedIn ? "/pricing" : "/register"}
              className="mt-8 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white shadow-xs transition hover:bg-indigo-700"
            >
              <span>
                {isLoggedIn ? "View Plan Options" : "Get Started Free"}
              </span>
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* 6. CREATOR FAQ ACCORDION */}
      <section className="mx-auto max-w-3xl space-y-4">
        <div className="text-center">
          <h2 className="text-2xl font-extrabold tracking-tight text-slate-900">
            Frequently Asked Questions
          </h2>
          <p className="mt-1 text-sm text-slate-600">
            Everything you need to know before connecting your channels.
          </p>
        </div>

        <div className="divide-y divide-slate-200 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xs">
          {LANDING_FAQS.map((item, idx) => {
            const isOpen = openFaq === idx;
            return (
              <div key={item.q}>
                <button
                  type="button"
                  onClick={() => setOpenFaq(isOpen ? null : idx)}
                  className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left hover:bg-slate-50"
                >
                  <span className="text-sm font-semibold text-slate-900">
                    {item.q}
                  </span>
                  <ChevronDown
                    className={`h-4 w-4 shrink-0 text-slate-400 transition-transform ${
                      isOpen ? "rotate-180" : ""
                    }`}
                  />
                </button>
                {isOpen && (
                  <div className="border-t border-slate-100 bg-slate-50/50 px-5 py-3.5 text-xs leading-relaxed text-slate-600 sm:text-sm">
                    {item.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* 7. BOTTOM CONVERSION BANNER */}
      <section className="rounded-3xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 px-6 py-12 text-center text-white shadow-lg sm:px-12">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3.5 py-1 text-xs font-semibold text-indigo-200">
          <ShieldCheck className="h-3.5 w-3.5" />
          <span>AES-256-GCM Encrypted Token Vault · Official YouTube & Meta APIs</span>
        </span>
        <h2 className="mx-auto mt-4 max-w-2xl text-2xl font-extrabold tracking-tight sm:text-4xl">
          Ready to publish across all your channels from one studio?
        </h2>
        <p className="mx-auto mt-3 max-w-xl text-sm text-slate-300">
          Connect up to 6 YouTube and Instagram channels in under 2 minutes — free forever, no credit card required.
        </p>
        <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
          <Link
            href={isLoggedIn ? "/compose" : "/register"}
            className="inline-flex items-center gap-2 rounded-xl bg-white px-7 py-3.5 text-sm font-bold text-slate-900 shadow-sm transition hover:bg-indigo-50"
          >
            <span>
              {isLoggedIn ? "Create a Cross-Post Now" : "Create Free Account"}
            </span>
            <ArrowRight className="h-4 w-4" />
          </Link>
          {!isLoggedIn && (
            <Link
              href="/login"
              className="inline-flex items-center gap-2 rounded-xl border border-white/25 bg-white/5 px-6 py-3.5 text-sm font-semibold text-white transition hover:bg-white/10"
            >
              <span>Sign In to Existing Account</span>
            </Link>
          )}
        </div>
      </section>
    </div>
  );
}
