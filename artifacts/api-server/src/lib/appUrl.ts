/**
 * Returns the canonical public-facing app URL.
 *
 * Priority order:
 *  1. APP_URL env var — set this to your production domain
 *     (e.g. https://openlocalapp.com) to override the Replit dev domain.
 *  2. REPLIT_DOMAINS — the first Replit-assigned domain for the deployment.
 *  3. Hard-coded fallback: https://openlocalapp.com
 */
export function getAppUrl(): string {
  if (process.env.APP_URL) {
    return process.env.APP_URL.replace(/\/$/, "");
  }
  const replitDomain = process.env.REPLIT_DOMAINS?.split(",")[0];
  if (replitDomain) {
    return `https://${replitDomain}`;
  }
  return "https://openlocalapp.com";
}
