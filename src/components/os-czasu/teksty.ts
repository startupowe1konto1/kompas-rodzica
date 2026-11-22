/**
 * Teksty osi czasu: nazwy typów odcinków, osób, miesięcy i opisy dla czytników ekranu.
 * Mała lokalna tabela – nie zależy od ogólnych formaterów w `src/components/format.ts`.
 */
import type { DataISO, Odcinek, Rola, TypOdcinka } from '../../engine/types';
import { parsujDate } from './daty';

export const NAZWY_TYPOW: Record<TypOdcinka, string> = {
  chorobowy_ciaza: 'Zwolnienie lekarskie w ciąży',
  w_wys_macierzynskiego: 'Zasiłek w wysokości zasiłku macierzyńskiego',
  macierzynski: 'Urlop macierzyński',
  na_warunkach_macierzynskiego: 'Urlop na warunkach urlopu macierzyńskiego',
  uzupelniajacy: 'Urlop uzupełniający',
  rodzicielski: 'Urlop rodzicielski',
  ojcowski: 'Urlop ojcowski',
  praca: 'Praca',
  przerwa: 'Przerwa',
  wychowawczy: 'Urlop wychowawczy',
};

export const NAZWY_ROL: Record<Rola, string> = {
  matka: 'Mama',
  ojciec: 'Tata',
  przyjmujacy: 'Osoba przyjmująca dziecko',
  inny_czlonek_rodziny: 'Inny członek rodziny',
};

/** Indeks 0 = styczeń. */
export const MIESIACE_MIANOWNIK = [
  'styczeń', 'luty', 'marzec', 'kwiecień', 'maj', 'czerwiec',
  'lipiec', 'sierpień', 'wrzesień', 'październik', 'listopad', 'grudzień',
] as const;

export const MIESIACE_DOPELNIACZ = [
  'stycznia', 'lutego', 'marca', 'kwietnia', 'maja', 'czerwca',
  'lipca', 'sierpnia', 'września', 'października', 'listopada', 'grudnia',
] as const;

export const MIESIACE_SKROT = [
  'sty', 'lut', 'mar', 'kwi', 'maj', 'cze', 'lip', 'sie', 'wrz', 'paź', 'lis', 'gru',
] as const;

/** '2026-12-01' → '1 grudnia 2026'. */
export function opisDaty(d: DataISO): string {
  const { rok, miesiac, dzien } = parsujDate(d);
  return `${dzien} ${MIESIACE_DOPELNIACZ[miesiac - 1]} ${rok}`;
}

export function opisOkresu(od: DataISO, do_: DataISO): string {
  return `${opisDaty(od)} – ${opisDaty(do_)}`;
}

/** Odmiana: 1 tydzień, 2–4 tygodnie (bez 12–14), 5+ tygodni. */
function tygodnie(n: number): string {
  if (n === 1) return '1 tydzień';
  const j = n % 10;
  const d = n % 100;
  if (j >= 2 && j <= 4 && (d < 12 || d > 14)) return `${n} tygodnie`;
  return `${n} tygodni`;
}

function dni(n: number): string {
  return n === 1 ? '1 dzień' : `${n} dni`;
}

/** Długość odcinka w dniach słownie: '20 tygodni', '1 tydzień i 3 dni', '5 dni'. */
export function opisDlugosci(liczbaDni: number): string {
  const t = Math.floor(liczbaDni / 7);
  const r = liczbaDni % 7;
  if (t === 0) return dni(r);
  if (r === 0) return tygodnie(t);
  return `${tygodnie(t)} i ${dni(r)}`;
}

function opisWymiaru(w: number): string {
  if (w === 0.5) return '1/2 etatu';
  if (w === 0.25) return '1/4 etatu';
  return `${Math.round(w * 100)}% etatu`;
}

/**
 * Pełny opis odcinka dla czytnika ekranu, np.
 * 'Urlop macierzyński, 1 grudnia 2026 – 19 kwietnia 2027, 20 tygodni'.
 */
export function etykietaOdcinka(o: Odcinek, liczbaDni: number, maBlad: boolean): string {
  const czesci: string[] = [NAZWY_TYPOW[o.typ]];
  if (o.czescNr !== undefined) czesci.push(`część ${o.czescNr}`);
  if (o.wymiarPracy) czesci.push(`łączony z pracą na ${opisWymiaru(o.wymiarPracy)}`);
  czesci.push(opisOkresu(o.od, o.do), opisDlugosci(liczbaDni));
  if (maBlad) czesci.push('ten odcinek ma błąd w planie');
  return czesci.join(', ');
}
