/**
 * Pomocniki akcji na osi czasu – TOR A, zadanie A6. Używają ich `akcje.ts`, `akcjeLaczenie.ts`, `akcjePorod.ts`.
 */
import { ubezpieczenieWDniu } from '../eligibility/ubezpieczenie';
import type { DataISO, Komunikat, Odcinek, Osoba, Parametry, Rodzina } from '../types';

/** Komunikat dla akcji, której nie da się wykonać. Plan zostaje bez zmian. */
export function niemozliwe(tresc: string, odcinekId?: string, przepis?: string): Komunikat {
  return {
    kod: 'AKCJA_NIEMOZLIWA',
    poziom: 'blad',
    tresc,
    ...(odcinekId !== undefined ? { odcinekId } : {}),
    ...(przepis !== undefined ? { przepis } : {}),
  };
}

export function znajdzOsobe(rodzina: Rodzina, osobaId: string): Osoba | undefined {
  return rodzina.osoby.find((o) => o.id === osobaId);
}

/**
 * Odcinek z `tytulId` tytułu, z którego osoba jest ubezpieczona w dniu `dzien`.
 * Gdy w tym dniu nie ma ubezpieczenia chorobowego – odcinek bez `tytulId` (walidacja powie dlaczego).
 */
export function zTytulem(odcinek: Odcinek, osoba: Osoba, dzien: DataISO, rodzina: Rodzina, p: Parametry): Odcinek {
  const wynik: Odcinek = { ...odcinek };
  delete wynik.tytulId;
  const { tytulId } = ubezpieczenieWDniu(osoba, dzien, p, rodzina);
  return tytulId !== undefined ? { ...wynik, tytulId } : wynik;
}
