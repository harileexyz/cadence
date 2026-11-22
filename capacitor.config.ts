import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "in.cadences.app",
  appName: "Cadence",
  webDir: "mobile-web",
  server: {
    url: "https://cadences.in",
    cleartext: false,
    allowNavigation: [
      "cadences.in",
      "*.cadences.in",
      "cadence-urn7.onrender.com",
      "accounts.google.com",
      "*.google.com",
      "*.youtube.com",
      "*.facebook.com",
      "*.instagram.com",
    ],
  },
  android: {
    backgroundColor: "#4f46e5",
    allowMixedContent: false,
    overrideUserAgent:
      "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36",
  },
};

export default config;
