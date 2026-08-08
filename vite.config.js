import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],

  // Necessário para o Tauri: caminhos relativos no build final.
  base: "./",

  // Evita conflito de porta entre o dev server do Vite e o do Tauri.
  clearScreen: false,
  server: {
    port: 1420,
    strictPort: true,
  },

  build: {
    outDir: "dist",
    emptyOutDir: true,
  },

  test: {
    // Ambiente padrão "node" para os testes puros (mais rápido); arquivos que
    // precisam de DOM/localStorage declaram `// @vitest-environment jsdom` no topo.
    environment: "node",
    include: ["src/**/*.test.{js,jsx}"],
    setupFiles: ["src/test/setupTests.js"],
  },
});
