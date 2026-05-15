import nodemailer, { type Transporter } from "nodemailer";
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

// Lazy-initialized transporter. SMTP_HOST/PORT/USER/PASS are the canonical
// generic SMTP env vars and work for any provider. For Gmail, set:
//   SMTP_HOST=smtp.gmail.com
//   SMTP_PORT=465
//   SMTP_USER=<your gmail address>
//   SMTP_PASS=<16-char app password from https://myaccount.google.com/apppasswords>
//   MAIL_FROM=Open Local <hello@openlocalapp.com>   (defaults to SMTP_USER)
let transporter: Transporter | null = null;

function getTransporter(): Transporter | null {
  if (transporter) return transporter;
  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  if (!host || !user || !pass) return null;
  const port = Number(process.env.SMTP_PORT ?? 465);
  transporter = nodemailer.createTransport({
    host,
    port,
    // 465 → TLS from the start (Gmail), 587 → STARTTLS upgrade.
    secure: port === 465,
    auth: { user, pass },
  });
  return transporter;
}

function fromAddress(): string {
  return (
    process.env.MAIL_FROM ||
    (process.env.SMTP_USER ? `Open Local <${process.env.SMTP_USER}>` : "Open Local <onboarding@resend.dev>")
  );
}

export async function sendVerificationEmail(
  opts: SendVerificationOptions,
): Promise<SendVerificationResult> {
  const tx = getTransporter();
  if (!tx) {
    logger.warn(
      { to: opts.to, code: opts.code },
      "[email] SMTP not configured — verification code shown in dev fallback only",
    );
    return { sent: false, devFallback: true };
  }

  try {
    const info = await tx.sendMail({
      from: fromAddress(),
      to: opts.to,
      subject: VERIFICATION_SUBJECT,
      html: renderHtml(opts),
      text: renderText(opts),
    });
    logger.info({ to: opts.to, messageId: info.messageId }, "[email] sent");
    return { sent: true, devFallback: false };
  } catch (err) {
    logger.error({ err, to: opts.to }, "[email] SMTP send failed");
    throw new Error(`Email send failed: ${(err as Error).message}`);
  }
}

export function generateVerificationCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}
