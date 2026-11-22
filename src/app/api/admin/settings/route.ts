import { NextResponse } from "next/server";
import { z } from "zod";
import { requireFounder, updatePlatformSettings } from "@/lib/admin";

const SettingsSchema = z.object({
  inviteOnlyMode: z.boolean().optional(),
  announcementBanner: z
    .object({
      enabled: z.boolean(),
      message: z.string().max(240),
      tone: z.enum(["info", "success", "warn"]),
    })
    .optional(),
});

export async function PATCH(request: Request) {
  const founder = await requireFounder();
  if (!founder) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const parsed = SettingsSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || "Invalid settings payload" },
      { status: 400 }
    );
  }

  const settings = await updatePlatformSettings(parsed.data);
  return NextResponse.json({ settings });
}
