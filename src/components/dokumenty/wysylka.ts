/**
 * Teksty symulowanej wysyłki wniosku zależnie od adresata (`Dokument.gdzie`). Opis zadania ZUS, pkt 3: „symulacja
 * wypełnienia wniosków o urlopy i świadczenia (…) i ewentualnie przesłanie ich do pracodawcy/ZUS”. Wniosek o urlop
 * trafia do pracodawcy, więc przycisk nie może mówić o eZUS.
 */
import type { Dokument } from '../../engine/types';

export interface TekstyWysylki {
  przycisk: string;
  naglowek: string;
  opis: string;
}

const TEKSTY: Record<Dokument['gdzie'], TekstyWysylki> = {
  pracodawca: {
    przycisk: 'Wyślij do pracodawcy (symulacja)',
    naglowek: 'Wniosek wysłany do pracodawcy w symulacji',
    opis: 'To tylko pokaz. Nic nie zostało wysłane do pracodawcy ani do nikogo innego. Prawdziwy wniosek składa się u pracodawcy, w sposób przyjęty w firmie (np. papierowo albo elektronicznie).',
  },
  platnik: {
    przycisk: 'Wyślij do płatnika (symulacja)',
    naglowek: 'Wniosek wysłany do płatnika w symulacji',
    opis: 'To tylko pokaz. Nic nie zostało wysłane do płatnika ani do nikogo innego. Prawdziwy wniosek składa się u płatnika, np. zleceniodawcy.',
  },
  ZUS: {
    przycisk: 'Złóż w eZUS (symulacja)',
    naglowek: 'Wniosek złożony w eZUS w symulacji',
    opis: 'To tylko pokaz. Nic nie zostało wysłane do ZUS ani do nikogo innego. Prawdziwy wniosek można złożyć w eZUS albo w placówce ZUS.',
  },
};

export function tekstyWysylki(gdzie: Dokument['gdzie']): TekstyWysylki {
  return TEKSTY[gdzie];
}
