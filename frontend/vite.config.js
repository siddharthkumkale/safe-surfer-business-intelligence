import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react()],
  build: {
    // Recharts makes the dashboard bundle larger than a typical content site.
    chunkSizeWarningLimit: 750,
  },
});
