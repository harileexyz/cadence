import type { Metadata } from "next";
import { Footer } from "@/components/Footer";
import { NavBar } from "@/components/NavBar";
import "./globals.css";

export const metadata: Metadata = {
  title: "Cadence — Multi-Channel Social Publisher",
  description:
    "Schedule and cross-post across YouTube and Instagram with 6 free channels.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="flex min-h-screen flex-col antialiased">
        <NavBar />
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6">
          {children}
        </main>
        <Footer />
      </body>
    </html>
  );
}
