"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  Ban,
  Check,
  CheckCircle2,
  Copy,
  Database,
  FlaskConical,
  KeyRound,
  Loader2,
  Megaphone,
  RefreshCw,
  Search,
  Settings,
  ShieldCheck,
  Sparkles,
  Trash2,
  UserPlus,
  Users,
} from "lucide-react";
import { PlatformBadge } from "@/components/PlatformBadge";

interface AdminUserDTO {
  id: string;
  name: string;
  email: string;
  plan: "FREE" | "PRO";
  isBetaTester: boolean;
  isSuspended: boolean;
  createdAt: string;
  _count: {
    socialAccounts: number;
    posts: number;
    apiKeys: number;
  };
}

interface BetaInviteDTO {
  id: string;
  email: string;
  code: string;
  grantPlan: "FREE" | "PRO";
  note: string | null;
  invitedBy: string;
  usedAt: string | null;
  usedByEmail: string | null;
  createdAt: string;
}

interface FailedTargetDTO {
  id: string;
  postId: string;
  postTitle: string;
  userEmail: string;
  userName: string;
  platform: "YOUTUBE" | "INSTAGRAM";
  channelName: string;
  errorMessage: string | null;
  retryCount: number;
  updatedAt: string;
}

interface AdminOverviewDTO {
  metrics: {
    totalUsers: number;
    betaUsers: number;
    proUsers: number;
    totalChannels: number;
    ytChannels: number;
    igChannels: number;
    totalPosts: number;
    publishedPosts: number;
    scheduledPosts: number;
    failedPosts: number;
    totalApiKeys: number;
  };
  system: {
    youtubeOAuthConfigured: boolean;
    youtubeRedirectUri: string;
    instagramOAuthConfigured: boolean;
    instagramRedirectUri: string;
    storageKind: "s3" | "local";
    publicMediaBaseUrl: string;
  };
  settings: {
    inviteOnlyMode: boolean;
    announcementBanner: {
      enabled: boolean;
      message: string;
      tone: "info" | "success" | "warn";
    };
  };
  users: AdminUserDTO[];
  betaInvites: BetaInviteDTO[];
  failedTargets: FailedTargetDTO[];
}

type AdminTab = "beta" | "users" | "jobs" | "controls";

export default function AdminPage() {
  const [data, setData] = useState<AdminOverviewDTO | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [forbidden, setForbidden] = useState(false);
  const [tab, setTab] = useState<AdminTab>("beta");
  const [toast, setToast] = useState<{ type: "ok" | "err"; text: string } | null>(
    null
  );

  // Beta invite / direct tester creation form
  const [betaMode, setBetaMode] = useState<"invite" | "direct_account">("invite");
  const [betaEmail, setBetaEmail] = useState("");
  const [betaName, setBetaName] = useState("");
  const [betaPlan, setBetaPlan] = useState<"PRO" | "FREE">("PRO");
  const [betaNote, setBetaNote] = useState("");
  const [creatingBeta, setCreatingBeta] = useState(false);
  const [createdCredentials, setCreatedCredentials] = useState<{
    email: string;
    password?: string;
    inviteUrl?: string;
    code?: string;
  } | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Users search & filter
  const [userSearch, setUserSearch] = useState("");
  const [userFilter, setUserFilter] = useState<"ALL" | "BETA" | "PRO" | "SUSPENDED">(
    "ALL"
  );
  const [busyUserId, setBusyUserId] = useState<string | null>(null);

  // Platform settings
  const [inviteOnlyMode, setInviteOnlyMode] = useState(false);
  const [bannerEnabled, setBannerEnabled] = useState(false);
  const [bannerMessage, setBannerMessage] = useState("");
  const [bannerTone, setBannerTone] = useState<"info" | "success" | "warn">("info");
  const [savingSettings, setSavingSettings] = useState(false);

  const origin =
    typeof window !== "undefined"
      ? window.location.origin
      : "https://cadence-urn7.onrender.com";

  const showToast = useCallback((type: "ok" | "err", text: string) => {
    setToast({ type, text });
    setTimeout(() => setToast(null), 4000);
  }, []);

  const loadAdmin = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    try {
      const res = await fetch("/api/admin/overview");
      if (res.status === 401 || res.status === 403) {
        setForbidden(true);
        return;
      }
      if (res.ok) {
        const payload = (await res.json()) as AdminOverviewDTO;
        setData(payload);
        setInviteOnlyMode(payload.settings.inviteOnlyMode);
        setBannerEnabled(payload.settings.announcementBanner.enabled);
        setBannerMessage(payload.settings.announcementBanner.message);
        setBannerTone(payload.settings.announcementBanner.tone);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void loadAdmin(false);
  }, [loadAdmin]);

  function copyText(text: string, id: string) {
    void navigator.clipboard?.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  }

  async function handleCreateBeta(e: React.FormEvent) {
    e.preventDefault();
    if (!betaEmail.trim()) return;
    setCreatingBeta(true);
    setCreatedCredentials(null);
    try {
      const res = await fetch("/api/admin/beta-invites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: betaMode,
          email: betaEmail.trim(),
          name: betaName.trim() || undefined,
          grantPlan: betaPlan,
          note: betaNote.trim() || undefined,
        }),
      });
      const body = (await res.json()) as {
        error?: string;
        mode?: string;
        invite?: BetaInviteDTO;
        user?: { email: string };
        tempPassword?: string;
      };
      if (!res.ok) {
        throw new Error(body.error || "Failed to add beta user");
      }

      if (body.mode === "direct_account" && body.user && body.tempPassword) {
        setCreatedCredentials({
          email: body.user.email,
          password: body.tempPassword,
        });
        showToast("ok", `Created beta tester account for ${body.user.email}`);
      } else if (body.invite) {
        const inviteUrl = `${origin}/register?invite=${encodeURIComponent(
          body.invite.code
        )}&email=${encodeURIComponent(body.invite.email)}`;
        setCreatedCredentials({
          email: body.invite.email,
          code: body.invite.code,
          inviteUrl,
        });
        showToast("ok", `Beta invite created for ${body.invite.email}`);
      }

      setBetaEmail("");
      setBetaName("");
      setBetaNote("");
      await loadAdmin(false);
    } catch (err) {
      showToast("err", err instanceof Error ? err.message : "Failed");
    } finally {
      setCreatingBeta(false);
    }
  }

  async function handleRevokeInvite(id: string) {
    const res = await fetch(`/api/admin/beta-invites/${id}`, {
      method: "DELETE",
    });
    if (res.ok) {
      showToast("ok", "Beta invite revoked.");
      await loadAdmin(false);
    }
  }

  async function handleUpdateUser(
    id: string,
    patch: {
      plan?: "FREE" | "PRO";
      isBetaTester?: boolean;
      isSuspended?: boolean;
      resetPassword?: string;
    },
    successMsg: string
  ) {
    setBusyUserId(id);
    try {
      const res = await fetch(`/api/admin/users/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      const body = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(body.error || "Update failed");
      showToast("ok", successMsg);
      await loadAdmin(false);
    } catch (err) {
      showToast("err", err instanceof Error ? err.message : "Update failed");
    } finally {
      setBusyUserId(null);
    }
  }

  async function handleDeleteUser(u: AdminUserDTO) {
    if (
      !window.confirm(
        `Permanently delete ${u.email} and all their channels/posts?`
      )
    ) {
      return;
    }
    setBusyUserId(u.id);
    try {
      const res = await fetch(`/api/admin/users/${u.id}`, {
        method: "DELETE",
      });
      const body = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(body.error || "Delete failed");
      showToast("ok", `Deleted user ${u.email}`);
      await loadAdmin(false);
    } catch (err) {
      showToast("err", err instanceof Error ? err.message : "Delete failed");
    } finally {
      setBusyUserId(null);
    }
  }

  async function handleResetUserPassword(u: AdminUserDTO) {
    const tempPass = window.prompt(
      `Set a new temporary password for ${u.email} (min 8 characters):`,
      `Cadence-${Math.random().toString(36).slice(2, 8)}`
    );
    if (!tempPass || tempPass.trim().length < 8) return;
    await handleUpdateUser(
      u.id,
      { resetPassword: tempPass.trim() },
      `Password reset for ${u.email}`
    );
  }

  async function handleRetryTarget(targetId: string) {
    const res = await fetch(`/api/admin/targets/${targetId}/retry`, {
      method: "POST",
    });
    if (res.ok) {
      showToast("ok", "Target re-queued for immediate publishing.");
      await loadAdmin(false);
    } else {
      showToast("err", "Failed to retry target.");
    }
  }

  async function handleSaveSettings(e: React.FormEvent) {
    e.preventDefault();
    setSavingSettings(true);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          inviteOnlyMode,
          announcementBanner: {
            enabled: bannerEnabled,
            message: bannerMessage,
            tone: bannerTone,
          },
        }),
      });
      if (!res.ok) throw new Error("Failed to save platform controls");
      showToast("ok", "Platform controls updated live.");
      await loadAdmin(false);
    } catch (err) {
      showToast("err", err instanceof Error ? err.message : "Save failed");
    } finally {
      setSavingSettings(false);
    }
  }

  const filteredUsers = useMemo(() => {
    if (!data) return [];
    const q = userSearch.trim().toLowerCase();
    return data.users.filter((u) => {
      if (userFilter === "BETA" && !u.isBetaTester) return false;
      if (userFilter === "PRO" && u.plan !== "PRO") return false;
      if (userFilter === "SUSPENDED" && !u.isSuspended) return false;
      if (!q) return true;
      return (
        u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q)
      );
    });
  }, [data, userSearch, userFilter]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-slate-500">
        <Loader2 className="mr-2 h-5 w-5 animate-spin text-indigo-600" />
        <span>Loading Founder Command Center...</span>
      </div>
    );
  }

  if (forbidden || !data) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-8 text-center text-sm text-red-700">
        Founder Admin access is restricted.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-semibold text-indigo-700">
              <ShieldCheck className="h-3.5 w-3.5" />
              Founder Command Center
            </span>
            {data.settings.inviteOnlyMode && (
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-800">
                Private Beta (Invite-Only)
              </span>
            )}
          </div>
          <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-900">
            Cadence Admin & Beta Ops
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Invite beta testers, manage plans & access, monitor failed jobs, and broadcast live announcements.
          </p>
        </div>

        <button
          type="button"
          disabled={refreshing}
          onClick={() => void loadAdmin(true)}
          className="inline-flex items-center gap-2 self-start rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm font-medium text-slate-700 shadow-2xs hover:bg-slate-50 disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
          <span>Refresh</span>
        </button>
      </div>

      {toast && (
        <div
          className={`flex items-center gap-2 rounded-xl border px-4 py-3 text-xs font-semibold ${
            toast.type === "ok"
              ? "border-emerald-200 bg-emerald-50 text-emerald-800"
              : "border-red-200 bg-red-50 text-red-700"
          }`}
        >
          {toast.type === "ok" ? (
            <CheckCircle2 className="h-4 w-4 shrink-0" />
          ) : (
            <AlertCircle className="h-4 w-4 shrink-0" />
          )}
          <span>{toast.text}</span>
        </div>
      )}

      {/* Top KPI Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs">
          <p className="text-xs font-medium text-slate-500">Total Users</p>
          <p className="mt-1 text-2xl font-bold text-slate-900">
            {data.metrics.totalUsers}
          </p>
          <p className="mt-0.5 text-[11px] text-slate-400">
            {data.metrics.proUsers} Pro · {data.metrics.totalApiKeys} API keys
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs">
          <p className="text-xs font-medium text-slate-500">Beta Testers</p>
          <p className="mt-1 text-2xl font-bold text-indigo-700">
            {data.metrics.betaUsers}
          </p>
          <p className="mt-0.5 text-[11px] text-slate-400">
            {data.betaInvites.filter((i) => !i.usedAt).length} pending invites
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs">
          <p className="text-xs font-medium text-slate-500">Channels</p>
          <p className="mt-1 text-2xl font-bold text-slate-900">
            {data.metrics.totalChannels}
          </p>
          <p className="mt-0.5 text-[11px] text-slate-400">
            {data.metrics.ytChannels} YT · {data.metrics.igChannels} IG
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs">
          <p className="text-xs font-medium text-slate-500">Total Posts</p>
          <p className="mt-1 text-2xl font-bold text-slate-900">
            {data.metrics.totalPosts}
          </p>
          <p className="mt-0.5 text-[11px] text-slate-400">
            {data.metrics.publishedPosts} pub · {data.metrics.scheduledPosts} sched
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs">
          <p className="text-xs font-medium text-slate-500">Failed Targets</p>
          <p
            className={`mt-1 text-2xl font-bold ${
              data.failedTargets.length > 0
                ? "text-red-600"
                : "text-emerald-700"
            }`}
          >
            {data.failedTargets.length}
          </p>
          <p className="mt-0.5 text-[11px] text-slate-400">
            {data.failedTargets.length > 0 ? "Needs attention" : "All healthy"}
          </p>
        </div>
      </div>

      {/* Section Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 pb-3">
        {(
          [
            {
              id: "beta",
              label: "Beta Testers & Invites",
              icon: FlaskConical,
              count: data.betaInvites.length,
            },
            {
              id: "users",
              label: "Users Management",
              icon: Users,
              count: data.users.length,
            },
            {
              id: "jobs",
              label: "Failed Jobs & Health",
              icon: Database,
              count: data.failedTargets.length,
            },
            {
              id: "controls",
              label: "Platform Controls",
              icon: Settings,
              count: null,
            },
          ] as const
        ).map((t) => {
          const Icon = t.icon;
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`inline-flex items-center gap-2 rounded-xl border px-3.5 py-2 text-xs font-semibold transition ${
                active
                  ? "border-slate-900 bg-slate-900 text-white"
                  : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              <span>{t.label}</span>
              {t.count !== null && (
                <span
                  className={`rounded-full px-1.5 py-0.5 text-[10px] ${
                    active
                      ? "bg-white/20 text-white"
                      : "bg-slate-100 text-slate-600"
                  }`}
                >
                  {t.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* TAB 1: Beta Testers & Invites */}
      {tab === "beta" && (
        <div className="space-y-6">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="flex items-center gap-2 text-sm font-bold text-slate-900">
                  <UserPlus className="h-4 w-4 text-indigo-600" />
                  <span>Add Beta Tester</span>
                </h2>
                <p className="mt-0.5 text-xs text-slate-500">
                  Generate a shareable beta invite link or directly provision a ready-to-login test account.
                </p>
              </div>

              <div className="flex rounded-lg border border-slate-200 bg-slate-50 p-0.5 text-xs">
                <button
                  type="button"
                  onClick={() => setBetaMode("invite")}
                  className={`rounded-md px-3 py-1 font-semibold transition ${
                    betaMode === "invite"
                      ? "bg-white text-slate-900 shadow-2xs"
                      : "text-slate-600"
                  }`}
                >
                  Invite Link
                </button>
                <button
                  type="button"
                  onClick={() => setBetaMode("direct_account")}
                  className={`rounded-md px-3 py-1 font-semibold transition ${
                    betaMode === "direct_account"
                      ? "bg-white text-slate-900 shadow-2xs"
                      : "text-slate-600"
                  }`}
                >
                  Create Account Directly
                </button>
              </div>
            </div>

            <form
              onSubmit={(e) => void handleCreateBeta(e)}
              className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4"
            >
              <input
                type="email"
                required
                value={betaEmail}
                onChange={(e) => setBetaEmail(e.target.value)}
                placeholder="tester@email.com"
                className="rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
              />
              {betaMode === "direct_account" ? (
                <input
                  type="text"
                  value={betaName}
                  onChange={(e) => setBetaName(e.target.value)}
                  placeholder="Tester Name (optional)"
                  className="rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
                />
              ) : (
                <input
                  type="text"
                  value={betaNote}
                  onChange={(e) => setBetaNote(e.target.value)}
                  placeholder="Note (e.g. YouTube friend)"
                  className="rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
                />
              )}

              <select
                value={betaPlan}
                onChange={(e) => setBetaPlan(e.target.value as "PRO" | "FREE")}
                className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700"
              >
                <option value="PRO">Grant Creator Pro (Free Beta)</option>
                <option value="FREE">Grant Free Plan (6 Channels)</option>
              </select>

              <button
                type="submit"
                disabled={creatingBeta}
                className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
              >
                {creatingBeta ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Sparkles className="h-4 w-4" />
                )}
                <span>
                  {betaMode === "invite"
                    ? "Generate Invite"
                    : "Provision Account"}
                </span>
              </button>
            </form>

            {createdCredentials && (
              <div className="mt-4 space-y-2 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-xs text-emerald-950">
                {createdCredentials.inviteUrl ? (
                  <>
                    <p className="font-semibold">
                      Share this Beta Invite Link with {createdCredentials.email}{" "}
                      (Code: <code className="font-mono">{createdCredentials.code}</code>):
                    </p>
                    <div className="flex items-center gap-2">
                      <code className="flex-1 overflow-x-auto rounded-lg bg-white px-3 py-2 font-mono text-xs text-slate-800 ring-1 ring-emerald-200">
                        {createdCredentials.inviteUrl}
                      </code>
                      <button
                        type="button"
                        onClick={() =>
                          copyText(createdCredentials.inviteUrl!, "created-url")
                        }
                        className="inline-flex shrink-0 items-center gap-1 rounded-lg bg-emerald-700 px-3 py-2 font-semibold text-white hover:bg-emerald-800"
                      >
                        {copiedId === "created-url" ? (
                          <Check className="h-3.5 w-3.5" />
                        ) : (
                          <Copy className="h-3.5 w-3.5" />
                        )}
                        <span>{copiedId === "created-url" ? "Copied" : "Copy Link"}</span>
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <p className="font-semibold">
                      Beta Account Created — share these login credentials:
                    </p>
                    <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-white px-3 py-2 font-mono text-xs text-slate-800 ring-1 ring-emerald-200">
                      <span>
                        Email: <strong>{createdCredentials.email}</strong> · Password:{" "}
                        <strong>{createdCredentials.password}</strong>
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          copyText(
                            `Cadence Beta Login\nURL: ${origin}/login\nEmail: ${createdCredentials.email}\nPassword: ${createdCredentials.password}`,
                            "created-creds"
                          )
                        }
                        className="inline-flex items-center gap-1 rounded-md bg-emerald-700 px-2.5 py-1 text-[11px] font-sans font-semibold text-white"
                      >
                        {copiedId === "created-creds" ? "Copied" : "Copy Credentials"}
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Beta Invites List */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs">
            <h3 className="text-sm font-bold text-slate-900">
              Beta Invites ({data.betaInvites.length})
            </h3>
            {data.betaInvites.length === 0 ? (
              <p className="mt-4 rounded-xl border border-dashed border-slate-200 p-6 text-center text-xs text-slate-500">
                No beta invites created yet. Use the form above to invite testers.
              </p>
            ) : (
              <div className="mt-3 overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-500">
                      <th className="pb-2 font-medium">Invited Email</th>
                      <th className="pb-2 font-medium">Code</th>
                      <th className="pb-2 font-medium">Plan</th>
                      <th className="pb-2 font-medium">Status</th>
                      <th className="pb-2 font-medium text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {data.betaInvites.map((inv) => {
                      const link = `${origin}/register?invite=${encodeURIComponent(
                        inv.code
                      )}&email=${encodeURIComponent(inv.email)}`;
                      return (
                        <tr key={inv.id}>
                          <td className="py-3">
                            <p className="font-semibold text-slate-900">
                              {inv.email}
                            </p>
                            {inv.note && (
                              <p className="text-[11px] text-slate-500">
                                {inv.note}
                              </p>
                            )}
                          </td>
                          <td className="py-3 font-mono text-slate-700">
                            {inv.code}
                          </td>
                          <td className="py-3">
                            <span className="rounded-full bg-indigo-50 px-2 py-0.5 font-semibold text-indigo-700">
                              {inv.grantPlan}
                            </span>
                          </td>
                          <td className="py-3">
                            {inv.usedAt ? (
                              <span className="rounded-full bg-emerald-50 px-2 py-0.5 font-semibold text-emerald-700">
                                Accepted {new Date(inv.usedAt).toLocaleDateString()}
                              </span>
                            ) : (
                              <span className="rounded-full bg-amber-50 px-2 py-0.5 font-semibold text-amber-700">
                                Pending
                              </span>
                            )}
                          </td>
                          <td className="py-3 text-right">
                            <div className="inline-flex items-center gap-1.5">
                              {!inv.usedAt && (
                                <button
                                  type="button"
                                  onClick={() => copyText(link, inv.id)}
                                  className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1 font-medium text-slate-700 hover:bg-slate-50"
                                >
                                  {copiedId === inv.id ? (
                                    <Check className="h-3 w-3 text-emerald-600" />
                                  ) : (
                                    <Copy className="h-3 w-3" />
                                  )}
                                  <span>
                                    {copiedId === inv.id ? "Copied" : "Copy Link"}
                                  </span>
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => void handleRevokeInvite(inv.id)}
                                className="rounded-lg border border-slate-200 p-1.5 text-red-600 hover:bg-red-50"
                                title="Delete invite"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: Users Management */}
      {tab === "users" && (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative flex-1 sm:max-w-xs">
              <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                placeholder="Search users by name or email..."
                className="w-full rounded-xl border border-slate-200 py-2 pr-3 pl-9 text-xs focus:border-indigo-500 focus:outline-none"
              />
            </div>

            <div className="flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 p-0.5 text-xs">
              {(["ALL", "BETA", "PRO", "SUSPENDED"] as const).map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => setUserFilter(f)}
                  className={`rounded-md px-2.5 py-1 font-medium transition ${
                    userFilter === f
                      ? "bg-white text-slate-900 shadow-2xs"
                      : "text-slate-600"
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500">
                  <th className="pb-2 font-medium">User</th>
                  <th className="pb-2 font-medium">Plan & Badges</th>
                  <th className="pb-2 font-medium">Usage</th>
                  <th className="pb-2 font-medium">Joined</th>
                  <th className="pb-2 font-medium text-right">Controls</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredUsers.map((u) => {
                  const isBusy = busyUserId === u.id;
                  return (
                    <tr key={u.id} className={u.isSuspended ? "bg-red-50/40" : ""}>
                      <td className="py-3">
                        <p className="font-semibold text-slate-900">{u.name}</p>
                        <p className="text-[11px] text-slate-500">{u.email}</p>
                      </td>
                      <td className="py-3">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span
                            className={`rounded-full px-2 py-0.5 font-semibold ${
                              u.plan === "PRO"
                                ? "bg-indigo-50 text-indigo-700"
                                : "bg-slate-100 text-slate-700"
                            }`}
                          >
                            {u.plan}
                          </span>
                          {u.isBetaTester && (
                            <span className="rounded-full bg-purple-50 px-2 py-0.5 font-semibold text-purple-700">
                              BETA
                            </span>
                          )}
                          {u.isSuspended && (
                            <span className="rounded-full bg-red-100 px-2 py-0.5 font-semibold text-red-700">
                              SUSPENDED
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 text-slate-600">
                        {u._count.socialAccounts} ch · {u._count.posts} posts ·{" "}
                        {u._count.apiKeys} keys
                      </td>
                      <td className="py-3 text-slate-500">
                        {new Date(u.createdAt).toLocaleDateString()}
                      </td>
                      <td className="py-3 text-right">
                        <div className="inline-flex flex-wrap items-center justify-end gap-1.5">
                          <button
                            type="button"
                            disabled={isBusy}
                            onClick={() =>
                              void handleUpdateUser(
                                u.id,
                                { plan: u.plan === "PRO" ? "FREE" : "PRO" },
                                `Switched ${u.email} to ${u.plan === "PRO" ? "FREE" : "PRO"}`
                              )
                            }
                            className="rounded-lg border border-slate-200 px-2 py-1 font-medium text-slate-700 hover:bg-indigo-50 hover:text-indigo-700 disabled:opacity-50"
                          >
                            {u.plan === "PRO" ? "Set Free" : "Grant Pro"}
                          </button>
                          <button
                            type="button"
                            disabled={isBusy}
                            onClick={() =>
                              void handleUpdateUser(
                                u.id,
                                { isBetaTester: !u.isBetaTester },
                                `Updated Beta flag for ${u.email}`
                              )
                            }
                            className="rounded-lg border border-slate-200 px-2 py-1 font-medium text-purple-700 hover:bg-purple-50 disabled:opacity-50"
                          >
                            {u.isBetaTester ? "Unmark Beta" : "Mark Beta"}
                          </button>
                          <button
                            type="button"
                            disabled={isBusy}
                            onClick={() => void handleResetUserPassword(u)}
                            title="Reset password"
                            className="rounded-lg border border-slate-200 p-1.5 text-slate-600 hover:bg-slate-100 disabled:opacity-50"
                          >
                            <KeyRound className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            disabled={isBusy}
                            onClick={() =>
                              void handleUpdateUser(
                                u.id,
                                { isSuspended: !u.isSuspended },
                                u.isSuspended
                                  ? `Unsuspended ${u.email}`
                                  : `Suspended ${u.email}`
                              )
                            }
                            title={u.isSuspended ? "Unsuspend" : "Suspend user"}
                            className="rounded-lg border border-slate-200 p-1.5 text-amber-700 hover:bg-amber-50 disabled:opacity-50"
                          >
                            <Ban className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            disabled={isBusy}
                            onClick={() => void handleDeleteUser(u)}
                            title="Delete user"
                            className="rounded-lg border border-slate-200 p-1.5 text-red-600 hover:bg-red-50 disabled:opacity-50"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: Failed Jobs & System Health */}
      {tab === "jobs" && (
        <div className="space-y-6">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs">
            <h2 className="text-sm font-bold text-slate-900">
              Recent Failed Publishing Targets ({data.failedTargets.length})
            </h2>
            <p className="mt-0.5 text-xs text-slate-500">
              Inspect exact Meta/YouTube API errors across all users and retry any failed target in 1 click.
            </p>

            {data.failedTargets.length === 0 ? (
              <div className="mt-4 flex items-center justify-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-6 text-xs font-semibold text-emerald-800">
                <CheckCircle2 className="h-4 w-4" />
                <span>Zero failed publishing jobs across the platform.</span>
              </div>
            ) : (
              <div className="mt-4 divide-y divide-slate-100 rounded-xl border border-slate-200">
                {data.failedTargets.map((t) => (
                  <div
                    key={t.id}
                    className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="min-w-0 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <PlatformBadge platform={t.platform} />
                        <span className="text-xs font-semibold text-slate-900">
                          {t.channelName}
                        </span>
                        <span className="text-xs text-slate-400">
                          · {t.userEmail}
                        </span>
                        <span className="text-[11px] text-slate-400">
                          · {new Date(t.updatedAt).toLocaleString()}
                        </span>
                      </div>
                      <p className="truncate text-xs font-medium text-slate-800">
                        {t.postTitle}
                      </p>
                      <p className="rounded bg-red-50 px-2.5 py-1 text-[11px] text-red-700">
                        {t.errorMessage || "Unknown publishing error"}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => void handleRetryTarget(t.id)}
                      className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-800"
                    >
                      <RefreshCw className="h-3.5 w-3.5" />
                      <span>Retry</span>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* System & OAuth Diagnostics */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs">
            <h2 className="flex items-center gap-2 text-sm font-bold text-slate-900">
              <Database className="h-4 w-4 text-indigo-600" />
              <span>System & OAuth Provider Configuration</span>
            </h2>

            <div className="mt-4 grid gap-4 text-xs sm:grid-cols-3">
              <div className="rounded-xl border border-slate-100 bg-slate-50 p-3.5">
                <p className="font-semibold text-slate-800">Google / YouTube OAuth</p>
                <p className="mt-1 flex items-center gap-1 text-emerald-700">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  {data.system.youtubeOAuthConfigured ? "Configured" : "Missing"}
                </p>
                <p className="mt-1 break-all text-slate-500">
                  {data.system.youtubeRedirectUri}
                </p>
              </div>

              <div className="rounded-xl border border-slate-100 bg-slate-50 p-3.5">
                <p className="font-semibold text-slate-800">Meta / Instagram OAuth</p>
                <p className="mt-1 flex items-center gap-1 text-emerald-700">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  {data.system.instagramOAuthConfigured ? "Configured" : "Missing"}
                </p>
                <p className="mt-1 break-all text-slate-500">
                  {data.system.instagramRedirectUri}
                </p>
              </div>

              <div className="rounded-xl border border-slate-100 bg-slate-50 p-3.5">
                <p className="font-semibold text-slate-800">Media Storage</p>
                <p className="mt-1 font-medium text-slate-700">
                  {data.system.storageKind === "s3"
                    ? "Cloudflare R2 / S3"
                    : "Local Disk + HTTPS"}
                </p>
                <p className="mt-1 break-all text-slate-500">
                  {data.system.publicMediaBaseUrl}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: Platform Controls (Private Beta Mode + Global Announcement Banner) */}
      {tab === "controls" && (
        <form
          onSubmit={(e) => void handleSaveSettings(e)}
          className="space-y-6"
        >
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-sm font-bold text-slate-900">
                  Private Beta (Invite-Only Signups)
                </h2>
                <p className="mt-1 text-xs text-slate-500">
                  When enabled, only emails or invite codes listed under Beta Testers & Invites can register new accounts (both Email and Google Sign-Up).
                </p>
              </div>
              <label className="relative inline-flex cursor-pointer items-center">
                <input
                  type="checkbox"
                  checked={inviteOnlyMode}
                  onChange={(e) => setInviteOnlyMode(e.target.checked)}
                  className="peer sr-only"
                />
                <div className="h-6 w-11 rounded-full bg-slate-200 transition peer-checked:bg-indigo-600 after:absolute after:top-0.5 after:left-0.5 after:h-5 after:w-5 after:rounded-full after:bg-white after:transition peer-checked:after:translate-x-5" />
              </label>
            </div>
          </div>

          <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="flex items-center gap-2 text-sm font-bold text-slate-900">
                  <Megaphone className="h-4 w-4 text-indigo-600" />
                  <span>Global Announcement Banner</span>
                </h2>
                <p className="mt-1 text-xs text-slate-500">
                  Display a live notice banner at the top of Cadence for all signed-in users (great for beta updates or maintenance notices).
                </p>
              </div>
              <label className="relative inline-flex cursor-pointer items-center">
                <input
                  type="checkbox"
                  checked={bannerEnabled}
                  onChange={(e) => setBannerEnabled(e.target.checked)}
                  className="peer sr-only"
                />
                <div className="h-6 w-11 rounded-full bg-slate-200 transition peer-checked:bg-indigo-600 after:absolute after:top-0.5 after:left-0.5 after:h-5 after:w-5 after:rounded-full after:bg-white after:transition peer-checked:after:translate-x-5" />
              </label>
            </div>

            <div className="grid gap-3 sm:grid-cols-4">
              <input
                type="text"
                value={bannerMessage}
                onChange={(e) => setBannerMessage(e.target.value)}
                placeholder="e.g. Welcome to Cadence Beta! Try the new Reel Cover Scrubber & Comment Reply Inbox."
                className="rounded-xl border border-slate-300 px-3 py-2 text-sm sm:col-span-3 focus:border-indigo-500 focus:outline-none"
              />
              <select
                value={bannerTone}
                onChange={(e) =>
                  setBannerTone(e.target.value as "info" | "success" | "warn")
                }
                className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700"
              >
                <option value="info">Info (Indigo)</option>
                <option value="success">Success (Green)</option>
                <option value="warn">Warning (Amber)</option>
              </select>
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={savingSettings}
                className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-xs font-semibold text-white hover:bg-slate-800 disabled:opacity-50"
              >
                {savingSettings && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                <span>Save Platform Controls</span>
              </button>
            </div>
          </div>
        </form>
      )}
    </div>
  );
}
