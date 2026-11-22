"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import {
  BarChart3,
  BookOpen,
  CalendarClock,
  CreditCard,
  Layers,
  LogOut,
  PenSquare,
  ShieldCheck,
  Sparkles,
  UserCircle2,
  Users,
} from "lucide-react";
import { Footer } from "@/components/Footer";

interface UserMeResponse {
  user: {
    id: string;
    email: string;
    name: string;
    plan: "FREE" | "PRO";
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

const WORKSPACE_NAV = [
  { href: "/", label: "Publishing Queue", icon: CalendarClock },
  { href: "/compose", label: "Compose", icon: PenSquare },
  { href: "/engagement", label: "Engagement", icon: BarChart3 },
  { href: "/accounts", label: "Channels", icon: Users },
];

const ACCOUNT_NAV = [
  { href: "/guide", label: "Help & Guide", icon: BookOpen },
  { href: "/pricing", label: "Plan & Billing", icon: CreditCard },
  { href: "/profile", label: "Profile & Settings", icon: UserCircle2 },
];

const MOBILE_TAB_ITEMS = [
  { href: "/", label: "Queue", icon: CalendarClock },
  { href: "/compose", label: "Post", icon: PenSquare },
  { href: "/engagement", label: "Stats", icon: BarChart3 },
  { href: "/accounts", label: "Channels", icon: Users },
  { href: "/profile", label: "Profile", icon: UserCircle2 },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [me, setMe] = useState<UserMeResponse | null>(null);
  const [banner, setBanner] = useState<{
    enabled: boolean;
    message: string;
    tone: "info" | "success" | "warn";
  } | null>(null);

  const loadMe = useCallback(async () => {
    try {
      const [meRes, annRes] = await Promise.all([
        fetch("/api/user/me"),
        fetch("/api/system/announcement"),
      ]);
      if (meRes.ok) {
        const data = (await meRes.json()) as UserMeResponse;
        setMe(data);
      }
      if (annRes.ok) {
        const ann = (await annRes.json()) as {
          banner?: {
            enabled: boolean;
            message: string;
            tone: "info" | "success" | "warn";
          };
        };
        setBanner(ann.banner ?? null);
      }
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    void loadMe();
  }, [loadMe, pathname]);

  async function handleLogout() {
    await fetch("/api/user/logout", { method: "POST" });
    setMe({ user: null, usage: null });
    router.push("/login");
    router.refresh();
  }

  const user = me?.user;
  const usage = me?.usage;
  const isFounder = user?.email.toLowerCase() === "leehari007@gmail.com";
  const initials =
    user?.name
      .split(" ")
      .map((p) => p[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "U";

  const isAuthPage = pathname === "/login" || pathname === "/register";

  // Dedicated clean centered layout for Sign In / Register (no marketing navbar or footer clutter)
  if (isAuthPage) {
    return (
      <div className="flex min-h-screen flex-col justify-center bg-slate-50 px-4 py-8">
        <main className="mx-auto w-full max-w-md">{children}</main>
      </div>
    );
  }

  // Logged-out layout: clean public SaaS top bar + wide centered landing canvas
  if (!user) {
    return (
      <div className="flex min-h-screen flex-col">
        <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur">
          <div className="mx-auto flex h-16 w-full max-w-[1720px] items-center justify-between px-4 sm:px-6 lg:px-10">
            <div className="flex items-center gap-6">
              <Link
                href="/"
                className="flex items-center gap-2.5 font-semibold text-slate-900"
              >
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 text-white">
                  <Layers className="h-4 w-4" />
                </span>
                <span className="text-base tracking-tight">Cadence</span>
                <span className="hidden rounded-full bg-indigo-50 px-2 py-0.5 text-[11px] font-medium text-indigo-700 sm:inline-block">
                  6 Free Channels
                </span>
              </Link>

              <nav className="hidden items-center gap-5 text-sm font-medium text-slate-600 md:flex">
                <Link href="/#features" className="hover:text-slate-900">
                  Features
                </Link>
                <Link href="/#compare" className="hover:text-slate-900">
                  Compare
                </Link>
                <Link href="/pricing" className="hover:text-slate-900">
                  Pricing
                </Link>
                <Link href="/guide" className="hover:text-slate-900">
                  Guide
                </Link>
                <Link href="/privacy" className="hover:text-slate-900">
                  Privacy
                </Link>
              </nav>
            </div>

            <div className="flex items-center gap-2">
              <Link
                href="/login"
                className="rounded-lg px-3.5 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
              >
                Log in
              </Link>
              <Link
                href="/register"
                className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3.5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700"
              >
                <span>Start Free</span>
              </Link>
            </div>
          </div>
        </header>

        <main className="mx-auto w-full max-w-[1720px] flex-1 px-3 py-3 sm:px-6 sm:py-4 lg:px-10">
          {children}
        </main>
        <Footer />
      </div>
    );
  }

  const maxChannels = usage?.plan.maxChannels ?? 6;
  const usedChannels = usage?.connectedChannels ?? 0;
  const quotaPct =
    usage?.plan.maxChannels === null
      ? 25
      : Math.min(100, Math.round((usedChannels / maxChannels) * 100));

  // Authenticated SaaS App Shell: Fixed Left Sidebar on Desktop + Bottom Tab Bar on Mobile
  return (
    <div className="flex min-h-screen bg-slate-50">
      {/* Desktop Fixed Left Sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 flex-col border-r border-slate-200 bg-white md:flex">
        {/* Brand Header */}
        <div className="flex h-16 items-center justify-between border-b border-slate-100 px-5">
          <Link
            href="/"
            className="flex items-center gap-2.5 font-semibold text-slate-900"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 text-white shadow-2xs">
              <Layers className="h-4 w-4" />
            </span>
            <span className="text-base font-bold tracking-tight">Cadence</span>
          </Link>
          <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-[10px] font-semibold text-indigo-700">
            {user.plan === "PRO" ? "PRO" : "FREE"}
          </span>
        </div>

        {/* Primary Action CTA */}
        <div className="px-4 pt-4">
          <Link
            href="/compose"
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700"
          >
            <PenSquare className="h-4 w-4" />
            <span>New Post</span>
          </Link>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 space-y-6 overflow-y-auto px-3 py-5">
          <div>
            <p className="px-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              Workspace
            </p>
            <div className="mt-2 space-y-1">
              {WORKSPACE_NAV.map((item) => {
                const Icon = item.icon;
                const isActive =
                  item.href === "/"
                    ? pathname === "/"
                    : pathname.startsWith(item.href);

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                      isActive
                        ? "bg-indigo-50 text-indigo-700"
                        : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                    }`}
                  >
                    <Icon
                      className={`h-4 w-4 shrink-0 ${
                        isActive ? "text-indigo-600" : "text-slate-400"
                      }`}
                    />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </div>
          </div>

          <div>
            <p className="px-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              Account
            </p>
            <div className="mt-2 space-y-1">
              {ACCOUNT_NAV.map((item) => {
                const Icon = item.icon;
                const isActive = pathname.startsWith(item.href);

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                      isActive
                        ? "bg-indigo-50 text-indigo-700"
                        : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                    }`}
                  >
                    <Icon
                      className={`h-4 w-4 shrink-0 ${
                        isActive ? "text-indigo-600" : "text-slate-400"
                      }`}
                    />
                    <span>{item.label}</span>
                  </Link>
                );
              })}

              {isFounder && (
                <Link
                  href="/admin"
                  className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                    pathname.startsWith("/admin")
                      ? "bg-indigo-50 text-indigo-700"
                      : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                  }`}
                >
                  <ShieldCheck
                    className={`h-4 w-4 shrink-0 ${
                      pathname.startsWith("/admin")
                        ? "text-indigo-600"
                        : "text-slate-400"
                    }`}
                  />
                  <span>Admin Console</span>
                </Link>
              )}
            </div>
          </div>
        </nav>

        {/* Bottom Quota Card + User Profile Row */}
        <div className="space-y-3 border-t border-slate-100 p-3">
          {usage && (
            <Link
              href="/pricing"
              className="block rounded-xl border border-slate-200 bg-slate-50 p-3 transition hover:border-indigo-200 hover:bg-indigo-50/40"
            >
              <div className="flex items-center justify-between text-xs font-semibold text-slate-800">
                <span className="flex items-center gap-1">
                  <Sparkles className="h-3.5 w-3.5 text-indigo-600" />
                  {usage.plan.name}
                </span>
                <span className="text-indigo-600">
                  {usage.plan.maxChannels === null
                    ? `${usedChannels} ch`
                    : `${usedChannels}/${usage.plan.maxChannels}`}
                </span>
              </div>
              <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-200">
                <div
                  className="h-full rounded-full bg-indigo-600"
                  style={{ width: `${quotaPct}%` }}
                />
              </div>
              {user.plan === "FREE" && (
                <p className="mt-1.5 text-[11px] font-medium text-indigo-600">
                  Upgrade to Unlimited →
                </p>
              )}
            </Link>
          )}

          <div className="flex items-center justify-between gap-2 rounded-xl px-2 py-1.5">
            <Link
              href="/profile"
              className="flex min-w-0 items-center gap-2.5 hover:opacity-85"
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-xs font-bold text-white">
                {initials}
              </span>
              <div className="min-w-0">
                <p className="truncate text-xs font-semibold text-slate-900">
                  {user.name}
                </p>
                <p className="truncate text-[11px] text-slate-500">
                  {user.email}
                </p>
              </div>
            </Link>
            <button
              type="button"
              title="Log out"
              onClick={() => void handleLogout()}
              className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Column (shifted right by w-60 on desktop) */}
      <div className="flex min-h-screen flex-1 flex-col md:pl-60">
        {/* Compact Mobile Top Header (md:hidden) */}
        <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-slate-200 bg-white/95 px-4 backdrop-blur md:hidden">
          <Link
            href="/"
            className="flex items-center gap-2 font-semibold text-slate-900"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 text-white">
              <Layers className="h-4 w-4" />
            </span>
            <span className="text-base font-bold tracking-tight">Cadence</span>
          </Link>

          <div className="flex items-center gap-2">
            <Link
              href="/guide"
              title="Help & Guide"
              className="flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-slate-50 text-slate-600 hover:bg-indigo-50 hover:text-indigo-700"
            >
              <BookOpen className="h-4 w-4" />
            </Link>
            {usage && (
              <Link
                href="/pricing"
                className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-medium text-slate-700"
              >
                <Sparkles className="h-3 w-3 text-indigo-600" />
                <span>
                  {user.plan === "PRO"
                    ? `Pro · ${usedChannels}`
                    : `${usedChannels}/${usage.plan.maxChannels}`}
                </span>
              </Link>
            )}
            <Link
              href="/profile"
              className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-600 text-xs font-bold text-white"
            >
              {initials}
            </Link>
          </div>
        </header>

        <main className="mx-auto w-full max-w-[1720px] flex-1 px-3 py-5 pb-24 sm:px-5 md:px-6 md:py-6 md:pb-8 lg:px-8">
          {banner?.enabled && banner.message && (
            <div
              className={`mb-5 rounded-xl border px-4 py-2.5 text-xs font-medium ${
                banner.tone === "warn"
                  ? "border-amber-200 bg-amber-50 text-amber-900"
                  : banner.tone === "success"
                    ? "border-emerald-200 bg-emerald-50 text-emerald-900"
                    : "border-indigo-200 bg-indigo-50 text-indigo-900"
              }`}
            >
              {banner.message}
            </div>
          )}
          {children}
        </main>
        <Footer />
      </div>

      {/* Mobile Native-Style Bottom Tab Navigation Bar */}
      <nav
        aria-label="Mobile Navigation"
        className="safe-area-pb fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 backdrop-blur md:hidden"
      >
        <div className="grid h-16 grid-cols-5">
          {MOBILE_TAB_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive =
              item.href === "/"
                ? pathname === "/"
                : pathname.startsWith(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex flex-col items-center justify-center gap-1 text-[11px] font-medium transition ${
                  isActive
                    ? "text-indigo-600"
                    : "text-slate-500 active:text-slate-900"
                }`}
              >
                <span
                  className={`flex h-7 w-11 items-center justify-center rounded-full transition ${
                    isActive ? "bg-indigo-50" : ""
                  }`}
                >
                  <Icon className="h-5 w-5" />
                </span>
                <span>{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
