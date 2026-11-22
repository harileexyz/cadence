"use client";

import Link from "next/link";
import { useState } from "react";
import {
  ArrowLeftRight,
  ArrowRight,
  BarChart3,
  BookOpen,
  Check,
  CheckCircle2,
  ChevronDown,
  Code2,
  Film,
  Instagram,
  MessageCircle,
  ShieldCheck,
  Smartphone,
  Sparkles,
  X,
  Youtube,
} from "lucide-react";

const HERO_SCREENS = [
  {
    id: "switcher",
    label: "1. Per-Platform & Account Stats",
    badge: "YouTube + Instagram Switcher",
    caption:
      "Switch cleanly between All Platforms, YouTube (3), and Instagram (3) — or drill into any handle's momentum chart and top post.",
    src: "/screenshots/platform-switcher.jpg",
    url: "cadences.in/engagement?account=semicolon",
  },
  {
    id: "compare",
    label: "2. Shorts vs. Reels Comparison",
    badge: "Auto-Matched Cross-Posts",
    caption:
      "See how the exact same video performs on YouTube Shorts vs. Instagram Reels side-by-side with engagement split bars.",
    src: "/screenshots/cross-platform-compare.jpg",
    url: "cadences.in/engagement (Cross-Platform Comparison)",
  },
  {
    id: "inbox",
    label: "3. Unified Comment Reply Inbox",
    badge: "Live YT + IG Replies",
    caption:
      "Read and reply to viewer comments across all 6 YouTube and Instagram channels from one screen with 1-click saved replies.",
    src: "/screenshots/comment-reply-inbox.jpg",
    url: "cadences.in/engagement (Unified Comment Inbox)",
  },
  {
    id: "channel",
    label: "4. Channel Drilldown & Player",
    badge: "In-App Video Player",
    caption:
      "Watch your Shorts and Reels right inside Cadence while tracking real-time views, likes, comments, and engagement rate.",
    src: "/screenshots/dashboard-hero.png",
    url: "cadences.in/engagement?account=mythlantern",
  },
] as const;

const COMPARISON_ROWS = [
  {
    feature: "Free Connected Channels",
    cadence: "6 channels free forever (e.g. 3 YT + 3 IG)",
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
    feature: "Shorts vs. Reels Side-by-Side Comparison",
    cadence: "Auto-matched cards + engagement split bar",
    others: "Separate tabs only",
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
    cadence: "Category, tags, playlist & AI flag saved per handle",
    others: "Basic caption templates only",
    highlight: false,
  },
  {
    feature: "Developer Draft-Upload REST API",
    cadence: "Included (POST /api/v1/drafts with Bearer key)",
    others: "Enterprise plan only",
    highlight: true,
  },
  {
    feature: "Unlimited Pro Upgrade",
    cadence: "$9 / month flat (unlimited channels)",
    others: "$6–$15 per channel / month",
    highlight: true,
  },
];

const LANDING_FAQS = [
  {
    q: "Is the 6-channel Free plan really free forever?",
    a: "Yes. Connect up to 6 YouTube and Instagram channels (for example, 3 YouTube channels + 3 Instagram accounts) and publish up to 30 cross-posts every month on the Generous Free plan with no credit card required.",
  },
  {
    q: "What types of YouTube and Instagram accounts are supported?",
    a: "All YouTube channels (including Brand Channels) for Videos & Shorts, and Instagram Professional (free Creator or Business) accounts for Reels, Single Images, and Multi-Image Carousels.",
  },
  {
    q: "What happens if YouTube succeeds and Instagram fails on a cross-post?",
    a: "Each target channel is tracked independently. Click Retry on just the failed channel in your Publishing Queue — Cadence reuses your stored video without re-uploading.",
  },
  {
    q: "Can I push drafts automatically from my local scripts or AI pipeline?",
    a: "Yes. Generate a cad_live_... API key in Profile & Settings and POST your MP4 + metadata to /api/v1/drafts. Cadence merges each channel's saved presets and places the draft in your queue for 1-click review.",
  },
];

export function MarketingLanding({
  isLoggedIn = false,
  onBackToDashboard,
}: {
  isLoggedIn?: boolean;
  onBackToDashboard?: () => void;
}) {
  const [activeScreenIdx, setActiveScreenIdx] = useState(0);
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  const activeScreen = HERO_SCREENS[activeScreenIdx];

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
          },
          {
            "@type": "Offer",
            name: "Creator Pro",
            price: "9",
            priceCurrency: "USD",
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
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <div className="space-y-14 pb-8 sm:space-y-20">
        {isLoggedIn && onBackToDashboard && (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-indigo-200 bg-indigo-50/80 px-4 py-2.5 text-xs text-indigo-950">
            <span className="font-medium">
              Previewing the public <strong>cadences.in</strong> website while signed in.
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

        {/* 1. COMPACT HERO + INTERACTIVE LIVE APP SCREENSHOT SHOWCASE */}
        <section className="rounded-3xl border border-slate-200/90 bg-gradient-to-b from-indigo-50/70 via-white to-white px-4 pt-6 pb-8 shadow-xs sm:px-8 sm:pt-8 sm:pb-10">
          <div className="mx-auto max-w-4xl text-center">
            <div className="inline-flex items-center gap-2 rounded-full border border-indigo-200 bg-white px-3.5 py-1 text-xs font-semibold text-indigo-700 shadow-2xs">
              <Sparkles className="h-3.5 w-3.5 text-indigo-600" />
              <span>6 Channels Free Forever — 2× Buffer&apos;s 3-Channel Limit</span>
            </div>

            <h1 className="mt-4 text-3xl font-extrabold tracking-tight text-slate-900 sm:text-5xl">
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

            <p className="mx-auto mt-3 max-w-2xl text-sm leading-relaxed text-slate-600 sm:text-base">
              Upload once, scrub your Reel cover frame visually, compare Shorts vs. Reels side-by-side, and reply to all comments from one studio.
            </p>

            <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
              {isLoggedIn && onBackToDashboard ? (
                <button
                  type="button"
                  onClick={onBackToDashboard}
                  className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700"
                >
                  <span>Open Your Dashboard</span>
                  <ArrowRight className="h-4 w-4" />
                </button>
              ) : (
                <>
                  <Link
                    href="/register"
                    className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700"
                  >
                    <span>Start Free (6 Channels)</span>
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                  <Link
                    href="/login"
                    className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-800 transition hover:bg-slate-50"
                  >
                    <span>Sign In</span>
                  </Link>
                </>
              )}
              <Link
                href="/guide"
                className="inline-flex items-center gap-1.5 rounded-xl px-3.5 py-3 text-xs font-semibold text-indigo-600 hover:bg-indigo-50 sm:text-sm"
              >
                <BookOpen className="h-4 w-4" />
                <span>User Guide</span>
              </Link>
            </div>
          </div>

          {/* Interactive Screenshot Switcher Tabs */}
          <div className="mx-auto mt-7 max-w-5xl">
            <div className="flex flex-wrap items-center justify-center gap-2">
              {HERO_SCREENS.map((scr, idx) => {
                const active = idx === activeScreenIdx;
                return (
                  <button
                    key={scr.id}
                    type="button"
                    onClick={() => setActiveScreenIdx(idx)}
                    className={`rounded-xl border px-3.5 py-2 text-xs font-semibold transition ${
                      active
                        ? "border-slate-900 bg-slate-900 text-white shadow-xs"
                        : "border-slate-200 bg-white text-slate-700 hover:border-indigo-300 hover:bg-slate-50"
                    }`}
                  >
                    {scr.label}
                  </button>
                );
              })}
            </div>

            {/* Browser Window Frame with Real App Screenshot */}
            <div className="mt-4 overflow-hidden rounded-2xl border border-slate-300 bg-slate-950 p-2 shadow-2xl sm:p-3">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 px-3 py-2 text-xs text-slate-400">
                <div className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-rose-500" />
                  <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
                  <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                  <span className="ml-2 font-mono text-[11px] text-slate-300">
                    https://{activeScreen.url}
                  </span>
                </div>
                <span className="rounded-full bg-indigo-500/20 px-2.5 py-0.5 text-[10px] font-semibold text-indigo-300">
                  {activeScreen.badge}
                </span>
              </div>

              <div className="overflow-hidden rounded-xl bg-white">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={activeScreen.src}
                  alt={activeScreen.label}
                  className="w-full object-cover"
                />
              </div>

              <p className="mt-2.5 px-2 text-center text-xs text-slate-300">
                {activeScreen.caption}
              </p>
            </div>
          </div>
        </section>

        {/* 2. VISUAL PRODUCT TOUR (REAL SCREENSHOTS + PUNCHY BULLETS) */}
        <section id="features" className="space-y-12">
          <div className="mx-auto max-w-2xl text-center">
            <span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700">
              See Cadence in Action
            </span>
            <h2 className="mt-2.5 text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">
              Built for creators running multiple channels
            </h2>
          </div>

          {/* Visual Row 1: Side-by-Side Shorts vs. Reels Comparison */}
          <div className="grid items-center gap-8 rounded-3xl border border-slate-200 bg-white p-5 shadow-2xs sm:p-8 lg:grid-cols-12">
            <div className="space-y-4 lg:col-span-5">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-50 px-3 py-1 text-xs font-semibold text-rose-700">
                <ArrowLeftRight className="h-3.5 w-3.5" />
                <span>Cross-Platform Comparison</span>
              </span>
              <h3 className="text-xl font-extrabold text-slate-900 sm:text-2xl">
                Compare the same video on YouTube Shorts vs. Instagram Reels
              </h3>
              <ul className="space-y-2.5 text-xs text-slate-600 sm:text-sm">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                  <span>
                    <strong>Auto-matched pairs:</strong> Automatically links cross-posted Shorts and Reels by Cadence ID or caption keywords.
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                  <span>
                    <strong>Engagement split bar:</strong> Instantly see whether YouTube or Instagram drove more likes and comments.
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                  <span>
                    <strong>Watch inside Cadence:</strong> Click Watch on either card to play the Short or Reel without leaving your dashboard.
                  </span>
                </li>
              </ul>
            </div>

            <div className="overflow-hidden rounded-2xl border border-slate-200 shadow-lg lg:col-span-7">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/screenshots/cross-platform-compare.jpg"
                alt="Cross-Platform YouTube Shorts vs Instagram Reels Comparison"
                className="w-full object-cover"
              />
            </div>
          </div>

          {/* Visual Row 2: 1-Tap Platform Switcher & Per-Account Dashboards */}
          <div className="grid items-center gap-8 rounded-3xl border border-slate-200 bg-white p-5 shadow-2xs sm:p-8 lg:grid-cols-12">
            <div className="order-2 overflow-hidden rounded-2xl border border-slate-200 shadow-lg lg:order-1 lg:col-span-7">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/screenshots/platform-switcher.jpg"
                alt="YouTube and Instagram Platform Switcher and Per-Account Analytics"
                className="w-full object-cover"
              />
            </div>

            <div className="order-1 space-y-4 lg:order-2 lg:col-span-5">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700">
                <BarChart3 className="h-3.5 w-3.5" />
                <span>Per-Account Analytics</span>
              </span>
              <h3 className="text-xl font-extrabold text-slate-900 sm:text-2xl">
                Switch between YouTube & Instagram or drill into any handle
              </h3>
              <ul className="space-y-2.5 text-xs text-slate-600 sm:text-sm">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                  <span>
                    <strong>Clean platform toggle:</strong> Filter by All Platforms (6), YouTube (3), or Instagram (3) in one click.
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                  <span>
                    <strong>Momentum bar chart:</strong> Compare your last 12 uploads against your channel average benchmark line.
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                  <span>
                    <strong>Top Performing Post spotlight:</strong> Highlights your #1 recent upload with views, likes, comments & engagement rate.
                  </span>
                </li>
              </ul>
            </div>
          </div>

          {/* Visual Row 3: Unified Comment Reply Inbox + Mobile-First App & Presets */}
          <div className="grid items-center gap-8 rounded-3xl border border-slate-200 bg-white p-5 shadow-2xs sm:p-8 lg:grid-cols-12">
            <div className="space-y-4 lg:col-span-5">
              <div className="flex flex-wrap gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-800">
                  <MessageCircle className="h-3.5 w-3.5" />
                  <span>Unified Comment Inbox</span>
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-fuchsia-50 px-3 py-1 text-xs font-semibold text-fuchsia-700">
                  <Smartphone className="h-3.5 w-3.5" />
                  <span>Mobile & Desktop</span>
                </span>
              </div>
              <h3 className="text-xl font-extrabold text-slate-900 sm:text-2xl">
                Reply to all comments, save channel presets & automate via API
              </h3>
              <ul className="space-y-2.5 text-xs text-slate-600 sm:text-sm">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                  <span>
                    <strong>Live comment replies:</strong> Reply directly to YouTube & Instagram comments with 1-click Saved Reply chips.
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                  <span>
                    <strong>Per-channel Studio presets:</strong> Pre-save category, default tags, and AI/Altered disclosure per channel.
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                  <span>
                    <strong>Visual Cover Scrubber & Draft API:</strong> Scrub Reel covers visually or push MP4 drafts straight from local scripts (`POST /api/v1/drafts`).
                  </span>
                </li>
              </ul>
            </div>

            <div className="grid gap-4 sm:grid-cols-12 lg:col-span-7">
              <div className="overflow-hidden rounded-2xl border border-slate-200 shadow-lg sm:col-span-8">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/screenshots/comment-reply-inbox.jpg"
                  alt="Unified YouTube and Instagram Comment Reply Inbox"
                  className="h-full w-full object-cover"
                />
              </div>
              <div className="mx-auto max-w-[220px] overflow-hidden rounded-2xl border border-slate-200 shadow-lg sm:col-span-4">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/screenshots/mobile-channels.png"
                  alt="Cadence Mobile App Channels and Presets"
                  className="h-full w-full object-cover"
                />
              </div>
            </div>
          </div>
        </section>

        {/* 3. CADENCE VS. BUFFER COMPARISON TABLE */}
        <section id="compare" className="space-y-5">
          <div className="mx-auto max-w-2xl text-center">
            <span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700">
              Why Creators Switch
            </span>
            <h2 className="mt-2.5 text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">
              Cadence vs. Buffer & Traditional Schedulers
            </h2>
          </div>

          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs sm:text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/80 text-slate-600">
                    <th className="px-4 py-3 font-semibold sm:px-6">Capability</th>
                    <th className="px-4 py-3 font-bold text-indigo-700 sm:px-6">
                      Cadence (cadences.in)
                    </th>
                    <th className="px-4 py-3 font-semibold text-slate-500 sm:px-6">
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
                      <td className="px-4 py-3 font-semibold text-slate-900 sm:px-6">
                        {row.feature}
                      </td>
                      <td className="px-4 py-3 font-semibold text-slate-900 sm:px-6">
                        <span className="inline-flex items-center gap-2">
                          <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
                          <span>{row.cadence}</span>
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-500 sm:px-6">
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

        {/* 4. PRICING CARDS */}
        <section id="pricing" className="space-y-6">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">
              Start free with 6 channels
            </h2>
            <p className="mt-1 text-sm text-slate-600">
              No credit card required. Upgrade only when you need more than 6 channels.
            </p>
          </div>

          <div className="mx-auto grid max-w-4xl gap-5 md:grid-cols-2">
            <div className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-6 shadow-2xs">
              <div>
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-bold text-slate-900">
                    Generous Free
                  </h3>
                  <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700">
                    2× Buffer Free
                  </span>
                </div>
                <p className="mt-2 flex items-baseline gap-1">
                  <span className="text-3xl font-extrabold text-slate-900">$0</span>
                  <span className="text-xs text-slate-500">/ forever</span>
                </p>

                <ul className="mt-5 space-y-2 text-xs text-slate-700">
                  {[
                    "Up to 6 connected YouTube & Instagram channels",
                    "30 scheduled or immediate cross-posts / month",
                    "Visual Reel Cover Scrubber & Pre-Flight Guardrails",
                    "Shorts vs. Reels Comparison & Comment Reply Inbox",
                    "Developer Draft-Upload REST API included",
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
                className="mt-6 inline-flex w-full items-center justify-center rounded-xl border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-900 hover:bg-slate-50"
              >
                {isLoggedIn ? "Manage Your Channels" : "Start Free — 6 Channels"}
              </Link>
            </div>

            <div className="flex flex-col justify-between rounded-2xl border-2 border-indigo-600 bg-white p-6 shadow-md">
              <div>
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-bold text-slate-900">
                    Creator Pro
                  </h3>
                  <span className="rounded-full bg-indigo-600 px-2.5 py-0.5 text-xs font-semibold text-white">
                    Unlimited
                  </span>
                </div>
                <p className="mt-2 flex items-baseline gap-1">
                  <span className="text-3xl font-extrabold text-slate-900">$9</span>
                  <span className="text-xs text-slate-500">
                    / month flat (not per channel)
                  </span>
                </p>

                <ul className="mt-5 space-y-2 text-xs text-slate-700">
                  {[
                    "Unlimited YouTube & Instagram channels",
                    "Unlimited scheduled & immediate cross-posts",
                    "Up to 250 MB per video upload",
                    "Custom YouTube thumbnails & priority queue",
                    "Unlimited Unified Comment Replies & API automation",
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
                className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700"
              >
                <span>{isLoggedIn ? "View Plan Options" : "Get Started Free"}</span>
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </section>

        {/* 5. COMPACT FAQ */}
        <section className="mx-auto max-w-3xl space-y-3">
          <h2 className="text-center text-xl font-extrabold tracking-tight text-slate-900 sm:text-2xl">
            Frequently Asked Questions
          </h2>

          <div className="divide-y divide-slate-200 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xs">
            {LANDING_FAQS.map((item, idx) => {
              const isOpen = openFaq === idx;
              return (
                <div key={item.q}>
                  <button
                    type="button"
                    onClick={() => setOpenFaq(isOpen ? null : idx)}
                    className="flex w-full items-center justify-between gap-4 px-5 py-3.5 text-left hover:bg-slate-50"
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
                    <div className="border-t border-slate-100 bg-slate-50/50 px-5 py-3 text-xs leading-relaxed text-slate-600 sm:text-sm">
                      {item.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        {/* 6. BOTTOM CTA */}
        <section className="rounded-3xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 px-6 py-10 text-center text-white shadow-lg">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-indigo-200">
            <ShieldCheck className="h-3.5 w-3.5" />
            <span>AES-256-GCM Encrypted Token Vault · Official YouTube & Meta APIs</span>
          </span>
          <h2 className="mx-auto mt-3 max-w-2xl text-2xl font-extrabold tracking-tight sm:text-3xl">
            Ready to publish across all your channels in one click?
          </h2>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <Link
              href={isLoggedIn ? "/compose" : "/register"}
              className="inline-flex items-center gap-2 rounded-xl bg-white px-6 py-3 text-sm font-bold text-slate-900 shadow-sm hover:bg-indigo-50"
            >
              <span>
                {isLoggedIn ? "Create a Cross-Post Now" : "Create Free Account"}
              </span>
              <ArrowRight className="h-4 w-4" />
            </Link>
            {!isLoggedIn && (
              <Link
                href="/login"
                className="inline-flex items-center gap-2 rounded-xl border border-white/25 bg-white/5 px-5 py-3 text-sm font-semibold text-white hover:bg-white/10"
              >
                <span>Sign In</span>
              </Link>
            )}
          </div>
        </section>
      </div>
    </>
  );
}
