import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
    extensions: [".js", ".jsx", ".ts", ".tsx"],
  },
  server: {
    port: 3001,
    proxy: {
      "/api": {
        target: "http://localhost:5002",
        changeOrigin: true,
        secure: false,
        ws: true,
        rewrite: (path) => path,
      },
    },
    cors: true
  },
  optimizeDeps: {
    include: ["react-chartjs-2", "chart.js", "@hello-pangea/dnd"],
  },
  build: {
    commonjsOptions: {
      include: [/@hello-pangea\/dnd/, /node_modules/],
    },
  },
});
