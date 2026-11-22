// Zapis parametrów z panelu admina. Odczyt jest w `api.parametry()` (src/lib/api.ts, plik integratora).
// Hasło trafia tylko do nagłówka żądania; nie jest nigdzie zapisywane ani logowane.
import { BladApi } from '@/src/lib/api';
import type { Parametry } from '@/src/engine/types';
import type { StatusAktu } from '@/src/server/eli';

export interface OdpowiedzZapisu {
  wersje: Parametry[];
  /** false = magazyn tylko w pamięci serwera; zmiany znikną po jego restarcie. */
  trwale: boolean;
}

async function put(haslo: string, cialo: unknown): Promise<OdpowiedzZapisu> {
  let odp: Response;
  try {
    odp = await fetch('/api/admin/params', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'x-admin-haslo': haslo },
      body: JSON.stringify(cialo),
    });
  } catch {
    throw new BladApi('Brak połączenia z serwerem. Sprawdź internet i spróbuj ponownie.', 0);
  }
  const json = await odp.json().catch(() => ({ blad: 'Serwer zwrócił nieczytelną odpowiedź.' }));
  if (!odp.ok) throw new BladApi(json?.blad ?? `Błąd ${odp.status}`, odp.status);
  if (!Array.isArray(json?.wersje) || typeof json.trwale !== 'boolean') {
    throw new BladApi('Serwer zwrócił nieoczekiwaną odpowiedź. Odśwież stronę i sprawdź, czy zmiany zostały zapisane.', odp.status);
  }
  return json as OdpowiedzZapisu;
}

/** Zapisuje komplet wersji (PUT { wersje }). */
export function zapiszParametry(haslo: string, wersje: Parametry[]): Promise<OdpowiedzZapisu> {
  return put(haslo, { wersje });
}

/** Przywraca wersje domyślne (PUT { przywrocDomyslne: true }). */
export function przywrocDomyslneParametry(haslo: string): Promise<OdpowiedzZapisu> {
  return put(haslo, { przywrocDomyslne: true });
}

/**
 * Komunikat po zapisie albo przywróceniu wartości domyślnych. Przy `trwale: false` zapis jest tylko w pamięci
 * jednego procesu serwera: na hostingu z kilkoma instancjami inne mogą liczyć jeszcze na starych wartościach.
 */
export function komunikatPoZapisie(
  akcja: 'zapis' | 'przywrocenie',
  trwale: boolean,
): { rodzaj: 'ok' | 'ostrzezenie'; tekst: string } {
  if (trwale) {
    return {
      rodzaj: 'ok',
      tekst: akcja === 'zapis' ? 'Zapisano zmiany. Kalkulator używa już nowych wartości.' : 'Przywrócono wartości domyślne.',
    };
  }
  const co = akcja === 'zapis' ? 'Zapisano' : 'Przywrócono wartości domyślne';
  return {
    rodzaj: 'ostrzezenie',
    tekst: `${co} w pamięci tego serwera. Zmiany działają do restartu, a na hostingu z kilkoma instancjami mogą nie obejmować wszystkich zapytań.`,
  };
}

/** Status aktów prawnych z API ELI Sejmu (GET /api/admin/eli). Zwraca null, gdy trasa nie odpowiada – wtedy panel pokazuje same linki. */
export async function pobierzStatusyAktow(): Promise<StatusAktu[] | null> {
  try {
    const odp = await fetch('/api/admin/eli');
    if (!odp.ok) return null;
    const json: unknown = await odp.json();
    return Array.isArray(json) ? (json as StatusAktu[]) : null;
  } catch {
    return null;
  }
}
