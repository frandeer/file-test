import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import tailwindcss from 'tailwindcss';
import autoprefixer from 'autoprefixer';

const host = process.env.TAURI_DEV_HOST;

// https://vitejs.dev/config/
export default defineConfig(async () => ({
  plugins: [vue()],
  css: {
    lightningcss: false,
    postcss: {
      plugins: [
        tailwindcss,
        autoprefixer
      ],
    },
  },
  // Vite options tailored for Tauri development and only applied in `tauri dev` or `tauri build`
  // 1. prevent vite from obscuring rust errors
  clearScreen: false,
  // 2. tauri expects a fixed port, fail if that port is not available
  server: {
    port: 1420,
    strictPort: true,
    host: host || false,
    hmr: host
      ? {
          protocol: "ws",
          host,
          port: 1421,
        }
      : undefined,
    watch: {
      // 3. tell vite to ignore watching `src-tauri`
      ignored: ["**/src-tauri/**"],
    },
  },
  resolve: {
    alias: {
      '@': '/src',
    },
  },
  // Tauri 2 공식 문서 권장: @tauri-apps/api를 optimizeDeps에서 제외
  optimizeDeps: {
    exclude: ['@tauri-apps/api'],
  },
}));
