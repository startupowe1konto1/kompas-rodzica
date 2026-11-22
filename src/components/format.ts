/**
 * Formatowanie kwot i dat dla rodzica (po polsku).
 *
 * Decyzje:
 *  - Separator tysięcy i odstęp przed „zł” to TWARDA SPACJA (U+00A0), żeby kwota nie łamała się
 *    na dwie linie (np. „1 234,56” w jednej, „zł” w drugiej). Testy sprawdzają dokładnie ten znak.
 *  - Grupujemy także kwoty czterocyfrowe („1 000,00 zł”). `Intl.NumberFormat('pl-PL')` tego nie robi
 *    (minimumGroupingDigits = 2) i zależy od wersji ICU, dlatego formatujemy ręcznie.
 *  - Znak minus to zwykły „-” na początku: „-1 234,56 zł”.
 *  - Daty to napisy 'RRRR-MM-DD' (jak w `types.ts`). Nie tworzymy z nich lokalnego `Date`, więc strefa
 *    czasowa przeglądarki nie przesunie dnia. Niepoprawny napis zwracamy bez zmian, żeby UI się nie wywróciło.
 *  - Krótka data: dzień bez zera, miesiąc z zerem – „1.12.2026”, „5.03.2027”.
 *
 * Nie importujemy silnika (`src/engine/daty.ts`) – UI rozmawia z silnikiem tylko przez REST.
 */

const NBSP = ' ';
const POLPAUZA = '–';

const MIESIACE_DOPELNIACZ = [
  'stycznia',
  'lutego',
  'marca',
  'kwietnia',
  'maja',
  'czerwca',
  'lipca',
  'sierpnia',
  'września',
  'października',
  'listopada',
  'grudnia',
] as const;

/** 1234.56 → „1 234,56 zł” (twarde spacje). NaN i nieskończoność → „—”. */
export function formatujKwote(n: number): string {
  if (!Number.isFinite(n)) return '—';
  // Epsilon jak w silniku (doGrosza): 1,005 → 1,01, a nie 1,00.
  const grosze = Math.round((Math.abs(n) + Number.EPSILON) * 100);
  const zlote = Math.floor(grosze / 100);
  const reszta = grosze % 100;
  const znak = n < 0 && grosze > 0 ? '-' : '';
  return `${znak}${grupujTysiace(zlote)},${String(reszta).padStart(2, '0')}${NBSP}zł`;
}

function grupujTysiace(calkowite: number): string {
  return String(calkowite).replace(/\B(?=(\d{3})+(?!\d))/g, NBSP);
}

interface CzesciDaty {
  rok: number;
  miesiac: number; // 1–12
  dzien: number;
}

/** Rozbiór 'RRRR-MM-DD' ze sprawdzeniem, że taki dzień istnieje (liczone w UTC). */
function rozbierz(iso: string): CzesciDaty | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) return null;
  const rok = Number(m[1]);
  const miesiac = Number(m[2]);
  const dzien = Number(m[3]);
  const d = new Date(Date.UTC(rok, miesiac - 1, dzien));
  if (d.getUTCFullYear() !== rok || d.getUTCMonth() !== miesiac - 1 || d.getUTCDate() !== dzien) return null;
  return { rok, miesiac, dzien };
}

/** '2026-12-01' → „1 grudnia 2026”. */
export function formatujDate(iso: string): string {
  const c = rozbierz(iso);
  if (!c) return iso;
  return `${c.dzien} ${MIESIACE_DOPELNIACZ[c.miesiac - 1]} ${c.rok}`;
}

/** '2026-12-01' → „1.12.2026”. */
export function formatujDateKrotko(iso: string): string {
  const c = rozbierz(iso);
  if (!c) return iso;
  return `${c.dzien}.${String(c.miesiac).padStart(2, '0')}.${c.rok}`;
}

/**
 * Okres od–do (oba dni włącznie):
 *  - ten sam dzień: „1 grudnia 2026”,
 *  - ten sam miesiąc: „1–14 grudnia 2026”,
 *  - ten sam rok: „15 marca – 20 czerwca 2027”,
 *  - różne lata: „1 grudnia 2026 – 31 stycznia 2027”.
 * `{ krotko: true }`: „1.12.2026 – 31.01.2027”.
 */
export function formatujOkres(od: string, do_: string, opcje: { krotko?: boolean } = {}): string {
  if (od === do_) return opcje.krotko ? formatujDateKrotko(od) : formatujDate(od);
  if (opcje.krotko) return `${formatujDateKrotko(od)} ${POLPAUZA} ${formatujDateKrotko(do_)}`;

  const a = rozbierz(od);
  const b = rozbierz(do_);
  if (a && b && a.rok === b.rok) {
    if (a.miesiac === b.miesiac) {
      return `${a.dzien}${POLPAUZA}${b.dzien} ${MIESIACE_DOPELNIACZ[b.miesiac - 1]} ${b.rok}`;
    }
    return `${a.dzien} ${MIESIACE_DOPELNIACZ[a.miesiac - 1]} ${POLPAUZA} ${formatujDate(do_)}`;
  }
  return `${formatujDate(od)} ${POLPAUZA} ${formatujDate(do_)}`;
}
