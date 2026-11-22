/** Czyste pomocnicze funkcje dla `useZapytanie`: klucz zapytania i przyjazny komunikat błędu. */
import { BladApi } from '../lib/api';

export interface BladZapytania {
  /** Zdanie dla rodzica, prostym językiem. */
  komunikat: string;
  /** Status HTTP; brak = nie udało się połączyć albo błąd poza API. */
  status?: number;
  /** Treść błędu z serwera – do konsoli albo rozwijanego „szczegóły”, nie jako główny komunikat. */
  szczegoly?: string;
}

/**
 * Klucz identyfikujący zapytanie. Ten sam klucz = te same dane wejściowe = nie pytamy drugi raz.
 * Gdy któreś wejście jest null/undefined, zwraca null – hook wtedy nie wysyła zapytania.
 */
export function kluczZapytania(nazwa: string, ...wejscia: unknown[]): string | null {
  if (wejscia.some((w) => w === null || w === undefined)) return null;
  return JSON.stringify([nazwa, ...wejscia]);
}

export function komunikatBledu(e: unknown): BladZapytania {
  if (e instanceof BladApi) {
    const szczegoly = e.message || undefined;
    if (e.status === 400 || e.status === 422) {
      return {
        komunikat: 'Brakuje części danych albo któraś odpowiedź jest niepoprawna. Proszę sprawdzić odpowiedzi i spróbować ponownie.',
        status: e.status,
        szczegoly,
      };
    }
    if (e.status === 404) {
      return { komunikat: 'Nie znaleźliśmy tej informacji. Proszę odświeżyć stronę albo wrócić do poprzedniego kroku.', status: e.status, szczegoly };
    }
    if (e.status === 501) {
      return { komunikat: 'Ta część przewodnika jest jeszcze w przygotowaniu.', status: e.status, szczegoly };
    }
    if (e.status >= 500) {
      return { komunikat: 'Coś poszło nie tak po naszej stronie. Proszę spróbować ponownie za chwilę.', status: e.status, szczegoly };
    }
    return { komunikat: 'Nie udało się pobrać wyniku. Proszę spróbować ponownie.', status: e.status, szczegoly };
  }
  // `fetch` rzuca TypeError, gdy nie ma połączenia z serwerem.
  if (e instanceof TypeError) {
    return {
      komunikat: 'Nie udało się połączyć z serwerem. Proszę sprawdzić połączenie z internetem i spróbować ponownie.',
      szczegoly: e.message || undefined,
    };
  }
  return {
    komunikat: 'Coś poszło nie tak. Proszę spróbować ponownie.',
    szczegoly: e instanceof Error ? e.message : undefined,
  };
}

/** Trasa jeszcze nie istnieje (404) albo nie jest zaimplementowana (501): pokazujemy „w przygotowaniu”. */
export function funkcjaNiegotowa(blad: { status?: number } | null | undefined): boolean {
  return blad?.status === 501 || blad?.status === 404;
}
