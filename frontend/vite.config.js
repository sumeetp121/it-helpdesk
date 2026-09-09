import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],

  server: {
    port: 5173,

    proxy: {
      "/api/users": {
        target: "http://localhost:8001",
        changeOrigin: true,
      },

      "/api/tickets": {
        target: "http://localhost:8002",
        changeOrigin: true,
      },

      "/api/notifications": {
        target: "http://localhost:8003",
        changeOrigin: true,
      },
    },
  },
});