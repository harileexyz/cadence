"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  CreditCard,
  KeyRound,
  Loader2,
  LogOut,
  ShieldCheck,
  Trash2,
  User as UserIcon,
} from "lucide-react";

interface MeResponse {
  user: {
    id: string;
    email: string;
    name: string;
    plan: "FREE" | "PRO";
    createdAt: string;
  } | null;
  usage: {
    connectedChannels: number;
    postsThisMonth: number;
    plan: {
      name: string;
      maxChannels: number | null;
      maxPostsPerMonth: number | null;
    };
  } | null;
}

export default function ProfilePage() {
  const router = useRouter();
  const [me, setMe] = useState<MeResponse | null>(null);
  const [loading, setLoading] = useState(true);

  const [name, setName] = useState("");
  const [savingName, setSavingName] = useState(false);
  const [nameStatus, setNameStatus] = useState<string | null>(null);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordMsg, setPasswordMsg] = useState<{
    type: "ok" | "err";
    text: string;
  } | null>(null);

  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const loadMe = useCallback(async () => {
    try {
      const res = await fetch("/api/user/me");
      if (res.ok) {
        const data = (await res.json()) as MeResponse;
        if (!data.user) {
          window.location.href = "/login";
          return;
        }
        setMe(data);
        setName(data.user.name);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadMe();
  }, [loadMe]);

  async function handleSaveName(e: React.FormEvent) {
    e.preventDefault();
    setSavingName(true);
    setNameStatus(null);
    try {
      const res = await fetch("/api/user/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      if (res.ok) {
        setNameStatus("Profile updated.");
        await loadMe();
        router.refresh();
      }
    } finally {
      setSavingName(false);
    }
  }

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    setPasswordMsg(null);
    if (newPassword !== confirmPassword) {
      setPasswordMsg({ type: "err", text: "New passwords do not match." });
      return;
    }

    setSavingPassword(true);
    try {
      const res = await fetch("/api/user/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setPasswordMsg({
          type: "err",
          text: data.error || "Failed to update password.",
        });
        return;
      }
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setPasswordMsg({ type: "ok", text: "Password updated successfully." });
    } finally {
      setSavingPassword(false);
    }
  }

  async function handleLogout() {
    await fetch("/api/user/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  async function handleDeleteAccount() {
    setDeleting(true);
    try {
      const res = await fetch("/api/user/profile", { method: "DELETE" });
      if (res.ok) {
        router.push("/");
        router.refresh();
      }
    } finally {
      setDeleting(false);
    }
  }

  if (loading || !me?.user) {
    return (
      <div className="flex items-center justify-center rounded-xl border border-slate-200 bg-white py-16 text-slate-500">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
        <span>Loading profile...</span>
      </div>
    );
  }

  const { user, usage } = me;
  const initials = user.name
    .split(" ")
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  const isFounder = user.email.toLowerCase() === "leehari007@gmail.com";

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          Profile & Settings
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          Manage your Cadence account, subscription plan, and security settings.
        </p>
      </div>

      {/* Identity Card */}
      <section className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-lg font-bold text-white">
            {initials || "U"}
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="truncate text-lg font-bold text-slate-900">
                {user.name}
              </h2>
              <span className="rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-semibold text-indigo-700">
                {user.plan === "PRO" ? "Creator Pro" : "Generous Free"}
              </span>
            </div>
            <p className="truncate text-sm text-slate-500">{user.email}</p>
            <p className="mt-0.5 text-xs text-slate-400">
              Member since {new Date(user.createdAt).toLocaleDateString()}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => void handleLogout()}
          className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          <LogOut className="h-4 w-4" />
          <span>Log out</span>
        </button>
      </section>

      {/* Plan & Billing Summary */}
      {usage && (
        <section className="rounded-2xl border border-indigo-100 bg-indigo-50/50 p-5">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
            <div className="space-y-1">
              <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-indigo-700">
                <CreditCard className="h-3.5 w-3.5" />
                <span>{usage.plan.name}</span>
              </p>
              <p className="text-sm text-slate-700">
                <strong>{usage.connectedChannels}</strong> /{" "}
                {usage.plan.maxChannels ?? "Unlimited"} channels ·{" "}
                <strong>{usage.postsThisMonth}</strong> /{" "}
                {usage.plan.maxPostsPerMonth ?? "Unlimited"} posts this month
              </p>
            </div>
            <Link
              href="/pricing"
              className="inline-flex min-h-[44px] items-center justify-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-2xs hover:bg-indigo-700"
            >
              <span>Manage Plan</span>
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </section>
      )}

      {isFounder && (
        <Link
          href="/admin"
          className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs transition hover:bg-slate-50"
        >
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
              <ShieldCheck className="h-5 w-5" />
            </span>
            <div>
              <p className="text-sm font-semibold text-slate-900">
                Founder Admin Console
              </p>
              <p className="text-xs text-slate-500">
                View platform users, OAuth health, and storage status
              </p>
            </div>
          </div>
          <ArrowRight className="h-4 w-4 text-slate-400" />
        </Link>
      )}

      {/* Edit Display Name */}
      <form
        onSubmit={(e) => void handleSaveName(e)}
        className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs"
      >
        <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
          <UserIcon className="h-4 w-4 text-indigo-600" />
          <span>Account Details</span>
        </h3>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-xs font-medium text-slate-600">
              Display Name
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600">
              Email Address
            </label>
            <input
              type="email"
              disabled
              value={user.email}
              className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-500"
            />
          </div>
        </div>

        <div className="flex items-center justify-between">
          {nameStatus ? (
            <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700">
              <CheckCircle2 className="h-4 w-4" />
              {nameStatus}
            </span>
          ) : (
            <span />
          )}
          <button
            type="submit"
            disabled={savingName}
            className="min-h-[44px] rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-50"
          >
            {savingName ? "Saving..." : "Save Profile"}
          </button>
        </div>
      </form>

      {/* Change Password */}
      <form
        onSubmit={(e) => void handleChangePassword(e)}
        className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs"
      >
        <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
          <KeyRound className="h-4 w-4 text-indigo-600" />
          <span>Change Password</span>
        </h3>

        {passwordMsg && (
          <div
            className={`flex items-center gap-2 rounded-lg border p-3 text-xs ${
              passwordMsg.type === "ok"
                ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                : "border-red-200 bg-red-50 text-red-700"
            }`}
          >
            {passwordMsg.type === "ok" ? (
              <CheckCircle2 className="h-4 w-4 shrink-0" />
            ) : (
              <AlertCircle className="h-4 w-4 shrink-0" />
            )}
            <span>{passwordMsg.text}</span>
          </div>
        )}

        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-slate-600">
              Current Password
            </label>
            <input
              type="password"
              required
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-medium text-slate-600">
                New Password (min. 8 chars)
              </label>
              <input
                type="password"
                required
                minLength={8}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600">
                Confirm New Password
              </label>
              <input
                type="password"
                required
                minLength={8}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={savingPassword}
            className="min-h-[44px] rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-50 disabled:opacity-50"
          >
            {savingPassword ? "Updating..." : "Update Password"}
          </button>
        </div>
      </form>

      {/* Danger Zone: Delete Account */}
      <section className="rounded-2xl border border-red-200 bg-red-50/40 p-5">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <h3 className="text-sm font-semibold text-red-900">
              Delete Account
            </h3>
            <p className="mt-0.5 text-xs text-red-700">
              Permanently deletes your Cadence account, encrypted social tokens, and scheduled posts.
            </p>
          </div>

          {!confirmDelete ? (
            <button
              type="button"
              onClick={() => setConfirmDelete(true)}
              className="inline-flex min-h-[44px] shrink-0 items-center justify-center gap-1.5 rounded-xl border border-red-300 bg-white px-4 py-2 text-xs font-semibold text-red-700 hover:bg-red-50"
            >
              <Trash2 className="h-4 w-4" />
              <span>Delete Account</span>
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setConfirmDelete(false)}
                className="min-h-[44px] rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-700"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={deleting}
                onClick={() => void handleDeleteAccount()}
                className="min-h-[44px] rounded-xl bg-red-600 px-4 py-2 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-50"
              >
                {deleting ? "Deleting..." : "Confirm Delete"}
              </button>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
