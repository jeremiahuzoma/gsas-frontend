import path from "node:path";

import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig, loadEnv } from "vite";

// The browser talks to the NestJS API under /api. In development Vite proxies
// /api to the backend (VITE_DEV_API_PROXY, default http://localhost:3000), so
// the app and the API share an origin exactly as the TanStack Start app did.
// In production either serve both behind one host (see nginx.conf) or set
// VITE_API_URL to the API's origin at build time.
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const target = env["VITE_DEV_API_PROXY"] || "http://localhost:3000";
  return {
    plugins: [react(), tailwindcss()],
    resolve: { alias: { "@": path.resolve(__dirname, "src") } },
    server: {
      port: 5173,
      proxy: { "/api": { target, changeOrigin: true } },
    },
    preview: {
      port: 4173,
      proxy: { "/api": { target, changeOrigin: true } },
    },
  };
});
