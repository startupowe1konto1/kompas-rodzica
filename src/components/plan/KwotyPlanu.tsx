'use client';

/**
 * Kwoty planu w dwóch częściach, z jednego wyniku `useKwoty` (wołanego raz w `EkranPlanu`):
 * - `KafleKwot` na górze ekranu: jeden kafel wypełniony kolorem („Razem” w pełnym `zielen-noc`, biały tekst), obok
 *   jeden kafel: suma brutto z „na rękę” w drugiej linii; przy błędzie albo ładowaniu to ta część pokazuje stan i „Spróbuj ponownie”;
 * - `SzczegolyKwot` na dole, zwinięte: sumy osób, liczniki pul tygodni i wykres miesięczny.
 */
import { IconCalendarDollar } from '@tabler/icons-react';
import type { WynikZapytania } from '../../state/useZapytanie';
import type { WynikKwot } from '../../engine/types';
import { formatujKwote } from '../format';
import { podsumowanieOsoby, rozbicieRodziny } from '../kwoty/podsumowanie';
import { WykresMiesieczny } from '../kwoty/WykresMiesieczny';
import { LicznikiPul } from '../pule/LicznikiPul';
import { KafelLiczby, Karta, Przycisk, Rozwijane, StanBledu } from '../ui';
import { ObszarLadowania } from '../ui/Szkielet';
import { SzkieletKafliKwot } from './SzkieletPlanu';
import { etykietaOsoby } from '../wynik/etykiety';
import type { Planer } from './usePlaner';

export type KwotyPlanuDane = WynikZapytania<WynikKwot>;

export function KafleKwot({ planer, kwoty }: { planer: Planer; kwoty: KwotyPlanuDane }) {
  const { rodzina, plan } = planer;
  if (!plan || !rodzina) return null;

  if (kwoty.blad) {
    return (
      <section aria-label="Kwoty planu" data-slot="kwoty-planu" data-stan="blad" className="flex flex-col gap-3">
        <StanBledu poziomNaglowka={2} tytul="Nie udało się policzyć kwot" opis={`${kwoty.blad.komunikat} Plan zostaje bez zmian.`} onPonow={kwoty.odswiez} />
      </section>
    );
  }
  if (!kwoty.dane) {
    return (
      <section aria-label="Kwoty planu" data-slot="kwoty-planu" data-stan="laduje" className="flex flex-col gap-2">
        {/* Szkielet o wymiarach gotowego kafla: termin wniosku i oś pod spodem nie przesuwają się po wczytaniu kwot. */}
        <ObszarLadowania etykieta="Liczymy kwoty…">
          <SzkieletKafliKwot />
        </ObszarLadowania>
      </section>
    );
  }

  const wynik = kwoty.dane;
  return (
    <section
      aria-label="Kwoty planu"
      aria-busy={kwoty.laduje}
      data-slot="kwoty-planu"
      className="flex flex-col gap-2 transition-opacity duration-150 aria-busy:opacity-60 motion-reduce:transition-none"
    >
      {/* Jeden kafel (uwaga zespołu 21.11: za dużo kafli z liczbami, niebieski odrzucony): suma brutto w pełnym
          kolorze, „netto” jako druga linia. Zdanie o symulacji jest w stopce, jak na ekranie wyniku. */}
      <KafelLiczby
        kolor="zielen-noc"
        etykieta="Razem dla rodziny (brutto)"
        wartosc={<span data-suma-razem>{formatujKwote(wynik.sumaRazem)}</span>}
        podpis={
          wynik.naRekeRazem !== undefined ? (
            <>
              Netto ok. <span data-suma-na-reke className="font-bold">{formatujKwote(wynik.naRekeRazem)}</span> (po zaliczce na podatek)
            </>
          ) : (
            'Suma za wszystkie okresy w tym planie'
          )
        }
      />
      {/* Harmonogram miesiąc po miesiącu do wydruku (test z użytkowniczką 22.11: „chcę sobie wydrukować kalendarz wypłat”). */}
      <Przycisk
        href="/plan/harmonogram"
        wariant="drugi"
        data-link-harmonogramu
        ikona={<IconCalendarDollar size={20} />}
        pelnaSzerokosc
        className="sm:w-auto sm:self-start"
      >
        Harmonogram wypłat miesiąc po miesiącu
      </Przycisk>
    </section>
  );
}

export function SzczegolyKwot({ planer, kwoty }: { planer: Planer; kwoty: KwotyPlanuDane }) {
  const { rodzina, plan, walidacja } = planer;
  if (!plan || !rodzina) return null;
  const wynik = kwoty.dane;
  const osoby = wynik ? rodzina.osoby.filter((o) => wynik.odcinki.some((k) => k.osobaId === o.id)) : [];

  return (
    <div data-slot="szczegoly-kwot">
      <Rozwijane tytul="Szczegóły kwot i pul tygodni">
        <div className="flex flex-col gap-6">
          {wynik && osoby.length > 0 && (
            <div className="grid gap-3 sm:grid-cols-2">
              {osoby.map((o) => {
                const p = podsumowanieOsoby(wynik, o.id);
                return (
                  <div key={o.id} data-suma-osoby={o.id} className="flex flex-col">
                    <KafelLiczby
                      etykieta={`Razem: ${etykietaOsoby(rodzina, o.id)}`}
                      wartosc={formatujKwote(p.brutto)}
                      podpis={p.naReke === undefined ? 'Brutto' : `Brutto. Szacunkowo netto: ${formatujKwote(p.naReke)}`}
                      className="flex-1"
                    />
                  </div>
                );
              })}
            </div>
          )}

          {walidacja && (
            <section aria-labelledby="szczegoly-liczniki" className="flex flex-col gap-3">
              <h3 id="szczegoly-liczniki" className="text-lg font-bold leading-snug text-granat lg:text-xl">
                Ile tygodni zostało
              </h3>
              <LicznikiPul wykorzystanie={walidacja.wykorzystanie} rodzina={rodzina} />
            </section>
          )}

          {wynik && (
            <Karta>
              <WykresMiesieczny
                tytul="Wykres kwot brutto miesiąc po miesiącu"
                miesiace={rozbicieRodziny(wynik)}
                osoby={osoby.map((o) => ({ osobaId: o.id, etykieta: etykietaOsoby(rodzina, o.id) }))}
              />
            </Karta>
          )}
          {!wynik && <p className="text-tekst-drugi">Kwoty pojawią się, gdy skończymy je liczyć.</p>}
        </div>
      </Rozwijane>
    </div>
  );
}
