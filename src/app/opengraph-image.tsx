import { ImageResponse } from "next/og";

export const alt =
  "Cadence — Cross-Post & Schedule YouTube Shorts and Instagram Reels (6 Free Channels)";
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "64px 72px",
          background:
            "linear-gradient(135deg, #0f172a 0%, #1e1b4b 55%, #311042 100%)",
          color: "#ffffff",
          fontFamily: "sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
            <div
              style={{
                width: 56,
                height: 56,
                borderRadius: 16,
                background:
                  "linear-gradient(135deg, #4f46e5 0%, #db2777 100%)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 32,
                fontWeight: 800,
              }}
            >
              C
            </div>
            <span style={{ fontSize: 36, fontWeight: 800, letterSpacing: -1 }}>
              Cadence
            </span>
          </div>

          <div
            style={{
              padding: "10px 22px",
              borderRadius: 999,
              background: "rgba(99, 102, 241, 0.22)",
              border: "1px solid rgba(165, 180, 252, 0.35)",
              color: "#c7d2fe",
              fontSize: 22,
              fontWeight: 700,
            }}
          >
            6 Channels Free Forever · Multi-Brand Studio
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <div
            style={{
              fontSize: 66,
              fontWeight: 800,
              lineHeight: 1.08,
              letterSpacing: -2,
              maxWidth: 980,
            }}
          >
            Cross-post YouTube Shorts & Instagram Reels in one click.
          </div>
          <div
            style={{
              fontSize: 28,
              color: "#cbd5e1",
              maxWidth: 920,
              lineHeight: 1.4,
            }}
          >
            Visual Reel cover scrubber, per-channel Studio presets, side-by-side Shorts vs. Reels analytics, unified comment reply inbox & Draft REST API.
          </div>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            borderTop: "1px solid rgba(255,255,255,0.12)",
            paddingTop: 26,
            fontSize: 22,
            color: "#94a3b8",
          }}
        >
          <span>cadences.in</span>
          <span style={{ color: "#e2e8f0", fontWeight: 700 }}>
            YouTube Videos & Shorts · Instagram Reels & Carousels
          </span>
        </div>
      </div>
    ),
    { ...size }
  );
}
