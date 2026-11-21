import type { Metadata, Viewport } from "next";
import { Footer } from "@/components/Footer";
import { NavBar } from "@/components/NavBar";
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
      <body className="flex min-h-screen flex-col overflow-x-hidden antialiased">
        <NavBar />
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 pb-24 sm:px-6 md:py-8 md:pb-8">
          {children}
        </main>
        <Footer />
      </body>
    </html>
  );
}
