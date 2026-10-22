import path from "node:path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { tanstackRouter } from "@tanstack/router-plugin/vite";

// GitHub Pages serves the site under /<repo>/; CI sets GH_PAGES_BASE=/github-insights.
const raw = process.env.GH_PAGES_BASE || "/";
const base = raw.endsWith("/") ? raw : `${raw}/`;

export default defineConfig({
  base,
  plugins: [
    tanstackRouter({ target: "react", autoCodeSplitting: true }),
    react(),
    tailwindcss(),
  ],
  resolve: {
    alias: { "@": path.resolve(__dirname, "./src") },
  },
  server: {
    port: 3000,
    // processed JSON lives in ../data/processed, outside the Vite root.
    fs: { allow: [".."] },
  },
  build: { outDir: "dist" },
});
