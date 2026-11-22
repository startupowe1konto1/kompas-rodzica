'use client';

import { useRef, useState } from 'react';
import { IconCircleCheck, IconFileText } from '@tabler/icons-react';
import { Karta, Przycisk } from '../ui';
import { LINKI } from '../../content/linki';
import { LinkZewnetrzny } from './LinkZewnetrzny';

/**
 * Symulacja wniosku o odpis aktu urodzenia. Nic nie wychodzi poza przeglądarkę:
 * żadnych zapytań do sieci i żadnych zapisanych danych.
 */
export function OdpisAktu() {
  const [zlozono, ustawZlozono] = useState(false);
  const potwierdzenie = useRef<HTMLDivElement>(null);

  function zloz() {
    ustawZlozono(true);
    // Fokus na potwierdzeniu, żeby czytnik ekranu je odczytał.
    requestAnimationFrame(() => potwierdzenie.current?.focus());
  }

  return (
    <Karta jako="section" aria-labelledby="odpis-tytul" className="flex flex-col gap-4">
      <div className="flex items-start gap-3">
        <span aria-hidden className="flex size-12 shrink-0 items-center justify-center rounded-komunikat bg-granat text-white">
          <IconFileText size={24} stroke={2} />
        </span>
        <div className="flex flex-col gap-1">
          <h2 id="odpis-tytul" className="text-lg font-bold leading-snug text-granat lg:text-xl">
            Odpis aktu urodzenia
          </h2>
          <p className="max-w-prose leading-normal text-tekst-drugi">
            Odpis skrócony aktu urodzenia jest potrzebny płatnikowi zasiłku. Tu można przećwiczyć, jak wygląda składanie wniosku. To symulacja:
            nic nie wysyłamy i niczego nie zapisujemy.
          </p>
        </div>
      </div>

      {zlozono ? (
        <div
          ref={potwierdzenie}
          tabIndex={-1}
          role="status"
          data-stan="zlozono-symulacja"
          className="flex gap-3 rounded-komunikat bg-szary-kafel p-4 outline-none"
        >
          <IconCircleCheck size={24} stroke={2} aria-hidden className="mt-0.5 shrink-0 text-zielen" />
          <div className="flex flex-col gap-1">
            <p className="font-bold text-granat">Gotowe. Wniosek złożony w symulacji.</p>
            <p className="max-w-prose leading-normal">
              Nikt go nie dostał, bo to tylko ćwiczenie. Prawdziwy odpis można zamówić na oficjalnej stronie, przez internet albo w urzędzie stanu
              cywilnego. Można to zrobić wtedy, gdy przyjdzie na to dobry moment.
            </p>
            <LinkZewnetrzny href={LINKI.odpisAktuStanuCywilnego.url}>{LINKI.odpisAktuStanuCywilnego.nazwa}</LinkZewnetrzny>
          </div>
        </div>
      ) : (
        <div className="*:w-full sm:*:w-auto">
          <Przycisk wariant="glowny" onClick={zloz}>
            Złóż wniosek o odpis aktu urodzenia (symulacja)
          </Przycisk>
        </div>
      )}
    </Karta>
  );
}
