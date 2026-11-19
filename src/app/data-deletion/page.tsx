export default function DataDeletionPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-6 rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">
          User Data Deletion Instructions
        </h1>
        <p className="mt-1 text-xs text-slate-500">
          Required for Meta App Review & Google OAuth Compliance
        </p>
      </div>

      <section className="space-y-3 text-sm text-slate-700">
        <h2 className="font-semibold text-slate-900">
          How to Delete Your Connected Channels & Data
        </h2>
        <ol className="list-decimal space-y-2 pl-5">
          <li>
            Sign in to your Cadence account and navigate to{" "}
            <a href="/accounts" className="text-indigo-600 underline">
              Connected Channels (/accounts)
            </a>
            .
          </li>
          <li>
            Click the <strong>Disconnect (Trash)</strong> button next to any
            YouTube channel or Instagram account. This immediately deletes your
            encrypted OAuth tokens and associated scheduled targets from our
            PostgreSQL database.
          </li>
          <li>
            To revoke access directly from Google or Instagram:
            <ul className="mt-1 list-disc pl-5">
              <li>
                <strong>Google / YouTube:</strong> Visit{" "}
                <a
                  href="https://myaccount.google.com/permissions"
                  target="_blank"
                  rel="noreferrer"
                  className="text-indigo-600 underline"
                >
                  myaccount.google.com/permissions
                </a>{" "}
                and remove Cadence.
              </li>
              <li>
                <strong>Instagram / Meta:</strong> Visit Instagram Settings →
                Website Permissions → Apps and Websites, and remove Cadence.
              </li>
            </ul>
          </li>
        </ol>
      </section>
    </div>
  );
}
