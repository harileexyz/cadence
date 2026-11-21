"use client";

import { useMemo, useState } from "react";
import {
  CheckCircle2,
  ExternalLink,
  Loader2,
  MessageCircle,
  Reply,
  Send,
  X,
} from "lucide-react";
import { PlatformBadge } from "@/components/PlatformBadge";
import { formatRelativeDate, type CommentDTO } from "@/lib/analytics";

const SAVED_REPLIES = [
  "Thank you so much! 🙏",
  "Glad you enjoyed it!",
  "Part 2 coming soon! 🔥",
  "Appreciate the support ❤️",
];

interface SentReplyRecord {
  text: string;
  repliedAt: string;
}

export function UnifiedCommentInbox({
  comments,
  showPlatformFilter,
  scopeName,
}: {
  comments: CommentDTO[];
  showPlatformFilter: boolean;
  scopeName?: string;
}) {
  const [platformFilter, setPlatformFilter] = useState<
    "ALL" | "YOUTUBE" | "INSTAGRAM"
  >("ALL");
  const [replyingToKey, setReplyingToKey] = useState<string | null>(null);
  const [draftText, setDraftText] = useState("");
  const [sending, setSending] = useState(false);
  const [replyError, setReplyError] = useState<string | null>(null);
  const [sentReplies, setSentReplies] = useState<
    Record<string, SentReplyRecord[]>
  >({});

  const visibleComments = useMemo(() => {
    if (!showPlatformFilter || platformFilter === "ALL") return comments;
    return comments.filter((c) => c.platform === platformFilter);
  }, [comments, showPlatformFilter, platformFilter]);

  function openReply(key: string) {
    if (replyingToKey === key) {
      setReplyingToKey(null);
      setDraftText("");
      setReplyError(null);
    } else {
      setReplyingToKey(key);
      setDraftText("");
      setReplyError(null);
    }
  }

  async function handleSendReply(cmt: CommentDTO, key: string) {
    const trimmed = draftText.trim();
    if (!trimmed) return;
    setSending(true);
    setReplyError(null);
    try {
      const res = await fetch("/api/engagement/comments/reply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accountId: cmt.accountId,
          commentId: cmt.id,
          text: trimmed,
        }),
      });
      const data = (await res.json()) as {
        ok?: boolean;
        error?: string;
        repliedAt?: string;
      };
      if (!res.ok || !data.ok) {
        throw new Error(data.error || "Failed to send reply");
      }

      setSentReplies((prev) => ({
        ...prev,
        [key]: [
          ...(prev[key] ?? []),
          { text: trimmed, repliedAt: data.repliedAt || new Date().toISOString() },
        ],
      }));
      setDraftText("");
      setReplyingToKey(null);
    } catch (err) {
      setReplyError(
        err instanceof Error ? err.message : "Failed to send reply"
      );
    } finally {
      setSending(false);
    }
  }

  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <MessageCircle className="h-4 w-4 text-amber-500" />
          <h2 className="text-sm font-semibold text-slate-900">
            Unified Comment Inbox{" "}
            <span className="font-normal text-slate-400">
              ({visibleComments.length})
            </span>
          </h2>
        </div>

        {showPlatformFilter && (
          <div className="flex items-center gap-0.5 rounded-lg border border-slate-200 bg-white p-0.5 text-[11px]">
            {(["ALL", "YOUTUBE", "INSTAGRAM"] as const).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setPlatformFilter(tab)}
                className={`rounded-md px-2 py-0.5 font-medium transition ${
                  platformFilter === tab
                    ? "bg-slate-900 text-white"
                    : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                {tab === "ALL" ? "All" : tab === "YOUTUBE" ? "YT" : "IG"}
              </button>
            ))}
          </div>
        )}
      </div>

      {visibleComments.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-xs text-slate-500">
          No recent comments on {scopeName || "your channels"} yet.
        </div>
      ) : (
        <div className="max-h-[680px] divide-y divide-slate-100 overflow-y-auto rounded-2xl border border-slate-200 bg-white shadow-2xs">
          {visibleComments.map((cmt) => {
            const key = `${cmt.platform}-${cmt.id}`;
            const isReplying = replyingToKey === key;
            const replies = sentReplies[key] ?? [];

            return (
              <div
                key={key}
                className="space-y-2 p-4 transition hover:bg-slate-50/70"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex min-w-0 items-center gap-2">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-100 text-[10px] font-bold text-slate-700">
                      {cmt.authorName.replace(/^@/, "").charAt(0).toUpperCase()}
                    </span>
                    <span className="truncate text-xs font-semibold text-slate-900">
                      {cmt.authorName}
                    </span>
                    {showPlatformFilter && (
                      <PlatformBadge platform={cmt.platform} />
                    )}
                  </div>
                  <span className="shrink-0 text-[11px] text-slate-400">
                    {formatRelativeDate(cmt.publishedAt)}
                  </span>
                </div>

                <p className="text-xs leading-relaxed text-slate-700">
                  {cmt.text}
                </p>

                <div className="flex items-center justify-between gap-2 pt-0.5">
                  <a
                    href={cmt.postUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex min-w-0 items-center gap-1 text-[11px] font-medium text-indigo-600 hover:underline"
                  >
                    <span className="truncate">
                      {showPlatformFilter ? `${cmt.accountName} · ` : ""}
                      {cmt.postTitle}
                    </span>
                    <ExternalLink className="h-3 w-3 shrink-0" />
                  </a>

                  <button
                    type="button"
                    onClick={() => openReply(key)}
                    className={`inline-flex shrink-0 items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-semibold transition ${
                      isReplying
                        ? "bg-slate-200 text-slate-800"
                        : "bg-slate-100 text-slate-700 hover:bg-indigo-50 hover:text-indigo-700"
                    }`}
                  >
                    {isReplying ? (
                      <>
                        <X className="h-3 w-3" />
                        <span>Cancel</span>
                      </>
                    ) : (
                      <>
                        <Reply className="h-3 w-3" />
                        <span>Reply</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Sent Replies Thread */}
                {replies.length > 0 && (
                  <div className="space-y-1.5 border-l-2 border-emerald-300 pl-3 pt-1">
                    {replies.map((r, i) => (
                      <div
                        key={i}
                        className="rounded-lg bg-emerald-50/70 px-2.5 py-1.5 text-[11px] text-emerald-900"
                      >
                        <div className="flex items-center gap-1 font-semibold text-emerald-700">
                          <CheckCircle2 className="h-3 w-3" />
                          <span>You replied ({cmt.accountName})</span>
                        </div>
                        <p className="mt-0.5 text-slate-800">{r.text}</p>
                      </div>
                    ))}
                  </div>
                )}

                {/* Inline Reply Composer */}
                {isReplying && (
                  <div className="mt-2 space-y-2 rounded-xl border border-indigo-100 bg-indigo-50/40 p-2.5">
                    <div className="flex flex-wrap gap-1">
                      {SAVED_REPLIES.map((preset) => (
                        <button
                          key={preset}
                          type="button"
                          onClick={() => setDraftText(preset)}
                          className="rounded-full border border-indigo-200 bg-white px-2 py-0.5 text-[10px] font-medium text-indigo-700 hover:bg-indigo-100"
                        >
                          {preset}
                        </button>
                      ))}
                    </div>

                    {replyError && (
                      <p className="text-[11px] font-medium text-red-600">
                        {replyError}
                      </p>
                    )}

                    <div className="flex items-center gap-1.5">
                      <input
                        type="text"
                        value={draftText}
                        onChange={(e) => setDraftText(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && !e.shiftKey) {
                            e.preventDefault();
                            void handleSendReply(cmt, key);
                          }
                        }}
                        placeholder={`Reply as ${cmt.accountName}...`}
                        className="flex-1 rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-800 focus:border-indigo-500 focus:outline-none"
                      />
                      <button
                        type="button"
                        disabled={sending || !draftText.trim()}
                        onClick={() => void handleSendReply(cmt, key)}
                        className="inline-flex items-center gap-1 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
                      >
                        {sending ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Send className="h-3.5 w-3.5" />
                        )}
                        <span>Send</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
