import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// base: "./" so the built SPA works both at the hosted root (snitch.doodesch.de) and when served by the
// in-mod server at http://localhost:6140/ (relative asset paths). Output is fully static -> embeddable.
export default defineConfig({
  plugins: [react(), tailwindcss()],
  base: "./",
  build: { outDir: "dist", emptyOutDir: true, target: "es2022" },
  server: { port: 5273, strictPort: false },
});
