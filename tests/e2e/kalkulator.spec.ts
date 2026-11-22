import { expect, test, type Page } from "@playwright/test";
import { KLUCZ_MAGAZYNU } from "../../src/state/magazyn";
import { PROFIL_ANNY, wstrzyknijProfil } from "./pomocnicze";

// Szybki kalkulator (/kalkulator): wejście ze startu, wynik bez ankiety, wariant 81,5%, para,
// profil w localStorage zmienia się dopiero po „Przenieś do planera”. Asercje na atrybutach data-* i kodach.

const NAV = { timeout: 60_000 } as const;

async function profil(page: Page): Promise<string | null> {
  return page.evaluate((k) => window.localStorage.getItem(k), KLUCZ_MAGAZYNU);
}

async function wpiszMame(page: Page) {
  await page.locator('input[name="data-porodu"]').fill("2027-01-01");
  await page.locator('input[name="zarobki-mama"]').fill("8000");
}

const kwotaMiesieczna = (page: Page) => page.locator("[data-kwota-miesiecznie]");

test("z ekranu startowego moduł prowadzi do kalkulatora, cztery kafle mieszczą się na ekranie po „Zaczynamy”", async ({ page }, info) => {
  await page.goto("/");
  // Pierwszy ekran to intro; „Zaczynamy” przewija do wyboru (start.spec.ts).
  await page.getByRole("link", { name: "Zaczynamy" }).click();
  const kafle = page.locator("ul li").filter({ has: page.locator("a[href='/logowanie'], a[href='/sytuacja'], a[href='/kalkulator'], button") });
  if (info.project.name === "telefon") {
    await page.waitForTimeout(900);
    const dol = await page.locator('[data-modul="kalkulator"]').evaluate((el) => el.getBoundingClientRect().bottom);
    expect(dol).toBeLessThanOrEqual(812);
  }
  expect(await kafle.count()).toBeGreaterThanOrEqual(4);
  const modul = page.locator('[data-modul="kalkulator"]');
  await expect(modul).toBeVisible();
  // Kalkulator to czwarty kafel w tej samej siatce co trzy pozostałe wejścia.
  await expect(modul.locator("xpath=ancestor::ul")).toHaveCount(1);
  await modul.getByRole("link", { name: "Szybki kalkulator" }).click();
  await expect(page).toHaveURL(/\/kalkulator$/, NAV);
  await expect(page.getByRole("heading", { level: 1, name: "Szybki kalkulator zasiłku" })).toBeVisible(NAV);
  // Trasa spoza ścieżki: pasek kroków się nie pokazuje.
  await expect(page.getByRole("navigation", { name: /kroki/i })).toHaveCount(0);
});

test("stopka ma link do kalkulatora", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("contentinfo").getByRole("link", { name: "Szybki kalkulator" })).toHaveAttribute("href", "/kalkulator");
});

test("mama na etacie: kafel kwoty, okresy, status z kodem, bez zmiany profilu", async ({ page }) => {
  await page.goto("/kalkulator");
  await expect(page.locator('[data-stan="puste"]')).toBeVisible(NAV);
  await wpiszMame(page);

  await expect(kwotaMiesieczna(page)).toContainText("zł", NAV);
  await expect(kwotaMiesieczna(page)).toContainText(/\d/);
  await expect(page.locator("[data-suma-razem]")).toContainText("zł");
  await expect(page.locator('[data-osoba-wynik="osoba-1"] [data-typ="macierzynski"]')).toBeVisible();
  await expect(page.locator('[data-osoba-wynik="osoba-1"] [data-typ="rodzicielski"]')).toBeVisible();
  await expect(page.locator("[data-kod][data-status]").first()).toBeVisible();
  await expect(page.locator('[data-status="przysluguje"]').first()).toBeVisible();

  // Kalkulator nie dotyka zapisanego profilu.
  expect(await profil(page)).toBeNull();
});

test("wariant 81,5% zmienia kwotę", async ({ page }) => {
  await page.goto("/kalkulator");
  await wpiszMame(page);
  await expect(kwotaMiesieczna(page)).toContainText("zł", NAV);
  const przed = await kwotaMiesieczna(page).innerText();
  const razemPrzed = await page.locator("[data-suma-razem]").innerText();

  await page.getByText("81,5% przez cały okres", { exact: true }).click();
  await expect.poll(async () => page.locator("[data-suma-razem]").innerText(), NAV).not.toBe(razemPrzed);
  expect(await kwotaMiesieczna(page).innerText()).not.toBe(przed);
  expect(await profil(page)).toBeNull();
});

test("„Policz też dla taty” pokazuje okresy taty", async ({ page }) => {
  await page.goto("/kalkulator");
  await wpiszMame(page);
  await expect(kwotaMiesieczna(page)).toContainText("zł", NAV);
  await expect(page.locator('[data-osoba-wynik="osoba-2"]')).toHaveCount(0);

  await page.locator('input[name="policz-tate"][value="tak"]').check({ force: true });
  await page.locator('input[name="zarobki-tata"]').fill("6000");
  await expect(page.locator('[data-osoba-wynik="osoba-2"][data-rola="ojciec"]')).toBeVisible(NAV);
  await expect(page.locator('[data-osoba-wynik="osoba-2"] [data-typ]').first()).toBeVisible();
});

test("„Przenieś do planera” zapisuje profil i otwiera plan", async ({ page }) => {
  await page.goto("/kalkulator");
  await wpiszMame(page);
  await expect(kwotaMiesieczna(page)).toContainText("zł", NAV);
  expect(await profil(page)).toBeNull();

  await page.getByRole("button", { name: "Przenieś do planera" }).click();
  await expect(page).toHaveURL(/\/plan$/, NAV);
  await expect(page.locator("[data-odcinek], [data-slot='scenariusze']").first()).toBeVisible(NAV);
  const zapis = JSON.parse((await profil(page)) ?? "null");
  expect(zapis.rodzina.osoby[0].tytuly[0].wynagrodzenieMiesieczne).toBe(8000);
  expect(zapis.plany.length).toBeGreaterThan(0);
});

test("przy zapisanym profilu najpierw pytanie o zastąpienie danych", async ({ page }) => {
  await wstrzyknijProfil(page, PROFIL_ANNY);
  await page.goto("/kalkulator");
  const przed = await profil(page);
  expect(przed).not.toBeNull();
  await wpiszMame(page);
  await expect(kwotaMiesieczna(page)).toContainText("zł", NAV);

  const pytania: string[] = [];
  page.once("dialog", async (d) => {
    pytania.push(d.message());
    await d.dismiss();
  });
  await page.getByRole("button", { name: "Przenieś do planera" }).click();
  await expect.poll(() => pytania.length).toBe(1);
  expect(pytania[0]).toContain("Zastąpić zapisane dane");
  await expect(page).toHaveURL(/\/kalkulator$/);
  expect(await profil(page)).toBe(przed);
});

test("błąd API: komunikat i „Spróbuj ponownie”", async ({ page }) => {
  let proby = 0;
  await page.route("**/api/eligibility", (r) => {
    proby += 1;
    return proby === 1 ? r.fulfill({ status: 500, json: { blad: "x" } }) : r.continue();
  });
  await page.goto("/kalkulator");
  await wpiszMame(page);
  await expect(page.getByRole("button", { name: "Spróbuj ponownie" })).toBeVisible(NAV);
  await page.getByRole("button", { name: "Spróbuj ponownie" }).click();
  await expect(kwotaMiesieczna(page)).toContainText("zł", NAV);
});

test("lista umów: zlecenie z chorobowym liczy, bez chorobowego pokazuje informację i brak planu", async ({ page }) => {
  await page.goto("/kalkulator");
  await page.locator('input[name="data-porodu"]').fill("2027-01-01");
  const lista = page.locator('select[name="umowa-mama"]');
  await expect(lista.locator("option")).toHaveCount(5);

  await lista.selectOption("zlecenie");
  await page.locator('input[name="zarobki-mama"]').fill("5000");
  await expect(kwotaMiesieczna(page)).toContainText("zł", NAV);

  await page.locator('input[name="chorobowe-mama"][value="nie"]').check({ force: true });
  await expect(page.locator('[data-stan="bez-chorobowego"]')).toBeVisible();
  await expect(page.locator('input[name="zarobki-mama"]')).toHaveCount(0);
  await expect(page.locator('[data-stan="bez-planu"]')).toBeVisible(NAV);
  await expect(page.locator("[data-kod][data-status]").first()).toBeVisible();
});

for (const umowa of ["dzialalnosc", "inny"]) {
  test(`lista umów: ${umowa} liczy kwotę`, async ({ page }) => {
    await page.goto("/kalkulator");
    await page.locator('input[name="data-porodu"]').fill("2027-01-01");
    await page.locator('select[name="umowa-mama"]').selectOption(umowa);
    await page.locator('input[name="zarobki-mama"]').fill("4000");
    await expect(kwotaMiesieczna(page)).toContainText("zł", NAV);
  });
}

test("lista umów: brak ubezpieczenia nie pyta o zarobki", async ({ page }) => {
  await page.goto("/kalkulator");
  await page.locator('input[name="data-porodu"]').fill("2027-01-01");
  await page.locator('select[name="umowa-mama"]').selectOption("brak");
  await expect(page.locator('input[name="zarobki-mama"]')).toHaveCount(0);
  await expect(page.locator('[data-stan="bez-planu"], [data-kod]').first()).toBeVisible(NAV);
});
