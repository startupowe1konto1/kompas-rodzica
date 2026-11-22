'use client';

/**
 * Profil rodzica (rodzina + plany) wspólny dla wszystkich ekranów, zapisany w localStorage.
 *
 * SSR: na serwerze i podczas hydratacji `useSyncExternalStore` bierze migawkę serwerową (null),
 * więc HTML z serwera i pierwszy render w przeglądarce są takie same (`gotowy: false`, pusty profil).
 * localStorage czytamy dopiero po hydratacji, w przeglądarce. Strony, które bez profilu przekierowują
 * do startu, powinny czekać na `gotowy`, inaczej przekierują, zanim profil się wczyta.
 */
import { createContext, useContext, useEffect, useMemo, useState, useSyncExternalStore, type ReactNode } from 'react';
import type { PochodzenieDanej, Plan, Rodzina } from '../engine/types';
import {
  KLUCZ_MAGAZYNU,
  PUSTY_PROFIL,
  dopiszPochodzenie,
  oznaczJakoWpisane,
  potwierdz,
  wybranyPlan,
  zAktualizowanymPlanem,
  zDoPotwierdzenia,
  zPlanami,
  zPochodzeniem,
  zRodzina,
  zWybranymPlanem,
  type StanProfilu,
  type ZmianaRodziny,
} from './magazyn';
import { utworzSklepProfilu, type SklepProfilu } from './sklepProfilu';

export { dzisISO, nowaRodzina, type ZmianaRodziny } from './magazyn';

export interface Profil {
  /** false na serwerze i do chwili odczytu localStorage. */
  gotowy: boolean;
  rodzina: Rodzina | null;
  plany: Plan[];
  wybranyPlanId: string | null;
  wybranyPlan: Plan | null;
  /** Nowa rodzina albo funkcja `(poprzednia) => nowa`. Plany zostają bez zmian. */
  ustawRodzine: (zmiana: ZmianaRodziny) => void;
  /** Wybór zostaje, jeśli plan nadal jest na liście; inaczej wybiera pierwszy plan. */
  ustawPlany: (plany: Plan[]) => void;
  /** Nieznane id jest ignorowane; null czyści wybór. */
  wybierzPlan: (id: string | null) => void;
  /** Podmienia plan o tym samym id albo dopisuje nowy na końcu. */
  aktualizujPlan: (plan: Plan) => void;
  /** Źródła danych (ścieżka w `Rodzina` → usługa). */
  pochodzenie: PochodzenieDanej[];
  /** Ścieżki odpowiedzi z wartością startową, które rodzic ma jeszcze potwierdzić. */
  doPotwierdzenia: string[];
  /** Podmienia całą listę źródeł. */
  ustawPochodzenie: (p: PochodzenieDanej[]) => void;
  /** Dopisuje źródła; ta sama ścieżka – nowy wpis zastępuje stary. */
  dopiszPochodzenie: (p: PochodzenieDanej[]) => void;
  /** Rodzic wpisał albo poprawił pole: jego źródłem jest od teraz „uzytkownik”. */
  oznaczJakoWpisane: (sciezka: string) => void;
  ustawDoPotwierdzenia: (sciezki: string[]) => void;
  /** Zdejmuje odpowiedź z listy „do potwierdzenia”. */
  potwierdz: (sciezka: string) => void;
  /** Usuwa profil z pamięci i z localStorage. */
  wyczyscProfil: () => void;
}

const ProfilKontekst = createContext<Profil | null>(null);

const migawkaSerwerowa = (): StanProfilu | null => null;

function localStorageAlboNull(): Storage | null {
  return typeof window === 'undefined' ? null : window.localStorage;
}

export function ProfilProvider({ children }: { children: ReactNode }) {
  const [sklep] = useState<SklepProfilu>(() => utworzSklepProfilu(localStorageAlboNull));
  const stan = useSyncExternalStore<StanProfilu | null>(sklep.subskrybuj, sklep.pobierz, migawkaSerwerowa);

  // Zmiana profilu w innej karcie tej samej przeglądarki.
  useEffect(() => {
    const naZmiane = (e: StorageEvent) => {
      if (e.key === null || e.key === KLUCZ_MAGAZYNU) sklep.wczytajPonownie();
    };
    window.addEventListener('storage', naZmiane);
    return () => window.removeEventListener('storage', naZmiane);
  }, [sklep]);

  const akcje = useMemo(
    () => ({
      ustawRodzine: (zmiana: ZmianaRodziny) => sklep.zmien((s) => zRodzina(s, zmiana)),
      ustawPlany: (plany: Plan[]) => sklep.zmien((s) => zPlanami(s, plany)),
      wybierzPlan: (id: string | null) => sklep.zmien((s) => zWybranymPlanem(s, id)),
      aktualizujPlan: (plan: Plan) => sklep.zmien((s) => zAktualizowanymPlanem(s, plan)),
      ustawPochodzenie: (p: PochodzenieDanej[]) => sklep.zmien((s) => zPochodzeniem(s, p)),
      dopiszPochodzenie: (p: PochodzenieDanej[]) => sklep.zmien((s) => dopiszPochodzenie(s, p)),
      oznaczJakoWpisane: (sciezka: string) => sklep.zmien((s) => oznaczJakoWpisane(s, sciezka)),
      ustawDoPotwierdzenia: (sciezki: string[]) => sklep.zmien((s) => zDoPotwierdzenia(s, sciezki)),
      potwierdz: (sciezka: string) => sklep.zmien((s) => potwierdz(s, sciezka)),
      wyczyscProfil: () => sklep.wyczysc(),
    }),
    [sklep],
  );

  const wartosc = useMemo<Profil>(() => {
    const s = stan ?? PUSTY_PROFIL;
    return {
      gotowy: stan !== null,
      rodzina: s.rodzina,
      plany: s.plany,
      wybranyPlanId: s.wybranyPlanId,
      wybranyPlan: wybranyPlan(s),
      pochodzenie: s.pochodzenie,
      doPotwierdzenia: s.doPotwierdzenia,
      ...akcje,
    };
  }, [stan, akcje]);

  return <ProfilKontekst.Provider value={wartosc}>{children}</ProfilKontekst.Provider>;
}

export function useProfil(): Profil {
  const profil = useContext(ProfilKontekst);
  if (!profil) throw new Error('useProfil() działa tylko wewnątrz <ProfilProvider> (app/layout.tsx).');
  return profil;
}
