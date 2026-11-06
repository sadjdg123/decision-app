import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

const PUBLIC_FILES = [
  "favicon.svg",
  "manifest.webmanifest",
  "icons/icon-192.png",
  "icons/icon-512.png",
  "icons/maskable-512.png",
  "icons/apple-touch-icon.png",
];

// Writes sw.js with every built file listed, so the whole app (3D included) works offline.
function serviceWorker() {
  return {
    name: "decision-club-service-worker",
    apply: "build",
    generateBundle(_, bundle) {
      const built = Object.keys(bundle).filter(
        (file) => !file.endsWith(".map") && file !== "index.html",
      );
      const files = ["./", ...built.sort(), ...PUBLIC_FILES];
      const version = createHash("sha256")
        .update(files.join("\n"))
        .digest("hex")
        .slice(0, 10);
      const source = readFileSync("pwa/sw.js", "utf8")
        .replace("__VERSION__", version)
        .replace("/* __PRECACHE__ */ []", JSON.stringify(files, null, 2));
      this.emitFile({ type: "asset", fileName: "sw.js", source });
    },
  };
}

export default defineConfig({
  // three.js is loaded lazily on the coin and dice pages only.
  build: { chunkSizeWarningLimit: 700 },
  plugins: [react(), tailwindcss(), serviceWorker()],
});
