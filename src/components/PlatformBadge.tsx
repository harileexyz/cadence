import { Instagram, Youtube } from "lucide-react";

export function PlatformBadge({
  platform,
  size = "sm",
}: {
  platform: "YOUTUBE" | "INSTAGRAM";
  size?: "sm" | "md";
}) {
  const iconCls = size === "md" ? "h-4 w-4" : "h-3.5 w-3.5";

  if (platform === "YOUTUBE") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2.5 py-0.5 text-xs font-medium text-red-700 ring-1 ring-inset ring-red-200">
        <Youtube className={iconCls} />
        <span>YouTube</span>
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-pink-50 px-2.5 py-0.5 text-xs font-medium text-pink-700 ring-1 ring-inset ring-pink-200">
      <Instagram className={iconCls} />
      <span>Instagram</span>
    </span>
  );
}
