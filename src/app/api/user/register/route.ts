import { NextResponse } from "next/server";
import { z } from "zod";
import { evaluateRegistrationAccess } from "@/lib/admin";
import { createSession, hashPassword } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { checkRateLimit, getClientIp } from "@/lib/rateLimit";

const registerSchema = z.object({
  name: z.string().min(1, "Name is required").max(80),
  email: z.string().email("Enter a valid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  inviteCode: z.string().max(40).optional(),
});

export async function POST(request: Request) {
  const ip = getClientIp(request);
  const rl = checkRateLimit({
    key: `register:${ip}`,
    limit: 8,
    windowMs: 15 * 60 * 1000,
  });
  if (!rl.allowed) {
    return NextResponse.json(
      { error: `Too many sign-up attempts. Try again in ${rl.retryAfterSec}s.` },
      { status: 429 }
    );
  }
  const body = await request.json().catch(() => null);
  const parsed = registerSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || "Invalid input" },
      { status: 400 }
    );
  }

  const email = parsed.data.email.toLowerCase().trim();
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json(
      { error: "An account with this email already exists." },
      { status: 409 }
    );
  }

  const access = await evaluateRegistrationAccess({
    email,
    inviteCode: parsed.data.inviteCode,
  });
  if (!access.allowed) {
    return NextResponse.json(
      { error: access.reason || "Private beta invite required." },
      { status: 403 }
    );
  }

  const user = await prisma.user.create({
    data: {
      email,
      name: parsed.data.name.trim(),
      passwordHash: hashPassword(parsed.data.password),
      plan: access.matchedInvite ? access.matchedInvite.grantPlan : "FREE",
      isBetaTester: Boolean(access.matchedInvite),
    },
  });

  if (access.matchedInvite) {
    await prisma.betaInvite.update({
      where: { id: access.matchedInvite.id },
      data: { usedAt: new Date(), usedByEmail: email },
    });
  }

  await createSession(user.id);

  return NextResponse.json(
    {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        plan: user.plan,
      },
    },
    { status: 201 }
  );
}
