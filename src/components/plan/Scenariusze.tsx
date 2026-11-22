'use client';

/**
 * Proponowane układy urlopów (T2.7): zwinięte „Proponowane układy urlopów” z kartami planów z profilu, „Mama wraca po N tygodniach”
 * i wyborem wariantu płatności (dwa duże kafle: 100% + 70% albo 81,5% przez cały okres).
 * Pilny termin wniosku o 81,5% (`KomunikatWniosku`) jest osobno, poza zwinięciem.
 * Akcje składa `akcje.ts`, rozstrzyga silnik.
 */
import { useState } from 'react';
import Link from 'next/link';
import { IconUserPlus } from '@tabler/icons-react';
import { KomunikatTermin, Przycisk, Rozwijane, Wybor } from '../ui';
import { Szkielet } from '../ui/Szkielet';
import { mamaWracaPoObowiazkowych } from './akcje';
import type { Planer } from './usePlaner';

const WARIANT_STANDARD = 'standard';
const WARIANT_815 = 'wariant815';

const OPIS_STANDARD = 'Wyższa stawka na początku, potem niższa w urlopie rodzicielskim.';
const OPIS_815 = 'Jedna, równa stawka przez cały urlop macierzyński i rodzicielski.';

/** Termin wniosku o 81,5%: pokazujemy, dopóki nie minął (liczymy od `rodzina.dataAnalizy`, nie od zegara). */
export function KomunikatWniosku({ planer }: { planer: Planer }) {
  const { rodzina, uprawnienia, uprawnieniaBlad } = planer;
  // Termin przychodzi z uprawnieniami, później niż plan: do tego czasu szary blok o wymiarach komunikatu,
  // żeby oś i lista okresów pod nim nie zjechały w dół, gdy komunikat się pojawi.
  if (rodzina && !uprawnienia && !uprawnieniaBlad) return <Szkielet className="h-[8.3125rem] rounded-komunikat lg:h-[6.5625rem]" />;
  const termin = uprawnienia?.pule.wniosek815DoKiedy;
  if (!rodzina || !termin || termin < rodzina.dataAnalizy) return null;
  return (
    <KomunikatTermin
      tytul="Wniosek do"
      data={termin}
      poziomNaglowka={2}
      opis="Po tym dniu zostają dwie stawki: wyższa na początku i niższa w urlopie rodzicielskim."
    />
  );
}

export function Scenariusze({ planer }: { planer: Planer }) {
  const { plany, plan, rodzina, uprawnienia, zajety, wybierzScenariusz, wykonaj } = planer;
  // Wybór kafla widać od razu; do czasu odpowiedzi silnika trzyma go ten stan, potem znowu plan.
  const [oczekiwany815, setOczekiwany815] = useState<boolean | null>(null);
  if (plany.length === 0 || !plan || !rodzina) return null;

  const pule = uprawnienia?.pule;
  const jestMatka = rodzina.osoby.some((o) => o.rola === 'matka');
  const akcjaMamaWraca = pule ? mamaWracaPoObowiazkowych(rodzina, pule) : null;
  const bezDrugiegoRodzica = rodzina.osoby.length < 2;
  const etykietaMamaWraca = pule ? `Mama wraca po ${pule.obowiazkoweMatkiTyg} tygodniach` : 'Mama wraca po obowiązkowych tygodniach';

  const mozliwosc815 = uprawnienia?.mozliwosci.find((m) => m.kod === 'wariant_815');
  const wybrane815 = oczekiwany815 ?? plan.wariant815;

  async function zmienWariant(chce815: boolean) {
    if (zajety || chce815 === plan?.wariant815) return;
    setOczekiwany815(chce815);
    await wykonaj({ typ: 'ustaw_wariant_815', wartosc: chce815 });
    setOczekiwany815(null);
  }

  return (
    <div data-slot="scenariusze">
      <Rozwijane tytul="Proponowane układy urlopów">
        <div className="flex flex-col gap-6">
          <div className="flex flex-col gap-3">
            <h3 className="text-base font-bold text-granat lg:text-lg">Gotowe plany</h3>
            <ul className="flex flex-wrap gap-2">
              {plany.map((p) => (
                <li key={p.id}>
                  <button
                    type="button"
                    data-scenariusz={p.id}
                    aria-pressed={p.id === plan.id}
                    disabled={zajety}
                    onClick={() => wybierzScenariusz(p.id)}
                    className="min-h-11 rounded-przycisk border-2 border-zielen bg-white px-4 py-2 font-bold text-zielen transition-colors duration-150 hover:bg-szary-kafel disabled:cursor-not-allowed aria-pressed:bg-zielen aria-pressed:text-white"
                  >
                    {p.nazwa}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {jestMatka && (
            <div className="flex flex-col gap-2" data-slot="mama-wraca">
              <h3 className="text-base font-bold text-tekst">Po obowiązkowym urlopie mamy</h3>
              <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
                <Przycisk
                  wariant="drugi"
                  disabled={!akcjaMamaWraca}
                  onClick={() => akcjaMamaWraca && void wykonaj(akcjaMamaWraca)}
                  className="sm:self-start"
                >
                  {etykietaMamaWraca}
                </Przycisk>
                {bezDrugiegoRodzica && (
                  <Link
                    href="/osoba"
                    className="inline-flex min-h-11 items-center gap-2 font-bold text-zielen underline underline-offset-4 hover:text-zielen-ciemna"
                  >
                    <IconUserPlus size={20} aria-hidden />
                    Dodaj drugiego rodzica
                  </Link>
                )}
              </div>
              <p className="max-w-prose text-tekst-drugi">
                {bezDrugiegoRodzica
                  ? 'Żeby ktoś przejął resztę urlopu, w planie musi być drugi rodzic.'
                  : 'Mama wraca do pracy po obowiązkowych tygodniach, a resztę urlopu przejmuje drugi rodzic.'}
              </p>
            </div>
          )}

          <div className="flex flex-col gap-3" data-slot="wariant-platnosci">
            <Wybor
              legenda="Jak ma być liczony zasiłek"
              dwieKolumny
              name="wariant-platnosci"
              wartosc={wybrane815 ? WARIANT_815 : WARIANT_STANDARD}
              onZmiana={(w) => void zmienWariant(w === WARIANT_815)}
              opcje={[
                {
                  wartosc: WARIANT_STANDARD,
                  etykieta: '100% + 70%',
                  opis: OPIS_STANDARD,
                },
                {
                  wartosc: WARIANT_815,
                  etykieta: '81,5% przez cały okres',
                  opis: OPIS_815,
                },
              ]}
            />
            {mozliwosc815 && !mozliwosc815.dostepna && !plan.wariant815 && <p className="max-w-prose text-tekst-drugi">{mozliwosc815.opis}</p>}
          </div>
        </div>
      </Rozwijane>
    </div>
  );
}
