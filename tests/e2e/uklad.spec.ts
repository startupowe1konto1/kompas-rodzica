import { expect, test } from "@playwright/test";
import { START, TRASY } from "./trasy";

// Układ aplikacji (ZADANIA.md, C1): komunikat o symulacji w stopce, link „Przejdź do treści”,
// pasek kroków i stopka z linkami wymaganymi w zadaniu.

const KOMUNIKAT = "To symulacja. Wynik nie jest decyzją ZUS.";
const WSZYSTKIE = [START.sciezka, ...TRASY.map((t) => t.sciezka)];

for (const sciezka of WSZYSTKIE) {
  // Komunikat jest w stopce każdej strony (pasek w nagłówku usunięty 21.11, decyzja Wojtka).
  test(`${sciezka}: komunikat o symulacji widoczny w stopce`, async ({ page }) => {
    await page.goto(sciezka);
    await expect(page.getByRole("contentinfo").getByText(KOMUNIKAT)).toBeVisible();
  });
}

test("link „Przejdź do treści” przenosi fokus do treści", async ({ page }) => {
  await page.goto("/wynik");
  await page.keyboard.press("Tab");
  const link = page.getByRole("link", { name: "Przejdź do treści" });
  await expect(link).toBeFocused();
  await expect(link).toBeVisible();
  await page.keyboard.press("Enter");
  await expect(page.locator("#tresc")).toBeFocused();
});

test("pasek kroków pokazuje Wynik jako bieżący krok na /wynik", async ({ page }) => {
  await page.goto("/wynik");
  const kroki = page.getByRole("navigation", { name: "Kroki" });
  await expect(kroki).toBeVisible();
  await expect(kroki.locator('[aria-current="step"]:visible')).toHaveCount(1);
  await expect(kroki.locator('[aria-current="step"]:visible')).toContainText("Wynik");
});

test("na telefonie pasek kroków jest zwarty: „Krok 3 z 6”", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "telefon", "tylko widok telefonu");
  await page.goto("/wynik");
  const kroki = page.getByRole("navigation", { name: "Kroki" });
  await expect(kroki.getByText("Krok 3 z 6")).toBeVisible();
  await expect(kroki.getByRole("link", { name: "Poprzedni krok: Moja sytuacja" })).toBeVisible();
  await expect(kroki.getByRole("link", { name: "Następny krok: Plan" })).toBeVisible();
});

// Także dalsze kroki są linkami (uwaga Wojtka 21.11: z planu nie dało się przejść do kalendarza).
test("na komputerze wszystkie kroki poza bieżącym są linkami", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "komputer", "tylko widok komputera");
  await page.goto("/wynik");
  const kroki = page.getByRole("navigation", { name: "Kroki" });
  await expect(kroki.getByRole("link", { name: /Moja sytuacja/ })).toHaveAttribute("href", "/sytuacja");
  await expect(kroki.getByRole("link", { name: /Kalendarz/ })).toHaveAttribute("href", "/kalendarz");
  await expect(kroki.locator('[aria-current="step"]:visible')).toContainText("Wynik");
});

for (const sciezka of ["/trudne-sytuacje", "/inne-wsparcie"]) {
  test(`${sciezka}: poza ścieżką, bez paska kroków`, async ({ page }) => {
    await page.goto(sciezka);
    // Strona się wczytała (nagłówka z belką już nie ma, decyzja 21.11: sprawdzamy stopkę).
    await expect(page.getByRole("contentinfo")).toBeVisible();
    await expect(page.getByRole("navigation", { name: "Kroki" })).toHaveCount(0);
  });
}

test("stopka ma trzy linki zewnętrzne wymagane w zadaniu", async ({ page }) => {
  await page.goto("/");
  const stopka = page.getByRole("contentinfo");
  for (const href of [
    "https://www.zus.pl",
    "https://www.gov.pl/web/rodzina/urlop-rodzicielski",
    "https://www.pip.gov.pl/dla-pracodawcow/porady-prawne/rodzicielstwo",
  ]) {
    const link = stopka.locator(`a[href="${href}"]`);
    await expect(link).toHaveCount(1);
    await expect(link).toHaveAttribute("target", "_blank");
    await expect(link).toHaveAttribute("rel", "noopener noreferrer");
    await expect(link).toContainText("(otwiera się w nowej karcie)");
  }
});

for (const sciezka of WSZYSTKIE) {
  test(`${sciezka}: bez przewijania w poziomie na telefonie`, async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "telefon", "tylko widok telefonu");
    await page.goto(sciezka);
    // Strona się wczytała (nagłówka z belką już nie ma, decyzja 21.11: sprawdzamy stopkę).
    await expect(page.getByRole("contentinfo")).toBeVisible();
    const { scrollWidth, clientWidth } = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
    }));
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth);
  });
}
