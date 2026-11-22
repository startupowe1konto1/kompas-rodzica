'use client';

/**
 * Zmiany planu w podglądzie „po zmianie”, osobno dla każdej osoby – wspólne dla osi i kart decyzji.
 * Stawki odcinków (np. 81,5%) bierzemy z `POST /api/calculate` dla planu i dla podglądu; zapytania
 * są współdzielone (mała pamięć obietnic), żeby oś i karty nie pytały API dwa razy o to samo.
 */
import { useMemo } from 'react';
import type { Plan, Rodzina, WynikKwot } from '../../engine/types';
import { api } from '../../lib/api';
import { useZapytanie } from '../../state/useZapytanie';
import type { Planer } from '../plan/usePlaner';
import { zmianyPodgladu, type Stawki, type ZmianyOsoby } from './podglad';
import { listaOdcinkow } from './uklad';

const PAMIEC = new Map<string, Promise<WynikKwot>>();
const ROZMIAR_PAMIECI = 8;

function kwotyRaz(klucz: string, rodzina: Rodzina, plan: Plan): Promise<WynikKwot> {
  const jest = PAMIEC.get(klucz);
  if (jest) return jest;
  const obietnica = api.kwoty(rodzina, plan);
  obietnica.catch(() => PAMIEC.delete(klucz));
  PAMIEC.set(klucz, obietnica);
  if (PAMIEC.size > ROZMIAR_PAMIECI) PAMIEC.delete(PAMIEC.keys().next().value!);
  return obietnica;
}

function useKwotyPodgladu(rodzina: Rodzina | null, plan: Plan | null) {
  const klucz = useMemo(() => (rodzina && plan ? `kwoty-podglad:${JSON.stringify([rodzina, plan])}` : null), [rodzina, plan]);
  return useZapytanie(klucz, () => kwotyRaz(klucz!, rodzina!, plan!));
}

function stawki(k: WynikKwot | null): Stawki | null {
  return k ? Object.fromEntries(k.odcinki.map((o) => [o.odcinekId, o.stawkaProc])) : null;
}

export interface OsobaPodgladu {
  osobaId: string;
  etykieta: string;
}

export interface ZmianyPodgladu {
  /** null = brak podglądu. Kolejność osób jak na osi. */
  zmiany: ZmianyOsoby[] | null;
  osoby: OsobaPodgladu[];
}

export function useZmianyPodgladu(planer: Planer): ZmianyPodgladu {
  const { rodzina, plan, podglad } = planer;
  const przed = useKwotyPodgladu(rodzina, podglad ? plan : null);
  const po = useKwotyPodgladu(rodzina, podglad ? podglad.plan : null);
  const osoby = useMemo(() => (rodzina && plan ? listaOdcinkow(rodzina, plan).map((g) => ({ osobaId: g.osobaId, etykieta: g.etykieta })) : []), [rodzina, plan]);
  const zmiany = useMemo(
    () =>
      podglad && plan
        ? zmianyPodgladu(
            plan,
            podglad.plan,
            osoby.map((o) => o.osobaId),
            { przed: stawki(przed.dane), po: stawki(po.dane) },
          )
        : null,
    [podglad, plan, osoby, przed.dane, po.dane],
  );
  return { zmiany, osoby };
}
