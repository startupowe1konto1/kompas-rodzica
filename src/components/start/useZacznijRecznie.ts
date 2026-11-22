'use client';

import { dzisISO, useProfil } from '@/src/state/profil';
import { pustaRodzina } from './zrodla-startu';

/**
 * Wejście „Wpisz dane ręcznie” (także „Kontynuuj bez logowania” i odmowa zgody na pobranie danych).
 * Zaczyna od czystego profilu, gdy zapisany profil pochodzi z usług (persona, mObywatel, eZUS,
 * odczyt PDF). Profil wpisany ręcznie (bez źródeł) zostaje: to kontynuacja.
 * Zwraca funkcję do wywołania przy kliknięciu, przed przejściem na /sytuacja.
 */
export function useZacznijRecznie(): () => void {
  const profil = useProfil();
  return () => {
    if (!profil.gotowy || profil.pochodzenie.length === 0) return;
    const pusta = pustaRodzina(dzisISO());
    profil.ustawRodzine(pusta.rodzina);
    profil.ustawPochodzenie(pusta.pochodzenie);
    profil.ustawDoPotwierdzenia(pusta.doPotwierdzenia);
    profil.ustawPlany([]);
  };
}
