import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  // three.js is loaded lazily on the coin and dice pages only.
  build: { chunkSizeWarningLimit: 700 },
  plugins: [react(), tailwindcss()],
});
