"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  ArrowLeftRight,
  ArrowRight,
  BarChart3,
  BookOpen,
  CalendarClock,
  Check,
  ChevronDown,
  Code2,
  Copy,
  Film,
  HelpCircle,
  MessageCircle,
  Play,
  RefreshCw,
  Search,
  Settings2,
  ShieldCheck,
  Sliders,
  Sparkles,
  Users,
} from "lucide-react";

type GuideCategory =
  | "ALL"
  | "START"
  | "STUDIO"
  | "ANALYTICS"
  | "API"
  | "TROUBLESHOOT";

interface FeatureDoc {
  id: string;
  category: Exclude<GuideCategory, "ALL" | "TROUBLESHOOT">;
  title: string;
  badge: string;
  summary: string;
  howTo: string[];
  href: string;
  cta: string;
  icon: typeof BookOpen;
}

const FEATURES: FeatureDoc[] = [
  {
    id: "connect-channels",
    category: "START",
    title: "Connect up to 6 Channels Free (YouTube + Instagram)",
    badge: "6 Free Channels",
    summary:
      "Connect YouTube channels and Instagram Creator/Business accounts in one workspace with encrypted AES-256-GCM token storage.",
    howTo: [
      "Open Channels and click + Connect YouTube or + Connect Instagram.",
      "For YouTube, pick the Google account & Brand Channel you want to link (repeat to add multiple channels).",
      "For Instagram, ensure your account is a Creator or Business account linked to a Facebook Page, then select all desired accounts in the Meta popup.",
    ],
    href: "/accounts",
    cta: "Manage Channels",
    icon: Users,
  },
  {
    id: "channel-presets",
    category: "START",
    title: "Per-Channel Studio Presets",
    badge: "Time-Saver",
    summary:
      "Save default YouTube categories, privacy, tags, playlists, and AI/Altered content disclosures per handle so every brand pre-fills automatically.",
    howTo: [
      "Go to Channels and click the Settings (sliders) icon on any connected channel card.",
      "Configure default Category (e.g. Education), Privacy, Default Tags, Playlist ID, and Altered/Synthetic Media disclosure.",
      "Whenever you open Compose, Cadence automatically applies each channel's saved defaults as per-channel overrides.",
    ],
    href: "/accounts",
    cta: "Configure Presets",
    icon: Settings2,
  },
  {
    id: "token-health",
    category: "START",
    title: "Proactive Token Health Monitor",
    badge: "Reliability",
    summary:
      "Track Meta 60-day token expiry countdowns and Google auto-refresh status before a scheduled post ever fails.",
    howTo: [
      "Every channel card on the Channels page displays a live green, amber, or red token health indicator.",
      "YouTube tokens auto-refresh automatically; Instagram tokens show days remaining and trigger a 1-click Reconnect alert within 7 days of expiry.",
    ],
    href: "/accounts",
    cta: "Check Token Health",
    icon: ShieldCheck,
  },
  {
    id: "cover-scrubber",
    category: "STUDIO",
    title: "Visual Reel Cover Scrubber & Pre-Flight Guardrails",
    badge: "Composer",
    summary:
      "Scrub uploaded videos frame-by-frame to pick the exact Instagram Reel cover offset or capture a YouTube thumbnail directly from any video frame.",
    howTo: [
      "Upload an MP4 or MOV in Compose — the Visual Cover Scrubber appears automatically.",
      "Drag the timeline slider (or use quick jumps 0.0s, 1.0s, 3.0s, Mid) to find the cleanest frame.",
      "Click Set Reel Cover (X.Xs) for Instagram or Use Frame as YouTube Thumbnail to capture & upload a crisp JPEG thumbnail.",
      "Check the Pre-Flight Guardrails pills for 9:16 aspect ratio, 60s Shorts / 90s Reels duration, and file size.",
    ],
    href: "/compose",
    cta: "Open Composer",
    icon: Film,
  },
  {
    id: "cross-post-studio",
    category: "STUDIO",
    title: "Full YouTube Studio & Instagram Reels Controls",
    badge: "Cross-Post",
    summary:
      "Upload once and customize titles, captions, hashtags, Shorts/Reels flags, custom thumbnails, collaborators, and Auto First Comments per channel.",
    howTo: [
      "Select any combination of YouTube and Instagram channels in Compose.",
      "Fill in your shared Title & Caption, then expand Per-Channel Customizations to tailor copy, tags, or first comments per handle.",
      "Choose Save Draft (review later), Post Now (publish immediately), or Schedule for a future date/time.",
    ],
    href: "/compose",
    cta: "Create a Post",
    icon: Sliders,
  },
  {
    id: "queue-retry",
    category: "STUDIO",
    title: "Publishing Queue, Previews & 1-Click Partial-Failure Retry",
    badge: "Queue",
    summary:
      "Review Drafts, watch uploaded videos before publishing, click live receipt URLs, and retry a single failed channel without re-uploading.",
    howTo: [
      "Open Publishing Queue to filter by All, Scheduled, Published, Draft, or Failed.",
      "Click Preview on any card with media to watch your uploaded video right inside Cadence.",
      "If YouTube succeeds and Instagram fails on a cross-post, click Retry on just the failed channel — Cadence reuses your uploaded file.",
    ],
    href: "/",
    cta: "Open Queue",
    icon: CalendarClock,
  },
  {
    id: "analytics-dashboard",
    category: "ANALYTICS",
    title: "Analytics Dashboard & Per-Account Drilldowns",
    badge: "Live Stats",
    summary:
      "View cross-channel audience, views, interactions, and engagement rate — or tap any account pill to open its dedicated dashboard.",
    howTo: [
      "Open Engagement to see All Channels KPIs, Recent Posts Momentum chart, Channel Comparison bars, and Per-Account Scorecards with trend sparklines.",
      "Click any account pill at the top (or the chart icon on any channel card) to switch the entire dashboard into that single account's view.",
      "Toggle chart metrics between Views, Likes, Comments, and Engagement %.",
    ],
    href: "/engagement",
    cta: "View Analytics",
    icon: BarChart3,
  },
  {
    id: "cross-platform-compare",
    category: "ANALYTICS",
    title: "Cross-Platform Post Comparison (Shorts vs. Reels)",
    badge: "Insights",
    summary:
      "Compare how the exact same video performed on YouTube Shorts vs. Instagram Reels side-by-side with combined totals and engagement split bars.",
    howTo: [
      "Stay in All Channels mode on the Engagement page and scroll to Cross-Platform Post Comparison.",
      "Videos published via Cadence match automatically (Cadence Cross-Post), and manually cross-posted videos auto-match by title and publish date.",
    ],
    href: "/engagement",
    cta: "Compare Posts",
    icon: ArrowLeftRight,
  },
  {
    id: "comment-inbox",
    category: "ANALYTICS",
    title: "Unified Comment Reply Inbox",
    badge: "Engagement",
    summary:
      "Read and reply live to YouTube and Instagram comments across all connected channels from one inbox with 1-click saved replies.",
    howTo: [
      "In Engagement, scroll to Unified Comment Inbox and filter by All, YT, or IG (or pick a single channel at the top).",
      "Click Reply on any comment, pick a Saved Reply chip or type your own response, and press Send to publish live as that channel.",
    ],
    href: "/engagement",
    cta: "Open Comment Inbox",
    icon: MessageCircle,
  },
  {
    id: "in-app-viewer",
    category: "ANALYTICS",
    title: "In-App Content Viewer (Watch Inside Cadence)",
    badge: "Player",
    summary:
      "Play your YouTube videos/Shorts and Instagram Reels/Photos directly inside Cadence without switching tabs.",
    howTo: [
      "Click any video thumbnail, title, Top Performing Post Spotlight, or Cross-Platform Comparison card in Engagement.",
      "Press Esc or click outside the modal to close, or click Open on YouTube / Instagram to jump to the native post.",
    ],
    href: "/engagement",
    cta: "Watch Content",
    icon: Play,
  },
  {
    id: "draft-api",
    category: "API",
    title: "Developer Draft-Upload REST API",
    badge: "Automation",
    summary:
      "Push finished MP4s + metadata straight from your local scripts or AI video pipelines into Cadence as Drafts for 1-click review and publish.",
    howTo: [
      "Go to Profile & Settings → Developer API Keys and generate a cad_live_... Bearer token.",
      "Call GET /api/v1/channels to list your channel IDs and handles.",
      "POST multipart/form-data to /api/v1/drafts with file, title, caption, channels (e.g. @mythlanterntales or all), and optional youtube/instagram JSON options.",
    ],
    href: "/profile",
    cta: "Manage API Keys",
    icon: Code2,
  },
];

const FAQS = [
  {
    q: "Why does Instagram require a Creator/Business account linked to a Facebook Page?",
    a: "Meta's official Instagram Publishing API only allows third-party schedulers to publish Reels/Posts and manage comments for Instagram Professional (Creator or Business) accounts linked to a Facebook Page. Personal Instagram accounts cannot publish via API.",
  },
  {
    q: "How do I make sure my YouTube upload publishes as a YouTube Short?",
    a: "Keep your video vertical (9:16), 60 seconds or shorter, and leave 'Treat as YouTube Short (#shorts)' checked in Compose. Cadence's Pre-Flight Guardrails automatically verify both aspect ratio and duration right after upload.",
  },
  {
    q: "Why do Instagram posts show '—' for Views in Analytics?",
    a: "Meta's basic Instagram Graph media endpoint exposes Followers, Likes, and Comments, while Reel play/view counts require separate Insights permissions. Cadence automatically computes follower-based Engagement Rate for Instagram and excludes view-less posts when charting Views.",
  },
  {
    q: "What happens if one channel fails during a multi-channel cross-post?",
    a: "Each channel publishes independently. If YouTube succeeds and Instagram fails, the post is marked PARTIAL FAILURE on your Publishing Queue — click Retry on just the failed channel without re-uploading your video.",
  },
  {
    q: "How does the Draft-Upload API work with my saved channel presets?",
    a: "When your script uploads a draft via POST /api/v1/drafts, Cadence automatically merges each targeted channel's saved defaults (category, tags, AI disclosure, privacy) unless you explicitly override them in the youtube or instagram JSON field.",
  },
];

const QUICK_STEPS = [
  {
    step: "1",
    title: "Connect Channels",
    desc: "Link up to 6 YouTube & Instagram accounts free.",
    href: "/accounts",
  },
  {
    step: "2",
    title: "Set Channel Presets",
    desc: "Save category, tags & AI disclosure once per handle.",
    href: "/accounts",
  },
  {
    step: "3",
    title: "Compose & Scrub Cover",
    desc: "Upload once, pick cover frame, customize & schedule.",
    href: "/compose",
  },
  {
    step: "4",
    title: "Track, Watch & Reply",
    desc: "Compare Shorts vs. Reels & reply to all comments.",
    href: "/engagement",
  },
];

export default function GuidePage() {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<GuideCategory>("ALL");
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const [copiedCurl, setCopiedCurl] = useState(false);

  const origin =
    typeof window !== "undefined"
      ? window.location.origin
      : "https://cadence-urn7.onrender.com";

  const filteredFeatures = useMemo(() => {
    if (category === "TROUBLESHOOT") return [];
    const q = query.trim().toLowerCase();
    return FEATURES.filter((f) => {
      if (category !== "ALL" && f.category !== category) return false;
      if (!q) return true;
      return (
        f.title.toLowerCase().includes(q) ||
        f.summary.toLowerCase().includes(q) ||
        f.howTo.some((h) => h.toLowerCase().includes(q))
      );
    });
  }, [query, category]);

  const filteredFaqs = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return FAQS;
    return FAQS.filter(
      (item) =>
        item.q.toLowerCase().includes(q) || item.a.toLowerCase().includes(q)
    );
  }, [query]);

  const apiSnippet = `curl -X POST ${origin}/api/v1/drafts \\
  -H "Authorization: Bearer cad_live_YOUR_API_KEY" \\
  -F "file=@./video.mp4" \\
  -F "title=My Short Title #shorts" \\
  -F "caption=Full story caption #Cadence" \\
  -F "channels=all" \\
  -F "status=DRAFT"`;

  function copySnippet() {
    void navigator.clipboard?.writeText(apiSnippet);
    setCopiedCurl(true);
    setTimeout(() => setCopiedCurl(false), 2000);
  }

  return (
    <div className="space-y-8">
      {/* Hero Header */}
      <section className="rounded-2xl border border-indigo-200/80 bg-gradient-to-br from-indigo-50 via-white to-white p-6 shadow-2xs sm:p-8">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-2xl">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-100 px-3 py-1 text-xs font-semibold text-indigo-700">
              <BookOpen className="h-3.5 w-3.5" />
              <span>Cadence Documentation & Creator Guide</span>
            </span>
            <h1 className="mt-3 text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">
              Everything you can do with Cadence
            </h1>
            <p className="mt-2 text-sm leading-relaxed text-slate-600">
              Your complete walkthrough for cross-posting YouTube Shorts & Instagram Reels, scrubbing cover frames, monitoring analytics, replying to comments, and automating uploads via API.
            </p>
          </div>

          <div className="w-full lg:w-80">
            <div className="relative">
              <Search className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search features, API, or FAQs..."
                className="w-full rounded-xl border border-slate-300 bg-white py-2.5 pr-3.5 pl-10 text-sm text-slate-800 shadow-2xs placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* 4-Step Quick Start Strip */}
        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {QUICK_STEPS.map((s) => (
            <Link
              key={s.step}
              href={s.href}
              className="group flex items-start gap-3 rounded-xl border border-slate-200/90 bg-white p-3.5 transition hover:border-indigo-300 hover:shadow-xs"
            >
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-indigo-600 text-xs font-bold text-white">
                {s.step}
              </span>
              <div className="min-w-0">
                <p className="text-xs font-bold text-slate-900 group-hover:text-indigo-600">
                  {s.title}
                </p>
                <p className="mt-0.5 text-[11px] leading-snug text-slate-500">
                  {s.desc}
                </p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Category Filter Pills */}
      <div className="flex flex-wrap items-center gap-2">
        {(
          [
            { id: "ALL", label: "All Features" },
            { id: "START", label: "Getting Started" },
            { id: "STUDIO", label: "Publishing Studio" },
            { id: "ANALYTICS", label: "Analytics & Inbox" },
            { id: "API", label: "Automation & API" },
            { id: "TROUBLESHOOT", label: "FAQs & Troubleshooting" },
          ] as const
        ).map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setCategory(tab.id)}
            className={`rounded-full border px-3.5 py-1.5 text-xs font-semibold transition ${
              category === tab.id
                ? "border-slate-900 bg-slate-900 text-white"
                : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Feature Guides Grid */}
      {category !== "TROUBLESHOOT" && (
        <section className="space-y-3">
          {filteredFeatures.length === 0 ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
              No features matched &ldquo;{query}&rdquo;. Try clearing your search.
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {filteredFeatures.map((feat) => {
                const Icon = feat.icon;
                return (
                  <div
                    key={feat.id}
                    className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-2.5">
                          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                            <Icon className="h-4.5 w-4.5" />
                          </span>
                          <div>
                            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600">
                              {feat.badge}
                            </span>
                            <h2 className="mt-1 text-sm font-bold text-slate-900">
                              {feat.title}
                            </h2>
                          </div>
                        </div>
                      </div>

                      <p className="mt-3 text-xs leading-relaxed text-slate-600">
                        {feat.summary}
                      </p>

                      <ol className="mt-3.5 space-y-1.5 border-t border-slate-100 pt-3 text-xs text-slate-700">
                        {feat.howTo.map((step, i) => (
                          <li key={i} className="flex items-start gap-2">
                            <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-indigo-50 text-[10px] font-bold text-indigo-700">
                              {i + 1}
                            </span>
                            <span className="leading-relaxed">{step}</span>
                          </li>
                        ))}
                      </ol>
                    </div>

                    <div className="mt-4 pt-2">
                      <Link
                        href={feat.href}
                        className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-700 hover:underline"
                      >
                        <span>{feat.cta}</span>
                        <ArrowRight className="h-3.5 w-3.5" />
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      )}

      {/* Developer API Quick Reference */}
      {(category === "ALL" || category === "API") && (
        <section className="rounded-2xl border border-slate-200 bg-slate-900 p-6 text-slate-100 shadow-2xs">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 text-indigo-300">
                <Code2 className="h-4 w-4" />
                <span className="text-xs font-semibold uppercase tracking-wide">
                  Developer Automation
                </span>
              </div>
              <h2 className="mt-1 text-base font-bold text-white">
                Push Drafts Straight from Local Scripts or AI Pipelines
              </h2>
              <p className="mt-1 text-xs text-slate-400">
                Generate a key in Profile & Settings, then upload finished MP4s straight into your Cadence Queue as Drafts.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={copySnippet}
                className="inline-flex items-center gap-1.5 rounded-lg bg-white/10 px-3 py-1.5 text-xs font-semibold text-white hover:bg-white/20"
              >
                {copiedCurl ? (
                  <>
                    <Check className="h-3.5 w-3.5 text-emerald-400" />
                    <span>Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="h-3.5 w-3.5" />
                    <span>Copy curl</span>
                  </>
                )}
              </button>
              <Link
                href="/profile"
                className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-500"
              >
                <Sparkles className="h-3.5 w-3.5" />
                <span>Get API Key</span>
              </Link>
            </div>
          </div>

          <pre className="mt-4 overflow-x-auto rounded-xl bg-slate-950/80 p-4 font-mono text-xs leading-relaxed text-indigo-200">
            {apiSnippet}
          </pre>

          <div className="mt-3 flex flex-wrap gap-4 text-[11px] text-slate-400">
            <span>
              <strong className="text-slate-200">GET /api/v1/channels</strong> —
              List connected channel IDs, handles & saved presets
            </span>
            <span>
              <strong className="text-slate-200">POST /api/v1/drafts</strong> —
              Upload media + optional thumbnail, auto-merging channel presets
            </span>
          </div>
        </section>
      )}

      {/* FAQs & Troubleshooting */}
      {(category === "ALL" || category === "TROUBLESHOOT") && (
        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <HelpCircle className="h-4 w-4 text-indigo-600" />
            <h2 className="text-base font-bold text-slate-900">
              Frequently Asked Questions & Troubleshooting
            </h2>
          </div>

          <div className="divide-y divide-slate-200 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xs">
            {filteredFaqs.map((item, idx) => {
              const isOpen = openFaq === idx;
              return (
                <div key={idx}>
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
                    <div className="border-t border-slate-100 bg-slate-50/50 px-5 py-3.5 text-xs leading-relaxed text-slate-600">
                      {item.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Quick Footer CTA */}
      <section className="flex flex-col items-start justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs sm:flex-row sm:items-center">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
            <RefreshCw className="h-5 w-5" />
          </span>
          <div>
            <p className="text-sm font-bold text-slate-900">
              Ready to publish your next cross-post?
            </p>
            <p className="text-xs text-slate-500">
              Upload once, scrub your Reel cover, and publish across YouTube & Instagram in seconds.
            </p>
          </div>
        </div>
        <Link
          href="/compose"
          className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-semibold text-white hover:bg-indigo-700"
        >
          <span>Open Compose Studio</span>
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </section>
    </div>
  );
}
