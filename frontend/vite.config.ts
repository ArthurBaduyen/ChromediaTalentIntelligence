import "dotenv/config";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";
import { fileURLToPath } from "node:url";

const frontendRoot = path.dirname(fileURLToPath(import.meta.url));
const backendUrl = process.env.BACKEND_URL ?? "http://localhost:4000";

export default defineConfig({
  root: frontendRoot,
  plugins: [react()],
  server: {
    port: 5173,
    strictPort: true,
    proxy: {
      "/api": {
        target: backendUrl,
        changeOrigin: true
      }
    }
  }
});
