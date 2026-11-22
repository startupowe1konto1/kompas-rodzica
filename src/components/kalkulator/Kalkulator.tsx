'use client';

/**
 * Szybki kalkulator (osobna strona): jeden formularz, wynik obok (komputer) albo pod spodem (telefon).
 * Stan trzyma lokalnie – profil w localStorage zmienia się dopiero po „Przenieś do planera”.
 * Wynik przelicza się 400 ms po ostatniej zmianie pola.
 */
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { dzisISO, useProfil } from '../../state/profil';
import { useZapytanie } from '../../state/useZapytanie';
import { kluczZapytania } from '../../state/zapytanie';
import type { Rodzina } from '../../engine/types';
import { Karta, Pole, PrzelacznikTakNie, StanBledu, StanLadowania, Wybor } from '../ui';
import { budujRodzine, nowyFormularz, type Formularz, type FormularzOsoby } from './budujRodzine';
import { PoleOsoby } from './PoleOsoby';
import { policz } from './policz';
import { WynikKalkulatora } from './WynikKalkulatora';

const ZWLOKA_MS = 400;

const DZIECI = [
  { wartosc: '1', etykieta: '1' },
  { wartosc: '2', etykieta: '2' },
  { wartosc: '3', etykieta: '3 i więcej' },
];

const WARIANTY = [
  { wartosc: 'standard', etykieta: '100% potem 70%', opis: 'Wyższa stawka na początku, potem niższa w urlopie rodzicielskim.' },
  { wartosc: 'wariant815', etykieta: '81,5% przez cały okres', opis: 'Jedna, równa stawka przez cały urlop macierzyński i rodzicielski.' },
];

export function Kalkulator() {
  const router = useRouter();
  const profil = useProfil();
  // „Dziś” ustawiamy raz, przy pierwszym renderze (silnik nie czyta zegara).
  const [dzis] = useState(() => dzisISO());
  const [f, setF] = useState<Formularz>(() => nowyFormularz(dzis));

  const rodzina = useMemo(() => budujRodzine(f, dzis), [f, dzis]);
  const [zwloka, setZwloka] = useState<Rodzina | null>(null);
  useEffect(() => {
    const t = setTimeout(() => setZwloka(rodzina), rodzina ? ZWLOKA_MS : 0);
    return () => clearTimeout(t);
  }, [rodzina]);

  const klucz = kluczZapytania('kalkulator', zwloka, f.wariant815);
  const wynik = useZapytanie(klucz, () => policz(zwloka as Rodzina, f.wariant815));
  const czekaNaPauze = rodzina !== zwloka;

  function zmien(zmiana: Partial<Formularz>) {
    setF((s) => ({ ...s, ...zmiana }));
  }
  function zmienOsobe(kto: 'mama' | 'tata', zmiana: Partial<FormularzOsoby>) {
    setF((s) => ({ ...s, [kto]: { ...s[kto], ...zmiana } }));
  }

  function przenies() {
    const dane = wynik.dane;
    if (!zwloka || !dane?.plan) return;
    if (profil.rodzina !== null && !window.confirm('Zastąpić zapisane dane danymi z kalkulatora?')) return;
    const wybrany = dane.plan;
    profil.ustawRodzine(zwloka);
    profil.ustawPochodzenie([]);
    profil.ustawDoPotwierdzenia([]);
    // Wybrany plan (z wariantem) idzie pierwszy, reszta to pozostałe scenariusze domyślne.
    profil.ustawPlany([wybrany, ...dane.plany.filter((p) => p.id !== wybrany.id)]);
    profil.wybierzPlan(wybrany.id);
    router.push('/plan');
  }

  let prawa;
  if (!rodzina) {
    prawa = (
      <Karta data-stan="puste" className="flex flex-col gap-2">
        <h2 className="text-lg font-black text-granat">Tu pojawi się wynik</h2>
        <p className="max-w-prose leading-normal text-tekst-drugi">
          Po wpisaniu daty porodu i wynagrodzenia od razu policzymy zasiłek. Nie trzeba niczego zapisywać ani się logować.
        </p>
        <p className="text-sm text-tekst-drugi">To symulacja. Wynik nie jest decyzją ZUS.</p>
      </Karta>
    );
  } else if (wynik.blad && !czekaNaPauze) {
    prawa = <StanBledu opis={wynik.blad.komunikat} onPonow={wynik.odswiez} poziomNaglowka={2} />;
  } else if (wynik.dane && zwloka) {
    prawa = <WynikKalkulatora rodzina={zwloka} wynik={wynik.dane} przelicza={czekaNaPauze || wynik.laduje} onPrzenies={przenies} />;
  } else {
    prawa = <StanLadowania etykieta="Liczymy zasiłek…" />;
  }

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-4 py-6 lg:py-10">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-black text-granat lg:text-3xl">Szybki kalkulator zasiłku</h1>
        <p className="max-w-prose leading-normal text-tekst-drugi">
          Jeden ekran, bez ankiety. Wystarczy wpisać podstawowe dane, a wynik policzy się sam. Dane zapisane w przewodniku się nie zmienią.
        </p>
      </div>

      <div className="grid items-start gap-6 lg:grid-cols-2">
        <form className="flex flex-col gap-4" onSubmit={(e) => e.preventDefault()} aria-label="Dane do obliczenia">
          <Karta className="flex flex-col gap-4">
            <h2 className="text-lg font-black text-granat">Dziecko</h2>
            <Pole
              etykieta="Data porodu"
              podpowiedz="Przewidywana albo prawdziwa."
              typ="date"
              name="data-porodu"
              value={f.dataPorodu}
              onChange={(e) => zmien({ dataPorodu: e.target.value })}
            />
            <PrzelacznikTakNie
              pytanie="Czy dziecko już się urodziło?"
              name="urodzone"
              wartosc={f.urodzone}
              onZmiana={(w) => zmien({ urodzone: w })}
            />
            <Wybor
              legenda="Liczba dzieci"
              name="liczba-dzieci"
              wartosc={String(f.dzieci)}
              onZmiana={(w) => zmien({ dzieci: Number(w) as Formularz['dzieci'] })}
              opcje={DZIECI}
            />
          </Karta>

          <Karta className="flex flex-col gap-4">
            <h2 className="text-lg font-black text-granat">Mama</h2>
            <PoleOsoby nazwa="mama" czyje="mamy" wartosc={f.mama} onZmiana={(z) => zmienOsobe('mama', z)} />
          </Karta>

          <Karta className="flex flex-col gap-4">
            <h2 className="text-lg font-black text-granat">Tata</h2>
            <PrzelacznikTakNie
              pytanie="Czy policzyć też dla taty?"
              name="policz-tate"
              wartosc={f.policzTate}
              onZmiana={(w) => zmien({ policzTate: w })}
            />
            {f.policzTate && <PoleOsoby nazwa="tata" czyje="taty" wartosc={f.tata} onZmiana={(z) => zmienOsobe('tata', z)} />}
          </Karta>

          <Karta className="flex flex-col gap-4">
            <Wybor
              legenda="Wariant zasiłku"
              name="wariant-zasilku"
              dwieKolumny
              wartosc={f.wariant815 ? 'wariant815' : 'standard'}
              onZmiana={(w) => zmien({ wariant815: w === 'wariant815' })}
              opcje={WARIANTY}
            />
          </Karta>
        </form>

        <section aria-labelledby="kalk-wynik" aria-live="polite" className="flex flex-col gap-3 lg:sticky lg:top-4">
          <h2 id="kalk-wynik" className="sr-only">
            Wynik
          </h2>
          {prawa}
        </section>
      </div>
    </main>
  );
}
