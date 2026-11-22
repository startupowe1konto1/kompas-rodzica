import { expect, test } from "@playwright/test";
import { START, TRASY } from "./trasy";

// Test dymny: każdy ekran odpowiada 200 i pokazuje swój nagłówek h1.

test("strona startowa się ładuje", async ({ page }) => {
  const odpowiedz = await page.goto(START.sciezka);
  expect(odpowiedz?.status()).toBe(200);
  await expect(page.locator("h1").first()).toBeVisible();
});

for (const trasa of TRASY) {
  test(`${trasa.sciezka} pokazuje „${trasa.naglowek}”`, async ({ page }) => {
    const odpowiedz = await page.goto(trasa.sciezka);
    expect(odpowiedz?.status()).toBe(200);
    await expect(page.getByRole("heading", { level: 1, name: trasa.naglowek })).toBeVisible();
  });
}
