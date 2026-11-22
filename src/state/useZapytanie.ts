'use client';

/**
 * Wywołania `api.*` w komponentach: `{ dane, laduje, blad, odswiez }`.
 *
 *  - Zapytanie idzie, gdy zmieni się `klucz` (albo po `odswiez()`); `klucz === null` = nie pytamy.
 *  - Odpowiedź na zapytanie, które w międzyczasie zastąpiło nowsze (inne dane, odmontowanie),
 *    jest ignorowana – na ekranie nigdy nie pojawi się wynik dla starych danych po nowym.
 *  - Podczas ponownego ładowania `dane` to ostatni udany wynik (bez migania); po błędzie `dane` = null.
 *  - `blad.komunikat` to zdanie dla rodzica; treść z serwera jest w `blad.szczegoly`.
 */
import { useEffect, useEffectEvent, useMemo, useState } from 'react';
import { api } from '../lib/api';
import type { OdpowiedzPlanDomyslny, Plan, Rodzina, WynikDokumentow, WynikKwot, WynikUprawnien, WynikWalidacji } from '../engine/types';
import { kluczZapytania, komunikatBledu, type BladZapytania } from './zapytanie';

export type { BladZapytania } from './zapytanie';

export interface WynikZapytania<T> {
  dane: T | null;
  laduje: boolean;
  blad: BladZapytania | null;
  /** Wysyła to samo zapytanie jeszcze raz (np. przycisk „Spróbuj ponownie”). */
  odswiez: () => void;
}

interface Zakonczone<T> {
  zadanie: string;
  dane: T | null;
  blad: BladZapytania | null;
}

/**
 * @param klucz  identyfikuje dane wejściowe (zob. `kluczZapytania`); null = nie wysyłaj zapytania
 * @param wykonaj  wywołanie API; może być nową funkcją przy każdym renderze – liczy się tylko `klucz`
 */
export function useZapytanie<T>(klucz: string | null, wykonaj: () => Promise<T>): WynikZapytania<T> {
  const [licznik, setLicznik] = useState(0);
  const [wynik, setWynik] = useState<Zakonczone<T> | null>(null);
  const zadanie = klucz === null ? null : `${licznik}:${klucz}`;

  const uruchom = useEffectEvent((): Promise<T> => {
    try {
      return wykonaj();
    } catch (e) {
      return Promise.reject(e);
    }
  });

  useEffect(() => {
    if (zadanie === null) return;
    let aktualne = true;
    uruchom().then(
      (dane) => {
        if (aktualne) setWynik({ zadanie, dane, blad: null });
      },
      (e: unknown) => {
        if (aktualne) setWynik({ zadanie, dane: null, blad: komunikatBledu(e) });
      },
    );
    return () => {
      aktualne = false;
    };
  }, [zadanie]);

  const odswiez = useMemo(() => () => setLicznik((n) => n + 1), []);
  const zakonczone = wynik !== null && wynik.zadanie === zadanie;

  return {
    dane: zadanie === null ? null : (wynik?.dane ?? null),
    laduje: zadanie !== null && !zakonczone,
    blad: zakonczone ? wynik.blad : null,
    odswiez,
  };
}

function wymagane<T>(x: T | null): T {
  if (x === null) throw new Error('Brak danych wejściowych zapytania.');
  return x;
}

export function useUprawnienia(rodzina: Rodzina | null): WynikZapytania<WynikUprawnien> {
  const klucz = useMemo(() => kluczZapytania('uprawnienia', rodzina), [rodzina]);
  return useZapytanie(klucz, () => api.uprawnienia(wymagane(rodzina)));
}

export function usePlanyDomyslne(rodzina: Rodzina | null): WynikZapytania<OdpowiedzPlanDomyslny> {
  const klucz = useMemo(() => kluczZapytania('planyDomyslne', rodzina), [rodzina]);
  return useZapytanie(klucz, () => api.planyDomyslne(wymagane(rodzina)));
}

export function useKwoty(rodzina: Rodzina | null, plan: Plan | null): WynikZapytania<WynikKwot> {
  const klucz = useMemo(() => kluczZapytania('kwoty', rodzina, plan), [rodzina, plan]);
  return useZapytanie(klucz, () => api.kwoty(wymagane(rodzina), wymagane(plan)));
}

export function useDokumenty(rodzina: Rodzina | null, plan: Plan | null): WynikZapytania<WynikDokumentow> {
  const klucz = useMemo(() => kluczZapytania('dokumenty', rodzina, plan), [rodzina, plan]);
  return useZapytanie(klucz, () => api.dokumenty(wymagane(rodzina), wymagane(plan)));
}

export function useWalidacja(rodzina: Rodzina | null, plan: Plan | null): WynikZapytania<WynikWalidacji> {
  const klucz = useMemo(() => kluczZapytania('walidacja', rodzina, plan), [rodzina, plan]);
  return useZapytanie(klucz, () => api.walidujPlan(wymagane(rodzina), wymagane(plan)));
}
