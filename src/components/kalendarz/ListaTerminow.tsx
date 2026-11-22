'use client';

import { useEffect, useState } from 'react';
import { IconCalendarDollar, IconCalendarMonth, IconCalendarPlus } from '@tabler/icons-react';
import type { Dokument, Plan, Rodzina, WynikDokumentow } from '../../engine/types';
import { pobierzIcs } from '../../state/formularze';
import { useProfil } from '../../state/profil';
import { funkcjaNiegotowa, komunikatBledu } from '../../state/zapytanie';
import { useDokumenty, usePlanyDomyslne } from '../../state/useZapytanie';
import { formatujDate } from '../format';
import { KomunikatTermin, Przycisk, StanBledu, StanPusty, polacz } from '../ui';
import { Wejscie } from '../ui/Szkielet';
import { KartaTerminu, TON_STANU } from './KartaTerminu';
import { useOtwarteKarty } from './pamiec';
import { PodgladKalendarza } from './PodgladKalendarza';
import { SzkieletKalendarza } from './SzkieletKalendarza';
import { czesciTerminow, kluczTerminu } from './podglad';
import { oznaczTerminy } from './terminy';
import type { Oznaczony } from './typy';
import { NawigacjaKrokow } from '../uklad/NawigacjaKrokow';
import { PanelDoPoprawy } from '../wynik/PanelDoPoprawy';
import { czyBrakPlanu } from '../wynik/brakPlanu';

// min-h-dvh: stopka zaczyna poniżej ekranu, więc nie zjeżdża w dół, gdy dociąga się treść (bez skoków).
const KLASA_STRONY = 'mx-auto flex min-h-dvh w-full max-w-3xl flex-1 flex-col gap-6 px-4 py-6 lg:py-10';
const MIESIACE = ['sty', 'lut', 'mar', 'kwi', 'maj', 'cze', 'lip', 'sie', 'wrz', 'paź', 'lis', 'gru'];

/** Dokumenty, których termin to ten sam dzień (i ta sama osoba / odcinek, o ile termin je wskazuje). */
function dokumentyTerminu(t: Oznaczony, dokumenty: Dokument[]): Dokument[] {
  return dokumenty.filter(
    (d) =>
      d.termin === t.data &&
      (!t.osobaId || d.ktoSklada === t.osobaId || d.ktoSklada === 'platnik') &&
      (!t.odcinekId || !d.odcinekId || d.odcinekId === t.odcinekId),
  );
}

/**
 * Rząd kafli dni jak kartki z kalendarza: pasek u góry w kolorze stanu terminu (ten sam co blok dni na karcie)
 * z miesiącem, pod nim duży dzień. Klik otwiera „Podejrzyj kalendarz” z podświetlonym terminem (K3).
 */
function PasekDni({ terminy, onWybierz }: { terminy: Oznaczony[]; onWybierz: (klucz: string) => void }) {
  return (
    <nav aria-label="Terminy na osi dni">
      <ul className="-mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-2 lg:mx-0 lg:px-0">
        {terminy.map((t) => {
          const klucz = kluczTerminu(t);
          return (
            <li key={klucz} className="shrink-0 snap-start">
              <button
                type="button"
                data-kafel-dnia={t.data}
                data-klucz={klucz}
                aria-label={`${t.tytul}, ${formatujDate(t.data)}. Pokaż na osi`}
                onClick={() => onWybierz(klucz)}
                className="flex w-20 flex-col overflow-hidden rounded-karta bg-white text-center text-granat hover:ring-2 hover:ring-granat"
              >
                <span aria-hidden className={polacz('py-1 text-sm font-bold uppercase', TON_STANU[t.stan])}>
                  {MIESIACE[Number(t.data.slice(5, 7)) - 1]}
                </span>
                <span aria-hidden className="pt-2 text-3xl font-black leading-none tabular-nums">
                  {Number(t.data.slice(8, 10))}
                </span>
                <span aria-hidden className="pb-2 text-sm text-tekst-drugi">
                  {t.data.slice(0, 4)}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

type StanIcs = 'wolny' | 'laduje' | 'niegotowe' | { blad: string };

function PrzyciskIcs({ rodzina, plan, wariant }: { rodzina: Rodzina; plan: Plan | null; wariant: 'drugi' }) {
  const [s, ustaw] = useState<StanIcs>('wolny');
  if (s === 'niegotowe') {
    return (
      <p data-stan="niegotowe" className="text-sm text-tekst-drugi">
        Plik do kalendarza jest w przygotowaniu.
      </p>
    );
  }
  async function pobierz() {
    if (!plan) return;
    ustaw('laduje');
    try {
      const blob = await pobierzIcs(rodzina, plan);
      const adres = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = adres;
      a.download = 'terminy.ics';
      a.click();
      setTimeout(() => URL.revokeObjectURL(adres), 10_000);
      ustaw('wolny');
    } catch (e) {
      const blad = komunikatBledu(e);
      ustaw(funkcjaNiegotowa(blad) ? 'niegotowe' : { blad: blad.komunikat });
    }
  }
  return (
    <div className="flex flex-col gap-2">
      <Przycisk wariant={wariant} ikona={<IconCalendarPlus size={20} />} laduje={s === 'laduje'} disabled={!plan} onClick={pobierz}>
        Dodaj do kalendarza (.ics)
      </Przycisk>
      {typeof s === 'object' && (
        <p role="alert" className="text-sm text-tekst-drugi">
          {s.blad}
        </p>
      )}
    </div>
  );
}

function Terminy({ rodzina, plan, dane }: { rodzina: Rodzina; plan: Plan | null; dane: WynikDokumentow }) {
  const terminy = oznaczTerminy(dane.terminy, rodzina.dataAnalizy);
  if (terminy.length === 0) {
    return (
      <StanPusty
        tytul="Na razie nie ma terminów"
        opis="Po ułożeniu planu pokażemy tu terminy składania wniosków."
        akcja={<Przycisk href="/plan">Ułóż plan na osi czasu</Przycisk>}
      />
    );
  }
  return <TerminyZPodgladem rodzina={rodzina} plan={plan} dane={dane} terminy={terminy} />;
}

function TerminyZPodgladem({ rodzina, plan, dane, terminy }: { rodzina: Rodzina; plan: Plan | null; dane: WynikDokumentow; terminy: Oznaczony[] }) {
  const [podglad, ustawPodglad] = useState<{ otwarty: boolean; klucz: string | null }>({ otwarty: false, klucz: null });
  const { otwarte, ustaw } = useOtwarteKarty();
  const otworz = (klucz: string | null) => ustawPodglad({ otwarty: true, klucz });
  const najblizszy = terminy.find((t) => t.stan === 'wkrotce');
  const czesci = czesciTerminow(terminy);
  return (
    <>
      <Przycisk wariant="drugi" ikona={<IconCalendarMonth size={20} />} onClick={() => otworz(null)} pelnaSzerokosc className="sm:w-auto sm:self-start">
        Podejrzyj kalendarz
      </Przycisk>
      {najblizszy && (
        <KomunikatTermin
          tytul={najblizszy.tytul}
          data={najblizszy.data}
          opis={najblizszy.opis}
          ton="zielen"
          akcja={<PrzyciskIcs rodzina={rodzina} plan={plan} wariant="drugi" />}
        />
      )}
      <PasekDni terminy={terminy} onWybierz={otworz} />
      <ul className="flex flex-col gap-3">
        {terminy.map((t) => {
          const klucz = kluczTerminu(t);
          return (
            <KartaTerminu
              key={klucz}
              t={t}
              czesc={czesci.get(klucz)}
              rodzina={rodzina}
              dokumenty={dokumentyTerminu(t, dane.dokumenty)}
              otwarta={otwarte.has(klucz)}
              onPrzelacz={(o) => ustaw(klucz, o)}
              onPokazNaOsi={() => otworz(klucz)}
            />
          );
        })}
      </ul>
      {!najblizszy && <PrzyciskIcs rodzina={rodzina} plan={plan} wariant="drugi" />}
      <PodgladKalendarza
        otwarty={podglad.otwarty}
        podswietlony={podglad.klucz}
        onPodswietl={(klucz) => ustawPodglad({ otwarty: true, klucz })}
        onZamknij={() => ustawPodglad((p) => ({ ...p, otwarty: false }))}
        rodzina={rodzina}
        plan={plan}
        terminy={terminy}
      />
    </>
  );
}

export function ListaTerminow() {
  const { gotowy, rodzina, plany, ustawPlany, wybranyPlan } = useProfil();
  const planyDomyslne = usePlanyDomyslne(rodzina);
  const dokumenty = useDokumenty(rodzina, wybranyPlan);

  const planyZApi = planyDomyslne.dane?.plany;
  useEffect(() => {
    if (planyZApi && plany.length === 0) ustawPlany(planyZApi);
  }, [planyZApi, plany.length, ustawPlany]);

  const naglowek = <h1 className="text-2xl font-black text-granat lg:text-3xl">Kalendarz terminów</h1>;

  if (!gotowy) {
    return (
      <main className={KLASA_STRONY}>
        {naglowek}
        <SzkieletKalendarza />
      </main>
    );
  }
  if (!rodzina) {
    return (
      <main className={KLASA_STRONY}>
        <h1 className="sr-only">Kalendarz terminów</h1>
        <StanPusty
          tytul="Nie mamy jeszcze danych"
          opis="Żeby pokazać terminy, potrzebujemy kilku informacji o rodzinie."
          akcja={<Przycisk href="/">Zacznij od początku</Przycisk>}
        />
      </main>
    );
  }

  const brakPlanu = czyBrakPlanu(wybranyPlan, planyDomyslne);
  const czekaNaPlan = wybranyPlan === null && planyDomyslne.blad === null && !brakPlanu;
  const blad = dokumenty.blad ?? planyDomyslne.blad;

  return (
    <main className={KLASA_STRONY}>
      {naglowek}
      {brakPlanu ? (
        <PanelDoPoprawy rodzina={rodzina} brakWyniku />
      ) : blad ? (
        funkcjaNiegotowa(blad) ? (
          <p data-stan="niegotowe" className="rounded-karta bg-white p-4 text-tekst-drugi lg:p-6">
            Kalendarz terminów jest w przygotowaniu.
          </p>
        ) : (
          <StanBledu
            opis={blad.komunikat}
            onPonow={() => {
              dokumenty.odswiez();
              planyDomyslne.odswiez();
            }}
          />
        )
      ) : dokumenty.laduje || czekaNaPlan || !dokumenty.dane ? (
        <SzkieletKalendarza />
      ) : (
        <Wejscie className="flex flex-col gap-6">
          <Terminy rodzina={rodzina} plan={wybranyPlan} dane={dokumenty.dane} />
        </Wejscie>
      )}
      {!brakPlanu && wybranyPlan && (
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
      )}
      <NawigacjaKrokow dalej={brakPlanu ? false : undefined} />
    </main>
  );
}
