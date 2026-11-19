"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import {
  CalendarClock,
  CreditCard,
  Layers,
  LogOut,
  PenSquare,
  Sparkles,
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
  { href: "/accounts", label: "Channels", icon: Users },
  { href: "/pricing", label: "Plan & Billing", icon: CreditCard },
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

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <div className="flex items-center gap-6">
          <Link
            href="/"
            className="flex items-center gap-2.5 font-semibold text-slate-900"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 text-white">
              <Layers className="h-4 w-4" />
            </span>
            <span className="text-base tracking-tight">Cadence</span>
            <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-[11px] font-medium text-indigo-700">
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
              {user.email.toLowerCase() === "leehari007@gmail.com" && (
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

        <div className="flex items-center gap-2.5">
          {user && usage ? (
            <>
              <Link
                href="/pricing"
                className="hidden items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100 sm:inline-flex"
              >
                <Sparkles className="h-3.5 w-3.5 text-indigo-600" />
                <span>
                  {user.plan === "PRO"
                    ? `Pro · ${usage.connectedChannels} channels`
                    : `Free · ${usage.connectedChannels}/${usage.plan.maxChannels} channels`}
                </span>
              </Link>

              <Link
                href="/compose"
                className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-3.5 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-indigo-700"
              >
                <PenSquare className="h-4 w-4" />
                <span className="hidden sm:inline">New Post</span>
              </Link>

              <button
                type="button"
                title={`Signed in as ${user.email} — Log out`}
                onClick={() => void handleLogout()}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-900"
              >
                <LogOut className="h-4 w-4" />
                <span className="hidden lg:inline">Log out</span>
              </button>
            </>
          ) : (
            <>
              <Link
                href="/login"
                className="rounded-lg px-3.5 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
              >
                Log in
              </Link>
              <Link
                href="/register"
                className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3.5 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700"
              >
                <span>Start Free (6 Channels)</span>
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
