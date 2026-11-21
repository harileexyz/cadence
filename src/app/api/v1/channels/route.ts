import { NextResponse } from "next/server";
import { authenticateApiRequest } from "@/lib/apiKeys";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const user = await authenticateApiRequest(request);
  if (!user) {
    return NextResponse.json(
      { error: "Unauthorized. Provide Authorization: Bearer cad_live_..." },
      { status: 401 }
    );
  }

  const channels = await prisma.socialAccount.findMany({
    where: { userId: user.id, isActive: true },
    orderBy: [{ platform: "asc" }, { createdAt: "desc" }],
    select: {
      id: true,
      platform: true,
      displayName: true,
      username: true,
      externalAccountId: true,
      tokenExpiresAt: true,
      metadata: true,
    },
  });

  return NextResponse.json({ channels });
}
