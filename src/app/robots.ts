import type { MetadataRoute } from "next";
import { getAppUrl } from "@/lib/env";

export default function robots(): MetadataRoute.Robots {
  const base = getAppUrl() || "https://cadences.in";

  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/pricing", "/guide", "/register", "/login", "/privacy", "/terms"],
        disallow: ["/api/", "/admin"],
      },
    ],
    sitemap: `${base}/sitemap.xml`,
    host: base,
  };
}
