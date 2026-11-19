import { NextResponse } from "next/server";
import { z } from "zod";
import { createSession, hashPassword } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const registerSchema = z.object({
  name: z.string().min(1, "Name is required").max(80),
  email: z.string().email("Enter a valid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export async function POST(request: Request) {
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

  const user = await prisma.user.create({
    data: {
      email,
      name: parsed.data.name.trim(),
      passwordHash: hashPassword(parsed.data.password),
      plan: "FREE",
    },
  });

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
