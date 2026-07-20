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

const RESEND_API = "https://api.resend.com/emails";
const FROM = process.env.MAIL_FROM ?? "Open Local <onboarding@resend.dev>";

function resendConfigured(): boolean {
  return !!process.env.RESEND_API_KEY;
}

// ─── Verification code email (vendor/shopper signup) ─────────────────────────

export async function sendVerificationEmail(
  opts: SendVerificationOptions,
): Promise<SendVerificationResult> {
  if (!resendConfigured()) {
    logger.warn(
      { to: opts.to },
      "[email] RESEND_API_KEY not set — verification code shown in dev fallback only",
    );
    return { sent: false, devFallback: true };
  }

  const html = `
    <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px">
      <h2 style="color:#3c4a26;margin-bottom:8px">Open Local</h2>
      <p style="color:#555;margin-bottom:24px">Hi ${opts.businessName},</p>
      <p style="color:#555">Here's your verification code:</p>
      <div style="font-size:36px;font-weight:700;letter-spacing:8px;color:#3c4a26;padding:16px 0">${opts.code}</div>
      <p style="color:#888;font-size:13px">This code expires in 10 minutes. If you didn't request this, you can safely ignore this email.</p>
    </div>
  `;

  try {
    const resp = await fetch(RESEND_API, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: FROM,
        to: [opts.to],
        subject: `${opts.code} — your Open Local verification code`,
        html,
      }),
    });

    if (!resp.ok) {
      const body = await resp.text().catch(() => "");
      logger.warn(
        { to: opts.to, status: resp.status, body },
        "[email] Resend verification send failed — falling back to dev mode",
      );
      return { sent: false, devFallback: true };
    }

    logger.info({ to: opts.to }, "[email] verification sent via Resend");
    return { sent: true, devFallback: false };
  } catch (err) {
    logger.warn(
      { err, to: opts.to },
      "[email] Resend request failed — falling back to dev mode",
    );
    return { sent: false, devFallback: true };
  }
}

// ─── Generic direct email (onboarding, welcome, trial reminders) ─────────────

export async function sendDirectEmail(opts: {
  to: string;
  toName: string;
  subject: string;
  message: string;
}): Promise<void> {
  if (!resendConfigured()) {
    logger.warn(
      { to: opts.to, subject: opts.subject },
      "[email] RESEND_API_KEY not set — direct email skipped",
    );
    return;
  }

  const html = `
    <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px">
      <h2 style="color:#3c4a26;margin-bottom:8px">Open Local</h2>
      <p style="color:#555;margin-bottom:16px">Hi ${opts.toName},</p>
      <div style="color:#555;white-space:pre-wrap">${opts.message}</div>
      <hr style="border:none;border-top:1px solid #eee;margin:24px 0"/>
      <p style="color:#aaa;font-size:12px">Open Local · Local Sourcing and Experiences</p>
    </div>
  `;

  try {
    const resp = await fetch(RESEND_API, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: FROM,
        to: [opts.to],
        subject: opts.subject,
        html,
      }),
    });

    if (!resp.ok) {
      const body = await resp.text().catch(() => "");
      logger.warn(
        { to: opts.to, status: resp.status, body },
        "[email] Resend direct send failed",
      );
      return;
    }

    logger.info({ to: opts.to, subject: opts.subject }, "[email] direct send OK via Resend");
  } catch (err) {
    logger.warn({ err, to: opts.to }, "[email] Resend direct send request failed");
  }
}

export function generateVerificationCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}
