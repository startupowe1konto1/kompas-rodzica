'use client';

import { IconChevronRight, IconUser } from '@tabler/icons-react';
import type { PersonaTestowa } from '@/src/engine/types';
import { api } from '@/src/lib/api';
import { useZapytanie } from '@/src/state/useZapytanie';
import { StanBledu, StanLadowania } from '../ui';

export interface ListaPersonProps {
  onWybor: (persona: PersonaTestowa) => void;
}

/**
 * Lista person testowych do symulowanego logowania (krok po wyborze metody w węźle login.gov.pl). Każda persona to jeden duży przycisk
 * (nazwa + opis), bez logotypów: usługę nazywamy słowami „mObywatel (symulacja)”.
 */
export function ListaPerson({ onWybor }: ListaPersonProps) {
  const { dane, laduje, blad, odswiez } = useZapytanie('persony', api.persony);

  if (blad) {
    return <StanBledu tytul="Nie udało się wczytać listy osób" opis={blad.komunikat} onPonow={odswiez} ponawia={laduje} />;
  }
  if (!dane) return <StanLadowania etykieta="Wczytujemy listę osób…" wiersze={2} kafel={false} />;

  return (
    <ul className="grid gap-3 md:grid-cols-2" aria-label="Osoby testowe">
      {dane.map((persona) => (
        // Kafle w jednym wierszu siatki mają równą wysokość (flex + h-full), niezależnie od długości opisu.
        <li key={persona.id} className="flex">
          <button
            type="button"
            data-persona={persona.id}
            onClick={() => onWybor(persona)}
            className="flex h-full min-h-16 w-full items-start gap-3 rounded-karta bg-white p-4 text-left transition-colors hover:bg-szary-kafel lg:p-5"
          >
            <span aria-hidden className="mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-komunikat bg-granat text-white">
              <IconUser size={22} stroke={2} />
            </span>
            <span className="flex flex-1 flex-col gap-1">
              <span className="text-lg font-bold leading-snug text-tekst">{persona.nazwa}</span>
              <span className="leading-normal text-tekst-drugi">{persona.opis}</span>
            </span>
            <IconChevronRight size={24} stroke={2} aria-hidden className="mt-2 shrink-0 text-zielen" />
          </button>
        </li>
      ))}
    </ul>
  );
}
