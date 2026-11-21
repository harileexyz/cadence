import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Cadence — Multi-Channel Social Publisher",
    short_name: "Cadence",
    description:
      "Schedule, cross-post, and track engagement across YouTube and Instagram from one place.",
    start_url: "/",
    display: "standalone",
    background_color: "#f8fafc",
    theme_color: "#4f46e5",
  };
}
