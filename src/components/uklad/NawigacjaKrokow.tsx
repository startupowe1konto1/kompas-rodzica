'use client';

import type { ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { IconArrowLeft, IconArrowRight } from '@tabler/icons-react';
import { Przycisk } from '../ui';
import { sasiednieKroki } from './kroki';

interface Nadpisanie {
  etykieta?: string;
  ikona?: ReactNode;
}

interface NawigacjaKrokowProps {
  /** Inny tekst albo ikona „Dalej” (np. „Ułóż plan na osi czasu”); `false` chowa przycisk. */
  dalej?: Nadpisanie | false;
  /** `false` chowa „Wstecz”. */
  wstecz?: false;
}

/**
 * „Wstecz” i „Dalej” pod treścią ekranu ścieżki, zawsze w tym samym miejscu (uwaga z testów z użytkownikiem 22.11:
 * na Planie nie było jak przejść dalej, a przyciski cofania mają być „pod ręką”). Cel bierze z kroków ścieżki
 * (`kroki.ts`). Telefon: przyklejone do dołu okna, w zasięgu kciuka; komputer: zaraz pod treścią.
 */
export function NawigacjaKrokow({ dalej, wstecz }: NawigacjaKrokowProps) {
  const { poprzedni, nastepny } = sasiednieKroki(usePathname());
  const pokazWstecz = wstecz !== false && poprzedni !== null;
  const pokazDalej = dalej !== false && nastepny !== null;
  if (!pokazWstecz && !pokazDalej) return null;

  return (
    <nav
      aria-label="Następny krok"
      data-nawigacja-krokow
      className="sticky bottom-0 z-10 -mx-4 mt-2 flex gap-3 border-t border-szary-linia bg-tlo px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:static sm:mx-0 sm:justify-between sm:px-0 sm:pt-6 sm:pb-0"
    >
      {pokazWstecz && (
        <Przycisk href={poprzedni.sciezka} wariant="drugi" ikona={<IconArrowLeft size={20} aria-hidden />} className="shrink-0">
          <span className="sm:hidden">Wstecz</span>
          <span className="hidden sm:inline">Wstecz: {poprzedni.nazwa}</span>
        </Przycisk>
      )}
      {pokazDalej && (
        <Przycisk href={nastepny.sciezka} ikona={dalej?.ikona} className="ml-auto flex-1 sm:flex-none">
          {/* Tailwind ustawia svg jako blok: bez inline-flex strzałka spadałaby do drugiej linii. */}
          <span className="inline-flex items-center gap-2">
            {dalej?.etykieta ?? `Dalej: ${nastepny.nazwa}`}
            {!dalej?.ikona && <IconArrowRight size={20} aria-hidden className="shrink-0" />}
          </span>
        </Przycisk>
      )}
    </nav>
  );
}
