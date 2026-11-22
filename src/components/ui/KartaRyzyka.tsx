import { useId } from 'react';
import { IconAlertTriangle } from '@tabler/icons-react';
import type { Ryzyko } from '../../engine/types';
import { formatujDate } from '../format';
import { polacz, KLASY_H3, type PoziomNaglowka } from './klasy';

export interface KartaRyzykaProps {
  /** Ryzyko z silnika: tytul, coMozeSieStac, dlaczego, coZrobic, coPrzygotowac?, przepis?. */
  ryzyko: Pick<Ryzyko, 'tytul' | 'coMozeSieStac' | 'dlaczego' | 'coZrobic' | 'coPrzygotowac' | 'przepis'>;
  poziomNaglowka?: PoziomNaglowka;
  /** Termin (RRRR-MM-DD): zwykła linia w karcie, nie osobny znacznik. */
  termin?: string;
  className?: string;
}

/**
 * Karta ryzyka: biała karta bez kolorowego paska przy krawędzi (decyzja Wojtka 22.11), ciemny tekst, ikona w bursztynie
 * (zmiana 21.11 – pełny granat był „za agresywny”). Trzy części (co może się stać, dlaczego, co możesz zrobić)
 * i opcjonalna lista dokumentów. Spokojnie: bez czerwieni, bez wielkich liter.
 */
export function KartaRyzyka({ ryzyko, poziomNaglowka = 3, termin, className }: KartaRyzykaProps) {
  const id = useId();
  const Naglowek = `h${poziomNaglowka}` as const;
  const czesci: [string, string][] = [
    ['Co może się stać', ryzyko.coMozeSieStac],
    ['Dlaczego', ryzyko.dlaczego],
    ['Co można zrobić', ryzyko.coZrobic],
  ];
  return (
    <article aria-labelledby={id} className={polacz('rounded-komunikat border border-szary-linia bg-white p-4 text-tekst lg:p-6', className)}>
      <div className="flex items-start gap-3">
        <IconAlertTriangle size={24} stroke={2} aria-hidden className="mt-0.5 shrink-0 text-bursztyn" />
        <div className="flex flex-col gap-1">
          <Naglowek id={id} className={polacz(KLASY_H3, 'text-granat')}>
            {ryzyko.tytul}
          </Naglowek>
          {termin && <p className="text-sm font-bold text-tekst-drugi">Termin: do {formatujDate(termin)}</p>}
        </div>
      </div>
      <dl className="mt-4 flex flex-col gap-3">
        {czesci.map(([etykieta, tresc]) => (
          <div key={etykieta} className="flex flex-col gap-0.5">
            <dt className="font-bold text-granat">{etykieta}</dt>
            <dd className="max-w-prose leading-normal">{tresc}</dd>
          </div>
        ))}
      </dl>
      {ryzyko.coPrzygotowac && ryzyko.coPrzygotowac.length > 0 && (
        <div className="mt-4 border-t border-szary-linia pt-4">
          <p className="font-bold text-granat">Co warto mieć przygotowane</p>
          <ul className="mt-2 flex list-disc flex-col gap-1 pl-5 marker:text-bursztyn">
            {ryzyko.coPrzygotowac.map((d) => (
              <li key={d} className="leading-normal">
                {d}
              </li>
            ))}
          </ul>
        </div>
      )}
      {ryzyko.przepis && <p className="mt-4 text-sm text-tekst-drugi">Podstawa prawna: {ryzyko.przepis}</p>}
    </article>
  );
}
