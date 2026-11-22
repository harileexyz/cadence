import { PlanTier } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";
import { isFounderEmail, requireFounder } from "@/lib/admin";
import { hashPassword } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const PatchUserSchema = z.object({
  plan: z.enum(["FREE", "PRO"]).optional(),
  isBetaTester: z.boolean().optional(),
  isSuspended: z.boolean().optional(),
  resetPassword: z.string().min(8).max(80).optional(),
});

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const founder = await requireFounder();
  if (!founder) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await context.params;
  const target = await prisma.user.findUnique({ where: { id } });
  if (!target) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const body = await request.json().catch(() => null);
  const parsed = PatchUserSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || "Invalid update payload" },
      { status: 400 }
    );
  }

  if (parsed.data.isSuspended && isFounderEmail(target.email)) {
    return NextResponse.json(
      { error: "Cannot suspend the founder account." },
      { status: 400 }
    );
  }

  const updated = await prisma.user.update({
    where: { id },
    data: {
      ...(parsed.data.plan
        ? { plan: parsed.data.plan === "PRO" ? PlanTier.PRO : PlanTier.FREE }
        : {}),
      ...(typeof parsed.data.isBetaTester === "boolean"
        ? { isBetaTester: parsed.data.isBetaTester }
        : {}),
      ...(typeof parsed.data.isSuspended === "boolean"
        ? { isSuspended: parsed.data.isSuspended }
        : {}),
      ...(parsed.data.resetPassword
        ? { passwordHash: hashPassword(parsed.data.resetPassword) }
        : {}),
    },
    select: {
      id: true,
      name: true,
      email: true,
      plan: true,
      isBetaTester: true,
      isSuspended: true,
    },
  });

  // Immediately revoke active sessions when suspending a user
  if (parsed.data.isSuspended) {
    await prisma.session.deleteMany({ where: { userId: id } });
  }

  return NextResponse.json({ user: updated });
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const founder = await requireFounder();
  if (!founder) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await context.params;
  const target = await prisma.user.findUnique({ where: { id } });
  if (!target) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }
  if (isFounderEmail(target.email)) {
    return NextResponse.json(
      { error: "Cannot delete the founder account." },
      { status: 400 }
    );
  }

  await prisma.user.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
