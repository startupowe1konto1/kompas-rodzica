/**
 * Magazyn wersji parametrów dla panelu admina – TOR B (Mateusz).
 *
 * Kolejność odczytu: zapis w pamięci procesu, potem plik (tryb `plik`), potem `WERSJE_DOMYSLNE`.
 * Na hostingu bez zapisywalnego dysku (np. funkcje bezserwerowe) zapis ląduje tylko w pamięci
 * procesu i `trwale` ma wartość `false`: zmiana może zniknąć po restarcie instancji.
 */
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { czyPoprawna } from '../engine/daty';
import { PARAMETRY_2026, WERSJE_DOMYSLNE } from '../engine/params';
import type { Parametry } from '../engine/types';
import { BladDanych } from './http';

const PLIK_DOMYSLNY = '.data/parametry.json';

/** Zapis w pamięci procesu (tryb `pamiec` albo plik niedostępny do zapisu). */
let wPamieci: Parametry[] | null = null;

function trybPlik(): boolean {
  return process.env.MAGAZYN_PARAMETROW !== 'pamiec';
}

function sciezkaPliku(): string {
  // Plik czytamy i zapisujemy w czasie działania, nie przy budowie. Komentarz turbopackIgnore (podpowiedź z ostrzeżenia
  // `next build`) wyłącza śledzenie tej ścieżki – bez niego do kodu serwera trafiłby cały projekt (materialy/, public/).
  return path.resolve(/*turbopackIgnore: true*/ process.cwd(), process.env.MAGAZYN_PARAMETROW_PLIK ?? PLIK_DOMYSLNY);
}

function jestObiektem(x: unknown): x is Record<string, unknown> {
  return typeof x === 'object' && x !== null && !Array.isArray(x);
}

function czyProcent(sciezka: string): boolean {
  return (
    sciezka.startsWith('stawkiProc.') || sciezka === 'kwoty.skladkiPracownikaProc' || sciezka === 'podatek.zaliczkaProc'
  );
}

/** Pola `limity`, które mogą być ułamkiem: wymiar pracy, procenty i masa (pozostałe to dni, tygodnie, miesiące, lata, sztuki). */
const LIMITY_ULAMKOWE = new Set([
  'limity.maxWymiarPracyPrzyLaczeniu',
  'limity.progZaleglosciProcPlacyMinimalnej',
  'limity.ryzykoPodwyzkaProc',
  'limity.uzupelniajacy.masaGWczesniak',
]);

/** Tygodnie, terminy w dniach i limity w dniach, miesiącach, latach albo sztukach muszą być liczbami całkowitymi. */
function czyCalkowita(sciezka: string): boolean {
  return (
    sciezka.startsWith('wymiaryTyg.') ||
    sciezka.startsWith('terminyDni.') ||
    (sciezka.startsWith('limity.') && !LIMITY_ULAMKOWE.has(sciezka))
  );
}

/** Dzielnik stawki dziennej (UZ art. 36 ust. 3): zero dałoby w kalkulatorze dzielenie przez 0. */
const DODATNIE = new Set(['kwoty.dniWMiesiacuDoStawkiDziennej']);

/** Porównuje wartość ze wzorcem (kształt z `PARAMETRY_2026`) i dopisuje błędy po polsku. */
function sprawdzWzorzec(wzorzec: unknown, wartosc: unknown, sciezka: string, etykieta: string, bledy: string[]): void {
  const nazwa = `${etykieta}: ${sciezka}`;
  if (typeof wzorzec === 'number') {
    if (typeof wartosc !== 'number' || !Number.isFinite(wartosc)) {
      bledy.push(`${nazwa} musi być liczbą.`);
    } else if (wartosc < 0) {
      bledy.push(`${nazwa} nie może być ujemne.`);
    } else if (DODATNIE.has(sciezka) && wartosc === 0) {
      bledy.push(`${nazwa} musi być większe od zera.`);
    } else if (czyCalkowita(sciezka) && !Number.isInteger(wartosc)) {
      bledy.push(`${nazwa} musi być liczbą całkowitą.`);
    } else if (czyProcent(sciezka) && wartosc > 100) {
      bledy.push(`${nazwa} to procent, więc musi mieścić się w zakresie 0–100.`);
    }
  } else if (Array.isArray(wzorzec)) {
    if (!Array.isArray(wartosc) || wartosc.length === 0) {
      bledy.push(`${nazwa} musi być niepustą listą liczb.`);
    } else if (wartosc.some((x) => typeof x !== 'number' || !Number.isFinite(x) || x < 0)) {
      bledy.push(`${nazwa} musi zawierać same liczby nieujemne.`);
    } else if (czyCalkowita(sciezka) && wartosc.some((x) => !Number.isInteger(x))) {
      bledy.push(`${nazwa} musi zawierać same liczby całkowite.`);
    }
  } else if (jestObiektem(wzorzec)) {
    if (!jestObiektem(wartosc)) {
      bledy.push(`${nazwa} musi być grupą wartości.`);
      return;
    }
    for (const klucz of Object.keys(wzorzec)) {
      if (!(klucz in wartosc)) bledy.push(`${nazwa}: brakuje pola "${klucz}".`);
      else sprawdzWzorzec(wzorzec[klucz], wartosc[klucz], `${sciezka}.${klucz}`, etykieta, bledy);
    }
    for (const klucz of Object.keys(wartosc)) {
      if (!(klucz in wzorzec)) bledy.push(`${nazwa}: nieznane pole "${klucz}".`);
    }
  }
}

const GRUPY = ['stawkiProc', 'wymiaryTyg', 'limity', 'terminyDni', 'kwoty', 'podatek'] as const;

/** Lista błędów walidacji po polsku; pusta = dane poprawne. */
export function walidujWersje(wersje: unknown): string[] {
  if (!Array.isArray(wersje) || wersje.length === 0) return ['Potrzebna jest co najmniej jedna wersja parametrów.'];
  const bledy: string[] = [];
  const daty = new Set<string>();
  wersje.forEach((w: unknown, i) => {
    const etykieta = `Wersja ${i + 1}`;
    if (!jestObiektem(w)) {
      bledy.push(`${etykieta} musi być obiektem.`);
      return;
    }
    const data = w.obowiazujeOd;
    if (typeof data !== 'string' || !czyPoprawna(data)) {
      bledy.push(`${etykieta}: data obowiązywania musi być poprawną datą w formacie RRRR-MM-DD.`);
    } else if (daty.has(data)) {
      bledy.push(`${etykieta}: data obowiązywania ${data} już jest użyta w innej wersji.`);
    } else {
      daty.add(data);
    }
    if (typeof w.opis !== 'string') bledy.push(`${etykieta}: opis musi być tekstem.`);
    if (typeof w.zrodlo !== 'string') bledy.push(`${etykieta}: źródło musi być tekstem.`);
    if (w.przepisy !== undefined) {
      if (!jestObiektem(w.przepisy) || Object.values(w.przepisy).some((p) => typeof p !== 'string')) {
        bledy.push(`${etykieta}: przepisy muszą być zbiorem napisów.`);
      }
    }
    for (const grupa of GRUPY) {
      if (!(grupa in w)) bledy.push(`${etykieta}: brakuje grupy "${grupa}".`);
      else sprawdzWzorzec(PARAMETRY_2026[grupa], w[grupa], grupa, etykieta, bledy);
    }
  });
  return bledy;
}

async function odczytajPlik(): Promise<Parametry[] | null> {
  try {
    const dane: unknown = JSON.parse(await fs.readFile(sciezkaPliku(), 'utf-8'));
    return walidujWersje(dane).length === 0 ? (dane as Parametry[]) : null;
  } catch {
    return null;
  }
}

export async function pobierzWersje(): Promise<Parametry[]> {
  if (wPamieci) return structuredClone(wPamieci);
  if (trybPlik()) {
    const zPliku = await odczytajPlik();
    if (zPliku) return zPliku;
  }
  return structuredClone(WERSJE_DOMYSLNE);
}

export async function zapiszWersje(wersje: Parametry[]): Promise<{ trwale: boolean }> {
  const bledy = walidujWersje(wersje);
  if (bledy.length > 0) throw new BladDanych(bledy.join('; '));
  const posortowane = structuredClone(wersje).sort((a, b) => a.obowiazujeOd.localeCompare(b.obowiazujeOd));
  if (trybPlik()) {
    const sciezka = sciezkaPliku();
    // Zapis przez plik tymczasowy i podmianę: przerwany zapis (restart, brak miejsca) nie zostawia uciętego JSON-a,
    // więc poprzednie parametry nadal da się odczytać.
    const tymczasowy = `${sciezka}.${process.pid}.tmp`;
    try {
      await fs.mkdir(path.dirname(sciezka), { recursive: true });
      await fs.writeFile(tymczasowy, JSON.stringify(posortowane, null, 2) + '\n', 'utf-8');
      await fs.rename(tymczasowy, sciezka);
      wPamieci = null;
      return { trwale: true };
    } catch {
      // System plików tylko do odczytu (hosting bezserwerowy): zostaje pamięć procesu. Plik tymczasowy sprzątamy po cichu.
      await fs.rm(tymczasowy, { force: true }).catch(() => undefined);
    }
  }
  wPamieci = posortowane;
  return { trwale: false };
}

export async function przywrocDomyslne(): Promise<{ trwale: boolean }> {
  wPamieci = null;
  if (!trybPlik()) return { trwale: false };
  try {
    await fs.rm(sciezkaPliku(), { force: true });
    return { trwale: true };
  } catch {
    // Nie da się usunąć pliku z poprzednim zapisem. Odczyt wziąłby go z dysku, więc po „przywróceniu” wracałyby stare
    // wartości; trzymamy domyślne w pamięci procesu (nietrwale), tak jak przy zapisie bez dostępu do dysku.
    wPamieci = structuredClone(WERSJE_DOMYSLNE);
    return { trwale: false };
  }
}
