import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    open: true,
    proxy: {
      "/api": "http://localhost:5001",
      "/uploads": "http://localhost:5001",
    },
  },
});
