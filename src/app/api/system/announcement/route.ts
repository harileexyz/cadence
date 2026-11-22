import { NextResponse } from "next/server";
import { getPlatformSettings } from "@/lib/admin";

export async function GET() {
  const settings = await getPlatformSettings();
  return NextResponse.json({
    inviteOnlyMode: settings.inviteOnlyMode,
    banner: settings.announcementBanner,
  });
}
