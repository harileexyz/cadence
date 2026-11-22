import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { evaluateRegistrationAccess } from "@/lib/admin";
import { createSession, hashPassword } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const firebaseLoginSchema = z.object({
  idToken: z.string().min(20),
});

interface GoogleTokenInfoResponse {
  email?: string;
  email_verified?: string | boolean;
  name?: string;
  aud?: string;
  azp?: string;
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null);
    const parsed = firebaseLoginSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Missing Google/Firebase ID token." },
        { status: 400 }
      );
    }

    const tokenInfoUrl = new URL("https://oauth2.googleapis.com/tokeninfo");
    tokenInfoUrl.searchParams.set("id_token", parsed.data.idToken);

    const verifyRes = await fetch(tokenInfoUrl.toString());
    if (!verifyRes.ok) {
      return NextResponse.json(
        { error: "Could not verify Google Sign-In token. Please try again." },
        { status: 401 }
      );
    }

    const info = (await verifyRes.json()) as GoogleTokenInfoResponse;
    const verifiedClientId = process.env.GOOGLE_CLIENT_ID?.trim();
    if (
      verifiedClientId &&
      info.aud &&
      info.aud !== verifiedClientId &&
      info.azp !== verifiedClientId
    ) {
      // Also allow Firebase project audience if Firebase ID token was passed directly
      if (info.aud !== "psychic-era-515102-r4") {
        return NextResponse.json(
          { error: "Google token audience mismatch." },
          { status: 401 }
        );
      }
    }

    const isVerified =
      info.email_verified === true || info.email_verified === "true";
    if (!info.email || !isVerified) {
      return NextResponse.json(
        { error: "Google account email is not verified." },
        { status: 401 }
      );
    }

    const email = info.email.toLowerCase().trim();
    let user = await prisma.user.findUnique({ where: { email } });

    if (user) {
      if (user.isSuspended) {
        return NextResponse.json(
          {
            error:
              "This account has been suspended. Contact the founder for assistance.",
          },
          { status: 403 }
        );
      }
    } else {
      const access = await evaluateRegistrationAccess({ email });
      if (!access.allowed) {
        return NextResponse.json(
          { error: access.reason || "Cadence is currently in Private Beta." },
          { status: 403 }
        );
      }

      user = await prisma.user.create({
        data: {
          email,
          name: info.name || email.split("@")[0],
          passwordHash: hashPassword(crypto.randomBytes(24).toString("hex")),
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
    }

    await createSession(user.id);
    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        plan: user.plan,
      },
    });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Native Google Sign-In failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
