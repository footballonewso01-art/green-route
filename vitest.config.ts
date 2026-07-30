import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react-swc";
import path from "path";

export default defineConfig({
  plugins: [react()],
  define: {
    "import.meta.env.VITE_DEPLOY_ENV": JSON.stringify("test"),
    "import.meta.env.VITE_POCKETBASE_URL": JSON.stringify(
      "http://127.0.0.1:8090",
    ),
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test/setup.ts"],
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
  },
  resolve: {
    alias: { "@": path.resolve(__dirname, "./src") },
  },
});
