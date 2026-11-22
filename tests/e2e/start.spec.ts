import { expect, test, type Page } from "@playwright/test";
import { KLUCZ_MAGAZYNU } from "../../src/state/magazyn";
import { PROFIL_ANNY } from "./pomocnicze";

// Ekran startowy (ZADANIA.md, C2): nagłówek, trzy wejścia, spokojny komunikat po wgraniu PDF,
// brak przewijania w poziomie i kontrast białego tekstu na zielonym tle ze szkłem.

const W_PRZYGOTOWANIU = "Odczyt wniosku jest w przygotowaniu. Dane można wpisać ręcznie.";

/** Najmniejszy „PDF”: ma typ application/pdf, ale prawdziwa trasa odczytu uzna go za uszkodzony (400). */
const MALY_PDF = {
  name: "wniosek.pdf",
  mimeType: "application/pdf",
  buffer: Buffer.from("%PDF-1.4\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF\n"),
};

test.beforeEach(async ({ page }) => {
  await page.goto("/");
});

/** Symuluje trasę odczytu, która jeszcze nie działa (501), żeby sprawdzić komunikat zastępczy. */
async function trasaOdczytuNiegotowa(page: Page) {
  await page.route("**/api/forms/odczyt", (route) =>
    route.fulfill({ status: 501, contentType: "application/json", body: JSON.stringify({ blad: "Nie zaimplementowano" }) }),
  );
}

test("nagłówek h1 mówi, co robi aplikacja", async ({ page }) => {
  const h1 = page.getByRole("heading", { level: 1 });
  await expect(h1).toBeVisible();
  await expect(h1).toHaveText("Zasiłki i urlopy dla rodziców w jednym planie");
});

test("są cztery wejścia: mObywatel, ręcznie, wniosek PDF, kalkulator", async ({ page }) => {
  await expect(page.getByRole("link", { name: "Zaloguj się przez login.gov.pl (symulacja)" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Wpisz dane ręcznie" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Gotowy wniosek? Wgraj PDF" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Szybki kalkulator" }).first()).toHaveAttribute("href", "/kalkulator");
});

test("intro jest pierwszym ekranem, a „Zaczynamy” przewija do wyboru", async ({ page }, testInfo) => {
  const intro = page.locator("#start-intro");
  await expect(intro.getByRole("heading", { level: 1 })).toBeVisible();
  const wysokosc = page.viewportSize()!.height;
  // Intro zajmuje pierwszy ekran: kafle wyboru zaczynają się dopiero pod nim.
  const goraKafli = await page.locator("#start-tresc ul > li").first().evaluate((el) => el.getBoundingClientRect().top);
  expect(goraKafli).toBeGreaterThan(wysokosc * 0.8);

  const zaczynamy = page.getByRole("link", { name: "Zaczynamy" });
  await expect(zaczynamy).toHaveAttribute("href", "#start-wybor");
  await zaczynamy.click();
  await expect(page.getByRole("heading", { level: 2, name: "Jak zacząć?" })).toBeInViewport();
  await expect(page.locator("#start-wybor")).toBeFocused();

  if (testInfo.project.name === "telefon") {
    // Po „Zaczynamy” wszystkie cztery kafle mieszczą się na jednym ekranie telefonu (375×812).
    await page.waitForTimeout(900);
    const dol = await page.locator("#start-tresc ul > li").last().evaluate((el) => el.getBoundingClientRect().bottom);
    console.log("telefon: dół 4. kafla po „Zaczynamy” =", dol);
    expect(dol).toBeLessThanOrEqual(wysokosc);
  }
});

test("wybór: 4 kafle w jednej siatce, bez podglądu osi i bez linii o przeglądarce", async ({ page }) => {
  const kafle = page.locator("#start-tresc ul > li");
  await expect(kafle).toHaveCount(4);
  await expect(page.locator('#start-tresc [data-modul="kalkulator"]')).toHaveCount(1);
  await expect(page.locator("main")).not.toContainText("Wasz plan");
  await expect(page.locator("main")).not.toContainText("Dane zostają w Twojej przeglądarce");
  await expect(page.getByRole("heading", { level: 1 })).not.toContainText("osi czasu");
});

test("animacja wejścia jest wyłączona przy prefers-reduced-motion", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.reload();
  const nazwa = await page.locator("#start-tresc ul > li").first().evaluate((el) => getComputedStyle(el).animationName);
  expect(nazwa).toBe("none");
});

test("wejście przez login.gov.pl prowadzi do /logowanie", async ({ page }) => {
  const link = page.getByRole("link", { name: "Zaloguj się przez login.gov.pl (symulacja)" });
  await expect(link).toHaveAttribute("href", "/logowanie");
  await link.click();
  await expect(page).toHaveURL(/\/logowanie$/);
});

test("wejście ręczne prowadzi do /sytuacja", async ({ page }) => {
  const link = page.getByRole("link", { name: "Wpisz dane ręcznie" });
  await expect(link).toHaveAttribute("href", "/sytuacja");
  await link.click();
  await expect(page).toHaveURL(/\/sytuacja$/);
});

test("„Wpisz dane ręcznie” po zalogowaniu personą zaczyna od czystego profilu", async ({ page }) => {
  // Profil z usług (persona Anna z pochodzeniem) zapisany w przeglądarce, potem start ręczny.
  await page.evaluate(
    ([klucz, rodzina]) => {
      window.localStorage.setItem(
        klucz,
        JSON.stringify({
          wersja: 2,
          rodzina,
          plany: [],
          wybranyPlanId: null,
          pochodzenie: [{ sciezka: "osoby[0].dane", zrodlo: "mobywatel" }],
          doPotwierdzenia: [],
        }),
      );
    },
    [KLUCZ_MAGAZYNU, PROFIL_ANNY.rodzina] as const,
  );
  await page.reload();
  await page.getByRole("link", { name: "Wpisz dane ręcznie" }).first().click();
  await expect(page).toHaveURL(/\/sytuacja$/);
  const zapis = await page.evaluate((k) => JSON.parse(window.localStorage.getItem(k) ?? "{}"), KLUCZ_MAGAZYNU);
  expect(zapis.rodzina.osoby[0].dane?.imie).toBeUndefined();
  expect(zapis.pochodzenie).toEqual([]);
});

test("„Wpisz dane ręcznie” zostawia profil wpisany ręcznie (kontynuacja)", async ({ page }) => {
  await page.evaluate(
    ([klucz, rodzina]) => {
      window.localStorage.setItem(
        klucz,
        JSON.stringify({ wersja: 2, rodzina, plany: [], wybranyPlanId: null, pochodzenie: [], doPotwierdzenia: [] }),
      );
    },
    [KLUCZ_MAGAZYNU, PROFIL_ANNY.rodzina] as const,
  );
  await page.reload();
  await page.getByRole("link", { name: "Wpisz dane ręcznie" }).first().click();
  await expect(page).toHaveURL(/\/sytuacja$/);
  const zapis = await page.evaluate((k) => JSON.parse(window.localStorage.getItem(k) ?? "{}"), KLUCZ_MAGAZYNU);
  expect(zapis.rodzina.osoby[0].dane?.imie).toBe("Anna");
});

test("gdy odczyt jeszcze nie działa (501), widać spokojny komunikat „w przygotowaniu”", async ({ page }) => {
  await trasaOdczytuNiegotowa(page);
  const wyslane: string[] = [];
  page.on("request", (r) => {
    if (r.method() === "POST") wyslane.push(new URL(r.url()).pathname);
  });

  const [wybor] = await Promise.all([
    page.waitForEvent("filechooser"),
    page.getByRole("button", { name: "Gotowy wniosek? Wgraj PDF" }).click(),
  ]);
  await wybor.setFiles(MALY_PDF);

  const status = page.getByRole("status");
  await expect(status).toContainText(W_PRZYGOTOWANIU);
  await expect(status.getByRole("link", { name: "Wpisz dane ręcznie" })).toHaveAttribute("href", "/sytuacja");
  // Plik trafia tylko do naszej trasy odczytu.
  expect(wyslane).toEqual(["/api/forms/odczyt"]);
});

test("uszkodzony PDF: widać komunikat serwera i link do ręcznego wpisania", async ({ page }) => {
  await page.locator('input[type="file"]').setInputFiles(MALY_PDF);
  const status = page.getByRole("status");
  await expect(status).toContainText("uszkodzony");
  await expect(status.getByRole("link", { name: "Wpisz dane ręcznie" })).toHaveAttribute("href", "/sytuacja");
  await expect(page).toHaveURL(/\/$/);
});

test("plik inny niż PDF nie jest wysyłany", async ({ page }) => {
  let wyslano = false;
  page.on("request", (r) => {
    if (r.url().includes("/api/forms/odczyt")) wyslano = true;
  });
  await page.locator('input[type="file"]').setInputFiles({
    name: "zdjecie.png",
    mimeType: "image/png",
    buffer: Buffer.from([0x89, 0x50, 0x4e, 0x47]),
  });
  await expect(page.getByRole("status")).toContainText("nie jest w formacie PDF");
  expect(wyslano).toBe(false);
});

test("bez przewijania w poziomie na telefonie", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "telefon", "tylko widok telefonu");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  const { scrollWidth, clientWidth } = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
  }));
  expect(scrollWidth).toBeLessThanOrEqual(clientWidth);
});

test("wejścia mają cele dotykowe co najmniej 56 px", async ({ page }) => {
  for (const wejscie of [
    page.getByRole("link", { name: "Zaloguj się przez login.gov.pl (symulacja)" }),
    page.getByRole("link", { name: "Wpisz dane ręcznie" }).first(),
    page.getByRole("button", { name: "Gotowy wniosek? Wgraj PDF" }),
    page.getByRole("link", { name: "Szybki kalkulator" }).first(),
  ]) {
    const box = await wejscie.boundingBox();
    expect(box?.height ?? 0).toBeGreaterThanOrEqual(56);
  }
});

test("kontrast tekstu na tle startowym ≥ 4,5:1 (najciemniejszy piksel tła pod tekstem, z liniami)", async ({ page }) => {
  // Najpierw wywołaj komunikat po wgraniu pliku, żeby jego tekst też był sprawdzony.
  await trasaOdczytuNiegotowa(page);
  await page.locator('input[type="file"]').setInputFiles(MALY_PDF);
  await expect(page.getByRole("status")).toContainText(W_PRZYGOTOWANIU);
  // Linie są narysowane od razu (bez animacji), żeby pomiar objął ich końcowy wygląd.
  await page.emulateMedia({ reducedMotion: "reduce" });

  const obszary = await tekstyBezKafli(page);
  expect(obszary.length).toBeGreaterThan(1);

  // Ukryj tekst i ikony treści, zostaw samo tło (gradient, poświata, linie).
  await page.addStyleTag({
    content: `
      #start-intro, #start-intro *, #start-tresc, #start-tresc * { color: transparent !important; text-decoration-color: transparent !important; }
      #start-intro svg, #start-tresc svg { visibility: hidden !important; }
      #start-intro [data-kontrast-wlasny], #start-intro [aria-hidden="true"] { visibility: hidden !important; }
      nextjs-portal { display: none !important; }`,
  });

  const wyniki: { tekst: string; kontrast: number }[] = [];
  for (const o of obszary) {
    const png = await page.screenshot({ clip: o.prostokat, fullPage: true, animations: "disabled" });
    const luminancja = await najciemniejszaLuminancja(page, png.toString("base64"));
    wyniki.push({ tekst: o.tekst, kontrast: (luminancja + 0.05) / (o.luminancjaTekstu + 0.05) });
  }
  const najgorszy = wyniki.reduce((a, b) => (b.kontrast < a.kontrast ? b : a));
  console.log(`najniższy kontrast tekstu: ${najgorszy.kontrast.toFixed(2)}:1 („${najgorszy.tekst}”)`);
  for (const w of wyniki) expect(w.kontrast, w.tekst).toBeGreaterThanOrEqual(4.5);
});

/**
 * Prostokąty (współrzędne strony) linii tekstu poza kaflami (kafle mają jednolite tło), z
 * względną luminancją koloru tekstu. Bierzemy pola linii z Range, nie całe elementy.
 */
async function tekstyBezKafli(page: Page) {
  return page.evaluate(() => {
    // Intro (nagłówek h1, zdanie, dopisek o symulacji) i wybór (nagłówek, komunikat po wgraniu pliku).
    const korzenie = ["start-intro", "start-tresc"].map((id) => document.getElementById(id)).filter((k) => k !== null);
    const lin = (c: number) => {
      const s = c / 255;
      return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
    };
    const wynik: {
      tekst: string;
      luminancjaTekstu: number;
      prostokat: { x: number; y: number; width: number; height: number };
    }[] = [];
    for (const korzen of korzenie) {
    const chodzik = document.createTreeWalker(korzen, NodeFilter.SHOW_TEXT);
    for (let n = chodzik.nextNode(); n; n = chodzik.nextNode()) {
      const el = n.parentElement;
      // [data-kontrast-wlasny]: biały tekst na własnym pełnym tle (przycisk „Zaczynamy”, zieleń 5,6:1).
      if (!el || !n.textContent?.trim() || el.closest('[aria-hidden="true"], li, .sr-only, [data-kontrast-wlasny]')) continue;
      const k = getComputedStyle(el).color.match(/\d+/g)!.map(Number);
      const luminancjaTekstu = 0.2126 * lin(k[0]) + 0.7152 * lin(k[1]) + 0.0722 * lin(k[2]);
      const zakres = document.createRange();
      zakres.selectNodeContents(n);
      for (const r of zakres.getClientRects()) {
        if (r.width < 1 || r.height < 1) continue;
        wynik.push({
          tekst: n.textContent.trim().slice(0, 40),
          luminancjaTekstu,
          prostokat: { x: r.left + scrollX, y: r.top + scrollY, width: r.width, height: r.height },
        });
      }
    }
    }
    return wynik;
  });
}

/** Względna luminancja (WCAG 2.1) najciemniejszego piksela zrzutu. */
async function najciemniejszaLuminancja(page: Page, base64: string) {
  return page.evaluate(async (dane) => {
    const obraz = await createImageBitmap(await (await fetch(`data:image/png;base64,${dane}`)).blob());
    const plotno = new OffscreenCanvas(obraz.width, obraz.height);
    const ctx = plotno.getContext("2d")!;
    ctx.drawImage(obraz, 0, 0);
    const { data } = ctx.getImageData(0, 0, obraz.width, obraz.height);
    const lin = (c: number) => {
      const s = c / 255;
      return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
    };
    let min = 1;
    for (let i = 0; i < data.length; i += 4) {
      min = Math.min(min, 0.2126 * lin(data[i]) + 0.7152 * lin(data[i + 1]) + 0.0722 * lin(data[i + 2]));
    }
    return min;
  }, base64);
}
