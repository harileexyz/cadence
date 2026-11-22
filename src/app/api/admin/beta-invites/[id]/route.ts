import { NextResponse } from "next/server";
import { requireFounder } from "@/lib/admin";
import { prisma } from "@/lib/prisma";

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const founder = await requireFounder();
  if (!founder) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await context.params;
  const invite = await prisma.betaInvite.findUnique({ where: { id } });
  if (!invite) {
    return NextResponse.json({ error: "Invite not found" }, { status: 404 });
  }

  await prisma.betaInvite.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
