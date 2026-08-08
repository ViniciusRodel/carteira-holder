import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  retries: process.env.CI ? 2 : 0,
  reporter: [["list"]],

  use: {
    baseURL: "http://localhost:1420",
    trace: "retain-on-failure",
  },

  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
  ],

  // Sobe o dev server da UI (mesmo comando usado em npm run dev). O app funciona
  // igual num navegador comum ou dentro do WebView do Tauri para os fluxos
  // testados aqui — nenhum deles depende de APIs nativas do Rust/Tauri.
  webServer: {
    command: "npm run dev",
    url: "http://localhost:1420",
    reuseExistingServer: !process.env.CI,
    timeout: 30000,
  },
});
