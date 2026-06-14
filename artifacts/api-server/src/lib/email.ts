import { logger } from "./logger";

interface SendVerificationOptions {
  to: string;
  code: string;
  businessName: string;
}

export interface SendVerificationResult {
  sent: boolean;
  devFallback: boolean;
}

const EMAILJS_API = "https://api.emailjs.com/api/v1.0/email/send";

function emailJsConfigured(): boolean {
  return !!(
    process.env.EMAILJS_SERVICE_ID &&
    process.env.EMAILJS_PUBLIC_KEY
  );
}

// ─── Verification code email (vendor/shopper signup) ─────────────────────────

export async function sendVerificationEmail(
  opts: SendVerificationOptions,
): Promise<SendVerificationResult> {
  const templateId = process.env.EMAILJS_TEMPLATE_ID;
  if (!emailJsConfigured() || !templateId) {
    logger.warn(
      { to: opts.to },
      "[email] EmailJS not configured — verification code shown in dev fallback only",
    );
    return { sent: false, devFallback: true };
  }

  const payload: Record<string, unknown> = {
    service_id: process.env.EMAILJS_SERVICE_ID,
    template_id: templateId,
    user_id: process.env.EMAILJS_PUBLIC_KEY,
    template_params: {
      to_email: opts.to,
      to_name: opts.businessName,
      passcode: opts.code,
      time: "10 minutes",
    },
  };

  if (process.env.EMAILJS_PRIVATE_KEY) {
    payload.accessToken = process.env.EMAILJS_PRIVATE_KEY;
  }

  try {
    const resp = await fetch(EMAILJS_API, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!resp.ok) {
      const body = await resp.text().catch(() => "");
      logger.warn(
        { to: opts.to, status: resp.status, body },
        "[email] EmailJS verification send failed — falling back to dev mode",
      );
      return { sent: false, devFallback: true };
    }

    logger.info({ to: opts.to }, "[email] verification sent via EmailJS");
    return { sent: true, devFallback: false };
  } catch (err) {
    logger.warn(
      { err, to: opts.to },
      "[email] EmailJS request failed — falling back to dev mode",
    );
    return { sent: false, devFallback: true };
  }
}

// ─── Generic direct email (onboarding, welcome, trial reminders) ─────────────
//
// Uses a second EmailJS template whose params are:
//   to_email  — recipient address  (set as "To Email" in the EmailJS template)
//   to_name   — recipient display name
//   subject   — email subject line
//   message   — plain-text email body
//
// Template ID is read from EMAILJS_ONBOARDING_TEMPLATE_ID.  If the env var
// is absent the call is a no-op so the rest of the flow never breaks.

export async function sendDirectEmail(opts: {
  to: string;
  toName: string;
  subject: string;
  message: string;
}): Promise<void> {
  const templateId = process.env.EMAILJS_ONBOARDING_TEMPLATE_ID;
  if (!emailJsConfigured() || !templateId) {
    logger.warn(
      { to: opts.to, subject: opts.subject },
      "[email] EMAILJS_ONBOARDING_TEMPLATE_ID not set — onboarding email skipped",
    );
    return;
  }

  const payload: Record<string, unknown> = {
    service_id: process.env.EMAILJS_SERVICE_ID,
    template_id: templateId,
    user_id: process.env.EMAILJS_PUBLIC_KEY,
    template_params: {
      to_email: opts.to,
      to_name: opts.toName,
      subject: opts.subject,
      message: opts.message,
    },
  };

  if (process.env.EMAILJS_PRIVATE_KEY) {
    payload.accessToken = process.env.EMAILJS_PRIVATE_KEY;
  }

  try {
    const resp = await fetch(EMAILJS_API, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!resp.ok) {
      const body = await resp.text().catch(() => "");
      logger.warn(
        { to: opts.to, status: resp.status, body },
        "[email] direct send failed",
      );
      return;
    }
    logger.info({ to: opts.to, subject: opts.subject }, "[email] direct send OK");
  } catch (err) {
    logger.warn({ err, to: opts.to }, "[email] direct send request failed");
  }
}

export function generateVerificationCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}
