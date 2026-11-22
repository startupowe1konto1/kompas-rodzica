import path from "node:path";
import { expect, test } from "@playwright/test";
import { wstrzyknijProfil, zalogujJako } from "./pomocnicze";
import { START, TRASY } from "./trasy";

// Zrzuty ekranu każdej strony w obu rozmiarach (telefon, komputer) do docs/zrzuty/,
// potrzebne do zgłoszenia (ZADANIA.md, C8, T3.7).
//
// Testy mają tag @zrzuty: `npm run e2e` je pomija (--grep-invert @zrzuty),
// a uruchamia je tylko `npm run e2e:zrzuty` (--grep @zrzuty).
// Plik: docs/zrzuty/<projekt>-<ekran>.png, np. docs/zrzuty/telefon-wynik.png.
// Ekrany mają dane fikcyjnej persony `marta-i-piotr` (para, przejęcie urlopu), żeby nie były puste.
// Do zgłoszenia najlepiej z serwera produkcyjnego: `npm run build && npm start`, potem `npm run e2e:zrzuty`.

const FOLDER = path.join(process.cwd(), "docs", "zrzuty");
const PERSONA = "marta-i-piotr";

/** Dodatkowe ujęcia: planer z otwartą decyzją (81,5% „Pokaż na osi”), FAQ i panel administracyjny (opis zadania pkt 3). */
const DODATKOWE = [
  { sciezka: "/plan#wybor-wariant_815", nazwa: "plan-decyzja" },
  { sciezka: "/faq", nazwa: "faq" },
  { sciezka: "/admin", nazwa: "admin" },
];

test.beforeEach(async ({ page, request }) => {
  const persony = (await (await request.get("/api/mock/persony")).json()) as { id: string; rodzina: unknown }[];
  const persona = persony.find((p) => p.id === PERSONA);
  expect(persona, `persona ${PERSONA} w /api/mock/persony`).toBeTruthy();
  await wstrzyknijProfil(page, { rodzina: persona!.rodzina } as Parameters<typeof wstrzyknijProfil>[1]);
});

for (const { sciezka, nazwa } of [START, ...TRASY, ...DODATKOWE]) {
  test(`zrzut ${nazwa}`, { tag: "@zrzuty" }, async ({ page }, testInfo) => {
    test.slow(); // `next dev` kompiluje trasę przy pierwszym wejściu
    const odpowiedz = await page.goto(sciezka);
    expect(odpowiedz?.status()).toBe(200);
    await page.waitForLoadState("networkidle");
    await expect(page.locator("h1").first()).toBeVisible();
    // Ukryj znaczek narzędzi deweloperskich Next.js (`next dev`), żeby nie trafił do zrzutu.
    await page.addStyleTag({ content: "nextjs-portal { display: none !important; }" });
    await page.screenshot({
      path: path.join(FOLDER, `${testInfo.project.name}-${nazwa}.png`),
      fullPage: true,
      animations: "disabled",
    });
  });
}

// Pobieranie danych po logowaniu (symulacja) z kartą „Dokumenty z eZUS”: zaświadczenie o zadłużeniu i saldo
// (opis zadania pkt 3). Persona z zaległością w składkach.
test("zrzut pobieranie-danych", { tag: "@zrzuty" }, async ({ page }, testInfo) => {
  test.slow();
  await zalogujJako(page, "monika-firma-zaleglosc");
  await expect(page.locator('[data-dokumenty-zrodla="ezus"]')).toBeVisible({ timeout: 30_000 });
  await page.addStyleTag({ content: "nextjs-portal { display: none !important; }" });
  await page.screenshot({
    path: path.join(FOLDER, `${testInfo.project.name}-pobieranie-danych.png`),
    fullPage: true,
    animations: "disabled",
  });
});
