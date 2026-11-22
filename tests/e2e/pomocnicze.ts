import type { Page } from '@playwright/test';
import { PRZYKLAD_RODZINA } from '../../src/mocks/przyklad';
import { KLUCZ_MAGAZYNU, PUSTY_PROFIL, serializuj, type StanProfilu } from '../../src/state/magazyn';

export const PROFIL_ANNY: Partial<StanProfilu> = { rodzina: { ...PRZYKLAD_RODZINA, dataAnalizy: '2026-11-21' } };

/** Wpisuje profil do localStorage przed pierwszym skryptem strony; nie nadpisuje zmian zrobionych w teście. */
export async function wstrzyknijProfil(page: Page, stan: Partial<StanProfilu>): Promise<void> {
  const tekst = serializuj({ ...PUSTY_PROFIL, ...stan });
  await page.addInitScript(([k, t]) => {
    if (!window.localStorage.getItem(k)) window.localStorage.setItem(k, t);
  }, [KLUCZ_MAGAZYNU, tekst] as const);
}

/**
 * Logowanie przez login.gov.pl (symulacja): metoda → symulacja logowania (pominięta przyciskiem
 * „Pomiń symulację”, `data-logowanie-dalej`) → osoba testowa → zgoda na pobranie danych.
 * Kończy na ekranie pobierania („Pobieramy dane”).
 */
export async function zalogujJako(page: Page, persona: string, metoda = 'profil-zaufany'): Promise<void> {
  await page.goto('/logowanie');
  await page.locator(`[data-metoda="${metoda}"]`).click();
  // „Pomiń symulację” jest na każdym ekranie symulacji, także na liście banków, więc bank nie musi być wybrany.
  await page.locator('[data-logowanie-dalej]').click();
  await page.locator(`[data-persona="${persona}"]`).click();
  await page.locator('[data-zgoda="tak"]').click();
}
