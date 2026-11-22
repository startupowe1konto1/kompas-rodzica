/**
 * Profil rodzica w przeglądarce: zapis, odczyt i czyste zmiany stanu.
 * Bez Reacta i bez `window` – całość da się testować w Node. Provider: `profil.tsx`.
 */
import type { PochodzenieDanej, Plan, Rodzina } from '../engine/types';

/** Zmiana kształtu zapisu = nowa wersja. Stary zapis z inną wersją ignorujemy (profil zaczyna się od nowa). */
export const WERSJA_MAGAZYNU = 2;
export const KLUCZ_MAGAZYNU = `zasilkowy-przewodnik:v${WERSJA_MAGAZYNU}`;

export interface StanProfilu {
  rodzina: Rodzina | null;
  plany: Plan[];
  wybranyPlanId: string | null;
  /** Skąd pochodzi która dana (ścieżka w `Rodzina`; pełna ścieżka pola albo całego obiektu). */
  pochodzenie: PochodzenieDanej[];
  /** Ścieżki odpowiedzi z wartością startową, które rodzic ma jeszcze potwierdzić. */
  doPotwierdzenia: string[];
}

export const PUSTY_PROFIL: StanProfilu = Object.freeze({ rodzina: null, plany: [], wybranyPlanId: null, pochodzenie: [], doPotwierdzenia: [] });

interface Zapis extends StanProfilu {
  wersja: number;
}

export function serializuj(stan: StanProfilu): string {
  const zapis: Zapis = {
    wersja: WERSJA_MAGAZYNU,
    rodzina: stan.rodzina,
    plany: stan.plany,
    wybranyPlanId: stan.wybranyPlanId,
    pochodzenie: stan.pochodzenie,
    doPotwierdzenia: stan.doPotwierdzenia,
  };
  return JSON.stringify(zapis);
}

const czyObiekt = (x: unknown): x is Record<string, unknown> => typeof x === 'object' && x !== null && !Array.isArray(x);

/** Sprawdzamy tylko szkielet (to nasz własny zapis, nie dane z zewnątrz). Pełną poprawność ocenia silnik. */
function czyRodzina(x: unknown): x is Rodzina {
  return czyObiekt(x) && Array.isArray(x.osoby) && czyObiekt(x.zdarzenie) && typeof x.dataAnalizy === 'string';
}

function czyPlan(x: unknown): x is Plan {
  return czyObiekt(x) && typeof x.id === 'string' && typeof x.nazwa === 'string' && Array.isArray(x.odcinki);
}

function czyPochodzenie(x: unknown): x is PochodzenieDanej {
  return czyObiekt(x) && typeof x.sciezka === 'string' && typeof x.zrodlo === 'string';
}

/** Tekst z localStorage → stan. Brak, zły JSON, inna wersja albo zły kształt → null. */
export function deserializuj(tekst: string | null | undefined): StanProfilu | null {
  if (!tekst) return null;
  let surowy: unknown;
  try {
    surowy = JSON.parse(tekst);
  } catch {
    return null;
  }
  if (!czyObiekt(surowy) || surowy.wersja !== WERSJA_MAGAZYNU) return null;

  const { rodzina, plany, wybranyPlanId, pochodzenie, doPotwierdzenia } = surowy;
  if (rodzina !== null && !czyRodzina(rodzina)) return null;
  if (!Array.isArray(plany) || !plany.every(czyPlan)) return null;
  if (wybranyPlanId !== null && typeof wybranyPlanId !== 'string') return null;

  if (!Array.isArray(pochodzenie) || !pochodzenie.every(czyPochodzenie)) return null;
  if (!Array.isArray(doPotwierdzenia) || !doPotwierdzenia.every((x) => typeof x === 'string')) return null;

  return zPlanami({ rodzina, plany: [], wybranyPlanId, pochodzenie, doPotwierdzenia }, plany);
}

// ───────────────────────── Zmiany stanu (czyste funkcje) ─────────────────────────

export type ZmianaRodziny = Rodzina | null | ((poprzednia: Rodzina | null) => Rodzina | null);

/** Ustawia rodzinę. Plany zostają – jeśli dane się zmieniły, wywołujący sam pobiera nowe plany domyślne. */
export function zRodzina(stan: StanProfilu, zmiana: ZmianaRodziny): StanProfilu {
  const rodzina = typeof zmiana === 'function' ? zmiana(stan.rodzina) : zmiana;
  return rodzina === stan.rodzina ? stan : { ...stan, rodzina };
}

/** Podmienia listę planów. Wybór zostaje, jeśli plan nadal jest na liście; inaczej wybieramy pierwszy. */
export function zPlanami(stan: StanProfilu, plany: Plan[]): StanProfilu {
  const wybranyPlanId = plany.some((p) => p.id === stan.wybranyPlanId) ? stan.wybranyPlanId : (plany[0]?.id ?? null);
  return { ...stan, plany, wybranyPlanId };
}

/** Wybiera plan o danym id. Nieznane id ignoruje; null czyści wybór. */
export function zWybranymPlanem(stan: StanProfilu, id: string | null): StanProfilu {
  if (id === stan.wybranyPlanId) return stan;
  if (id !== null && !stan.plany.some((p) => p.id === id)) return stan;
  return { ...stan, wybranyPlanId: id };
}

/** Podmienia plan o tym samym id (w tym samym miejscu listy) albo dopisuje go na końcu. */
export function zAktualizowanymPlanem(stan: StanProfilu, plan: Plan): StanProfilu {
  const jest = stan.plany.some((p) => p.id === plan.id);
  const plany = jest ? stan.plany.map((p) => (p.id === plan.id ? plan : p)) : [...stan.plany, plan];
  return zPlanami(stan, plany);
}

export function wybranyPlan(stan: StanProfilu): Plan | null {
  return stan.plany.find((p) => p.id === stan.wybranyPlanId) ?? null;
}

// ───────────────────────── Źródła danych i odpowiedzi do potwierdzenia ─────────────────────────

/** Czy `sciezka` leży pod `przodek` ('a[0].b' jest pod 'a[0]' i pod 'a'). */
function lezyPod(sciezka: string, przodek: string): boolean {
  return sciezka.startsWith(`${przodek}.`) || sciezka.startsWith(`${przodek}[`);
}

/** Podmienia całą listę źródeł (np. po pobraniu danych z persony). */
export function zPochodzeniem(stan: StanProfilu, p: PochodzenieDanej[]): StanProfilu {
  return { ...stan, pochodzenie: p };
}

/** Dopisuje wpisy na koniec. Ta sama `sciezka` → nowy wpis zastępuje stary i trafia na koniec. */
export function dopiszPochodzenie(stan: StanProfilu, p: PochodzenieDanej[]): StanProfilu {
  const nowe = new Set(p.map((x) => x.sciezka));
  return { ...stan, pochodzenie: [...stan.pochodzenie.filter((x) => !nowe.has(x.sciezka)), ...p] };
}

/**
 * Rodzic poprawił albo wpisał pole `sciezka`: od teraz źródłem jest on.
 * Wpisy tej ścieżki i wszystkich pól pod nią stają się „uzytkownik”. Jeśli pole pokrywa tylko wpis
 * całego obiektu (np. `osoby[0].tytuly[0]` z eZUS), dopisujemy własny wpis pola, żeby reszta
 * obiektu zachowała swoje źródło. Pole bez żadnego wpisu zostaje bez zmian (ten sam obiekt).
 */
export function oznaczJakoWpisane(stan: StanProfilu, sciezka: string): StanProfilu {
  const dotyczy = (x: PochodzenieDanej) => x.sciezka === sciezka || lezyPod(x.sciezka, sciezka);
  if (stan.pochodzenie.some(dotyczy)) {
    if (stan.pochodzenie.every((x) => !dotyczy(x) || x.zrodlo === 'uzytkownik')) return stan;
    return { ...stan, pochodzenie: stan.pochodzenie.map((x) => (dotyczy(x) ? { ...x, zrodlo: 'uzytkownik' } : x)) };
  }
  // Pole pokryte wpisem przodka: liczy się najbliższy przodek (przy równej długości – późniejszy wpis).
  const przodkowie = stan.pochodzenie.filter((x) => lezyPod(sciezka, x.sciezka));
  if (przodkowie.length === 0) return stan;
  const najblizszy = przodkowie.reduce((a, b) => (b.sciezka.length >= a.sciezka.length ? b : a));
  if (najblizszy.zrodlo === 'uzytkownik') return stan;
  return { ...stan, pochodzenie: [...stan.pochodzenie, { sciezka, zrodlo: 'uzytkownik' }] };
}

export function zDoPotwierdzenia(stan: StanProfilu, sciezki: string[]): StanProfilu {
  return { ...stan, doPotwierdzenia: sciezki };
}

/** Rodzic dotknął odpowiedzi – zdejmujemy ją z listy do potwierdzenia. */
export function potwierdz(stan: StanProfilu, sciezka: string): StanProfilu {
  if (!stan.doPotwierdzenia.includes(sciezka)) return stan;
  return { ...stan, doPotwierdzenia: stan.doPotwierdzenia.filter((x) => x !== sciezka) };
}

// ───────────────────────── „Dziś” dla nowego profilu ─────────────────────────

/** Dzisiejsza LOKALNA data kalendarzowa jako 'RRRR-MM-DD' (to, co rodzic widzi w kalendarzu). */
export function dzisISO(teraz: Date = new Date()): string {
  const rr = teraz.getFullYear();
  const mm = String(teraz.getMonth() + 1).padStart(2, '0');
  const dd = String(teraz.getDate()).padStart(2, '0');
  return `${rr}-${mm}-${dd}`;
}

/** Nowy profil: `dataAnalizy` = dziś. Silnik nie czyta zegara, więc „dziś” ustawia UI właśnie tutaj. */
export function nowaRodzina(dane: Omit<Rodzina, 'dataAnalizy'>, teraz: Date = new Date()): Rodzina {
  return { ...dane, dataAnalizy: dzisISO(teraz) };
}
