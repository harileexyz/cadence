import type { Metadata, Viewport } from "next";
import { AppShell } from "@/components/AppShell";
import "./globals.css";

export const metadata: Metadata = {
  title: "Cadence — Multi-Channel Social Publisher",
  description:
    "Schedule and cross-post across YouTube and Instagram with 6 free channels.",
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
