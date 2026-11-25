import crypto from "node:crypto";
import { describe, expect, it } from "vitest";
import { verifyDodoWebhookSignature } from "../dodo";

describe("Dodo Payments Standard Webhooks verification", () => {
  const rawSecret = crypto.randomBytes(32);
  const webhookSecret = `whsec_${rawSecret.toString("base64")}`;

  it("verifies a valid Standard Webhooks v1 signature", () => {
    const webhookId = "msg_test_123";
    const nowSec = 1_795_000_000;
    const webhookTimestamp = String(nowSec);
    const rawBody = JSON.stringify({
      type: "payment.succeeded",
      data: { metadata: { userId: "user_1" } },
    });

    const expectedSig = crypto
      .createHmac("sha256", rawSecret)
      .update(`${webhookId}.${webhookTimestamp}.${rawBody}`)
      .digest("base64");

    expect(
      verifyDodoWebhookSignature({
        rawBody,
        webhookId,
        webhookTimestamp,
        webhookSignature: `v1,${expectedSig}`,
        secretOverride: webhookSecret,
        nowSec,
      })
    ).toBe(true);
  });

  it("rejects tampered body or expired timestamps", () => {
    const webhookId = "msg_test_456";
    const nowSec = 1_795_000_000;
    const webhookTimestamp = String(nowSec);
    const rawBody = JSON.stringify({ type: "payment.succeeded" });

    const expectedSig = crypto
      .createHmac("sha256", rawSecret)
      .update(`${webhookId}.${webhookTimestamp}.${rawBody}`)
      .digest("base64");

    // Tampered payload
    expect(
      verifyDodoWebhookSignature({
        rawBody: `${rawBody} `,
        webhookId,
        webhookTimestamp,
        webhookSignature: `v1,${expectedSig}`,
        secretOverride: webhookSecret,
        nowSec,
      })
    ).toBe(false);

    // Expired timestamp (> 5 minutes old)
    expect(
      verifyDodoWebhookSignature({
        rawBody,
        webhookId,
        webhookTimestamp,
        webhookSignature: `v1,${expectedSig}`,
        secretOverride: webhookSecret,
        nowSec: nowSec + 600,
      })
    ).toBe(false);
  });
});
