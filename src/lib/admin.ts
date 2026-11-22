import crypto from "node:crypto";
import type { BetaInvite, Prisma, User } from "@prisma/client";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const FOUNDER_EMAILS = new Set(["leehari007@gmail.com"]);

export function isFounderEmail(email: string): boolean {
  return FOUNDER_EMAILS.has(email.trim().toLowerCase());
}

export async function requireFounder(): Promise<User | null> {
  const user = await getCurrentUser();
  if (!user || !isFounderEmail(user.email)) {
    return null;
  }
  return user;
}

export function generateInviteCode(): string {
  const raw = crypto.randomBytes(4).toString("hex").toUpperCase();
  return `CAD-${raw.slice(0, 4)}-${raw.slice(4, 8)}`;
}

export interface AnnouncementBannerSetting {
  enabled: boolean;
  message: string;
  tone: "info" | "success" | "warn";
}

export interface PlatformSettings {
  inviteOnlyMode: boolean;
  announcementBanner: AnnouncementBannerSetting;
}

const DEFAULT_SETTINGS: PlatformSettings = {
  inviteOnlyMode: false,
  announcementBanner: {
    enabled: false,
    message: "",
    tone: "info",
  },
};

export async function getPlatformSettings(): Promise<PlatformSettings> {
  try {
    const rows = await prisma.systemSetting.findMany({
      where: { key: { in: ["inviteOnlyMode", "announcementBanner"] } },
    });

    const map = new Map(rows.map((r) => [r.key, r.value]));
    const inviteOnlyMode =
      typeof map.get("inviteOnlyMode") === "boolean"
        ? (map.get("inviteOnlyMode") as boolean)
        : DEFAULT_SETTINGS.inviteOnlyMode;

    const rawBanner = map.get("announcementBanner");
    let announcementBanner = DEFAULT_SETTINGS.announcementBanner;
    if (rawBanner && typeof rawBanner === "object" && !Array.isArray(rawBanner)) {
      const obj = rawBanner as Record<string, unknown>;
      const tone =
        obj.tone === "success" || obj.tone === "warn" || obj.tone === "info"
          ? obj.tone
          : "info";
      announcementBanner = {
        enabled: Boolean(obj.enabled),
        message: typeof obj.message === "string" ? obj.message : "",
        tone,
      };
    }

    return { inviteOnlyMode, announcementBanner };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export async function updatePlatformSettings(
  patch: Partial<PlatformSettings>
): Promise<PlatformSettings> {
  const current = await getPlatformSettings();
  const next: PlatformSettings = {
    inviteOnlyMode:
      typeof patch.inviteOnlyMode === "boolean"
        ? patch.inviteOnlyMode
        : current.inviteOnlyMode,
    announcementBanner: patch.announcementBanner
      ? {
          enabled: Boolean(patch.announcementBanner.enabled),
          message: patch.announcementBanner.message.trim().slice(0, 240),
          tone: patch.announcementBanner.tone,
        }
      : current.announcementBanner,
  };

  await Promise.all([
    prisma.systemSetting.upsert({
      where: { key: "inviteOnlyMode" },
      create: {
        key: "inviteOnlyMode",
        value: next.inviteOnlyMode as Prisma.InputJsonValue,
      },
      update: {
        value: next.inviteOnlyMode as Prisma.InputJsonValue,
      },
    }),
    prisma.systemSetting.upsert({
      where: { key: "announcementBanner" },
      create: {
        key: "announcementBanner",
        value: next.announcementBanner as unknown as Prisma.InputJsonValue,
      },
      update: {
        value: next.announcementBanner as unknown as Prisma.InputJsonValue,
      },
    }),
  ]);

  return next;
}

export async function evaluateRegistrationAccess(params: {
  email: string;
  inviteCode?: string | null;
}): Promise<{
  allowed: boolean;
  reason?: string;
  matchedInvite: BetaInvite | null;
}> {
  const normalizedEmail = params.email.trim().toLowerCase();
  const normalizedCode = params.inviteCode?.trim().toUpperCase() || null;

  // Match unused invite by code or email
  let matchedInvite: BetaInvite | null = null;
  if (normalizedCode) {
    matchedInvite = await prisma.betaInvite.findFirst({
      where: { code: normalizedCode, usedAt: null },
    });
  }
  if (!matchedInvite) {
    matchedInvite = await prisma.betaInvite.findFirst({
      where: { email: normalizedEmail, usedAt: null },
    });
  }

  if (isFounderEmail(normalizedEmail)) {
    return { allowed: true, matchedInvite };
  }

  const settings = await getPlatformSettings();
  if (settings.inviteOnlyMode && !matchedInvite) {
    return {
      allowed: false,
      reason:
        "Cadence is currently in Private Beta. Enter a valid beta invite code or ask the founder for an invite.",
      matchedInvite: null,
    };
  }

  return { allowed: true, matchedInvite };
}
