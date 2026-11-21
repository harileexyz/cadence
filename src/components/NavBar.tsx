"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import {
  BarChart3,
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

const AUTH_NAV_ITEMS = [
  { href: "/", label: "Queue", icon: CalendarClock },
  { href: "/compose", label: "Compose", icon: PenSquare },
  { href: "/engagement", label: "Engagement", icon: BarChart3 },
  { href: "/accounts", label: "Channels", icon: Users },
  { href: "/pricing", label: "Plan & Billing", icon: CreditCard },
];

const MOBILE_TAB_ITEMS = [
  { href: "/", label: "Queue", icon: CalendarClock },
  { href: "/compose", label: "Post", icon: PenSquare },
  { href: "/engagement", label: "Stats", icon: BarChart3 },
  { href: "/accounts", label: "Channels", icon: Users },
  { href: "/profile", label: "Profile", icon: UserCircle2 },
];

export function NavBar() {
  const pathname = usePathname();
  const router = useRouter();
  const [me, setMe] = useState<UserMeResponse | null>(null);

  const loadMe = useCallback(async () => {
    try {
      const res = await fetch("/api/user/me");
      if (res.ok) {
        const data = (await res.json()) as UserMeResponse;
        setMe(data);
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

  return (
    <>
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-2 px-4 sm:h-16 sm:px-6">
          <div className="flex min-w-0 items-center gap-5">
            <Link
              href="/"
              className="flex shrink-0 items-center gap-2 font-semibold text-slate-900"
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 text-white">
                <Layers className="h-4 w-4" />
              </span>
              <span className="text-base tracking-tight">Cadence</span>
              <span className="hidden rounded-full bg-indigo-50 px-2 py-0.5 text-[11px] font-medium text-indigo-700 sm:inline-block">
                {user?.plan === "PRO" ? "Creator Pro" : "6 Free Channels"}
              </span>
            </Link>

            {user ? (
              <nav className="hidden items-center gap-1 md:flex">
                {AUTH_NAV_ITEMS.map((item) => {
                  const Icon = item.icon;
                  const isActive =
                    item.href === "/"
                      ? pathname === "/"
                      : pathname.startsWith(item.href);

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition ${
                        isActive
                          ? "bg-slate-100 text-slate-900"
                          : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                      <span>{item.label}</span>
                    </Link>
                  );
                })}
                {isFounder && (
                  <Link
                    href="/admin"
                    className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition ${
                      pathname.startsWith("/admin")
                        ? "bg-slate-100 text-slate-900"
                        : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                    }`}
                  >
                    <span>Admin</span>
                  </Link>
                )}
              </nav>
            ) : (
              <nav className="hidden items-center gap-4 text-sm font-medium text-slate-600 md:flex">
                <Link href="/pricing" className="hover:text-slate-900">
                  Pricing
                </Link>
                <Link href="/privacy" className="hover:text-slate-900">
                  Privacy
                </Link>
                <Link href="/terms" className="hover:text-slate-900">
                  Terms
                </Link>
              </nav>
            )}
          </div>

          <div className="flex shrink-0 items-center gap-2">
            {user && usage ? (
              <>
                <Link
                  href="/pricing"
                  className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-medium text-slate-700 hover:bg-slate-100 sm:text-xs"
                >
                  <Sparkles className="h-3 w-3 text-indigo-600 sm:h-3.5 sm:w-3.5" />
                  <span>
                    {user.plan === "PRO"
                      ? `Pro · ${usage.connectedChannels}`
                      : `${usage.connectedChannels}/${usage.plan.maxChannels}`}
                  </span>
                </Link>

                {isFounder && (
                  <Link
                    href="/admin"
                    title="Founder Admin"
                    className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 md:hidden"
                  >
                    <ShieldCheck className="h-4 w-4" />
                  </Link>
                )}

                <Link
                  href="/compose"
                  className="hidden items-center gap-2 rounded-lg bg-indigo-600 px-3.5 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-indigo-700 md:inline-flex"
                >
                  <PenSquare className="h-4 w-4" />
                  <span>New Post</span>
                </Link>

                <Link
                  href="/profile"
                  title={`Profile (${user.email})`}
                  className={`inline-flex h-9 w-9 items-center justify-center rounded-full text-xs font-bold transition ${
                    pathname.startsWith("/profile")
                      ? "bg-indigo-600 text-white ring-2 ring-indigo-200"
                      : "bg-indigo-50 text-indigo-700 hover:bg-indigo-100"
                  }`}
                >
                  {user.name
                    .split(" ")
                    .map((p) => p[0])
                    .join("")
                    .slice(0, 2)
                    .toUpperCase() || "U"}
                </Link>

                <button
                  type="button"
                  title={`Signed in as ${user.email} — Log out`}
                  onClick={() => void handleLogout()}
                  className="hidden h-9 items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-900 sm:inline-flex"
                >
                  <LogOut className="h-4 w-4" />
                  <span className="hidden lg:inline">Log out</span>
                </button>
              </>
            ) : (
              <>
                <Link
                  href="/login"
                  className="rounded-lg px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100 sm:text-sm"
                >
                  Log in
                </Link>
                <Link
                  href="/register"
                  className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-2 text-xs font-semibold text-white shadow-sm hover:bg-indigo-700 sm:px-3.5 sm:text-sm"
                >
                  <span>Start Free</span>
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Mobile Native-Style Bottom Tab Navigation Bar */}
      {user && (
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
      )}
    </>
  );
}
