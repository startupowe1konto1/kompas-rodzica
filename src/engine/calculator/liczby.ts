/**
 * Arytmetyka kalkulatora na groszach (liczby całkowite), żeby nie gubić groszy
 * na liczbach zmiennoprzecinkowych. Wynik zawsze kończy w `doGrosza`.
 */
import { doGrosza } from '../pieniadze';
import type { Parametry } from '../types';

const grosze = (kwota: number) => Math.round(kwota * 100);
const punktyBazowe = (procent: number) => Math.round(procent * 100); // 86,29% → 8629

/** kwota × procent%, liczone na groszach; wynik do grosza, połówki w górę. */
export function procentZ(kwota: number, procent: number): number {
  return doGrosza(Math.round((grosze(kwota) * punktyBazowe(procent)) / 10_000) / 100);
}

/**
 * Kwota po odliczeniu składek finansowanych przez ubezpieczonego: kwota × (100% − p.kwoty.skladkiPracownikaProc).
 * Mnożymy przez (100% − 13,71%), a nie odejmujemy zaokrąglonej składki: tylko tak wychodzi wynik z załącznika ZUS.
 */
// UZ art. 3 pkt 3 i 4
export function poOdliczeniuSkladek(kwota: number, p: Parametry): number {
  return procentZ(kwota, 100 - p.kwoty.skladkiPracownikaProc);
}

/**
 * Stawka dzienna zasiłku: podstawa ÷ dniWMiesiacu × stawkaProc%, zaokrąglona raz, do grosza.
 * Dzielnik ≤ 0 albo nie-liczba (błędne parametry) daje 0 zamiast Infinity/NaN; panel admina i tak go odrzuca.
 */
// UZ art. 36 ust. 3
export function stawkaDzienna(podstawa: number, stawkaProc: number, dniWMiesiacu: number): number {
  if (!(dniWMiesiacu > 0)) return 0;
  return doGrosza(Math.round((grosze(podstawa) * punktyBazowe(stawkaProc)) / (10_000 * dniWMiesiacu)) / 100);
}

/** kwotaDzienna × dni, liczone na groszach. */
export function razyDni(kwotaDzienna: number, dni: number): number {
  return doGrosza((grosze(kwotaDzienna) * dni) / 100);
}

/** '8000,00 zł' – dwa miejsca po przecinku, bez separatora tysięcy. */
export function zl(kwota: number): string {
  return `${kwota.toFixed(2).replace('.', ',')} zł`;
}

/** '100%', '13,71%', '81,5%' – przecinek dziesiętny, bez zbędnych zer. */
export function proc(wartosc: number): string {
  return `${String(Math.round(wartosc * 100) / 100).replace('.', ',')}%`;
}
