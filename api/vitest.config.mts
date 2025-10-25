import { defineConfig } from "vitest/config";

process.env.SUPABASE_URL ??= "https://test.supabase.local";
process.env.SUPABASE_SERVICE_ROLE_KEY ??= "test-key";

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts", "lib/**/*.test.ts"],
  },
});
