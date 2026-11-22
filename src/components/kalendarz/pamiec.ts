'use client';

/**
 * Które karty terminów rodzic rozwinął (K4): pamiętane w sessionStorage tylko na czas sesji karty
 * przeglądarki, żeby po powrocie z innego kroku szczegóły były tam, gdzie je zostawił.
 * Trzymamy wyłącznie klucze terminów (data + kod), żadnych danych osobowych.
 */
import { useCallback, useMemo, useSyncExternalStore } from 'react';

const KLUCZ = 'zasilkowy-przewodnik:kalendarz-otwarte';
const sluchacze = new Set<() => void>();

function odczytaj(): string {
  try {
    return window.sessionStorage.getItem(KLUCZ) ?? '';
  } catch {
    return '';
  }
}

function subskrybuj(zmiana: () => void) {
  sluchacze.add(zmiana);
  return () => sluchacze.delete(zmiana);
}

export function useOtwarteKarty() {
  const surowe = useSyncExternalStore(subskrybuj, odczytaj, () => '');
  const otwarte = useMemo(() => new Set(surowe ? surowe.split('\n') : []), [surowe]);

  const ustaw = useCallback((klucz: string, otwarta: boolean) => {
    const zbior = new Set(odczytaj().split('\n').filter(Boolean));
    if (zbior.has(klucz) === otwarta) return;
    if (otwarta) zbior.add(klucz);
    else zbior.delete(klucz);
    try {
      window.sessionStorage.setItem(KLUCZ, [...zbior].join('\n'));
    } catch {
      // Bez sessionStorage (tryb prywatny) karta po prostu nie zapamięta stanu.
    }
    sluchacze.forEach((s) => s());
  }, []);

  return { otwarte, ustaw };
}
