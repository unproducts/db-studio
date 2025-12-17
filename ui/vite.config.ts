import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import tailwindcss from '@tailwindcss/vite'
import { resolve } from "node:path";

export default defineConfig({
  plugins: [vue(), tailwindcss(),],
  build: {
    outDir: resolve(__dirname, "../dist-ui"),
    emptyOutDir: true,
  },
});
