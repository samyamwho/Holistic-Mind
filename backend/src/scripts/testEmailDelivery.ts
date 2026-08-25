import assert from "node:assert/strict";

const originalFetch = globalThis.fetch;

try {
  globalThis.fetch = async () => new Response(
    JSON.stringify({ id: "email_test_accepted" }),
    { status: 200, headers: { "content-type": "application/json" } }
  );

  const {
    EmailDeliveryError,
    sendPasswordResetCode,
    sendVerificationCode,
  } = await import("../auth/email.js");

  const verificationReceipt = await sendVerificationCode("test@example.com", "123456");
  assert.equal(verificationReceipt.mode, "resend");
  assert.equal(verificationReceipt.id, "email_test_accepted");

  globalThis.fetch = async () => new Response(
    JSON.stringify({
      message: "You can only send testing emails to your own email address. Please verify a domain.",
    }),
    { status: 403, headers: { "content-type": "application/json" } }
  );

  await assert.rejects(
    () => sendPasswordResetCode("another@example.com", "654321"),
    (error: unknown) => {
      assert.ok(error instanceof EmailDeliveryError);
      assert.equal(error.providerStatus, 403);
      assert.match(error.userMessage, /Verify a sender domain/i);
      return true;
    }
  );

  console.log("Email delivery tests passed.");
} finally {
  globalThis.fetch = originalFetch;
}
