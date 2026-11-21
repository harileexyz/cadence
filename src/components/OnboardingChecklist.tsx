"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Circle,
  Sparkles,
  X,
} from "lucide-react";

const STORAGE_KEY = "cadence_onboarding_dismissed_v1";

interface OnboardingProps {
  postsCount: number;
}

interface AccountLite {
  id: string;
  isActive: boolean;
  metadata?: { defaults?: Record<string, unknown> } | null;
}

export function OnboardingChecklist({ postsCount }: OnboardingProps) {
  const [dismissed, setDismissed] = useState(true);
  const [accounts, setAccounts] = useState<AccountLite[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      setDismissed(saved === "1");
    } catch {
      setDismissed(false);
    }

    void (async () => {
      try {
        const res = await fetch("/api/accounts");
        if (res.ok) {
          const data = (await res.json()) as { accounts: AccountLite[] };
          setAccounts(data.accounts);
        }
      } finally {
        setLoaded(true);
      }
    })();
  }, []);

  function handleDismiss() {
    setDismissed(true);
    try {
      window.localStorage.setItem(STORAGE_KEY, "1");
    } catch {
      // ignore
    }
  }

  if (dismissed || !loaded) return null;

  const hasChannels = accounts.some((a) => a.isActive);
  const hasPresets = accounts.some(
    (a) => a.metadata?.defaults && Object.keys(a.metadata.defaults).length > 0
  );
  const hasPosts = postsCount > 0;

  const steps = [
    {
      done: hasChannels,
      title: "Connect your YouTube & Instagram channels",
      desc: "Up to 6 channels free with live token health monitoring.",
      href: "/accounts",
      cta: "Connect",
    },
    {
      done: hasPresets,
      title: "Save per-channel Studio presets",
      desc: "Pre-fill category, tags, playlist & AI disclosure automatically.",
      href: "/accounts",
      cta: "Set Presets",
    },
    {
      done: hasPosts,
      title: "Create your first cross-post or draft",
      desc: "Upload once, scrub your Reel cover frame & publish everywhere.",
      href: "/compose",
      cta: "Compose",
    },
    {
      done: false,
      title: "Explore Analytics, In-App Player & Comment Replies",
      desc: "Compare Shorts vs. Reels side-by-side and reply from one inbox.",
      href: "/engagement",
      cta: "Open Stats",
    },
  ];

  const completedCount = steps.filter((s) => s.done).length;
  const pct = Math.round((completedCount / steps.length) * 100);

  return (
    <section className="rounded-2xl border border-indigo-200/80 bg-gradient-to-r from-indigo-50/70 via-white to-white p-5 shadow-2xs">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-indigo-600" />
            <h2 className="text-sm font-bold text-slate-900">
              Getting Started with Cadence
            </h2>
            <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-[10px] font-semibold text-indigo-700">
              {completedCount}/{steps.length} done
            </span>
          </div>
          <p className="mt-0.5 text-xs text-slate-600">
            Quick checklist to unlock cross-posting, visual cover scrubbing, and live analytics.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/guide"
            className="inline-flex items-center gap-1.5 rounded-lg border border-indigo-200 bg-white px-3 py-1.5 text-xs font-semibold text-indigo-700 hover:bg-indigo-50"
          >
            <BookOpen className="h-3.5 w-3.5" />
            <span>Full Guide</span>
          </Link>
          <button
            type="button"
            onClick={handleDismiss}
            title="Dismiss checklist"
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-indigo-100">
        <div
          className="h-full rounded-full bg-indigo-600 transition-all duration-300"
          style={{ width: `${Math.max(8, pct)}%` }}
        />
      </div>

      <div className="mt-4 grid gap-2.5 sm:grid-cols-2">
        {steps.map((step, i) => (
          <Link
            key={i}
            href={step.href}
            className={`group flex items-start justify-between gap-3 rounded-xl border p-3 transition ${
              step.done
                ? "border-emerald-200/80 bg-emerald-50/40"
                : "border-slate-200 bg-white hover:border-indigo-300"
            }`}
          >
            <div className="flex items-start gap-2.5">
              {step.done ? (
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
              ) : (
                <Circle className="mt-0.5 h-4 w-4 shrink-0 text-slate-300 group-hover:text-indigo-500" />
              )}
              <div>
                <p
                  className={`text-xs font-semibold ${
                    step.done ? "text-emerald-900" : "text-slate-900"
                  }`}
                >
                  {step.title}
                </p>
                <p className="mt-0.5 text-[11px] text-slate-500">{step.desc}</p>
              </div>
            </div>
            <span className="mt-0.5 inline-flex shrink-0 items-center gap-0.5 text-[11px] font-semibold text-indigo-600">
              {step.cta}
              <ArrowRight className="h-3 w-3" />
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}
