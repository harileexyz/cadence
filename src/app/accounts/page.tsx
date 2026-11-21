"use client";

import Link from "next/link";
import { Suspense, useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  AlertCircle,
  ArrowRight,
  BarChart3,
  CheckCircle2,
  ExternalLink,
  Instagram,
  Loader2,
  Plus,
  Power,
  Settings2,
  Sparkles,
  Trash2,
  X,
  Youtube,
} from "lucide-react";
import { PlatformBadge } from "@/components/PlatformBadge";
import { YOUTUBE_CATEGORIES, type AccountDefaults } from "@/lib/platforms/types";

interface AccountDTO {
  id: string;
  platform: "YOUTUBE" | "INSTAGRAM";
  externalAccountId: string;
  displayName: string;
  username: string | null;
  avatarUrl: string | null;
  tokenExpiresAt: string | null;
  metadata?: {
    defaults?: AccountDefaults;
    [key: string]: unknown;
  } | null;
  isActive: boolean;
}

interface UsageDTO {
  connectedChannels: number;
  postsThisMonth: number;
  canConnectMoreChannels: boolean;
  plan: {
    tier: "FREE" | "PRO";
    name: string;
    maxChannels: number | null;
    maxPostsPerMonth: number | null;
  };
}

function AccountsContent() {
  const searchParams = useSearchParams();
  const connectedBanner = searchParams.get("connected");
  const errorBanner = searchParams.get("error");

  const [accounts, setAccounts] = useState<AccountDTO[]>([]);
  const [usage, setUsage] = useState<UsageDTO | null>(null);
  const [loading, setLoading] = useState(true);
  const [showIgModal, setShowIgModal] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftDefaults, setDraftDefaults] = useState<AccountDefaults>({});
  const [tagsInput, setTagsInput] = useState("");
  const [collabsInput, setCollabsInput] = useState("");
  const [savingId, setSavingId] = useState<string | null>(null);

  const loadAccounts = useCallback(async () => {
    try {
      const res = await fetch("/api/accounts");
      if (res.status === 401) {
        window.location.href = "/login";
        return;
      }
      if (res.ok) {
        const data = (await res.json()) as {
          accounts: AccountDTO[];
          usage: UsageDTO;
        };
        setAccounts(data.accounts);
        setUsage(data.usage);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadAccounts();
  }, [loadAccounts]);

  function openDefaultsEditor(acc: AccountDTO) {
    if (editingId === acc.id) {
      setEditingId(null);
      return;
    }
    const defs = acc.metadata?.defaults ?? {};
    setDraftDefaults(defs);
    setTagsInput((defs.tags ?? []).join(", "));
    setCollabsInput((defs.collaborators ?? []).join(", "));
    setEditingId(acc.id);
  }

  async function saveDefaults(acc: AccountDTO) {
    setSavingId(acc.id);
    try {
      const parsedTags = tagsInput
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);
      const parsedCollabs = collabsInput
        .split(",")
        .map((c) => c.replace(/^@/, "").trim())
        .filter(Boolean)
        .slice(0, 3);

      const nextDefaults: AccountDefaults = {
        ...draftDefaults,
        ...(acc.platform === "YOUTUBE" ? { tags: parsedTags } : {}),
        ...(acc.platform === "INSTAGRAM" ? { collaborators: parsedCollabs } : {}),
      };

      await fetch(`/api/accounts/${acc.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ defaults: nextDefaults }),
      });
      await loadAccounts();
      setEditingId(null);
    } finally {
      setSavingId(null);
    }
  }

  async function toggleActive(account: AccountDTO) {
    await fetch(`/api/accounts/${account.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !account.isActive }),
    });
    await loadAccounts();
  }

  async function removeAccount(id: string) {
    await fetch(`/api/accounts/${id}`, { method: "DELETE" });
    await loadAccounts();
  }

  const maxChannels = usage?.plan.maxChannels ?? 6;
  const usedChannels = usage?.connectedChannels ?? accounts.length;
  const quotaPct =
    usage?.plan.maxChannels === null
      ? 25
      : Math.min(100, Math.round((usedChannels / maxChannels) * 100));

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Channels
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Connect your YouTube channels and Instagram accounts, and customize default publishing presets for each handle.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-2.5 sm:flex sm:flex-wrap">
          <a
            href="/api/auth/youtube/connect"
            className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-lg bg-red-600 px-3.5 py-2 text-sm font-medium text-white shadow-sm hover:bg-red-700"
          >
            <Youtube className="h-4 w-4 shrink-0" />
            <span>YouTube</span>
          </a>
          <button
            type="button"
            onClick={() => setShowIgModal(true)}
            className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-pink-600 to-purple-600 px-3.5 py-2 text-sm font-medium text-white shadow-sm hover:opacity-95"
          >
            <Instagram className="h-4 w-4 shrink-0" />
            <span>Instagram</span>
          </button>
        </div>
      </div>

      {/* SaaS Plan Quota Bar */}
      {usage && (
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold uppercase tracking-wide text-indigo-600">
                  {usage.plan.name}
                </span>
                <span className="text-xs text-slate-500">·</span>
                <span className="text-xs font-medium text-slate-700">
                  {usage.plan.maxChannels === null
                    ? `${usedChannels} channels connected (Unlimited)`
                    : `${usedChannels} of ${usage.plan.maxChannels} free channels connected`}
                </span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100 sm:w-64">
                <div
                  className="h-full rounded-full bg-indigo-600 transition-all"
                  style={{ width: `${quotaPct}%` }}
                />
              </div>
            </div>

            {usage.plan.tier === "FREE" && (
              <Link
                href="/pricing"
                className="inline-flex items-center gap-1.5 self-start rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-xs font-semibold text-indigo-700 hover:bg-indigo-100 sm:self-center"
              >
                <Sparkles className="h-3.5 w-3.5" />
                <span>Need more than 6 channels? Upgrade to Pro</span>
              </Link>
            )}
          </div>
        </div>
      )}

      {connectedBanner && (
        <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span>Channel connected successfully ({connectedBanner}).</span>
        </div>
      )}

      {errorBanner && (
        <div className="flex items-center justify-between gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          <div className="flex items-start gap-2">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{errorBanner}</span>
          </div>
          {errorBanner.toLowerCase().includes("instagram") && (
            <button
              type="button"
              onClick={() => setShowIgModal(true)}
              className="shrink-0 rounded-lg bg-red-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-800"
            >
              View Setup Steps
            </button>
          )}
        </div>
      )}

      {/* Buffer-Style Connect Instagram Onboarding Modal */}
      {showIgModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-xl">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2.5">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-pink-600 to-purple-600 text-white">
                  <Instagram className="h-5 w-5" />
                </span>
                <div>
                  <h2 className="text-lg font-bold text-slate-900">
                    Connect Instagram to Cadence
                  </h2>
                  <p className="text-xs text-slate-500">
                    Direct publishing for Reels, Images & Carousels
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowIgModal(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-5 space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-4 text-xs text-slate-700">
              <p className="font-semibold text-slate-900">
                Before you continue (required by Instagram&apos;s API for all schedulers like Buffer & Cadence):
              </p>
              <ol className="list-decimal space-y-2 pl-4">
                <li>
                  <strong>Professional Account:</strong> Your Instagram account
                  must be switched to a free <strong>Creator</strong> or{" "}
                  <strong>Business</strong> account (in Instagram Settings →
                  Account type and tools).
                </li>
                <li>
                  <strong>Linked Facebook Page:</strong> Meta authenticates
                  Instagram Professional accounts through a linked Facebook Page.
                  If your Instagram handle isn&apos;t linked to a Page yet, open{" "}
                  <a
                    href="https://www.instagram.com/accounts/Manage_access/"
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-0.5 font-medium text-indigo-600 underline"
                  >
                    Instagram Edit Profile
                    <ExternalLink className="h-3 w-3" />
                  </a>{" "}
                  or your Facebook Page&apos;s <strong>Linked Accounts → Instagram</strong>{" "}
                  settings to link them once.
                </li>
                <li>
                  <strong>Select in Popup:</strong> In the Meta window that opens
                  next, click <strong>Edit previous settings</strong> and check
                  all the Instagram accounts and Pages you want to use with
                  Cadence.
                </li>
              </ol>
            </div>

            <div className="mt-6 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setShowIgModal(false)}
                className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <a
                href="/api/auth/instagram/connect"
                className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-pink-600 to-purple-600 px-5 py-2 text-sm font-semibold text-white shadow-sm hover:opacity-95"
              >
                <span>Continue to Instagram / Meta</span>
                <ArrowRight className="h-4 w-4" />
              </a>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center rounded-xl border border-slate-200 bg-white py-12 text-slate-500">
          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
          <span>Loading your channels...</span>
        </div>
      ) : accounts.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center">
          <h3 className="text-base font-semibold text-slate-900">
            Connect your first social channel
          </h3>
          <p className="mx-auto mt-1 max-w-md text-sm text-slate-600">
            Link up to 6 YouTube channels and Instagram accounts on the Free plan and publish everywhere in one click.
          </p>
          <div className="mt-5 flex flex-wrap justify-center gap-3">
            <a
              href="/api/auth/youtube/connect"
              className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
            >
              <Youtube className="h-4 w-4" />
              <span>Connect YouTube Channel</span>
            </a>
            <button
              type="button"
              onClick={() => setShowIgModal(true)}
              className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-pink-600 to-purple-600 px-4 py-2 text-sm font-medium text-white hover:opacity-95"
            >
              <Instagram className="h-4 w-4" />
              <span>Connect Instagram Account</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {accounts.map((acc) => {
            const defs = acc.metadata?.defaults;
            const categoryLabel = YOUTUBE_CATEGORIES.find(
              (c) => c.id === defs?.categoryId
            )?.label;

            return (
              <div
                key={acc.id}
                className="flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
              >
                <div className="flex items-start justify-between gap-2 sm:gap-4">
                  <div className="flex min-w-0 items-center gap-3">
                    {acc.avatarUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={acc.avatarUrl}
                        alt={acc.displayName}
                        referrerPolicy="no-referrer"
                        className="h-11 w-11 shrink-0 rounded-full object-cover"
                      />
                    ) : (
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-slate-100 text-sm font-semibold text-slate-600">
                        {acc.displayName.charAt(0).toUpperCase()}
                      </div>
                    )}

                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <PlatformBadge platform={acc.platform} />
                        <span
                          className={`text-xs font-medium ${
                            acc.isActive ? "text-emerald-700" : "text-slate-400"
                          }`}
                        >
                          {acc.isActive ? "Connected" : "Paused"}
                        </span>
                      </div>
                      <p className="mt-1 truncate text-sm font-semibold text-slate-900">
                        {acc.displayName}
                      </p>
                      <p className="truncate text-xs text-slate-500">
                        {acc.username || acc.externalAccountId}
                      </p>
                      {defs && (
                        <div className="mt-1.5 flex flex-wrap gap-1.5">
                          {categoryLabel && (
                            <span className="rounded bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-700">
                              {categoryLabel}
                            </span>
                          )}
                          {defs.containsSyntheticMedia && (
                            <span className="rounded bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-800">
                              AI / Altered Disclosure On
                            </span>
                          )}
                          {defs.tags && defs.tags.length > 0 && (
                            <span className="rounded bg-indigo-50 px-2 py-0.5 text-[11px] font-medium text-indigo-700">
                              {defs.tags.length} default tags
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex shrink-0 items-center gap-1.5">
                    <Link
                      href={`/engagement?account=${acc.id}`}
                      title="View account analytics"
                      className="rounded-lg border border-slate-200 p-2 text-slate-600 transition hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-700"
                    >
                      <BarChart3 className="h-4 w-4" />
                    </Link>
                    <button
                      type="button"
                      title="Configure channel defaults"
                      onClick={() => openDefaultsEditor(acc)}
                      className={`rounded-lg border p-2 transition ${
                        editingId === acc.id
                          ? "border-indigo-500 bg-indigo-50 text-indigo-700"
                          : "border-slate-200 text-slate-600 hover:bg-slate-50"
                      }`}
                    >
                      <Settings2 className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      title={acc.isActive ? "Pause channel" : "Resume channel"}
                      onClick={() => void toggleActive(acc)}
                      className="rounded-lg border border-slate-200 p-2 text-slate-600 hover:bg-slate-50"
                    >
                      <Power className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      title="Disconnect channel"
                      onClick={() => void removeAccount(acc.id)}
                      className="rounded-lg border border-slate-200 p-2 text-slate-600 hover:bg-red-50 hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {editingId === acc.id && (
                  <div className="mt-4 space-y-3 border-t border-slate-100 pt-3 text-xs">
                    <p className="font-semibold text-slate-800">
                      Default Studio Presets for {acc.displayName}
                    </p>

                    {acc.platform === "YOUTUBE" ? (
                      <>
                        <div className="grid gap-2.5 sm:grid-cols-2">
                          <div>
                            <label className="block font-medium text-slate-600">
                              Default Category
                            </label>
                            <select
                              value={draftDefaults.categoryId || "22"}
                              onChange={(e) =>
                                setDraftDefaults((prev) => ({
                                  ...prev,
                                  categoryId: e.target.value,
                                }))
                              }
                              className="mt-1 w-full rounded border border-slate-300 bg-white px-2.5 py-1.5"
                            >
                              {YOUTUBE_CATEGORIES.map((c) => (
                                <option key={c.id} value={c.id}>
                                  {c.label}
                                </option>
                              ))}
                            </select>
                          </div>

                          <div>
                            <label className="block font-medium text-slate-600">
                              Default Language
                            </label>
                            <input
                              type="text"
                              value={draftDefaults.defaultLanguage || "en"}
                              onChange={(e) =>
                                setDraftDefaults((prev) => ({
                                  ...prev,
                                  defaultLanguage: e.target.value,
                                }))
                              }
                              placeholder="en"
                              className="mt-1 w-full rounded border border-slate-300 px-2.5 py-1.5"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block font-medium text-slate-600">
                            Default Tags (comma-separated)
                          </label>
                          <input
                            type="text"
                            value={tagsInput}
                            onChange={(e) => setTagsInput(e.target.value)}
                            placeholder="shorts, viral, commentary"
                            className="mt-1 w-full rounded border border-slate-300 px-2.5 py-1.5"
                          />
                        </div>

                        <div>
                          <label className="block font-medium text-slate-600">
                            Default Playlist ID (optional)
                          </label>
                          <input
                            type="text"
                            value={draftDefaults.playlistId || ""}
                            onChange={(e) =>
                              setDraftDefaults((prev) => ({
                                ...prev,
                                playlistId: e.target.value,
                              }))
                            }
                            placeholder="PL..."
                            className="mt-1 w-full rounded border border-slate-300 px-2.5 py-1.5"
                          />
                        </div>

                        <div className="flex flex-wrap gap-4 pt-1">
                          <label className="flex items-center gap-1.5 text-slate-700">
                            <input
                              type="checkbox"
                              checked={Boolean(
                                draftDefaults.containsSyntheticMedia
                              )}
                              onChange={(e) =>
                                setDraftDefaults((prev) => ({
                                  ...prev,
                                  containsSyntheticMedia: e.target.checked,
                                }))
                              }
                            />
                            <span>Altered / Synthetic content (AI disclosure)</span>
                          </label>

                          <label className="flex items-center gap-1.5 text-slate-700">
                            <input
                              type="checkbox"
                              checked={Boolean(draftDefaults.madeForKids)}
                              onChange={(e) =>
                                setDraftDefaults((prev) => ({
                                  ...prev,
                                  madeForKids: e.target.checked,
                                }))
                              }
                            />
                            <span>Made for Kids</span>
                          </label>
                        </div>
                      </>
                    ) : (
                      <>
                        <div>
                          <label className="block font-medium text-slate-600">
                            Default Collaborators (up to 3 handles, comma-separated)
                          </label>
                          <input
                            type="text"
                            value={collabsInput}
                            onChange={(e) => setCollabsInput(e.target.value)}
                            placeholder="creator1, creator2"
                            className="mt-1 w-full rounded border border-slate-300 px-2.5 py-1.5"
                          />
                        </div>
                        <div>
                          <label className="block font-medium text-slate-600">
                            Default Original Audio Name
                          </label>
                          <input
                            type="text"
                            value={draftDefaults.audioName || ""}
                            onChange={(e) =>
                              setDraftDefaults((prev) => ({
                                ...prev,
                                audioName: e.target.value,
                              }))
                            }
                            placeholder="Original Audio"
                            className="mt-1 w-full rounded border border-slate-300 px-2.5 py-1.5"
                          />
                        </div>
                      </>
                    )}

                    <div className="flex justify-end gap-2 pt-2">
                      <button
                        type="button"
                        onClick={() => setEditingId(null)}
                        className="rounded border border-slate-200 px-3 py-1.5 font-medium text-slate-600 hover:bg-slate-50"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        disabled={savingId === acc.id}
                        onClick={() => void saveDefaults(acc)}
                        className="rounded bg-indigo-600 px-3 py-1.5 font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
                      >
                        {savingId === acc.id ? "Saving..." : "Save Presets"}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          {/* Add Another Channel Card */}
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50/60 p-6 text-center">
            <Plus className="h-6 w-6 text-slate-400" />
            <p className="mt-2 text-sm font-semibold text-slate-800">
              Add Another Channel
            </p>
            <p className="mt-0.5 text-xs text-slate-500">
              Connect additional YouTube or Instagram handles
            </p>
            <div className="mt-4 flex flex-wrap justify-center gap-2">
              <a
                href="/api/auth/youtube/connect"
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-2xs hover:bg-slate-50"
              >
                <Youtube className="h-3.5 w-3.5 text-red-600" />
                <span>YouTube</span>
              </a>
              <button
                type="button"
                onClick={() => setShowIgModal(true)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-2xs hover:bg-slate-50"
              >
                <Instagram className="h-3.5 w-3.5 text-pink-600" />
                <span>Instagram</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function AccountsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center py-12 text-slate-500">
          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
          <span>Loading...</span>
        </div>
      }
    >
      <AccountsContent />
    </Suspense>
  );
}
