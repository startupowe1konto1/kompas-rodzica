import { defineConfig } from "@playwright/test";

// Testy end-to-end interfejsu (ZADANIA.md, C8). Uruchamiają aplikację przez `npm run dev`
// albo używają serwera, który już działa na porcie 3000.
//
// Polecenia:
//   npm run e2e         – wszystkie testy oprócz zrzutów ekranu (pomija tag @zrzuty)
//   npm run e2e:zrzuty  – tylko zrzuty ekranu każdej strony do docs/zrzuty/ (tag @zrzuty)
//
// Przeglądarka: Chromium w wersji, której oczekuje @playwright/test (rewizja z
// node_modules/playwright-core/browsers.json). Jeśli masz ją w innym folderze, ustaw
// PLAYWRIGHT_BROWSERS_PATH; jeśli nie masz jej wcale: `npx playwright install chromium`.

//
// E2E_PROD=1 – testy na buildzie produkcyjnym (`next build` + `next start` na porcie 3100), jak u jury.
// Na `next dev` trasy API kompilują się przy pierwszym wywołaniu i pod równoległym obciążeniem
// (albo przy przebudowie po zmianie plików) /api/calculate potrafi odpowiadać dłużej niż 5 s,
// więc testy wyniku padały na czekaniu, nie na błędzie aplikacji. Na buildzie odpowiada w ~20 ms.
const PROD = process.env.E2E_PROD === "1";
const PORT = PROD ? 3100 : 3000;
const baseURL = `http://localhost:${PORT}`;

export default defineConfig({
  testDir: "tests/e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL,
    locale: "pl-PL",
    timezoneId: "Europe/Warsaw",
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
  },
  projects: [
    {
      name: "telefon",
      use: {
        browserName: "chromium",
        viewport: { width: 375, height: 812 },
        isMobile: true,
        hasTouch: true,
      },
    },
    {
      name: "komputer",
      use: {
        browserName: "chromium",
        viewport: { width: 1280, height: 800 },
      },
    },
  ],
  // Na `next dev` asercje dostają więcej czasu (kompilacja tras na żądanie); na buildzie zostaje domyślne 5 s.
  expect: { timeout: PROD ? 5_000 : 15_000 },
  webServer: {
    command: PROD ? `npm run build && npx next start -p ${PORT}` : "npm run dev",
    url: baseURL,
    reuseExistingServer: !PROD,
    // Pierwsza kompilacja `next dev` na laptopie potrafi trwać ponad minutę.
    timeout: 180_000,
  },
});
