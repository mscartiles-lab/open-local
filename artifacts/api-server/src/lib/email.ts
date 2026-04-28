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

const VERIFICATION_SUBJECT = "Your Open Local verification code";

function renderHtml(opts: SendVerificationOptions): string {
  return `<!doctype html>
<html>
  <body style="margin:0;padding:0;background:#f3f1ea;font-family:Georgia,'Times New Roman',serif;color:#1d1d1b;">
    <div style="max-width:520px;margin:0 auto;padding:32px 24px;">
      <div style="background:#ffffff;border:1px solid #e5e2d6;padding:32px 28px;">
        <p style="margin:0 0 4px;font-family:Helvetica,Arial,sans-serif;font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#5b6a3f;font-weight:600;">Open Local</p>
        <h1 style="margin:0 0 16px;font-size:24px;font-weight:700;color:#1d1d1b;">Verify your email</h1>
        <p style="margin:0 0 24px;font-size:15px;line-height:1.55;color:#3a3a36;">Use this code to publish <strong>${escapeHtml(opts.businessName)}</strong> on Open Local. It expires in 10 minutes.</p>
        <div style="background:#f3f1ea;border:1px solid #e5e2d6;padding:18px 0;text-align:center;font-family:'SFMono-Regular',Menlo,Consolas,monospace;font-size:34px;letter-spacing:10px;font-weight:700;color:#3d4a26;">${opts.code}</div>
        <p style="margin:24px 0 0;font-size:13px;line-height:1.5;color:#7a7a72;">If you didn't request this, you can ignore this email — your address won't be added.</p>
      </div>
      <p style="margin:18px 0 0;font-family:Helvetica,Arial,sans-serif;font-size:11px;letter-spacing:1px;text-transform:uppercase;color:#7a7a72;text-align:center;">Open Local · Florida's local marketplace</p>
    </div>
  </body>
</html>`;
}

function renderText(opts: SendVerificationOptions): string {
  return `Open Local — Verify your email

Use this code to publish ${opts.businessName} on Open Local: ${opts.code}

This code expires in 10 minutes.

If you didn't request this, you can ignore this email.`;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export async function sendVerificationEmail(
  opts: SendVerificationOptions,
): Promise<SendVerificationResult> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.MAIL_FROM || "Open Local <onboarding@resend.dev>";

  if (!apiKey) {
    logger.warn(
      { to: opts.to, code: opts.code },
      "[email] RESEND_API_KEY not set — verification code shown in dev fallback only",
    );
    return { sent: false, devFallback: true };
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: opts.to,
      subject: VERIFICATION_SUBJECT,
      html: renderHtml(opts),
      text: renderText(opts),
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    logger.error({ status: res.status, body }, "[email] Resend send failed");
    throw new Error(`Email provider returned ${res.status}`);
  }

  return { sent: true, devFallback: false };
}

export function generateVerificationCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}
