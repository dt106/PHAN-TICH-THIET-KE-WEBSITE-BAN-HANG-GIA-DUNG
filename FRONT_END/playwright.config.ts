import { defineConfig } from "@playwright/test";

/**
 * Hành trình khách trên storefront.
 * Cần sẵn: MongoDB, BACK_END (PAYMENT_ENV=mock, MAIL_HOST=127.0.0.1, MAIL_PORT=2525), Vite :3000.
 * OTP đọc từ hộp thư SMTP local (e2e/smtp-sink.mjs) vì backend không lưu OTP trong DB.
 */
export default defineConfig({
  testDir: "./e2e",
  globalSetup: "./e2e/global-setup.ts",
  timeout: 90_000,
  expect: { timeout: 20_000 },
  fullyParallel: false,
  workers: 1,
  reporter: [["list"], ["html", { open: "never", outputFolder: "e2e-results/html" }]],
  outputDir: "e2e-results/output",
  use: {
    baseURL: "http://localhost:3000",
    channel: "chrome",
    headless: true,
    viewport: { width: 1280, height: 800 },
    screenshot: "on",
    video: "retain-on-failure",
    trace: "retain-on-failure",
    launchOptions: {
      args: ["--no-sandbox", "--disable-dev-shm-usage"],
    },
  },
});
