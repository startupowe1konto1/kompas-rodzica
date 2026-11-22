'use client';

/**
 * Porównanie dwóch wariantów planu obok siebie (T2.10).
 * Dwa plany z profilu (domyślnie wybrany i następny), `useKwoty` dla każdego, `porownajWarianty` składa sumy,
 * miesiące i daty powrotu do pracy. Rodzic może dodać kopię z/bez 81,5% (akcja silnika na kopii planu)
 * i jednym przyciskiem uczynić któryś wariant swoim planem. Na telefonie kolumny leżą jedna pod drugą.
 */
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { IconArrowLeft, IconArrowsDiff, IconCheck } from '@tabler/icons-react';
import type { Plan, Rodzina, WynikKwot } from '../../engine/types';
import { api } from '../../lib/api';
import { useProfil } from '../../state/profil';
import { useKwoty, usePlanyDomyslne, type BladZapytania } from '../../state/useZapytanie';
import { komunikatBledu } from '../../state/zapytanie';
import { NAZWY_ROL } from '../os-czasu/teksty';
import { Data, KafelLiczby, Karta, Kwota, Przycisk, Rozwijane, StanBledu, StanLadowania, StanPusty, Wybor, ZnacznikStatusu } from '../ui';
import { kopiaPlanu, porownajWarianty } from './porownaj';
import { opiszRoznice } from './opisRoznicy';
import { WykresPary } from './WykresPary';

const KLASA_STRONY = 'mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-4 py-6 lg:py-10';
const NAGLOWEK = 'text-2xl font-black text-granat lg:text-3xl';

type Litera = 'a' | 'b';

function nazwaOsoby(rodzina: Rodzina, osobaId: string): { etykieta: string; slowo: string } {
  const o = rodzina.osoby.find((x) => x.id === osobaId);
  const rola = o ? NAZWY_ROL[o.rola] : 'Osoba';
  const imie = o?.dane?.imie;
  return { etykieta: imie ? `${rola} (${imie})` : rola, slowo: rola.toLowerCase() };
}

function KolumnaWariantu(props: {
  litera: Litera;
  plan: Plan;
  kwoty: WynikKwot;
  rodzina: Rodzina;
  powrot: Record<string, string>;
  wybrany: boolean;
  onWybierz: () => void;
}) {
  const { litera, plan, kwoty, rodzina, powrot, wybrany, onWybierz } = props;
  const L = litera.toUpperCase();
  const idNaglowka = `wariant-${litera}-naglowek`;
  return (
    <Karta jako="section" aria-labelledby={idNaglowka} data-wariant={litera} data-plan={plan.id} className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <span
            aria-hidden
            className={`flex size-8 items-center justify-center rounded-przycisk text-base font-black text-white ${litera === 'a' ? 'bg-granat' : 'bg-zielen'}`}
          >
            {L}
          </span>
          <h2 id={idNaglowka} className="text-lg font-black text-granat lg:text-xl">
            Wariant {L}
          </h2>
          {wybrany && <ZnacznikStatusu etykieta="Wybrany plan" ton="zielen" />}
        </div>
        <p className="leading-snug text-tekst-drugi">{plan.nazwa}</p>
        {plan.wariant815 && <p className="text-sm font-bold text-granat">Jedna, równa stawka 81,5% przez cały okres</p>}
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
        <KafelLiczby
          kolor="szary"
          etykieta="Suma brutto za cały okres"
          wartosc={
            <span data-suma>
              <Kwota wartosc={kwoty.sumaRazem} />
            </span>
          }
        />
        <KafelLiczby
          kolor="szary"
          etykieta="Netto (szacunek)"
          wartosc={
            kwoty.naRekeRazem !== undefined ? (
              <span data-na-reke>
                <Kwota wartosc={kwoty.naRekeRazem} />
              </span>
            ) : (
              <span className="text-base font-bold text-tekst-drugi">Brak szacunku</span>
            )
          }
        />
      </div>

      <div className="flex flex-col gap-2">
        <h3 className="text-base font-bold text-tekst">Powrót do pracy</h3>
        <ul className="flex flex-col gap-2">
          {rodzina.osoby.map((o) => {
            const data = powrot[o.id];
            const n = nazwaOsoby(rodzina, o.id);
            return (
              <li
                key={o.id}
                data-powrot={o.id}
                className="flex flex-wrap items-baseline justify-between gap-x-3 rounded-przycisk bg-szary-kafel px-3 py-2"
              >
                <span className="font-bold">{n.etykieta}</span>
                {data ? (
                  <span>
                    wraca <Data iso={data} className="font-black" />
                  </span>
                ) : (
                  <span className="text-tekst-drugi">bez urlopu w tym wariancie</span>
                )}
              </li>
            );
          })}
        </ul>
      </div>

      <div className="mt-auto">
        {wybrany ? (
          <p role="status" className="flex items-center gap-2 font-bold text-sukces">
            <IconCheck size={22} stroke={2.25} aria-hidden />
            To jest obecnie wybrany plan
          </p>
        ) : (
          <Przycisk wariant="drugi" pelnaSzerokosc onClick={onWybierz}>
            Wybierz ten wariant<span className="sr-only"> ({L})</span>
          </Przycisk>
        )}
      </div>
    </Karta>
  );
}

export function Porownanie() {
  const profil = useProfil();
  const { gotowy, rodzina, plany, wybranyPlanId, ustawPlany, aktualizujPlan, wybierzPlan } = profil;

  // Gdy ktoś wchodzi prosto na /plan/porownanie, bierzemy plany domyślne, tak jak ekran planu.
  const domyslne = usePlanyDomyslne(plany.length === 0 ? rodzina : null);
  const planyZApi = domyslne.dane?.plany;
  useEffect(() => {
    if (planyZApi && plany.length === 0) ustawPlany(planyZApi);
  }, [planyZApi, plany.length, ustawPlany]);

  const [idA, setIdA] = useState<string | null>(null);
  const [idB, setIdB] = useState<string | null>(null);
  const [zajety, setZajety] = useState(false);
  const [blad, setBlad] = useState<BladZapytania | null>(null);

  // Wariant A startuje jako wybrany plan, ale potem stoi w miejscu: „Wybierz ten wariant” nie ma zamieniać kolumn.
  const startowyIdA = plany.find((p) => p.id === wybranyPlanId)?.id ?? plany[0]?.id ?? null;
  if (idA === null && startowyIdA !== null) setIdA(startowyIdA);
  const planA = plany.find((p) => p.id === idA) ?? plany.find((p) => p.id === startowyIdA) ?? null;
  const planB = useMemo(() => {
    const wskazany = plany.find((p) => p.id === idB && p.id !== planA?.id);
    if (wskazany) return wskazany;
    if (!planA || plany.length < 2) return null;
    // „Następny” po A, z zawinięciem na początek listy.
    const i = plany.findIndex((p) => p.id === planA.id);
    return plany[(i + 1) % plany.length];
  }, [plany, idB, planA]);

  const kwotyA = useKwoty(rodzina, planA);
  const kwotyB = useKwoty(rodzina, planB);

  const porownanie = useMemo(
    () =>
      planA && planB && kwotyA.dane && kwotyB.dane
        ? porownajWarianty({ plan: planA, kwoty: kwotyA.dane }, { plan: planB, kwoty: kwotyB.dane })
        : null,
    [planA, planB, kwotyA.dane, kwotyB.dane],
  );

  if (!gotowy) {
    return (
      <main className={KLASA_STRONY}>
        <h1 className={NAGLOWEK}>Porównaj warianty</h1>
        <StanLadowania />
      </main>
    );
  }
  if (!rodzina) {
    return (
      <main className={KLASA_STRONY}>
        <h1 className="sr-only">Porównaj warianty</h1>
        <StanPusty
          tytul="Nie mamy jeszcze danych"
          opis="Żeby porównać warianty planu, potrzebujemy kilku informacji o rodzinie."
          akcja={<Przycisk href="/">Zacznij od początku</Przycisk>}
        />
      </main>
    );
  }

  const jestWariant815 = planA?.wariant815 ?? false;

  async function dodajKopie() {
    if (!planA || !rodzina || zajety) return;
    const chce815 = !planA.wariant815;
    const kopia = kopiaPlanu(planA, plany.map((p) => p.id));
    setZajety(true);
    setBlad(null);
    try {
      const odp = await api.akcja(rodzina, kopia, { typ: 'ustaw_wariant_815', wartosc: chce815 });
      const nowy: Plan = { ...odp.plan, id: kopia.id, nazwa: `${planA.nazwa} (${chce815 ? 'z 81,5%' : 'bez 81,5%'})` };
      aktualizujPlan(nowy);
      setIdB(nowy.id);
    } catch (e) {
      setBlad(komunikatBledu(e));
    } finally {
      setZajety(false);
    }
  }

  const opcje = plany.map((p) => ({ wartosc: p.id, etykieta: p.nazwa }));
  // Wybranie planu, który stoi po drugiej stronie, zamienia strony miejscami (nie porównujemy planu z samym sobą).
  function wybierzA(id: string) {
    if (planA && planB && id === planB.id) setIdB(planA.id);
    setIdA(id);
  }
  function wybierzB(id: string) {
    if (planA && planB && id === planA.id) setIdA(planB.id);
    setIdB(id);
  }

  const nazwy: Record<string, string> = Object.fromEntries(rodzina.osoby.map((o) => [o.id, nazwaOsoby(rodzina, o.id).slowo]));
  const opis = porownanie
    ? opiszRoznice({ roznica: porownanie.roznica, powrotA: porownanie.powrotA, powrotB: porownanie.powrotB, nazwy })
    : null;

  const kwotyLaduja = (kwotyA.laduje && !kwotyA.dane) || (kwotyB.laduje && !kwotyB.dane);
  const bladKwot = kwotyA.blad ?? kwotyB.blad;

  return (
    <main className={KLASA_STRONY}>
      <div className="flex flex-col gap-3">
        <Link
          href="/plan"
          className="inline-flex min-h-11 items-center gap-1 self-start font-bold text-zielen underline underline-offset-4 hover:text-zielen-ciemna"
        >
          <IconArrowLeft size={20} aria-hidden />
          Wróć do planu
        </Link>
        <h1 className={NAGLOWEK}>Porównaj warianty</h1>
        <p className="max-w-prose leading-normal text-tekst-drugi">
          Dwa plany obok siebie: ile pieniędzy dają razem i kiedy każda osoba wraca do pracy.
        </p>
      </div>

      {plany.length === 0 ? (
        domyslne.blad ? (
          <StanBledu tytul="Nie udało się ułożyć planów" opis={domyslne.blad.komunikat} onPonow={domyslne.odswiez} />
        ) : (
          <StanLadowania etykieta="Układamy plany na podstawie wpisanych danych…" />
        )
      ) : (
        <>
          <Karta jako="section" aria-label="Wybór wariantów" className="flex flex-col gap-4">
            <Rozwijane tytul="Zmień porównywane warianty">
              <div className="grid gap-5 lg:grid-cols-2">
                <Wybor legenda="Wariant A" name="porownanie-a" wartosc={planA?.id ?? null} opcje={opcje} onZmiana={wybierzA} />
                <Wybor legenda="Wariant B" name="porownanie-b" wartosc={planB?.id ?? null} opcje={opcje} onZmiana={wybierzB} />
              </div>
            </Rozwijane>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
              <Przycisk
                wariant="drugi"
                ikona={<IconArrowsDiff size={22} />}
                laduje={zajety}
                etykietaLadowania="Liczymy nowy wariant"
                onClick={() => void dodajKopie()}
                disabled={!planA}
              >
                {jestWariant815 ? 'Dodaj wersję bez 81,5%' : 'Dodaj wersję z 81,5%'}
              </Przycisk>
              <p className="text-sm leading-snug text-tekst-drugi sm:max-w-sm">
                Kopia wariantu A z drugim sposobem liczenia stawki. Pojawi się jako wariant B.
              </p>
            </div>
            {blad && <StanBledu poziomNaglowka={2} tytul="Nie udało się dodać wersji" opis={`${blad.komunikat} Plany zostają bez zmian.`} />}
          </Karta>

          {!planB ? (
            <StanPusty
              poziomNaglowka={2}
              tytul="Potrzebujemy drugiego wariantu"
              opis="Jest tylko jeden plan. Po dodaniu wersji z inną stawką zestawimy ją z obecnym planem."
            />
          ) : kwotyLaduja ? (
            <StanLadowania etykieta="Liczymy kwoty obu wariantów…" />
          ) : bladKwot || !porownanie || !opis || !planA || !kwotyA.dane || !kwotyB.dane ? (
            <StanBledu
              tytul="Nie udało się policzyć kwot"
              opis={bladKwot?.komunikat}
              onPonow={() => {
                kwotyA.odswiez();
                kwotyB.odswiez();
              }}
            />
          ) : (
            <>
              <KafelLiczby
                kolor="zielen-noc"
                etykieta="Różnica: wariant B minus wariant A"
                wartosc={
                  <span data-roznica>
                    {porownanie.roznica === 0 ? (
                      'tyle samo'
                    ) : (
                      <>
                        {porownanie.roznica > 0 ? '+' : '−'}
                        <Kwota wartosc={Math.abs(porownanie.roznica)} /> {porownanie.roznica > 0 ? 'więcej' : 'mniej'}
                      </>
                    )}
                  </span>
                }
                podpis={<span className="text-base leading-snug">{opis.zdanie}</span>}
              />
              <div className="grid items-stretch gap-4 lg:grid-cols-2">
                <KolumnaWariantu
                  litera="a"
                  plan={planA}
                  kwoty={kwotyA.dane}
                  rodzina={rodzina}
                  powrot={porownanie.powrotA}
                  wybrany={planA.id === wybranyPlanId}
                  onWybierz={() => wybierzPlan(planA.id)}
                />
                <KolumnaWariantu
                  litera="b"
                  plan={planB}
                  kwoty={kwotyB.dane}
                  rodzina={rodzina}
                  powrot={porownanie.powrotB}
                  wybrany={planB.id === wybranyPlanId}
                  onWybierz={() => wybierzPlan(planB.id)}
                />
              </div>
              <Karta jako="section" aria-labelledby="wykres-naglowek" className="flex flex-col gap-3">
                <h2 id="wykres-naglowek" className="text-lg font-black text-granat lg:text-xl">
                  Wypłaty miesiąc po miesiącu
                </h2>
                <WykresPary miesiace={porownanie.miesiace} />
              </Karta>
              {(planA.id === wybranyPlanId || planB.id === wybranyPlanId) && (
                <p className="text-sm text-tekst-drugi">
                  Wybrany plan jest widoczny na{' '}
                  <Link href="/plan" className="font-bold text-zielen underline underline-offset-4">
                    ekranie planu
                  </Link>
                  .
                </p>
              )}
            </>
          )}
        </>
      )}
    </main>
  );
}
