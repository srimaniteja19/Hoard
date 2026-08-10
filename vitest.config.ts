import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    include: ["src/**/*.test.ts"],
    exclude: [
      "node_modules/**",
      // Legacy manual test runners (not vitest suites)
      "src/lib/cover-data.test.ts",
      "src/components/covers/covers.test.ts",
      "src/components/covers/lib/cover-geometry.test.ts",
    ],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
