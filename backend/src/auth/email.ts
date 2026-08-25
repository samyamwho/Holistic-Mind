import { config } from "../config.js";

type Message = { to: string; subject: string; text: string; html: string };

type ResendResponse = {
  id?: unknown;
  name?: unknown;
  message?: unknown;
};

export class EmailDeliveryError extends Error {
  constructor(
    message: string,
    public readonly userMessage: string,
    public readonly providerStatus?: number
  ) {
    super(message);
    this.name = "EmailDeliveryError";
  }
}

function maskEmail(email: string) {
  const [localPart, domain = ""] = email.split("@");
  const visible = localPart.slice(0, 2);
  return `${visible}${"*".repeat(Math.max(1, localPart.length - visible.length))}@${domain}`;
}

function providerMessage(payload: ResendResponse) {
  return typeof payload.message === "string"
    ? payload.message
    : "The email provider rejected the request.";
}

function userMessageForStatus(status: number, detail: string) {
  if (status === 403 && /testing emails|verify a domain|domain is not verified/i.test(detail)) {
    return "Email delivery is limited to the Resend account email. Verify a sender domain in Resend before emailing other addresses.";
  }
  if (status === 401 || status === 403) {
    return "The email service is not configured correctly. Please contact support.";
  }
  if (status === 429) {
    return "Too many emails were requested. Please wait a few minutes and try again.";
  }
  return "We could not send the email right now. Please try again.";
}

async function send(message: Message) {
  if (config.EMAIL_DELIVERY_MODE === "log") {
    console.log(`[auth email code] to=${message.to} subject=${message.subject}\n${message.text}`);
    return { mode: "log" as const };
  }

  if (!config.RESEND_API_KEY) {
    throw new EmailDeliveryError(
      "RESEND_API_KEY is missing while EMAIL_DELIVERY_MODE=resend.",
      "The email service is not configured correctly. Please contact support."
    );
  }

  let response: Response;
  try {
    response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { authorization: `Bearer ${config.RESEND_API_KEY}`, "content-type": "application/json" },
      body: JSON.stringify({ from: config.EMAIL_FROM, ...message }),
      signal: AbortSignal.timeout(10_000),
    });
  } catch (error) {
    throw new EmailDeliveryError(
      `Resend network request failed: ${error instanceof Error ? error.message : String(error)}`,
      "The email service could not be reached. Please try again."
    );
  }

  const payload = (await response.json().catch(() => ({}))) as ResendResponse;
  if (!response.ok) {
    const detail = providerMessage(payload);
    throw new EmailDeliveryError(
      `Resend returned ${response.status}: ${detail}`,
      userMessageForStatus(response.status, detail),
      response.status
    );
  }

  if (typeof payload.id !== "string" || !payload.id) {
    throw new EmailDeliveryError(
      "Resend accepted the request without returning an email ID.",
      "We could not confirm that the email was sent. Please try again."
    );
  }

  console.info(`[auth email accepted] id=${payload.id} to=${maskEmail(message.to)}`);
  return { mode: "resend" as const, id: payload.id };
}

export function sendVerificationCode(to: string, code: string) {
  return send({
    to,
    subject: "Verify your Holistic Mind email",
    text: `Your Holistic Mind verification code is ${code}. It expires in 30 minutes.`,
    html: `<p>Your Holistic Mind verification code is:</p><h1>${code}</h1><p>It expires in 30 minutes.</p>`,
  });
}

export function sendPasswordResetCode(to: string, code: string) {
  return send({
    to,
    subject: "Reset your Holistic Mind password",
    text: `Your Holistic Mind password reset code is ${code}. It expires in 15 minutes.`,
    html: `<p>Your Holistic Mind password reset code is:</p><h1>${code}</h1><p>It expires in 15 minutes.</p>`,
  });
}
