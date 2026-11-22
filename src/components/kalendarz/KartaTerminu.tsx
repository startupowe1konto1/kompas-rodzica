'use client';

/**
 * Karta terminu (K1, K2 – przegląd zespołu 21.11 wieczorem).
 * K1: zamiast pigułki „kropka + napis” pełny kolorowy blok po lewej stronie karty z dużą liczbą dni
 *     (zieleń = w ciągu 14 dni, czerwień = minął, granat = później). Kolor zawsze z tekstem.
 *     Zieleń zamiast bursztynu: testerka 22.11 uznała bursztyn za agresywny.
 * K2: na wierzchu tylko co, do kiedy, ile dni i akcje; opis, osoba, dokumenty i przepis pod „Szczegóły”.
 */
import { IconChevronDown, IconFileText, IconTimeline } from '@tabler/icons-react';
import type { Dokument, Rodzina } from '../../engine/types';
import { etykietaKtoSklada, etykietaOsoby } from '../wynik/etykiety';
import { Data, Przycisk, polacz } from '../ui';
import { kluczTerminu, opisDni } from './podglad';
import type { StanTerminu } from './terminy';
import type { Oznaczony } from './typy';

const GDZIE: Record<Dokument['gdzie'], string> = { pracodawca: 'u pracodawcy', platnik: 'u płatnika', ZUS: 'w ZUS' };

/**
 * Tło bloku dni; biały tekst na zieleni, szarości i granacie (5,6:1, 5,9:1 i 10,6:1).
 * Miniony termin bez czerwieni – była „agresywna” (decyzja Wojtka 22.11); spokojna szarość mówi, że to już za nami.
 */
export const TON_STANU: Record<StanTerminu, string> = {
  wkrotce: 'bg-zielen text-white',
  minal: 'bg-nie-przysluguje text-white',
  pozniej: 'bg-granat text-white',
};

/** Co znaczy data przy danym rodzaju terminu. */
function DoKiedy({ t }: { t: Oznaczony }) {
  const data = <Data iso={t.data} className="font-bold text-tekst" />;
  if (t.rodzaj === 'wniosek') return <>Wniosek należy złożyć najpóźniej {data}</>;
  if (t.rodzaj === 'graniczny') return <>Najpóźniej {data}</>;
  return data;
}

export function BlokDni({ t, className }: { t: Oznaczony; className?: string }) {
  const o = opisDni(t.zaIleDni);
  return (
    <span
      role="img"
      aria-label={o.etykieta}
      data-dni={t.zaIleDni}
      data-ton={t.stan}
      className={polacz('flex flex-col items-center justify-center text-center', TON_STANU[t.stan], className)}
    >
      {o.liczba !== null && <span className="text-[2rem] font-black leading-none tabular-nums">{o.liczba}</span>}
      <span className={polacz('font-bold leading-tight', o.liczba === null ? 'text-xl font-black' : 'text-sm')}>{o.jednostka}</span>
    </span>
  );
}

export interface KartaTerminuProps {
  t: Oznaczony;
  /** Numer części urlopu, gdy ten sam termin powtarza się dla kolejnych części (`czesciTerminow`). */
  czesc?: number;
  rodzina: Rodzina;
  dokumenty: Dokument[];
  otwarta: boolean;
  onPrzelacz: (otwarta: boolean) => void;
  onPokazNaOsi: () => void;
}

export function KartaTerminu({ t, czesc, rodzina, dokumenty, otwarta, onPrzelacz, onPokazNaOsi }: KartaTerminuProps) {
  const klucz = kluczTerminu(t);
  const doWypelnienia = dokumenty.some((d) => d.ktoSklada !== 'platnik');
  const maSzczegoly = Boolean(t.opis || t.osobaId || dokumenty.length || t.przepis);

  return (
    <li
      id={`termin-${klucz}`}
      data-termin={t.rodzaj}
      data-kod={t.kod}
      data-klucz={klucz}
      data-data={t.data}
      data-stan={t.stan}
      data-czesc={czesc}
      className="flex scroll-mt-4 overflow-hidden rounded-karta bg-white"
    >
      <BlokDni t={t} className="w-20 shrink-0 px-2 py-4 lg:w-24" />
      <div className="flex min-w-0 flex-1 flex-col gap-2 p-4 lg:px-6">
        <div className="flex flex-col gap-1">
          <h3 className="text-lg font-bold leading-snug text-granat lg:text-xl">
            {t.tytul}
            {czesc && ` – część ${czesc}`}
          </h3>
          <p className="text-tekst-drugi">
            <DoKiedy t={t} />
          </p>
        </div>

        {doWypelnienia && (
          <Przycisk href="/dokumenty" wariant="drugi" ikona={<IconFileText size={20} />} className="min-h-11 self-start px-3">
            Przygotuj wniosek
          </Przycisk>
        )}

        {/* „Szczegóły” i „Pokaż na osi” w jednym wierszu, żeby karta była niska (uwaga zespołu: jak najmniej miejsca). */}
        <div className="relative">
          {maSzczegoly ? (
            <details data-szczegoly open={otwarta} onToggle={(e) => onPrzelacz(e.currentTarget.open)} className="group">
              <summary className="flex min-h-11 w-fit cursor-pointer list-none items-center gap-1 rounded-przycisk font-bold text-granat [&::-webkit-details-marker]:hidden">
                Szczegóły
                <IconChevronDown
                  size={20}
                  stroke={2}
                  aria-hidden
                  className="transition-transform duration-150 group-open:rotate-180 motion-reduce:transition-none"
                />
              </summary>
              <div className="mt-2 flex flex-col gap-2 border-t border-szary-linia pt-3 text-base">
                {t.opis && (
                  <p data-opis className="max-w-prose leading-normal text-tekst-drugi">
                    {t.opis}
                  </p>
                )}
                {t.osobaId && (
                  <p className="text-tekst-drugi">
                    Dotyczy: <span className="font-bold text-tekst">{etykietaOsoby(rodzina, t.osobaId)}</span>
                  </p>
                )}
                {dokumenty.length > 0 && (
                  <ul className="flex flex-col gap-1 text-tekst-drugi">
                    {dokumenty.map((d) => (
                      <li key={`${d.kod}-${d.ktoSklada}-${d.odcinekId ?? ''}`}>
                        <span className="font-bold text-tekst">{d.nazwa}</span>. Składa: {etykietaKtoSklada(rodzina, d.ktoSklada)}, {GDZIE[d.gdzie]}.
                      </li>
                    ))}
                  </ul>
                )}
                {t.przepis && <p className="text-sm text-tekst-drugi">Podstawa: {t.przepis}</p>}
              </div>
            </details>
          ) : (
            <div className="min-h-11" />
          )}
          <button
            type="button"
            onClick={onPokazNaOsi}
            className="absolute top-0 right-0 inline-flex min-h-11 items-center gap-2 rounded-przycisk px-2 font-bold text-zielen underline-offset-4 hover:underline"
          >
            <IconTimeline size={20} stroke={2} aria-hidden />
            Pokaż na osi
          </button>
        </div>
      </div>
    </li>
  );
}
