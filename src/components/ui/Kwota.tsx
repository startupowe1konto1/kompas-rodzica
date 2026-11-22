import { formatujKwote } from '../format';
import { polacz } from './klasy';

export type RozmiarKwoty = 'maly' | 'zwykly' | 'duzy' | 'glowny';

export interface KwotaProps {
  /** Kwota w złotych (np. 6903.2). */
  wartosc: number;
  /**
   * 'maly' 14 px, 'zwykly' jak tekst (dziedziczy), 'duzy' 22/24 px 700,
   * 'glowny' – kwota główna z design.md: 32 px telefon / 40 px komputer, 900.
   */
  rozmiar?: RozmiarKwoty;
  className?: string;
}

const ROZMIARY: Record<RozmiarKwoty, string> = {
  maly: 'text-sm',
  zwykly: '',
  duzy: 'text-[1.375rem] font-bold lg:text-2xl',
  glowny: 'text-[2rem] font-black leading-tight lg:text-[2.5rem]',
};

/** Kwota po polsku („6 903,20 zł”, twarde spacje), cyfry o stałej szerokości, bez łamania linii. */
export function Kwota({ wartosc, rozmiar = 'zwykly', className }: KwotaProps) {
  return <span className={polacz('whitespace-nowrap tabular-nums', ROZMIARY[rozmiar], className)}>{formatujKwote(wartosc)}</span>;
}
