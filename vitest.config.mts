import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  resolve: { alias: { "@": new URL("./src", import.meta.url).pathname } },
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    exclude: ["e2e/**", "node_modules/**", ".next/**"],
    setupFiles: ["./src/test/setup.ts"],
  },
});
