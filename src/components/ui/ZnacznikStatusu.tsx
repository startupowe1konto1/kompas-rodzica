import { polacz } from './klasy';

/**
 * Kolor kropki = znaczenie (design.md): bursztyn „teraz / termin”, zieleń „gotowe / przysługuje”,
 * czerwień „po terminie”, granat „później”, info „do potwierdzenia”, szary „bez statusu”.
 */
export type TonStatusu = 'bursztyn' | 'zielen' | 'blad' | 'granat' | 'info' | 'szary';

export interface ZnacznikStatusuProps {
  /** Słowo statusu, np. „Teraz”, „Później”, „Po terminie”. Kropka nigdy nie niesie znaczenia sama. */
  etykieta: string;
  ton: TonStatusu;
  /** Liczba elementów w tym statusie, np. 3 dokumenty. */
  liczba?: number;
  /** Dla czytnika: co liczymy, np. „dokumenty” → „Teraz: 3 dokumenty”. */
  coLiczymy?: string;
  className?: string;
}

const KROPKI: Record<TonStatusu, string> = {
  bursztyn: 'bg-bursztyn ring-1 ring-granat/40',
  zielen: 'bg-zielen',
  blad: 'bg-blad',
  granat: 'bg-granat',
  info: 'bg-info',
  szary: 'bg-szary-ramka',
};

/** Mały, w pełni zaokrąglony znacznik statusu: kropka w kolorze + słowo + liczba („Teraz • 3”). */
export function ZnacznikStatusu({ etykieta, ton, liczba, coLiczymy, className }: ZnacznikStatusuProps) {
  return (
    <span
      className={polacz(
        'inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border border-szary-linia bg-white px-3 py-1 text-sm font-bold leading-tight text-tekst',
        className,
      )}
    >
      <span aria-hidden className={polacz('size-2.5 shrink-0 rounded-full', KROPKI[ton])} />
      <span>{etykieta}</span>
      {liczba !== undefined && (
        <>
          <span aria-hidden className="text-tekst-drugi">
            •
          </span>
          <span className="font-black tabular-nums">
            <span className="sr-only">: </span>
            {liczba}
            {coLiczymy && <span className="sr-only"> {coLiczymy}</span>}
          </span>
        </>
      )}
    </span>
  );
}
