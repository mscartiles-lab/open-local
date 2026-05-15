// Daily vendor-onboarding sweep. Designed to be run from a Replit Scheduled
// Deployment or any cron. Hits the admin HTTP endpoint with an admin bearer
// token so the sweep runs against the deployment's database.
//
// Required env:
//   API_BASE_URL — e.g. https://your-app.replit.app
//   ONBOARDING_CRON_TOKEN — a valid admin session bearer token (ol_session
//     value from an admin user)

async function main(): Promise<void> {
  const base = process.env.API_BASE_URL;
  const token = process.env.ONBOARDING_CRON_TOKEN;
  if (!base) throw new Error("API_BASE_URL is required");
  if (!token) throw new Error("ONBOARDING_CRON_TOKEN is required");

  const r = await fetch(`${base.replace(/\/$/, "")}/api/admin/onboarding/run-daily`, {
    method: "POST",
    headers: { authorization: `Bearer ${token}` },
  });
  if (!r.ok) {
    const body = await r.text();
    throw new Error(`HTTP ${r.status}: ${body}`);
  }
  const data = await r.json();
  // eslint-disable-next-line no-console
  console.log(JSON.stringify(data));
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});
