import { defineConfig, devices } from "@playwright/test";

const required = ["E2E_BASE_URL", "E2E_EMAIL", "E2E_PASSWORD"] as const;
const missing = required.filter((name) => !process.env[name]);
if (missing.length > 0) {
  throw new Error(
    `Live E2E needs a running isolated app and credentials: ${missing.join(", ")}. No API responses are mocked.`,
  );
}

const baseURL = new URL(process.env.E2E_BASE_URL!);
if (!["http:", "https:"].includes(baseURL.protocol)) {
  throw new Error("E2E_BASE_URL must be an HTTP(S) URL");
}

export default defineConfig({
  testDir: "./e2e",
  testMatch: "*.spec.ts",
  fullyParallel: false,
  workers: 1,
  timeout: 60_000,
  expect: { timeout: 15_000 },
  reporter: [["list"]],
  use: {
    ...devices["Desktop Chrome"],
    baseURL: baseURL.origin,
    trace: "off",
    screenshot: "off",
    video: "off",
  },
});
