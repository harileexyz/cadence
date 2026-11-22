import crypto from "node:crypto";
import { PlanTier } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";
import { generateInviteCode, requireFounder } from "@/lib/admin";
import { hashPassword } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const CreateInviteSchema = z.object({
  mode: z.enum(["invite", "direct_account"]).default("invite"),
  email: z.string().email("Enter a valid email address"),
  name: z.string().trim().max(80).optional(),
  grantPlan: z.enum(["FREE", "PRO"]).default("PRO"),
  note: z.string().trim().max(160).optional(),
  password: z.string().min(8).max(80).optional(),
});

export async function POST(request: Request) {
  const founder = await requireFounder();
  if (!founder) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const parsed = CreateInviteSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || "Invalid input" },
      { status: 400 }
    );
  }

  const email = parsed.data.email.trim().toLowerCase();
  const grantPlan: PlanTier =
    parsed.data.grantPlan === "PRO" ? PlanTier.PRO : PlanTier.FREE;

  // Mode 2: Directly provision a ready-to-login Beta Tester account
  if (parsed.data.mode === "direct_account") {
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return NextResponse.json(
        { error: "A user with this email already exists. Edit them in Users Management." },
        { status: 409 }
      );
    }

    const tempPassword =
      parsed.data.password ||
      `Cadence-${crypto.randomBytes(4).toString("hex")}`;

    const createdUser = await prisma.user.create({
      data: {
        email,
        name: parsed.data.name || email.split("@")[0],
        passwordHash: hashPassword(tempPassword),
        plan: grantPlan,
        isBetaTester: true,
      },
      select: {
        id: true,
        name: true,
        email: true,
        plan: true,
        isBetaTester: true,
      },
    });

    return NextResponse.json(
      {
        mode: "direct_account",
        user: createdUser,
        tempPassword,
      },
      { status: 201 }
    );
  }

  // Mode 1: Create or update an invite code for self-signup
  const existingInvite = await prisma.betaInvite.findUnique({
    where: { email },
  });
  if (existingInvite && existingInvite.usedAt) {
    return NextResponse.json(
      { error: "This email already redeemed a beta invite." },
      { status: 409 }
    );
  }

  const code = existingInvite?.code || generateInviteCode();
  const invite = await prisma.betaInvite.upsert({
    where: { email },
    create: {
      email,
      code,
      grantPlan,
      note: parsed.data.note || null,
      invitedBy: founder.email,
    },
    update: {
      grantPlan,
      note: parsed.data.note || null,
      invitedBy: founder.email,
    },
  });

  return NextResponse.json({ mode: "invite", invite }, { status: 201 });
}
