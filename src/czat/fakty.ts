/**
 * Fakty dla ZuSika: wynik silnika dla rodziny i planu. Model nic nie liczy – dostaje tylko to, co policzył silnik,
 * tymi samymi funkcjami, których używają trasy REST (/api/eligibility, /api/plan/validate, /api/calculate, /api/documents).
 * Silnik liczy na rodzinie bez danych osobowych, więc nie mogą one trafić do wyniku.
 */
import { dokumentyITerminy, obliczKwoty, ustalUprawnienia, walidujPlan } from '../engine';
import type { Parametry, Plan, Rodzina, WynikDokumentow, WynikKwot, WynikUprawnien, WynikWalidacji } from '../engine/types';
import { rodzinaDlaModelu } from './anonimizacja';

export interface FaktyCzatu {
  rodzina: Rodzina;
  plan: Plan;
  /** null = silnik nie policzył tej części (np. niepełne dane) – ZuSik ma wtedy o niej nie mówić. */
  uprawnienia: WynikUprawnien | null;
  walidacja: WynikWalidacji | null;
  kwoty: WynikKwot | null;
  dokumenty: WynikDokumentow | null;
}

function sprobuj<T>(fn: () => T): T | null {
  try {
    return fn();
  } catch {
    return null;
  }
}

export function zbierzFakty(rodzina: Rodzina, plan: Plan, wersje: Parametry[]): FaktyCzatu {
  const r = rodzinaDlaModelu(rodzina);
  return {
    rodzina: r,
    plan,
    uprawnienia: sprobuj(() => ustalUprawnienia(r, wersje)),
    walidacja: sprobuj(() => walidujPlan(r, plan, wersje)),
    kwoty: sprobuj(() => obliczKwoty(r, plan, wersje)),
    dokumenty: sprobuj(() => dokumentyITerminy(r, plan, wersje)),
  };
}
