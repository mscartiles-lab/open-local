import { defineConfig, devices } from "@playwright/test";

const baseURL = process.env.MOBILE_WEB_URL ?? "http://127.0.0.1:24149";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: "list",
  use: {
    baseURL,
    ...devices["Pixel 5"],
    trace: "retain-on-failure",
    viewport: { width: 402, height: 874 },
  },
  webServer: process.env.MOBILE_WEB_URL
    ? undefined
    : {
        command:
          "pnpm --filter @workspace/open-local-mobile exec expo start --web --localhost --port 24149",
        url: baseURL,
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
      },
});