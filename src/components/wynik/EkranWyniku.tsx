'use client';

import { useEffect } from 'react';
import {
  IconAlertTriangle,
  IconCalendarStats,
  IconCalendarWeek,
  IconChecklist,
  IconCoins,
  IconFileText,
  IconRoute,
  IconUserPlus,
} from '@tabler/icons-react';
import { useProfil } from '../../state/profil';
import { useDokumenty, useKwoty, usePlanyDomyslne, useUprawnienia, useWalidacja, type WynikZapytania } from '../../state/useZapytanie';
import { Przycisk, StanPusty } from '../ui';
import { KafleSum, OkresyKwot } from './KafleKwot';
import { StanSekcji } from './Sekcja';
import { TrescDokumentow } from './SekcjaDokumentow';
import { TrescKtoWyplaca } from './SekcjaKtoWyplaca';
import { pulaWyniku, TrescPul } from './SekcjaPul';
import { TrescRyzyk } from './SekcjaRyzyk';
import { TrescUprawnien } from './SekcjaUprawnien';
import { TrescWyborow } from './SekcjaWyborow';
import { SiatkaSekcji, type DefinicjaSekcji } from './SiatkaSekcji';
import { SzkieletKafliSum, SzkieletTresciSekcji } from './SzkieletWyniku';
import { skrotDokumentow, skrotKtoWyplaca, skrotKwot, skrotPul, skrotRyzyk, skrotUprawnien, skrotWyborow } from './podsumowanie';
import { NawigacjaKrokow } from '../uklad/NawigacjaKrokow';
import { PanelDoPoprawy } from './PanelDoPoprawy';
import { czyBrakPlanu } from './brakPlanu';
import { UtrataPracyWCiazy } from './UtrataPracyWCiazy';

// min-h-dvh: stopka zaczyna poniżej ekranu, więc nie zjeżdża w dół, gdy dociąga się treść (bez skoków).
const KLASA_STRONY = 'mx-auto flex min-h-dvh w-full max-w-5xl flex-1 flex-col gap-6 px-4 py-6 lg:py-10';
const TYTUL = 'Wynik – ile wyniosą zasiłki';

type RamaSekcji = Pick<DefinicjaSekcji, 'id' | 'tytul' | 'ikona'>;

/** Stała część kafli (tytuł, ikona, kolor): stoi od pierwszej klatki, także zanim wczyta się profil. */
const RAMA = {
  kwoty: { id: 'kwoty', tytul: 'Kwoty w danym okresie', ikona: <IconCoins size={24} /> },
  uprawnienia: { id: 'uprawnienia', tytul: 'Co przysługuje', ikona: <IconChecklist size={24} /> },
  pule: { id: 'pule', tytul: 'Ile tygodni urlopu przysługuje', ikona: <IconCalendarWeek size={24} /> },
  wybory: { id: 'wybory', tytul: 'Wybory dotyczące urlopu', ikona: <IconRoute size={24} /> },
  ryzyka: { id: 'ryzyka', tytul: 'Na co uważać', ikona: <IconAlertTriangle size={24} /> },
  dokumenty: { id: 'dokumenty', tytul: 'Co można zrobić teraz', ikona: <IconFileText size={24} /> },
} satisfies Record<string, RamaSekcji>;

/** Kafle w trakcie wczytywania profilu: te same tytuły i miejsca, opis „Liczymy…”. */
const SEKCJE_LADOWANIA: DefinicjaSekcji[] = Object.values(RAMA).map((r) => ({ ...r, skrot: '', stan: 'laduje', tresc: () => <SzkieletTresciSekcji /> }));

/** Przyciski pod siatką: te same w trakcie wczytywania i po nim, żeby nic nie wskakiwało. */
const PRZYCISKI = (
  <>
    <Przycisk href="/osoba" wariant="drugi" ikona={<IconUserPlus size={22} />} pelnaSzerokosc className="sm:w-auto sm:self-start">
      Dodaj osobę
    </Przycisk>

    <NawigacjaKrokow dalej={{ etykieta: 'Ułóż plan na osi czasu', ikona: <IconCalendarStats size={22} /> }} />
  </>
);

/** Stan kafla z wyniku zapytania: gotowe dane wygrywają z ponownym ładowaniem. */
function stanKafla<T>(w: Pick<WynikZapytania<T>, 'dane' | 'laduje' | 'blad'>, czekaNaPlan = false): DefinicjaSekcji['stan'] {
  if (w.dane !== null) return 'gotowe';
  if (w.blad) return 'blad';
  return w.laduje || czekaNaPlan ? 'laduje' : 'gotowe';
}

export function EkranWyniku() {
  const { gotowy, rodzina, plany, ustawPlany, wybranyPlan, ustawRodzine } = useProfil();

  const uprawnienia = useUprawnienia(rodzina);
  const planyDomyslne = usePlanyDomyslne(rodzina);
  const plan = wybranyPlan;
  const walidacja = useWalidacja(rodzina, plan);
  const kwoty = useKwoty(rodzina, plan);
  const dokumenty = useDokumenty(rodzina, plan);

  const planyZApi = planyDomyslne.dane?.plany;
  useEffect(() => {
    if (planyZApi && plany.length === 0) ustawPlany(planyZApi);
  }, [planyZApi, plany.length, ustawPlany]);

  if (!gotowy) {
    return (
      <main className={KLASA_STRONY}>
        <h1 className="text-2xl font-black text-granat lg:text-3xl">{TYTUL}</h1>
        <SzkieletKafliSum />
        <SiatkaSekcji sekcje={SEKCJE_LADOWANIA} />
        {PRZYCISKI}
      </main>
    );
  }
  if (!rodzina) {
    return (
      <main className={KLASA_STRONY}>
        <h1 className="sr-only">Wynik</h1>
        <StanPusty
          tytul="Nie mamy jeszcze danych"
          opis="Żeby pokazać wynik, potrzebujemy kilku informacji o rodzinie."
          akcja={<Przycisk href="/">Zacznij od początku</Przycisk>}
        />
      </main>
    );
  }

  // Silnik nie ułożył żadnego planu (np. sprzeczne odpowiedzi): bez tego kafle czekałyby na plan w nieskończoność.
  const brakPlanu = czyBrakPlanu(plan, planyDomyslne);
  // Dopóki plan domyślny się nie pojawi, kafle zależne od planu pokazują ładowanie.
  const czekaNaPlan = plan === null && planyDomyslne.blad === null && !brakPlanu;
  const zPlanem = <T extends { laduje: boolean }>(w: T) => ({ ...w, laduje: w.laduje || czekaNaPlan });

  const ustawPit2 = (osobaId: string, wartosc: boolean) =>
    ustawRodzine((r) => (r ? { ...r, osoby: r.osoby.map((o) => (o.id === osobaId ? { ...o, pit2: wartosc } : o)) } : r));

  const pule = pulaWyniku(walidacja, uprawnienia, rodzina);
  const walidacjaStan = { dane: pule.wykorzystanie, laduje: walidacja.laduje || czekaNaPlan || pule.czeka, blad: pule.wykorzystanie ? null : walidacja.blad };

  const sekcje: DefinicjaSekcji[] = [
    {
      ...RAMA.kwoty,
      skrot: skrotKwot(kwoty.dane, plan),
      stan: stanKafla(kwoty, czekaNaPlan || plan === null),
      tresc: () => (
        <StanSekcji {...zPlanem(kwoty)} laduje={kwoty.laduje || plan === null} dzieci={(w) => (plan ? <OkresyKwot wynik={w} plan={plan} rodzina={rodzina} /> : null)} />
      ),
    },
    {
      ...RAMA.uprawnienia,
      skrot: [skrotUprawnien(uprawnienia.dane), skrotKtoWyplaca(dokumenty.dane)].filter(Boolean).join(' · '),
      stan: stanKafla(uprawnienia),
      // „Kto wypłaca zasiłek” jest częścią tej sekcji (6 kafli zamiast 7 – uwaga zespołu 21.11).
      tresc: () => (
        <>
          <StanSekcji {...uprawnienia} dzieci={(w) => <TrescUprawnien dane={w} rodzina={rodzina} />} />
          {!brakPlanu && (
            <>
              <h3 className="mt-2 px-4 text-lg font-bold text-granat lg:px-6 lg:text-xl">Kto wypłaca zasiłek</h3>
              <StanSekcji {...zPlanem(dokumenty)} dzieci={(w) => <TrescKtoWyplaca dane={w} rodzina={rodzina} />} />
            </>
          )}
        </>
      ),
    },
    {
      ...RAMA.pule,
      skrot: skrotPul(pule.wykorzystanie),
      stan: stanKafla(walidacjaStan),
      tresc: () => (
        <StanSekcji
          {...walidacjaStan}
          odswiez={walidacja.odswiez}
          dzieci={(w) => <TrescPul wykorzystanie={w} zapasowe={pule.zapasowe} odswiez={walidacja.odswiez} rodzina={rodzina} />}
        />
      ),
    },
    {
      ...RAMA.wybory,
      skrot: skrotWyborow(uprawnienia.dane),
      stan: stanKafla(uprawnienia),
      tresc: () => <StanSekcji {...uprawnienia} dzieci={(w) => <TrescWyborow dane={w} rodzina={rodzina} />} />,
    },
    {
      ...RAMA.ryzyka,
      skrot: skrotRyzyk(uprawnienia.dane),
      stan: stanKafla(uprawnienia),
      tresc: () => <StanSekcji {...uprawnienia} dzieci={(w) => <TrescRyzyk dane={w} rodzina={rodzina} />} />,
    },
    {
      ...RAMA.dokumenty,
      skrot: skrotDokumentow(dokumenty.dane),
      stan: stanKafla(dokumenty, czekaNaPlan),
      tresc: () => <StanSekcji {...zPlanem(dokumenty)} dzieci={(w) => <TrescDokumentow dane={w} rodzina={rodzina} />} />,
    },
  ];

  return (
    <main className={KLASA_STRONY}>
      <h1 className="text-2xl font-black text-granat lg:text-3xl">{TYTUL}</h1>
      <PanelDoPoprawy rodzina={rodzina} brakWyniku={brakPlanu} />
      {/* Ubezpieczenie kończy się przed porodem / przyjęciem i nie ma zasiłku macierzyńskiego: co można zrobić (warunek w utrataPracy.ts). */}
      <UtrataPracyWCiazy rodzina={rodzina} uprawnienia={uprawnienia.dane} />
      {!brakPlanu && (
        <StanSekcji
          {...zPlanem(kwoty)}
          laduje={kwoty.laduje || plan === null}
          szkielet={<SzkieletKafliSum />}
          dzieci={(w) => (plan ? <KafleSum wynik={w} plan={plan} rodzina={rodzina} ustawPit2={ustawPit2} /> : null)}
        />
      )}

      {/* Bez planu zostają tylko kafle, które od planu nie zależą: co przysługuje, wybory i na co uważać. */}
      <SiatkaSekcji sekcje={brakPlanu ? sekcje.filter((x) => ['uprawnienia', 'wybory', 'ryzyka'].includes(x.id)) : sekcje} />

      {brakPlanu ? (
        <>
          <Przycisk href="/osoba" wariant="drugi" ikona={<IconUserPlus size={22} />} pelnaSzerokosc className="sm:w-auto sm:self-start">
            Dodaj osobę
          </Przycisk>
          <NawigacjaKrokow dalej={false} />
        </>
      ) : (
        PRZYCISKI
      )}
    </main>
  );
}
