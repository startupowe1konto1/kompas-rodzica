import { useId } from 'react';
import type { ReactNode } from 'react';
import { IconCalendarEvent } from '@tabler/icons-react';
import { Data } from './Data';
import { polacz, KLASY_H3, type PoziomNaglowka } from './klasy';

export interface KomunikatTerminProps {
  /** Co trzeba zrobić, np. „Wniosek o zasiłek w wysokości 81,5%”. Data dochodzi po dwukropku. */
  tytul: string;
  /** Termin 'RRRR-MM-DD'. */
  data: string;
  /** Jedno zdanie wyjaśnienia. */
  opis: ReactNode;
  /** Przycisk po prawej (na telefonie pod tekstem, na całą szerokość), zwykle <Przycisk wariant="na-bursztynie">. */
  akcja?: ReactNode;
  poziomNaglowka?: PoziomNaglowka;
  /**
   * Kolor tła. 'bursztyn' (domyślny): tekst granat 6,1:1, akcja `na-bursztynie`.
   * 'zielen' (kalendarz, uwaga testerki 22.11: bursztyn był za agresywny): biały tekst 5,6:1, akcja `drugi` (biała).
   */
  ton?: 'bursztyn' | 'zielen';
  className?: string;
}

// Na zieleni obrys fokusu jest biały (granat ma tu za mały kontrast), jak w stopce.
const TONY = { bursztyn: 'bg-bursztyn text-granat', zielen: 'bg-zielen text-white [&_*:focus-visible]:outline-white!' } as const;

/**
 * Komunikat „termin / zrób teraz” (wariant A z design.md): pełny bursztyn z tekstem granat albo pełna zieleń z białym tekstem,
 * ikona kalendarza 24 px, nagłówek 700 z datą, jedno zdanie, akcja po prawej.
 */
export function KomunikatTermin({ tytul, data, opis, akcja, poziomNaglowka = 3, ton = 'bursztyn', className }: KomunikatTerminProps) {
  const id = useId();
  const Naglowek = `h${poziomNaglowka}` as const;
  return (
    <section
      aria-labelledby={id}
      className={polacz('flex flex-col gap-4 rounded-komunikat p-4 sm:flex-row sm:items-center lg:p-6', TONY[ton], className)}
    >
      <div className="flex min-w-0 flex-1 gap-3">
        <IconCalendarEvent size={24} stroke={2} aria-hidden className="mt-0.5 shrink-0" />
        <div className="flex min-w-0 flex-col gap-1">
          <Naglowek id={id} className={KLASY_H3}>
            <span className="sr-only">Termin: </span>
            {tytul}: <Data iso={data} />
          </Naglowek>
          <p className="max-w-prose leading-normal">{opis}</p>
        </div>
      </div>
      {akcja && <div className="shrink-0 *:w-full sm:*:w-auto">{akcja}</div>}
    </section>
  );
}
