"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AlertCircle, Check, CheckCircle2, Crown, Loader2, Sparkles } from "lucide-react";
import { clearClientCache } from "@/lib/mobileCache";
import { PLAN_SPECS, type UserUsageSummary } from "@/lib/plans";

interface MeState {
  user: {
    id: string;
    email: string;
    name: string;
    plan: "FREE" | "PRO";
  } | null;
  usage: UserUsageSummary | null;
}

interface RazorpayCheckoutResponse {
  razorpay_payment_id: string;
  razorpay_order_id?: string;
  razorpay_subscription_id?: string;
  razorpay_signature: string;
}

function loadRazorpayScript(): Promise<boolean> {
  if (typeof window === "undefined") return Promise.resolve(false);
  if ((window as unknown as { Razorpay?: unknown }).Razorpay) {
    return Promise.resolve(true);
  }
  return new Promise((resolve) => {
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

export default function PricingPage() {
  const [me, setMe] = useState<MeState>({ user: null, usage: null });
  const [loading, setLoading] = useState(true);
  const [switching, setSwitching] = useState<string | null>(null);
  const [statusError, setStatusError] = useState<string | null>(null);
  const [statusSuccess, setStatusSuccess] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        if (typeof window !== "undefined") {
          const checkout = new URLSearchParams(window.location.search).get(
            "checkout"
          );
          if (checkout === "success") {
            clearClientCache();
            setStatusSuccess(
              "Payment received! Your Creator Pro plan is activating (refresh in a few seconds if not updated yet)."
            );
          }
        }
        const res = await fetch("/api/user/me");
        if (res.ok) {
          setMe((await res.json()) as MeState);
        }
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  async function switchPlan(targetPlan: "FREE" | "PRO") {
    setSwitching(targetPlan);
    setStatusError(null);
    setStatusSuccess(null);

    try {
      if (targetPlan === "PRO") {
        // 1. Primary billing provider: Dodo Payments hosted checkout (UPI + Global Cards)
        const dodoRes = await fetch("/api/billing/dodo/checkout", {
          method: "POST",
        });
        const dodoData = (await dodoRes.json()) as {
          checkoutUrl?: string;
          error?: string;
        };
        if (dodoRes.ok && dodoData.checkoutUrl) {
          window.location.assign(dodoData.checkoutUrl);
          return;
        }
        if (dodoRes.status !== 503) {
          throw new Error(dodoData.error || "Unable to start Dodo checkout.");
        }

        // 2. Secondary billing provider: Razorpay (if configured)
        const checkoutRes = await fetch("/api/billing/razorpay/checkout", {
          method: "POST",
        });
        const checkoutData = (await checkoutRes.json()) as {
          mode?: "order" | "subscription";
          keyId?: string;
          orderId?: string;
          subscriptionId?: string;
          amount?: number;
          currency?: string;
          name?: string;
          description?: string;
          prefill?: { name?: string; email?: string };
          error?: string;
        };

        if (checkoutRes.ok && checkoutData.keyId) {
          const loaded = await loadRazorpayScript();
          if (!loaded) {
            throw new Error("Could not load Razorpay Checkout. Check your internet connection.");
          }

          const RazorpayCtor = (
            window as unknown as {
              Razorpay: new (opts: Record<string, unknown>) => { open: () => void };
            }
          ).Razorpay;

          await new Promise<void>((resolve, reject) => {
            const rzp = new RazorpayCtor({
              key: checkoutData.keyId,
              ...(checkoutData.mode === "subscription"
                ? { subscription_id: checkoutData.subscriptionId }
                : {
                    order_id: checkoutData.orderId,
                    amount: checkoutData.amount,
                    currency: checkoutData.currency,
                  }),
              name: checkoutData.name || "Cadence",
              description: checkoutData.description || "Creator Pro Plan",
              prefill: checkoutData.prefill,
              theme: { color: "#4f46e5" },
              modal: {
                ondismiss: () => resolve(),
              },
              handler: async (response: RazorpayCheckoutResponse) => {
                try {
                  const verifyRes = await fetch("/api/billing/razorpay/verify", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(response),
                  });
                  const verifyData = (await verifyRes.json()) as MeState & {
                    error?: string;
                  };
                  if (!verifyRes.ok) {
                    throw new Error(
                      verifyData.error || "Payment verification failed."
                    );
                  }
                  clearClientCache();
                  setMe({ user: verifyData.user, usage: verifyData.usage });
                  setStatusSuccess(
                    "Welcome to Creator Pro! Unlimited channels and posts are now active."
                  );
                  resolve();
                } catch (err) {
                  reject(err);
                }
              },
            });
            rzp.open();
          });
          return;
        }

        // Fallback to /api/user/plan only for Founder / Beta Tester accounts if Razorpay isn't configured yet
        if (checkoutRes.status !== 503) {
          throw new Error(checkoutData.error || "Unable to start checkout.");
        }
      }

      const res = await fetch("/api/user/plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: targetPlan }),
      });
      const data = (await res.json()) as MeState & { error?: string };
      if (!res.ok) {
        throw new Error(data.error || "Unable to update plan.");
      }
      clearClientCache();
      setMe({ user: data.user, usage: data.usage });
      setStatusSuccess(
        targetPlan === "PRO"
          ? "Creator Pro activated!"
          : "Switched back to Generous Free."
      );
    } catch (err) {
      setStatusError(
        err instanceof Error ? err.message : "Failed to process plan change."
      );
    } finally {
      setSwitching(null);
    }
  }

  const currentPlan = me.user?.plan;
  const usage = me.usage;

  return (
    <div className="mx-auto max-w-4xl space-y-8 py-4">
      <div className="text-center">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700">
          <Sparkles className="h-3.5 w-3.5" />
          <span>6 Free Connected Channels Forever</span>
        </span>
        <h1 className="mt-3 text-3xl font-bold tracking-tight text-slate-900">
          Simple, Creator-Friendly Pricing
        </h1>
        <p className="mt-2 text-sm text-slate-600">
          Connect up to 6 channels free forever, or unlock unlimited channels and posts with Creator Pro.
        </p>
      </div>

      {statusError && (
        <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{statusError}</span>
        </div>
      )}

      {statusSuccess && (
        <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span>{statusSuccess}</span>
        </div>
      )}

      {me.user && usage && (
        <div className="rounded-2xl border border-indigo-100 bg-indigo-50/50 p-5">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-indigo-700">
                Your Active Plan ({me.user.email})
              </p>
              <p className="mt-1 text-lg font-bold text-slate-900">
                {usage.plan.name}
              </p>
            </div>
            <div className="flex flex-wrap gap-6 text-sm">
              <div>
                <p className="text-xs text-slate-500">Connected Channels</p>
                <p className="font-semibold text-slate-900">
                  {usage.connectedChannels} /{" "}
                  {usage.plan.maxChannels ?? "Unlimited"}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Posts This Month</p>
                <p className="font-semibold text-slate-900">
                  {usage.postsThisMonth} /{" "}
                  {usage.plan.maxPostsPerMonth ?? "Unlimited"}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        {(["FREE", "PRO"] as const).map((tierKey) => {
          const spec = PLAN_SPECS[tierKey];
          const isPro = tierKey === "PRO";
          const isCurrent = currentPlan === tierKey;

          return (
            <div
              key={tierKey}
              className={`flex flex-col justify-between rounded-2xl border p-7 shadow-sm ${
                isPro
                  ? "border-indigo-600 bg-white ring-2 ring-indigo-600"
                  : "border-slate-200 bg-white"
              }`}
            >
              <div>
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-bold text-slate-900">
                    {spec.name}
                  </h2>
                  {isPro && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-indigo-600 px-2.5 py-0.5 text-xs font-medium text-white">
                      <Crown className="h-3 w-3" />
                      Most Popular
                    </span>
                  )}
                </div>

                <div className="mt-4 flex items-baseline gap-1">
                  <span className="text-4xl font-extrabold text-slate-900">
                    ${spec.priceMonthlyUsd}
                  </span>
                  <span className="text-sm text-slate-500">/ month</span>
                </div>

                <ul className="mt-6 space-y-3 text-sm text-slate-700">
                  {spec.features.map((feat) => (
                    <li key={feat} className="flex items-start gap-2.5">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                      <span>{feat}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="mt-8">
                {loading ? (
                  <div className="flex justify-center py-2">
                    <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
                  </div>
                ) : !me.user ? (
                  <Link
                    href="/register"
                    className={`flex w-full items-center justify-center rounded-xl px-4 py-2.5 text-sm font-semibold ${
                      isPro
                        ? "bg-indigo-600 text-white hover:bg-indigo-700"
                        : "border border-slate-300 bg-white text-slate-800 hover:bg-slate-50"
                    }`}
                  >
                    {isPro ? "Start Creator Pro" : "Start Free (6 Channels)"}
                  </Link>
                ) : isCurrent ? (
                  <div className="rounded-xl bg-slate-100 py-2.5 text-center text-sm font-semibold text-slate-600">
                    Current Plan
                  </div>
                ) : (
                  <button
                    type="button"
                    disabled={switching !== null}
                    onClick={() => void switchPlan(tierKey)}
                    className={`flex w-full items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition ${
                      isPro
                        ? "bg-indigo-600 text-white hover:bg-indigo-700"
                        : "border border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    {switching === tierKey && (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    )}
                    <span>
                      {isPro
                        ? "Upgrade to Creator Pro"
                        : "Switch to Generous Free"}
                    </span>
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
