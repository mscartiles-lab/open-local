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
    process.env.EMAILJS_TEMPLATE_ID &&
    process.env.EMAILJS_PUBLIC_KEY
  );
}

export async function sendVerificationEmail(
  opts: SendVerificationOptions,
): Promise<SendVerificationResult> {
  if (!emailJsConfigured()) {
    logger.warn(
      { to: opts.to },
      "[email] EmailJS not configured — verification code shown in dev fallback only",
    );
    return { sent: false, devFallback: true };
  }

  const payload: Record<string, unknown> = {
    service_id: process.env.EMAILJS_SERVICE_ID,
    template_id: process.env.EMAILJS_TEMPLATE_ID,
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
        "[email] EmailJS send failed — falling back to dev mode",
      );
      return { sent: false, devFallback: true };
    }

    logger.info({ to: opts.to }, "[email] sent via EmailJS");
    return { sent: true, devFallback: false };
  } catch (err) {
    logger.warn(
      { err, to: opts.to },
      "[email] EmailJS request failed — falling back to dev mode",
    );
    return { sent: false, devFallback: true };
  }
}

export function generateVerificationCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}
