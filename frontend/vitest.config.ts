import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  resolve: { tsconfigPaths: true },
  test: {
    environment: "jsdom",
    environmentOptions: {
      jsdom: { url: "http://localhost:3000" },
    },
    globals: true,
    // @t3-oss/env-nextjs 가 import 시점에 검증하므로 테스트용 값을 주입한다.
    env: {
      BACKEND_API_URL: "http://localhost:8080",
      NEXT_PUBLIC_APP_URL: "http://localhost:3000",
    },
    setupFiles: ["./vitest.setup.ts"],
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
    exclude: ["node_modules", "e2e"],
  },
});
