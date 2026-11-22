import type { MetadataRoute } from "next";
import { getAppUrl } from "@/lib/env";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = getAppUrl() || "https://cadences.in";
  const now = new Date();

  const routes: Array<{
    path: string;
    priority: number;
    changeFrequency:
      | "daily"
      | "weekly"
      | "monthly";
  }> = [
    { path: "", priority: 1.0, changeFrequency: "daily" },
    { path: "/pricing", priority: 0.9, changeFrequency: "weekly" },
    { path: "/guide", priority: 0.9, changeFrequency: "weekly" },
    { path: "/register", priority: 0.8, changeFrequency: "monthly" },
    { path: "/login", priority: 0.7, changeFrequency: "monthly" },
    { path: "/privacy", priority: 0.4, changeFrequency: "monthly" },
    { path: "/terms", priority: 0.4, changeFrequency: "monthly" },
    { path: "/data-deletion", priority: 0.3, changeFrequency: "monthly" },
  ];

  return routes.map((r) => ({
    url: `${base}${r.path}`,
    lastModified: now,
    changeFrequency: r.changeFrequency,
    priority: r.priority,
  }));
}
