/**
 * Teksty harmonogramu wypłat: nazwy świadczeń tak, jak pisze ZUS, nazwy miesięcy i stawki.
 * Typ odcinka → świadczenie za ten okres (za urlop rodzicielski: „zasiłek macierzyński za okres urlopu rodzicielskiego”).
 */
import type { KtoWyplaca, MiesiacISO, TypOdcinka } from '../../engine/types';
import { MIESIACE_MIANOWNIK } from '../os-czasu/teksty';

export const NAZWY_SWIADCZEN_HARMONOGRAMU: Record<TypOdcinka, string> = {
  chorobowy_ciaza: 'zasiłek chorobowy w okresie ciąży',
  w_wys_macierzynskiego: 'zasiłek w wysokości zasiłku macierzyńskiego',
  macierzynski: 'zasiłek macierzyński za okres urlopu macierzyńskiego',
  na_warunkach_macierzynskiego: 'zasiłek macierzyński za okres urlopu na warunkach urlopu macierzyńskiego',
  uzupelniajacy: 'zasiłek macierzyński za okres uzupełniającego urlopu macierzyńskiego',
  rodzicielski: 'zasiłek macierzyński za okres urlopu rodzicielskiego',
  ojcowski: 'zasiłek macierzyński za okres urlopu ojcowskiego',
  wychowawczy: 'urlop wychowawczy (bez zasiłku)',
  praca: 'praca',
  przerwa: 'przerwa',
};

/** '2027-01' → „styczeń 2027”. */
export function nazwaMiesiaca(m: MiesiacISO): string {
  const nr = Number(m.slice(5, 7)) - 1;
  return `${MIESIACE_MIANOWNIK[nr] ?? m} ${m.slice(0, 4)}`;
}

/** 81.5 → „81,5%”, 100 → „100%”. */
export function formatujStawke(proc: number): string {
  return `${String(Math.round(proc * 10) / 10).replace('.', ',')}%`;
}

/** 1 → „1 dzień”, 17 → „17 dni”. */
export function dniSlownie(n: number): string {
  return n === 1 ? '1 dzień' : `${n} dni`;
}

/** 0.5 → „1/2 etatu”. */
export function wymiarSlownie(w: number): string {
  if (w === 0.5) return '1/2 etatu';
  if (w === 0.25) return '1/4 etatu';
  return `${Math.round(w * 100)}% etatu`;
}

export function ktoWyplacaSlownie(kto: KtoWyplaca['kto'], nazwaPlatnika?: string): string {
  if (kto === 'ZUS') return 'ZUS';
  return nazwaPlatnika ? `płatnik: ${nazwaPlatnika}` : 'płatnik (pracodawca, zleceniodawca)';
}
