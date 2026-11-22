import Link from "next/link";

export function Footer() {
  return (
    <footer className="mt-12 border-t border-slate-200 bg-white py-8 pb-24 md:mt-16 md:pb-8">
      <div className="mx-auto flex max-w-[1440px] flex-col items-center justify-between gap-4 px-4 text-xs text-slate-500 sm:flex-row sm:px-6">
        <p>© {new Date().getFullYear()} Cadence. Cross-post & schedule across YouTube and Instagram.</p>
        <div className="flex flex-wrap items-center gap-5">
          <Link href="/pricing" className="hover:text-slate-900">
            Pricing
          </Link>
          <Link href="/privacy" className="hover:text-slate-900">
            Privacy Policy
          </Link>
          <Link href="/terms" className="hover:text-slate-900">
            Terms of Service
          </Link>
          <Link href="/data-deletion" className="hover:text-slate-900">
            Data Deletion
          </Link>
        </div>
      </div>
    </footer>
  );
}
