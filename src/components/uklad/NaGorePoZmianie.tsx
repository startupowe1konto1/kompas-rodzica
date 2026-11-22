'use client';

import { usePathname } from 'next/navigation';
import { useEffect, useLayoutEffect } from 'react';

// useLayoutEffect w przeglądarce (przewinięcie przed pierwszym malowaniem), useEffect na serwerze (bez ostrzeżenia).
const useIzomorficznyLayoutEffect = typeof window === 'undefined' ? useEffect : useLayoutEffect;

/**
 * Po każdej zmianie ekranu – także po cofnięciu się przyciskiem przeglądarki – strona zaczyna się od góry
 * (uwaga zespołu 21.11: przy powrocie z innej karty lądowało się w środku długiej strony).
 * Wyjątek: adres z kotwicą (#decyzja-…), wtedy przewija ekran docelowy.
 */
export function NaGorePoZmianie() {
  const sciezka = usePathname();

  useEffect(() => {
    if ('scrollRestoration' in window.history) window.history.scrollRestoration = 'manual';
  }, []);

  useIzomorficznyLayoutEffect(() => {
    if (window.location.hash) return;
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }, [sciezka]);

  return null;
}
