"use client";

import { useEffect, useState } from "react";
import {
  CheckCircle2,
  Database,
  Loader2,
  ShieldCheck,
  Users,
} from "lucide-react";

interface AdminOverviewDTO {
  metrics: {
    totalUsers: number;
    totalChannels: number;
    totalPosts: number;
  };
  system: {
    youtubeOAuthConfigured: boolean;
    youtubeRedirectUri: string;
    instagramOAuthConfigured: boolean;
    instagramRedirectUri: string;
    storageKind: "s3" | "local";
    publicMediaBaseUrl: string;
  };
  users: Array<{
    id: string;
    name: string;
    email: string;
    plan: "FREE" | "PRO";
    createdAt: string;
    _count: {
      socialAccounts: number;
      posts: number;
    };
  }>;
}

export default function AdminPage() {
  const [data, setData] = useState<AdminOverviewDTO | null>(null);
  const [loading, setLoading] = useState(true);
  const [forbidden, setForbidden] = useState(false);

  useEffect(() => {
    void (async () => {
      try {
        const res = await fetch("/api/admin/overview");
        if (res.status === 401 || res.status === 403) {
          setForbidden(true);
          return;
        }
        if (res.ok) {
          setData((await res.json()) as AdminOverviewDTO);
        }
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 text-slate-500">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
        <span>Loading Founder Admin...</span>
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
      <div>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-semibold text-indigo-700">
          <ShieldCheck className="h-3.5 w-3.5" />
          Founder Console
        </span>
        <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-900">
          Cadence SaaS Admin & Infrastructure
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          Platform-wide customer metrics, OAuth provider health, and tenant usage.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-medium text-slate-500">Registered SaaS Users</p>
          <p className="mt-1 text-2xl font-bold text-slate-900">
            {data.metrics.totalUsers}
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-medium text-slate-500">
            Total Connected Channels
          </p>
          <p className="mt-1 text-2xl font-bold text-slate-900">
            {data.metrics.totalChannels}
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-medium text-slate-500">Total Posts Created</p>
          <p className="mt-1 text-2xl font-bold text-slate-900">
            {data.metrics.totalPosts}
          </p>
        </div>
      </div>

      {/* System & OAuth Diagnostics (moved out of customer UI) */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
          <Database className="h-4 w-4 text-indigo-600" />
          <span>System & OAuth Provider Configuration</span>
        </h2>

        <div className="mt-4 grid gap-4 text-xs sm:grid-cols-3">
          <div className="rounded-lg border border-slate-100 bg-slate-50 p-3.5">
            <p className="font-semibold text-slate-800">Google / YouTube OAuth</p>
            <p className="mt-1 flex items-center gap-1 text-emerald-700">
              <CheckCircle2 className="h-3.5 w-3.5" />
              {data.system.youtubeOAuthConfigured ? "Configured" : "Missing"}
            </p>
            <p className="mt-1 break-all text-slate-500">
              {data.system.youtubeRedirectUri}
            </p>
          </div>

          <div className="rounded-lg border border-slate-100 bg-slate-50 p-3.5">
            <p className="font-semibold text-slate-800">Meta / Instagram OAuth</p>
            <p className="mt-1 flex items-center gap-1 text-emerald-700">
              <CheckCircle2 className="h-3.5 w-3.5" />
              {data.system.instagramOAuthConfigured ? "Configured" : "Missing"}
            </p>
            <p className="mt-1 break-all text-slate-500">
              {data.system.instagramRedirectUri}
            </p>
          </div>

          <div className="rounded-lg border border-slate-100 bg-slate-50 p-3.5">
            <p className="font-semibold text-slate-800">Media Storage & Delivery</p>
            <p className="mt-1 font-medium text-slate-700">
              {data.system.storageKind === "s3"
                ? "Cloudflare R2 / S3"
                : "Local Disk + HTTPS Tunnel"}
            </p>
            <p className="mt-1 break-all text-slate-500">
              {data.system.publicMediaBaseUrl}
            </p>
          </div>
        </div>
      </div>

      {/* SaaS Tenants Table */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
          <Users className="h-4 w-4 text-indigo-600" />
          <span>SaaS Customers ({data.users.length})</span>
        </h2>

        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-xs text-slate-500">
                <th className="pb-2 font-medium">Customer</th>
                <th className="pb-2 font-medium">Plan</th>
                <th className="pb-2 font-medium">Connected Channels</th>
                <th className="pb-2 font-medium">Posts</th>
                <th className="pb-2 font-medium">Joined</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data.users.map((u) => (
                <tr key={u.id}>
                  <td className="py-3">
                    <p className="font-medium text-slate-900">{u.name}</p>
                    <p className="text-xs text-slate-500">{u.email}</p>
                  </td>
                  <td className="py-3">
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                        u.plan === "PRO"
                          ? "bg-indigo-50 text-indigo-700"
                          : "bg-slate-100 text-slate-700"
                      }`}
                    >
                      {u.plan}
                    </span>
                  </td>
                  <td className="py-3">{u._count.socialAccounts}</td>
                  <td className="py-3">{u._count.posts}</td>
                  <td className="py-3 text-xs text-slate-500">
                    {new Date(u.createdAt).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
