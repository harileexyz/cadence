import { NextResponse } from "next/server";
import { z } from "zod";
import {
  clearSession,
  getCurrentUser,
  hashPassword,
  verifyPassword,
} from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const updateProfileSchema = z.object({
  name: z.string().min(1, "Name is required").max(80).optional(),
  currentPassword: z.string().optional(),
  newPassword: z.string().min(8, "New password must be at least 8 characters").optional(),
});

export async function PATCH(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const parsed = updateProfileSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || "Invalid input" },
      { status: 400 }
    );
  }

  const updateData: { name?: string; passwordHash?: string } = {};

  if (parsed.data.name !== undefined) {
    updateData.name = parsed.data.name.trim();
  }

  if (parsed.data.newPassword) {
    if (!parsed.data.currentPassword) {
      return NextResponse.json(
        { error: "Current password is required to set a new password." },
        { status: 400 }
      );
    }
    const valid = verifyPassword(parsed.data.currentPassword, user.passwordHash);
    if (!valid) {
      return NextResponse.json(
        { error: "Current password is incorrect." },
        { status: 400 }
      );
    }
    updateData.passwordHash = hashPassword(parsed.data.newPassword);
  }

  const updated = await prisma.user.update({
    where: { id: user.id },
    data: updateData,
    select: {
      id: true,
      email: true,
      name: true,
      plan: true,
      createdAt: true,
    },
  });

  return NextResponse.json({ user: updated });
}

export async function DELETE() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await prisma.user.delete({ where: { id: user.id } });
  await clearSession();

  return NextResponse.json({ deleted: true });
}
