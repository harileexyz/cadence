import crypto from "node:crypto";
import { describe, expect, it } from "vitest";
import {
  verifyRazorpayPaymentSignature,
  verifyRazorpayWebhookSignature,
} from "../razorpay";

describe("Razorpay signature verification", () => {
  const secret = "rzp_test_secret_123456";

  it("verifies valid order payment signature and rejects tampered signatures", () => {
    const orderId = "order_ABC123";
    const paymentId = "pay_XYZ789";
    const validSig = crypto
      .createHmac("sha256", secret)
      .update(`${orderId}|${paymentId}`)
      .digest("hex");

    expect(
      verifyRazorpayPaymentSignature({
        orderId,
        paymentId,
        signature: validSig,
        keySecretOverride: secret,
      })
    ).toBe(true);

    expect(
      verifyRazorpayPaymentSignature({
        orderId,
        paymentId,
        signature: validSig.replace(/^./, validSig[0] === "a" ? "b" : "a"),
        keySecretOverride: secret,
      })
    ).toBe(false);
  });

  it("verifies valid subscription payment signature", () => {
    const subscriptionId = "sub_ABC123";
    const paymentId = "pay_XYZ789";
    const validSig = crypto
      .createHmac("sha256", secret)
      .update(`${paymentId}|${subscriptionId}`)
      .digest("hex");

    expect(
      verifyRazorpayPaymentSignature({
        subscriptionId,
        paymentId,
        signature: validSig,
        keySecretOverride: secret,
      })
    ).toBe(true);
  });

  it("verifies webhook HMAC signature against raw request body", () => {
    const webhookSecret = "whsec_cadence_999";
    const rawBody = JSON.stringify({ event: "payment.captured", payload: {} });
    const sig = crypto
      .createHmac("sha256", webhookSecret)
      .update(rawBody)
      .digest("hex");

    expect(
      verifyRazorpayWebhookSignature({
        rawBody,
        signature: sig,
        webhookSecretOverride: webhookSecret,
      })
    ).toBe(true);

    expect(
      verifyRazorpayWebhookSignature({
        rawBody: `${rawBody} `,
        signature: sig,
        webhookSecretOverride: webhookSecret,
      })
    ).toBe(false);
  });
});
