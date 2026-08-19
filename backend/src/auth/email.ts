import { config } from "../config.js";

type Message = { to: string; subject: string; text: string; html: string };

async function send(message: Message) {
  if (config.EMAIL_DELIVERY_MODE === "log") {
    console.log(`[development email] to=${message.to} subject=${message.subject}\n${message.text}`);
    return;
  }
  if (!config.RESEND_API_KEY) throw new Error("RESEND_API_KEY is required for email delivery");
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { authorization: `Bearer ${config.RESEND_API_KEY}`, "content-type": "application/json" },
    body: JSON.stringify({ from: config.EMAIL_FROM, ...message }),
  });
  if (!response.ok) throw new Error(`Email delivery failed (${response.status})`);
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
