export default function PrivacyPolicyPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-6 rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Privacy Policy</h1>
        <p className="mt-1 text-xs text-slate-500">
          Effective Date: November 18, 2026
        </p>
      </div>

      <section className="space-y-2 text-sm text-slate-700">
        <h2 className="font-semibold text-slate-900">
          1. Information We Collect
        </h2>
        <p>
          Cadence collects your account email, name, and the OAuth access and
          refresh tokens granted when you explicitly connect your YouTube channels
          or Instagram Professional accounts.
        </p>
      </section>

      <section className="space-y-2 text-sm text-slate-700">
        <h2 className="font-semibold text-slate-900">
          2. How We Use Google & Meta User Data
        </h2>
        <p>
          We use your Google (YouTube Data API v3) and Meta (Instagram Graph API)
          permissions strictly to display your connected channel names and publish
          or schedule videos, images, captions, thumbnails, and comments that you
          explicitly submit in the Composer.
        </p>
        <p>
          Cadence&apos;s use and transfer of information received from Google APIs
          adheres to the{" "}
          <a
            href="https://developers.google.com/terms/api-services-user-data-policy"
            target="_blank"
            rel="noreferrer"
            className="text-indigo-600 underline"
          >
            Google API Services User Data Policy
          </a>
          , including the Limited Use requirements.
        </p>
      </section>

      <section className="space-y-2 text-sm text-slate-700">
        <h2 className="font-semibold text-slate-900">
          3. Token Security & Media Retention
        </h2>
        <p>
          All OAuth access tokens and refresh tokens are encrypted at rest using
          AES-256-GCM before being stored in our database. Uploaded media files
          are automatically purged from storage once scheduled posts have been
          published across all selected target channels.
        </p>
      </section>

      <section className="space-y-2 text-sm text-slate-700">
        <h2 className="font-semibold text-slate-900">
          4. Revoking Access & Data Deletion
        </h2>
        <p>
          You can disconnect any YouTube or Instagram channel at any time from the{" "}
          <a href="/accounts" className="text-indigo-600 underline">
            Connected Channels
          </a>{" "}
          page, or follow our{" "}
          <a href="/data-deletion" className="text-indigo-600 underline">
            Data Deletion Instructions
          </a>
          .
        </p>
      </section>
    </div>
  );
}
