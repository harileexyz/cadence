import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { getAppUrl } from "@/lib/env";

/**
 * Meta Data Deletion Request Callback endpoint (required for Meta App Review).
 */
export async function POST() {
  const confirmationCode = crypto.randomBytes(8).toString("hex");
  return NextResponse.json({
    url: `${getAppUrl()}/data-deletion?code=${confirmationCode}`,
    confirmation_code: confirmationCode,
  });
}
