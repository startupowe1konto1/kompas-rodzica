import type { Rodzina, WykorzystaniePuli } from '../../engine/types';
import { LicznikPuli, type KolorPuli } from '../ui';
import { etykietaOsoby } from '../wynik/etykiety';
import { licznikiPul, type LicznikPuliDane } from './liczniki';
import { kreski, opisLicznika, zdaniePrzepadnie } from './opisy';

export const NAZWY_PUL = {
  macierzynski: 'Urlop macierzyński',
  uzupelniajacy: 'Urlop uzupełniający',
  rodzicielski: 'Urlop rodzicielski',
  rodzicielski_nieprzenoszalne: 'Urlop rodzicielski, część tylko dla jednego rodzica',
  ojcowski: 'Urlop ojcowski',
} as const;

const KOLORY_PUL: Record<keyof typeof NAZWY_PUL, KolorPuli> = {
  macierzynski: 'macierzynski',
  uzupelniajacy: 'uzupelniajacy',
  rodzicielski: 'rodzicielski',
  rodzicielski_nieprzenoszalne: 'rodzicielski',
  ojcowski: 'ojcowski',
};

/** Jeden licznik: nazwa, zdanie „Zostało 9 z 41 tygodni”, pasek (1 kreska = 1 tydzień) i legenda. Rysuje `ui/LicznikPuli`. */
export function LicznikPuliWynik({ dane, nazwa, kto }: { dane: LicznikPuliDane; nazwa: string; kto?: string }) {
  const k = kreski(dane);
  const opis = opisLicznika(dane);
  const przepadnie = zdaniePrzepadnie(dane, kto);
  return (
    <div className="flex flex-col gap-2">
      <LicznikPuli
        nazwa={nazwa}
        kolor={KOLORY_PUL[dane.pula]}
        pula={k.razem}
        wykorzystane={k.wykorzystane}
        przepadnie={k.przepadnie}
        kreski={{ wykorzystane: k.wykorzystane, wolne: k.wolne, przepadnie: k.przepadnie }}
        legenda={{ wykorzystane: dane.wykorzystaneTyg, wolne: dane.wolneTyg }}
        legendaPrzepadnie={false}
        zdanie={opis}
        etykietaPaska={`${nazwa}. ${opis}${przepadnie ? `. ${przepadnie}` : ''}`}
      />
      {przepadnie && <p className="text-base text-tekst">{przepadnie}.</p>}
    </div>
  );
}

/** Liczniki pul dla wyniku i planu: po jednym pasku na wpis z `wykorzystanie`. */
export function LicznikiPul({ wykorzystanie, rodzina }: { wykorzystanie: WykorzystaniePuli[]; rodzina: Rodzina }) {
  const liczniki = licznikiPul(wykorzystanie);
  if (liczniki.length === 0) return <p className="text-tekst-drugi">Nie ma jeszcze czego liczyć.</p>;
  return (
    <div className="flex flex-col gap-5">
      {liczniki.map((l) => {
        const kto = l.osobaId ? etykietaOsoby(rodzina, l.osobaId) : undefined;
        const nazwa = NAZWY_PUL[l.pula] + (kto ? ` (${kto})` : '');
        return (
          <div key={`${l.pula}-${l.osobaId ?? ''}`} data-pula={l.pula} data-osoba={l.osobaId} data-przepadnie-tyg={l.przepadnieTyg}>
            <LicznikPuliWynik dane={l} nazwa={nazwa} kto={kto} />
          </div>
        );
      })}
    </div>
  );
}
