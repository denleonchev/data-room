import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "node:path";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  // @data-room/shared is built as CommonJS (apps/api consumes it that way), and
  // linked workspace packages skip the commonjs plugin unless listed here.
  build: {
    commonjsOptions: { include: [/packages\/shared/, /node_modules/] },
  },
  optimizeDeps: { include: ["@data-room/shared"] },
  server: {
    port: 5173,
  },
});
