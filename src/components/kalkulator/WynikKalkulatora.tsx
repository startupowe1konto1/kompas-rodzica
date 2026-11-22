'use client';

import { IconArrowRight } from '@tabler/icons-react';
import type { Rodzina } from '../../engine/types';
import { formatujDate, formatujKwote, formatujOkres } from '../format';
import { NAZWY_TYPOW } from '../os-czasu/teksty';
import { KafelLiczby, Karta, Przycisk, polacz } from '../ui';
import { etykietaOsoby } from '../wynik/etykiety';
import { SekcjaUprawnien } from '../wynik/SekcjaUprawnien';
import { kwotaMiesiecznaNaStart, formatujStawke, formatujTygodnie, wierszeRodzicow } from './podsumowanie';
import type { WynikKalkulatora as Wynik } from './policz';

interface Props {
  rodzina: Rodzina;
  wynik: Wynik;
  /** Trwa przeliczanie: stary wynik zostaje na ekranie, lekko przygaszony. */
  przelicza: boolean;
  onPrzenies: () => void;
}

const BEZ_ODSWIEZANIA = () => {};

/** Wynik szybkiego kalkulatora: para kafli z kwotami, okresy każdego rodzica, statusy uprawnień. */
export function WynikKalkulatora({ rodzina, wynik, przelicza, onPrzenies }: Props) {
  const { plan, kwoty, uprawnienia } = wynik;
  const wiersze = plan && kwoty ? wierszeRodzicow(rodzina, plan, kwoty) : [];
  const start = kwotaMiesiecznaNaStart(wiersze);

  return (
    <div className={polacz('flex flex-col gap-4', przelicza && 'opacity-60 transition-opacity motion-reduce:transition-none')} aria-busy={przelicza}>
      {plan && kwoty ? (
        <>
          <div className="grid gap-3 sm:grid-cols-2">
            <KafelLiczby
              kolor="zielen-noc"
              etykieta={start ? `Miesięcznie na początku urlopu: ${etykietaOsoby(rodzina, start.wiersz.osobaId)}` : 'Miesięcznie na początku urlopu'}
              wartosc={<span data-kwota-miesiecznie>{start ? formatujKwote(start.okres.miesiecznie) : '—'}</span>}
              podpis={
                start
                  ? `Brutto, ${NAZWY_TYPOW[start.okres.odcinek.typ].toLowerCase()}, ${formatujOkres(start.okres.od, start.okres.do, { krotko: true })}`
                  : 'Brutto, za pełny miesiąc'
              }
            />
            <KafelLiczby
              kolor="zielen"
              etykieta="Razem za cały urlop (rodzina)"
              wartosc={<span data-suma-razem>{formatujKwote(kwoty.sumaRazem)}</span>}
              podpis={plan.wariant815 ? 'Brutto, wariant 81,5% przez cały okres' : 'Brutto, 100% potem 70%'}
            />
          </div>

          {wiersze.map((w) => (
            <Karta key={w.osobaId} jako="section" aria-labelledby={`kalk-${w.osobaId}`} data-osoba-wynik={w.osobaId} data-rola={w.rola} className="flex flex-col gap-3">
              <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                <h3 id={`kalk-${w.osobaId}`} className="text-lg font-black text-granat">
                  {etykietaOsoby(rodzina, w.osobaId)}
                </h3>
                <p className="font-bold tabular-nums">
                  Razem: <span data-suma-osoby={w.osobaId}>{formatujKwote(w.razem)}</span>
                </p>
              </div>
              <ul className="flex flex-col divide-y divide-szary-linia">
                {w.okresy.map((o) => (
                  <li
                    key={o.odcinek.id}
                    data-typ={o.odcinek.typ}
                    data-odcinek={o.odcinek.id}
                    className="flex flex-col gap-1 py-3 first:pt-0 last:pb-0 sm:flex-row sm:items-baseline sm:justify-between sm:gap-4"
                  >
                    <div className="flex flex-col">
                      <span className="font-bold">{NAZWY_TYPOW[o.odcinek.typ]}</span>
                      <span className="text-tekst-drugi">{formatujOkres(o.od, o.do)}</span>
                    </div>
                    <div className="flex flex-col sm:items-end">
                      <span className="font-bold tabular-nums">{formatujKwote(o.razem)}</span>
                      <span className="text-sm text-tekst-drugi tabular-nums">
                        {formatujTygodnie(o.tygodnie)} tyg., {formatujStawke(o.stawkaProc)} podstawy
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            </Karta>
          ))}
        </>
      ) : (
        <Karta data-stan="bez-planu" className="flex flex-col gap-2">
          <h2 className="text-lg font-black text-granat">Nie ma z czego policzyć zasiłku</h2>
          <p className="max-w-prose leading-normal">
            Przy tych danych nie powstał plan urlopu z zasiłkiem. Powody są niżej, przy każdym świadczeniu.
          </p>
        </Karta>
      )}

      <SekcjaUprawnien dane={uprawnienia} laduje={false} blad={null} odswiez={BEZ_ODSWIEZANIA} rodzina={rodzina} />

      <p className="text-tekst-drugi">
        To symulacja. Wynik nie jest decyzją ZUS. Obliczono na dzień {formatujDate(rodzina.dataAnalizy)}.
      </p>

      {plan && (
        <Przycisk wariant="drugi" ikona={<IconArrowRight size={20} />} onClick={onPrzenies} pelnaSzerokosc className="sm:w-auto sm:self-start" data-akcja="przenies-do-planera">
          Przenieś do planera
        </Przycisk>
      )}
    </div>
  );
}
