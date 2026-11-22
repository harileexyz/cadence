import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { SESSION_COOKIE_NAME } from "@/lib/auth";
import { getAppUrl } from "@/lib/env";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const origin = getAppUrl() || url.origin;
  const token = url.searchParams.get("session")?.trim();
  const nextPath = url.searchParams.get("next") || "/";

  if (!token) {
    return NextResponse.redirect(new URL("/login", origin));
  }

  const session = await prisma.session.findUnique({
    where: { token },
  });

  if (!session || session.expiresAt.getTime() <= Date.now()) {
    const loginUrl = new URL("/login", origin);
    loginUrl.searchParams.set("error", "Session expired. Please sign in again.");
    return NextResponse.redirect(loginUrl);
  }

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, session.token, {
    httpOnly: true,
    sameSite: "lax",
    secure: origin.startsWith("https://"),
    path: "/",
    expires: session.expiresAt,
  });

  const safeNext = nextPath.startsWith("/") ? nextPath : "/";
  return NextResponse.redirect(new URL(safeNext, origin));
}
