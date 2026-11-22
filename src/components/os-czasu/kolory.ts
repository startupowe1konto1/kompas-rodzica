/**
 * Kolory i wzory odcinków osi czasu (design.md, „Oś czasu: kolory odcinków”).
 * HEX-y w `KOLORY_ODCINKOW` są kopią tokenów `--color-odc-*` z `app/globals.css` (do testu i opisów);
 * komponenty używają klas Tailwinda i zmiennych CSS, żeby kolor zmieniał się w jednym miejscu.
 */
import type { CSSProperties } from 'react';
import type { TypOdcinka } from '../../engine/types';

export interface KolorOdcinka {
  tlo: string;
  tekst: string;
  ramka?: 'przerywana';
}

const BIALY = '#ffffff';
const TEKST = '#1b1b1b';

export const KOLORY_ODCINKOW: Record<TypOdcinka, KolorOdcinka> = {
  macierzynski: { tlo: '#007834', tekst: BIALY },
  na_warunkach_macierzynskiego: { tlo: '#007834', tekst: BIALY },
  w_wys_macierzynskiego: { tlo: '#007834', tekst: BIALY },
  rodzicielski: { tlo: '#00416e', tekst: BIALY },
  ojcowski: { tlo: '#006d77', tekst: BIALY },
  uzupelniajacy: { tlo: '#5b3f8c', tekst: BIALY },
  chorobowy_ciaza: { tlo: '#5e6670', tekst: BIALY },
  wychowawczy: { tlo: '#7a5c2e', tekst: BIALY },
  praca: { tlo: '#ececec', tekst: TEKST },
  przerwa: { tlo: BIALY, tekst: TEKST, ramka: 'przerywana' },
};

/** Klasy tła i tekstu pigułki według typu (tokeny `--color-odc-*`). */
export const KLASY_TYPU: Record<TypOdcinka, string> = {
  macierzynski: 'bg-odc-macierzynski text-white',
  na_warunkach_macierzynskiego: 'bg-odc-macierzynski text-white',
  w_wys_macierzynskiego: 'bg-odc-macierzynski text-white',
  rodzicielski: 'bg-odc-rodzicielski text-white',
  ojcowski: 'bg-odc-ojcowski text-white',
  uzupelniajacy: 'bg-odc-uzupelniajacy text-white',
  chorobowy_ciaza: 'bg-odc-chorobowy text-white',
  wychowawczy: 'bg-odc-wychowawczy text-white',
  praca: 'bg-odc-praca text-tekst',
  przerwa: 'bg-white text-tekst border-2 border-dashed border-szary-ramka',
};

/** Kolor typu jako zmienna CSS (wzory, obrysy podglądu). */
export const KOLOR_TYPU: Record<TypOdcinka, string> = {
  macierzynski: 'var(--color-odc-macierzynski)',
  na_warunkach_macierzynskiego: 'var(--color-odc-macierzynski)',
  w_wys_macierzynskiego: 'var(--color-odc-macierzynski)',
  rodzicielski: 'var(--color-odc-rodzicielski)',
  ojcowski: 'var(--color-odc-ojcowski)',
  uzupelniajacy: 'var(--color-odc-uzupelniajacy)',
  chorobowy_ciaza: 'var(--color-odc-chorobowy)',
  wychowawczy: 'var(--color-odc-wychowawczy)',
  praca: 'var(--color-szary-ramka)',
  przerwa: 'var(--color-szary-ramka)',
};

/** Krótkie nazwy do pigułek; pełna nazwa jest w etykiecie dla czytnika (`etykietaDostepna`). */
export const KROTKIE_NAZWY: Record<TypOdcinka, string> = {
  macierzynski: 'Macierzyński',
  na_warunkach_macierzynskiego: 'Na war. macierzyńskiego',
  w_wys_macierzynskiego: 'Zasiłek przed porodem',
  rodzicielski: 'Rodzicielski',
  ojcowski: 'Ojcowski',
  uzupelniajacy: 'Uzupełniający',
  chorobowy_ciaza: 'Zwolnienie w ciąży',
  wychowawczy: 'Wychowawczy',
  praca: 'Praca',
  przerwa: 'Przerwa',
};

/** Ukośne białe paski: urlop łączony z pracą („+ praca 1/2 etatu”). */
export const WZOR_PRACY: CSSProperties = {
  backgroundImage: 'repeating-linear-gradient(135deg, rgb(255 255 255 / 0.28) 0 5px, transparent 5px 11px)',
};

/** Kratka „przepadnie” w kolorze puli. */
export function wzorKratki(kolor: string): CSSProperties {
  return {
    backgroundColor: 'white',
    backgroundImage: `repeating-linear-gradient(45deg, ${kolor} 0 1.5px, transparent 1.5px 9px), repeating-linear-gradient(-45deg, ${kolor} 0 1.5px, transparent 1.5px 9px)`,
  };
}

/**
 * Okno wyboru: zieleń ZUS (#007834, „termin, działaj”) w ukośne pasy – pełny pas na przemian z jaśniejszym, żeby siatka
 * pod spodem była widać. Zamiast bursztynu: testerka 22.11 uznała go za agresywny.
 */
export const WZOR_WYBORU: CSSProperties = {
  backgroundImage: 'repeating-linear-gradient(135deg, rgb(0 120 52) 0 6px, rgb(0 120 52 / 0.3) 6px 12px)',
};

/** Okno wyboru niedostępne: szare pasy. */
export const WZOR_WYBORU_NIEDOSTEPNEGO: CSSProperties = {
  backgroundImage: 'repeating-linear-gradient(135deg, rgb(133 133 133 / 0.22) 0 6px, transparent 6px 12px)',
};

/** Opis wymiaru pracy: „1/2 etatu”, „1/4 etatu”, „3/8 etatu”. */
export function opisWymiaruPracy(w: number): string {
  const osme = Math.round(w * 8);
  if (Math.abs(osme / 8 - w) > 1e-9) return `${Math.round(w * 100)}% etatu`;
  const nwd = (a: number, b: number): number => (b === 0 ? a : nwd(b, a % b));
  const d = nwd(osme, 8);
  return `${osme / d}/${8 / d} etatu`;
}

/** Liczba tygodni do znacznika na pigułce: „14 tyg.” albo „6 tyg. 1 d”. */
export function tygodnieKrotko(dni: number): string {
  const t = Math.floor(dni / 7);
  const r = dni % 7;
  if (t === 0) return `${r} d`;
  return r ? `${t} tyg. ${r} d` : `${t} tyg.`;
}

/** Ułamek 0..1 → wartość CSS `left` / `width`. */
export const proc = (u: number): string => `${(u * 100).toFixed(4)}%`;
