"use client";

import Link from "next/link";
import { useState } from "react";
import { AlertCircle, Info, RefreshCw } from "lucide-react";

interface FriendlyErrorInfo {
  title: string;
  summary: string;
  steps: string[];
  actionLabel?: string;
  actionHref?: string;
}

export function formatChannelError(
  platform: "YOUTUBE" | "INSTAGRAM",
  rawError: string
): FriendlyErrorInfo {
  const lower = rawError.toLowerCase();

  if (
    platform === "INSTAGRAM" &&
    (lower.includes("missing permissions") ||
      lower.includes("does not exist") ||
      lower.includes("oauthexception") ||
      lower.includes("invalid oauth") ||
      lower.includes("expired") ||
      lower.includes("code\":190") ||
      lower.includes("code\":10"))
  ) {
    return {
      title: "Instagram access needs re-authorization",
      summary:
        "Meta couldn't load this account with the current token or Business Portfolio permissions.",
      steps: [
        "Confirm this Instagram Professional account is added to your Meta Business Portfolio (or linked to a Facebook Page you manage).",
        "Go to Channels, click + Instagram, and make sure this handle is checked in the Meta popup.",
        "Return here and click Refresh to sync stats.",
      ],
      actionLabel: "Reconnect Instagram",
      actionHref: "/accounts",
    };
  }

  if (
    platform === "YOUTUBE" &&
    (lower.includes("401") ||
      lower.includes("invalid_grant") ||
      lower.includes("unauthorized") ||
      lower.includes("insufficient"))
  ) {
    return {
      title: "YouTube authorization expired",
      summary: "Your Google/YouTube access token needs to be refreshed.",
      steps: [
        "Open Channels and click + YouTube.",
        "Select your Google account and approve YouTube permissions.",
        "Return here and click Refresh.",
      ],
      actionLabel: "Reconnect YouTube",
      actionHref: "/accounts",
    };
  }

  if (
    lower.includes("429") ||
    lower.includes("quota") ||
    lower.includes("rate limit")
  ) {
    return {
      title: "Platform API rate limit reached",
      summary:
        "The platform temporarily paused analytics requests for this channel.",
      steps: [
        "Wait 2–5 minutes for the platform quota window to reset.",
        "Click Refresh at the top of the Engagement page.",
      ],
    };
  }

  return {
    title: "Unable to sync channel stats",
    summary:
      "The platform returned an unexpected response while syncing this channel.",
    steps: [
      "Check that the channel is still active under Channels.",
      "If the issue persists, reconnect the channel and click Refresh.",
    ],
    actionLabel: "Manage Channels",
    actionHref: "/accounts",
  };
}

export function ChannelErrorNotice({
  platform,
  rawError,
}: {
  platform: "YOUTUBE" | "INSTAGRAM";
  rawError: string;
}) {
  const [showHelp, setShowHelp] = useState(false);
  const info = formatChannelError(platform, rawError);

  return (
    <div
      className="mt-4 rounded-xl border border-amber-200 bg-amber-50/80 p-3 text-left"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 items-start gap-2">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
          <div className="min-w-0">
            <p className="text-xs font-semibold text-amber-950">{info.title}</p>
            <p className="mt-0.5 text-[11px] leading-relaxed text-amber-800">
              {info.summary}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setShowHelp((prev) => !prev);
          }}
          aria-label="How to fix this error"
          title="How to fix this"
          className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border transition ${
            showHelp
              ? "border-amber-400 bg-amber-200/70 text-amber-950"
              : "border-amber-300 bg-white text-amber-700 hover:bg-amber-100"
          }`}
        >
          <Info className="h-3.5 w-3.5" />
        </button>
      </div>

      {showHelp && (
        <div className="mt-2.5 space-y-2 rounded-lg border border-amber-200/80 bg-white p-2.5 text-[11px] text-slate-700">
          <p className="font-semibold text-slate-900">How to fix:</p>
          <ol className="list-decimal space-y-1 pl-4">
            {info.steps.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>
          {info.actionHref && info.actionLabel && (
            <div className="pt-1">
              <Link
                href={info.actionHref}
                onClick={(e) => e.stopPropagation()}
                className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-2.5 py-1.5 text-[11px] font-semibold text-white hover:bg-indigo-700"
              >
                <RefreshCw className="h-3 w-3" />
                <span>{info.actionLabel}</span>
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
