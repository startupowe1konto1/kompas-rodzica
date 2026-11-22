'use client';

/**
 * Ekran „Twój plan” (T2.4): jeden `Planer` czytany przez oś i listę. Ma być prostą mapką (decyzje 21.11):
 * nagłówek → jedno zdanie podsumowania (+ „Dziecko się urodziło”) → kafle kwot (jeden wypełniony kolorem) →
 * pilny termin wniosku → oś czasu jako sam PODGLĄD (zwijana: na telefonie domyślnie schowana, na komputerze
 * rozwinięta; bez okien wyborów, chyba że przy decyzji naciśnięto „Pokaż na osi”) → lista okresów, w której robi się
 * wszystkie zmiany („Zmień” rozwija panel pod okresem, „Zwiń” go zwija) → panel walidacji → decyzje → zwinięte
 * „Proponowane układy urlopów” → zwinięte „Szczegóły kwot” → „Porównaj warianty”.
 * Obrót ekranu nie jest wymuszany (WCAG 1.3.4): po rozwinięciu na telefonie oś przewija się poziomo.
 */
import { useCallback, useState, useSyncExternalStore } from 'react';
import { IconArrowsDiff, IconChevronDown, IconTimeline } from '@tabler/icons-react';
import type { Mozliwosc } from '../../engine/types';
import { ListaOdcinkow } from '../lista-odcinkow/ListaOdcinkow';
import { OsCzasu } from '../os-czasu/OsCzasu';
import { Przycisk, StanBledu, StanPusty, polacz } from '../ui';
import { DzieckoSieUrodzilo } from './DzieckoSieUrodzilo';
import { KartyDecyzji } from './KartyDecyzji';
import { useKwoty } from '../../state/useZapytanie';
import { KafleKwot, SzczegolyKwot } from './KwotyPlanu';
import { PanelWalidacji, ZnacznikBezBledow } from './PanelWalidacji';
import { zdaniePodsumowania } from './podsumowanie';
import { KomunikatWniosku, Scenariusze } from './Scenariusze';
import { PROG_OSI_PX } from './stanPlanera';
import { SzkieletPlanu } from './SzkieletPlanu';
import { usePlaner, type Planer } from './usePlaner';
import { NawigacjaKrokow } from '../uklad/NawigacjaKrokow';
import { PanelDoPoprawy } from '../wynik/PanelDoPoprawy';

// min-h-dvh: stopka zaczyna poniżej ekranu, więc nie zjeżdża w dół, gdy dociąga się treść (bez skoków).
const KLASA_STRONY = 'mx-auto flex min-h-dvh w-full max-w-6xl flex-1 flex-col gap-6 px-4 py-6 lg:py-10';
const NAGLOWEK = 'text-2xl font-black text-granat lg:text-3xl';

const ZAPYTANIE_OSI = `(min-width: ${PROG_OSI_PX}px)`;

/** Po hydratacji: czy ekran jest na tyle szeroki, by oś była domyślnie rozwinięta. Na serwerze: nie (telefon). */
function useSzerokiEkran(): boolean {
  return useSyncExternalStore(
    (zmiana) => {
      const mq = window.matchMedia(ZAPYTANIE_OSI);
      mq.addEventListener('change', zmiana);
      return () => mq.removeEventListener('change', zmiana);
    },
    () => window.matchMedia(ZAPYTANIE_OSI).matches,
    () => false,
  );
}

/** Przewija do elementu po chwili (po rozwinięciu panelu albo osi). */
function przewinDo(wybierz: () => HTMLElement | null) {
  window.setTimeout(() => {
    wybierz()?.scrollIntoView({ block: 'center' });
  }, 80);
}

export function EkranPlanu() {
  const planer = usePlaner();
  const { gotowy, rodzina } = planer;
  const szeroki = useSzerokiEkran();
  // Oś: null = domyślnie (rozwinięta na komputerze, zwinięta na telefonie), po kliknięciu wybór użytkownika.
  const [osOtwarta, setOsOtwarta] = useState<boolean | null>(null);
  const osRozwinieta = osOtwarta ?? szeroki;
  // Decyzja pokazana na osi jako nakładka (okno wyboru, pinezka). Znika po „Ukryj z osi”.
  const [naOsiKod, setNaOsiKod] = useState<Mozliwosc['kod'] | null>(null);

  const naOsi = useCallback((kod: Mozliwosc['kod'] | null) => {
    setNaOsiKod(kod);
    if (kod) {
      setOsOtwarta(true);
      przewinDo(() => document.getElementById('plan-os'));
    }
  }, []);
  /** Do okresu w liście: z decyzji („Zmień w liście okresów”). */
  const doListy = useCallback((odcinekId: string | null) => {
    przewinDo(() => (odcinekId ? document.querySelector<HTMLElement>(`[data-okres="${odcinekId}"]`) : document.getElementById('lista-naglowek')));
  }, []);
  /** Klik odcinka na osi: oś jest tylko podglądem, więc przewijamy do tego okresu w liście. */
  const zOsi = useCallback((odcinekId: string) => {
    przewinDo(() => document.querySelector<HTMLElement>(`[data-okres="${odcinekId}"]`));
  }, []);

  if (!gotowy) {
    return (
      <main className={KLASA_STRONY}>
        <h1 className={NAGLOWEK}>Plan urlopów</h1>
        <SzkieletPlanu />
      </main>
    );
  }
  if (!rodzina) {
    return (
      <main className={KLASA_STRONY}>
        <h1 className="sr-only">Plan urlopów</h1>
        <StanPusty
          tytul="Nie mamy jeszcze danych"
          opis="Żeby ułożyć plan, potrzebujemy kilku informacji o rodzinie."
          akcja={<Przycisk href="/">Zacznij od początku</Przycisk>}
        />
      </main>
    );
  }

  return (
    <main className={KLASA_STRONY}>
      <h1 className={NAGLOWEK}>Plan urlopów</h1>

      {planer.blad && (
        <StanBledu
          poziomNaglowka={2}
          tytul="Nie udało się zmienić planu"
          opis={`${planer.blad.komunikat} Plan zostaje bez zmian.`}
          onPonow={planer.plany.length === 0 ? planer.ponowPlany : undefined}
        />
      )}

      {planer.plan === null ? (
        planer.ladujePlany ? (
          <SzkieletPlanu />
        ) : planer.brakPlanu ? (
          <>
            <PanelDoPoprawy rodzina={rodzina} brakWyniku />
            <NawigacjaKrokow dalej={false} />
          </>
        ) : null
      ) : (
        <TrescPlanu
          planer={planer}
          osRozwinieta={osRozwinieta}
          onPrzelaczOs={() => setOsOtwarta(!osRozwinieta)}
          naOsiKod={naOsiKod}
          naOsi={naOsi}
          doListy={doListy}
          zOsi={zOsi}
        />
      )}
    </main>
  );
}

interface TrescPlanuProps {
  planer: Planer;
  osRozwinieta: boolean;
  onPrzelaczOs: () => void;
  naOsiKod: Mozliwosc['kod'] | null;
  naOsi: (kod: Mozliwosc['kod'] | null) => void;
  doListy: (odcinekId: string | null) => void;
  zOsi: (odcinekId: string) => void;
}

function TrescPlanu({ planer, osRozwinieta, onPrzelaczOs, naOsiKod, naOsi, doListy, zOsi }: TrescPlanuProps) {
  const { rodzina, plan } = planer;
  // Jedno zapytanie o kwoty na cały ekran: kafle na górze i szczegóły na dole czytają ten sam wynik.
  const kwoty = useKwoty(rodzina, plan);
  const zdanie = rodzina && plan ? zdaniePodsumowania(rodzina, plan) : null;
  return (
    <>
      <section aria-label="Podsumowanie planu" data-slot="podsumowanie-planu" className="flex flex-col items-start gap-3">
        {zdanie && <p className="max-w-prose text-lg font-bold leading-snug text-tekst lg:text-xl">{zdanie}</p>}
        <DzieckoSieUrodzilo planer={planer} />
      </section>

      <KafleKwot planer={planer} kwoty={kwoty} />
      <KomunikatWniosku planer={planer} />

      <section id="plan-widok" aria-label="Plan: kto, kiedy, jaki urlop" className="flex scroll-mt-4 flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <button
            type="button"
            data-przelacznik-osi
            aria-expanded={osRozwinieta}
            aria-controls="plan-os"
            onClick={onPrzelaczOs}
            className="inline-flex min-h-11 items-center gap-2 rounded-przycisk border-2 border-zielen bg-white px-4 py-2 font-bold text-zielen transition-colors duration-150 hover:bg-szary-kafel"
          >
            <IconTimeline size={20} aria-hidden />
            {osRozwinieta ? 'Ukryj oś czasu' : 'Pokaż oś czasu'}
            <IconChevronDown size={20} aria-hidden className={polacz('transition-transform duration-150 motion-reduce:transition-none', osRozwinieta && 'rotate-180')} />
          </button>
          <ZnacznikBezBledow planer={planer} />
        </div>
        <div id="plan-os" className="flex flex-col gap-3" hidden={!osRozwinieta}>
          {osRozwinieta && (
            <>
              <p className="text-tekst-drugi">Oś tylko pokazuje, kto i kiedy jest na urlopie. Zmiany wprowadza się na liście okresów pod nią.</p>
              <OsCzasu planer={planer} nakladka={naOsiKod} onOdcinek={zOsi} />
            </>
          )}
        </div>
        <ListaOdcinkow planer={planer} />
      </section>

      <PanelWalidacji planer={planer} />
      <KartyDecyzji planer={planer} naOsi={naOsiKod} onNaOsi={naOsi} onDoListy={doListy} />
      <Scenariusze planer={planer} />
      <SzczegolyKwot planer={planer} kwoty={kwoty} />
      <Przycisk href="/plan/porownanie" wariant="drugi" ikona={<IconArrowsDiff size={22} />} pelnaSzerokosc className="sm:w-auto sm:self-start">
        Porównaj warianty
      </Przycisk>
      <NawigacjaKrokow />
    </>
  );
}
