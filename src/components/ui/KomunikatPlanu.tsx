import { IconAlertTriangle, IconArrowRight, IconCircleX, IconInfoCircle } from '@tabler/icons-react';
import type { Icon } from '@tabler/icons-react';
import type { Komunikat, PoziomKomunikatu } from '../../engine/types';
import { polacz } from './klasy';

export interface KomunikatPlanuProps {
  /** Komunikat z silnika: poziom, tresc, przepis?, coZrobic?. */
  komunikat: Pick<Komunikat, 'poziom' | 'tresc' | 'przepis' | 'coZrobic'>;
  className?: string;
}

interface StylPoziomu {
  klasy: string;
  /** Widoczne słowo – kolor nigdy nie niesie znaczenia sam. */
  etykieta: string;
  Ikona: Icon;
}

/**
 * Kolory poziomów (pełne tła, bez pasteli):
 *  - blad → czerwień, biały tekst („nie można, bo…”, blokuje plan),
 *  - ostrzezenie → bursztyn, granat,
 *  - konsekwencja → granat-ciemny, biały,
 *  - info → niebieski info, biały.
 */
const STYLE: Record<PoziomKomunikatu, StylPoziomu> = {
  blad: { klasy: 'bg-blad text-white', etykieta: 'Błąd w planie', Ikona: IconCircleX },
  ostrzezenie: { klasy: 'bg-bursztyn text-granat', etykieta: 'Uwaga', Ikona: IconAlertTriangle },
  konsekwencja: { klasy: 'bg-granat-ciemny text-white', etykieta: 'Co z tego wynika', Ikona: IconArrowRight },
  info: { klasy: 'bg-info text-white', etykieta: 'Informacja', Ikona: IconInfoCircle },
};

/** Komunikat walidacji planu. Dla komunikatów pojawiających się na żywo owiń listę w kontener z aria-live. */
export function KomunikatPlanu({ komunikat, className }: KomunikatPlanuProps) {
  const { klasy, etykieta, Ikona } = STYLE[komunikat.poziom];
  return (
    <div className={polacz('flex gap-3 rounded-komunikat p-4 lg:px-6', klasy, className)}>
      <Ikona size={24} stroke={2} aria-hidden className="mt-0.5 shrink-0" />
      <div className="flex min-w-0 flex-col gap-1">
        <p className="text-sm font-bold uppercase tracking-wide">{etykieta}</p>
        <p className="max-w-prose font-bold leading-normal">{komunikat.tresc}</p>
        {komunikat.coZrobic && (
          <p className="max-w-prose leading-normal">
            <span className="font-bold">Co można zrobić: </span>
            {komunikat.coZrobic}
          </p>
        )}
        {komunikat.przepis && <p className="text-sm">Przepis: {komunikat.przepis}</p>}
      </div>
    </div>
  );
}
