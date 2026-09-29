import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";

export default defineConfig({
  root: "src",
  base: "/console/",
  plugins: [
    vue({
      template: {
        transformAssetUrls: {
          includeAbsolute: false,
        },
      },
    }),
  ],
  publicDir: "public",
  build: {
    outDir: "../dist",
    emptyOutDir: true,
    assetsDir: "static",
    sourcemap: false,
    cssCodeSplit: true,
    rollupOptions: {
      external: ["/logo.png", "/favicon.svg"],
    },
  },
  server: {
    host: "127.0.0.1",
    port: 5173,
    strictPort: true,
  },
});
