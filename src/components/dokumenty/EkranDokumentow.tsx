'use client';

import { useEffect } from 'react';
import { IconInfoCircle } from '@tabler/icons-react';
import type { Dokument, Plan, Rodzina, WynikDokumentow } from '../../engine/types';
import { useProfil } from '../../state/profil';
import { useDokumenty, usePlanyDomyslne } from '../../state/useZapytanie';
import { Przycisk, StanBledu, StanPusty } from '../ui';
import { Szkielet, Wejscie } from '../ui/Szkielet';
import { grupujDokumenty } from '../wynik/dokumenty';
import { KartaDokumentu } from './KartaDokumentu';
import { KartaDanychDoWnioskow } from './KartaDanychDoWnioskow';
import { SzkieletDokumentow } from './SzkieletDokumentow';
import { kluczDokumentu, opisyCzesci } from './czesci';
import { NawigacjaKrokow } from '../uklad/NawigacjaKrokow';
import { PanelDoPoprawy } from '../wynik/PanelDoPoprawy';
import { czyBrakPlanu } from '../wynik/brakPlanu';

// min-h-dvh: stopka zaczyna poniżej ekranu, więc nie zjeżdża w dół, gdy dociąga się treść (bez skoków).
const KLASA_STRONY = 'mx-auto flex min-h-dvh w-full max-w-3xl flex-1 flex-col gap-6 px-4 py-6 lg:py-10';

/** Nagłówek stoi od pierwszej klatki (także w trakcie wczytywania profilu), żeby treść pod nim nie skakała. */
const NAGLOWEK = (
  <header className="flex flex-col gap-2">
    <h1 className="text-2xl font-black text-granat lg:text-3xl">Dokumenty</h1>
    <p className="max-w-prose leading-normal text-tekst-drugi">
      Co trzeba złożyć, kto to robi, gdzie i do kiedy. Gdy możemy, przygotujemy wypełniony wniosek.
    </p>
  </header>
);

function Lista({ dane, rodzina, plan }: { dane: WynikDokumentow; rodzina: Rodzina; plan: Plan | null }) {
  if (dane.dokumenty.length === 0) {
    return (
      <StanPusty
        tytul="Na razie nie ma dokumentów do złożenia"
        opis="Po ułożeniu planu pokażemy tu, co i gdzie złożyć."
        akcja={<Przycisk href="/plan">Ułóż plan</Przycisk>}
      />
    );
  }
  const g = grupujDokumenty(dane.dokumenty);
  const grupy: { etykieta: string; lista: Dokument[] }[] = [
    { etykieta: 'Do złożenia teraz', lista: g.teraz },
    { etykieta: 'Później', lista: g.pozniej },
    { etykieta: 'Termin minął', lista: g.poTerminie },
  ];
  const czesci = opisyCzesci(dane.dokumenty, plan?.odcinki ?? []);
  return (
    <>
      {czesci.size > 0 && (
        <p data-info="czesci" className="max-w-prose leading-normal">
          Każdą część urlopu zgłasza się osobnym wnioskiem, najpóźniej 21 dni przed jej początkiem.
        </p>
      )}
      {grupy
        .filter((x) => x.lista.length > 0)
        .map((x) => (
          <section key={x.etykieta} aria-label={x.etykieta} className="flex flex-col gap-3">
            <h2 className="text-xl font-black leading-snug text-granat lg:text-2xl">{x.etykieta}</h2>
            <ul className="flex flex-col gap-4">
              {x.lista.map((d) => (
                <KartaDokumentu
                  key={`${d.kod}-${d.ktoSklada}-${d.odcinekId ?? ''}`}
                  dokument={d}
                  rodzina={rodzina}
                  plan={plan}
                  czesc={czesci.get(kluczDokumentu(d))}
                />
              ))}
            </ul>
          </section>
        ))}
    </>
  );
}

export function EkranDokumentow() {
  const { gotowy, rodzina, plany, ustawPlany, wybranyPlan } = useProfil();
  const planyDomyslne = usePlanyDomyslne(rodzina);
  const dokumenty = useDokumenty(rodzina, wybranyPlan);

  const planyZApi = planyDomyslne.dane?.plany;
  useEffect(() => {
    if (planyZApi && plany.length === 0) ustawPlany(planyZApi);
  }, [planyZApi, plany.length, ustawPlany]);

  if (!gotowy) {
    return (
      <main className={KLASA_STRONY}>
        {NAGLOWEK}
        <Szkielet className="h-[7.5rem] rounded-karta" />
        <SzkieletDokumentow />
      </main>
    );
  }
  if (!rodzina) {
    return (
      <main className={KLASA_STRONY}>
        <h1 className="sr-only">Dokumenty</h1>
        <StanPusty
          tytul="Nie mamy jeszcze danych"
          opis="Żeby pokazać dokumenty, potrzebujemy kilku informacji o rodzinie."
          akcja={<Przycisk href="/">Zacznij od początku</Przycisk>}
        />
      </main>
    );
  }

  const maPlatnika = dokumenty.dane?.dokumenty.some((d) => d.ktoSklada === 'platnik') ?? false;
  const brakPlanu = czyBrakPlanu(wybranyPlan, planyDomyslne);
  const czekaNaPlan = wybranyPlan === null && planyDomyslne.blad === null && !brakPlanu;
  const blad = dokumenty.blad ?? (wybranyPlan === null ? planyDomyslne.blad : null);
  const odswiez = dokumenty.blad ? dokumenty.odswiez : planyDomyslne.odswiez;

  return (
    <main className={KLASA_STRONY}>
      {NAGLOWEK}

      <KartaDanychDoWnioskow rodzina={rodzina} />

      {brakPlanu ? (
        <PanelDoPoprawy rodzina={rodzina} brakWyniku />
      ) : blad ? (
        <StanBledu opis={blad.komunikat} onPonow={odswiez} />
      ) : dokumenty.dane === null || czekaNaPlan ? (
        <SzkieletDokumentow />
      ) : (
        <Wejscie className="flex flex-col gap-6">
          <Lista dane={dokumenty.dane} rodzina={rodzina} plan={wybranyPlan} />
          {/* Pod listą, nie nad nią: ramka zależy od danych, więc u góry pojawiałaby się albo znikała i przesuwała ekran. */}
          {!maPlatnika && (
            <div data-info="z3-platnik" className="flex gap-3 rounded-komunikat border border-szary-linia bg-white p-4 lg:p-6">
              <IconInfoCircle size={24} stroke={2} aria-hidden className="mt-0.5 shrink-0 text-info" />
              <p className="max-w-prose leading-normal">
                <strong>Z-3 i Z-3a wypełnia płatnik.</strong> To zaświadczenia o zarobkach, które przygotowuje pracodawca albo
                zleceniodawca. Przy takim dokumencie nie ma przycisku do pobrania.
              </p>
            </div>
          )}
        </Wejscie>
      )}

      {/* Dopiero po wczytaniu listy: w trakcie stałby pod szkieletem i zjeżdżał w dół razem z treścią. */}
      {(brakPlanu || (dokumenty.dane !== null && !czekaNaPlan)) && <NawigacjaKrokow />}
    </main>
  );
}
