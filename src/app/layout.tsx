import type { Metadata, Viewport } from "next";
import { AppShell } from "@/components/AppShell";
import "./globals.css";

const SITE_URL = process.env.APP_URL || "https://cadences.in";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default:
      "Cadence — Cross-Post & Schedule YouTube Shorts and Instagram Reels (6 Free Channels)",
    template: "%s | Cadence",
  },
  description:
    "Connect up to 6 YouTube and Instagram channels free (2× Buffer's free limit). Upload once, scrub Reel cover frames visually, customize per-channel Studio settings, compare Shorts vs. Reels analytics side-by-side, reply to comments in one inbox, and automate drafts via REST API.",
  applicationName: "Cadence",
  keywords: [
    "Cadence",
    "cadences.in",
    "social media scheduler",
    "YouTube Shorts scheduler",
    "Instagram Reels scheduler",
    "Buffer alternative",
    "cross-post YouTube Shorts and Instagram Reels",
    "multi-channel social publisher",
    "free social media scheduler 6 channels",
    "social media analytics dashboard",
    "unified comment inbox YouTube Instagram",
    "video scheduling REST API",
  ],
  authors: [{ name: "Cadence Studio", url: SITE_URL }],
  creator: "Cadence Studio",
  publisher: "Cadence Studio",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: SITE_URL,
    siteName: "Cadence",
    title:
      "Cadence — Cross-Post YouTube Shorts & Instagram Reels in One Click",
    description:
      "Connect 6 YouTube & Instagram channels free forever (2× Buffer). Visual Reel cover scrubber, per-channel Studio presets, side-by-side Shorts vs. Reels comparison, unified comment reply inbox & Draft REST API.",
  },
  twitter: {
    card: "summary_large_image",
    title:
      "Cadence — Cross-Post YouTube Shorts & Instagram Reels (6 Free Channels)",
    description:
      "Stop hitting 3-channel walls. Upload once, customize YouTube Studio & Instagram Reels settings per handle, compare Shorts vs. Reels analytics, and reply to all comments in one place.",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Cadence",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#4f46e5",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="min-h-screen overflow-x-hidden antialiased">
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
