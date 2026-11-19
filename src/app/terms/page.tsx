export default function TermsOfServicePage() {
  return (
    <div className="mx-auto max-w-3xl space-y-6 rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Terms of Service</h1>
        <p className="mt-1 text-xs text-slate-500">
          Effective Date: November 18, 2026
        </p>
      </div>

      <section className="space-y-2 text-sm text-slate-700">
        <h2 className="font-semibold text-slate-900">1. Acceptance of Terms</h2>
        <p>
          By creating an account and using Cadence, you agree to comply with
          these Terms of Service, the{" "}
          <a
            href="https://www.youtube.com/t/terms"
            target="_blank"
            rel="noreferrer"
            className="text-indigo-600 underline"
          >
            YouTube Terms of Service
          </a>
          , and the{" "}
          <a
            href="https://help.instagram.com/581066165581870"
            target="_blank"
            rel="noreferrer"
            className="text-indigo-600 underline"
          >
            Instagram Terms of Use
          </a>
          .
        </p>
      </section>

      <section className="space-y-2 text-sm text-slate-700">
        <h2 className="font-semibold text-slate-900">2. Content Responsibility</h2>
        <p>
          You retain full ownership of all videos, images, titles, and captions you
          upload and schedule through Cadence. You are solely responsible for
          ensuring your content complies with each destination platform&apos;s
          community guidelines and copyright policies.
        </p>
      </section>

      <section className="space-y-2 text-sm text-slate-700">
        <h2 className="font-semibold text-slate-900">3. Service Tiers & Quotas</h2>
        <p>
          The Free tier includes up to 6 connected social channels and 30 posts
          per month. Creator Pro unlocks unlimited channels and scheduled posts.
          Publishing remains subject to upstream platform API rate limits.
        </p>
      </section>
    </div>
  );
}
