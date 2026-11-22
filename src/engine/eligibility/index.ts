/**
 * UPRAWNIENIA I PULE – TOR A (Oskar). Składa wynik z czterech modułów:
 * pule (A1), uprawnienia (A2), możliwości i ryzyka (A3). Plan: docs/superpowers/plans/2026-11-21-tor-a.md.
 */
import { parametryNaDzien } from '../params';
import type { Parametry, Rodzina, WynikUprawnien } from '../types';
import { ustalMozliwosci } from './mozliwosci';
import { ustalPule } from './pule';
import { ustalRyzyka } from './ryzyka';
import { ustalListeUprawnien } from './uprawnienia';

export { ustalPule } from './pule';
export { poczatekCiazy, ubezpieczenieWDniu } from './ubezpieczenie';
export type { UbezpieczenieWDniu } from './ubezpieczenie';

export function ustalUprawnienia(rodzina: Rodzina, wersje: Parametry[]): WynikUprawnien {
  const p = parametryNaDzien(rodzina.zdarzenie.data, wersje);
  const pule = ustalPule(rodzina, p);
  return {
    uprawnienia: ustalListeUprawnien(rodzina, pule, p),
    pule,
    mozliwosci: ustalMozliwosci(rodzina, pule, p),
    ryzyka: ustalRyzyka(rodzina, pule, p),
  };
}
