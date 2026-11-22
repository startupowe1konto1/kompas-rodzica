/**
 * Zewnętrzny magazyn profilu dla `useSyncExternalStore`: stan w pamięci + kopia w localStorage.
 * Schowek przychodzi z fabryki, więc w testach (Node) podajemy atrapę, a w przeglądarce `window.localStorage`.
 * Każdy dostęp do schowka jest w try/catch: tryb prywatny, pełny dysk albo zablokowane ciasteczka
 * nie mogą wywrócić aplikacji – wtedy profil żyje tylko w pamięci karty.
 */
import { KLUCZ_MAGAZYNU, PUSTY_PROFIL, deserializuj, serializuj, type StanProfilu } from './magazyn';

/** To, czego używamy z `Storage`. */
export type Schowek = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

export interface SklepProfilu {
  /** Aktualny stan; ten sam obiekt, dopóki nic się nie zmieni (wymóg `useSyncExternalStore`). */
  pobierz(): StanProfilu;
  subskrybuj(sluchacz: () => void): () => void;
  zmien(fn: (stan: StanProfilu) => StanProfilu): void;
  wyczysc(): void;
  /** Ponowny odczyt schowka, np. po zdarzeniu `storage` z innej karty. */
  wczytajPonownie(): void;
}

export function utworzSklepProfilu(fabrykaSchowka: () => Schowek | null): SklepProfilu {
  let stan: StanProfilu | null = null;
  const sluchacze = new Set<() => void>();

  function schowek(): Schowek | null {
    try {
      return fabrykaSchowka();
    } catch {
      return null;
    }
  }

  function odczytaj(): StanProfilu {
    try {
      return deserializuj(schowek()?.getItem(KLUCZ_MAGAZYNU)) ?? PUSTY_PROFIL;
    } catch {
      return PUSTY_PROFIL;
    }
  }

  function powiadom() {
    sluchacze.forEach((s) => s());
  }

  function pobierz(): StanProfilu {
    if (stan === null) stan = odczytaj();
    return stan;
  }

  return {
    pobierz,
    subskrybuj(sluchacz) {
      sluchacze.add(sluchacz);
      return () => {
        sluchacze.delete(sluchacz);
      };
    },
    zmien(fn) {
      const poprzedni = pobierz();
      const nowy = fn(poprzedni);
      if (nowy === poprzedni) return;
      stan = nowy;
      try {
        schowek()?.setItem(KLUCZ_MAGAZYNU, serializuj(nowy));
      } catch {
        // Brak miejsca albo zablokowany schowek: zostaje stan w pamięci.
      }
      powiadom();
    },
    wyczysc() {
      stan = PUSTY_PROFIL;
      try {
        schowek()?.removeItem(KLUCZ_MAGAZYNU);
      } catch {
        // jak wyżej
      }
      powiadom();
    },
    wczytajPonownie() {
      stan = odczytaj();
      powiadom();
    },
  };
}
