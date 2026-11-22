'use client';

/**
 * Panel zmian jednego okresu (T2.6), rozwijany w liście okresów (`ListaOdcinkow`) pod wierszem tego okresu.
 * UI składa tylko obiekty `AkcjaPlanu` (akcje.ts) i wysyła je przez `planer.wykonaj` (REST);
 * czy akcja jest dozwolona, rozstrzyga silnik. Każda akcja ma jedno zdanie opisu pod przyciskiem;
 * opisy zgadzają się z tym, co robi silnik (src/engine/planner/akcje.ts).
 * Panel zwija przycisk „Zwiń” przy okresie (wybierzOdcinek(null)). W trakcie akcji przyciski są `disabled`
 * z `aria-busy`; po akcji fokus wraca na przycisk okresu.
 */
import { useState } from 'react';
import { IconMinus, IconPlus } from '@tabler/icons-react';
import type { AkcjaPlanu, Odcinek, Parametry } from '../../engine/types';
import { api } from '../../lib/api';
import { useZapytanie } from '../../state/useZapytanie';
import { formatujOkres } from '../format';
import { Pole, Przycisk, Wybor, polacz } from '../ui';
import { NAZWY_TYPOW } from '../os-czasu/teksty';
import { etykietaOsoby } from '../wynik/etykiety';
import { drugaOsoba, maksWymiarPracy, opcjeWymiaruPracy, podzielWPolowie, przesunOTydzien, skrocOTydzien, wydluzOTydzien } from './akcje';
import { etykietaWymiaru, odczytajWymiar, wartoscWymiaru } from './etykietyAkcji';
import type { Planer } from './usePlaner';

const NAGLOWEK_SEKCJI = 'text-base font-bold text-granat';
const DUZY_PRZYCISK = 'min-h-14 w-full text-lg';

const OPIS = 'text-sm leading-snug text-tekst-drugi';

/** Fokus wraca na przycisk okresu w liście (pierwszy przycisk wiersza); gdy go nie ma – na nagłówek listy. */
function przywrocFokus(odcinekId: string) {
  window.setTimeout(() => {
    const el =
      document.querySelector<HTMLElement>(`[data-okres="${odcinekId}"] button`) ??
      document.querySelector<HTMLElement>(`[data-okres="${odcinekId}"]`) ??
      document.getElementById('lista-naglowek');
    if (!el) return;
    if (!el.matches('button, a, input, select, textarea, [tabindex]')) el.setAttribute('tabindex', '-1');
    el.focus({ preventScroll: false });
  }, 60);
}

export function PanelAkcji({ planer, odcinek }: { planer: Planer; odcinek: Odcinek }) {
  return (
    <div
      id={`okres-${odcinek.id}-panel`}
      role="group"
      aria-label={`Zmień: ${NAZWY_TYPOW[odcinek.typ]}`}
      data-slot="panel-akcji"
      className="mt-1 flex basis-full flex-col gap-5 border-t border-szary-linia pt-4"
    >
      <TrescPanelu key={`${odcinek.id}|${odcinek.od}|${odcinek.do}`} planer={planer} odcinek={odcinek} />
    </div>
  );
}

function TrescPanelu({ planer, odcinek }: { planer: Planer; odcinek: Odcinek }) {
  const { rodzina, zajety, wykonaj, wybierzOdcinek } = planer;
  const [nowyKoniec, setNowyKoniec] = useState(odcinek.do);
  const [wymiar, setWymiar] = useState<string | null>(odcinek.wymiarPracy !== undefined ? wartoscWymiaru(odcinek.wymiarPracy) : null);
  const [potwierdzUsuniecie, setPotwierdzUsuniecie] = useState(false);
  /** Który przycisk wysłał trwającą akcję: tylko on pokazuje kręcący się znak i `aria-busy`. */
  const [aktywny, setAktywny] = useState<string | null>(null);

  const rodzicielski = odcinek.typ === 'rodzicielski';
  const parametry = useZapytanie<Parametry[]>(rodzicielski ? 'parametry' : null, () => api.parametry());
  const max = (parametry.dane && rodzina ? maksWymiarPracy(parametry.dane, rodzina.zdarzenie.data) : null) ?? 1;
  const opcjeWymiaru = opcjeWymiaruPracy(max);

  const krocej = skrocOTydzien(odcinek);
  const podzial = podzielWPolowie(odcinek);
  const inna = rodzina ? drugaOsoba(rodzina, odcinek.osobaId) : undefined;
  const wybranyWymiar = odczytajWymiar(wymiar);

  async function uruchom(akcja: AkcjaPlanu, przycisk: string): Promise<boolean> {
    setAktywny(przycisk);
    const ok = await wykonaj(akcja);
    setAktywny(null);
    if (ok) przywrocFokus(odcinek.id);
    return ok;
  }

  /** Reszta przycisków w trakcie akcji jest tylko wyłączona; ten, który ją wysłał, ma też `aria-busy`. */
  const zajetosc = (klucz: string) => ({ disabled: zajety, laduje: zajety && aktywny === klucz, etykietaLadowania: 'Trwa zmiana planu' }) as const;

  return (
    <>
      <p className="text-tekst-drugi">
        {formatujOkres(odcinek.od, odcinek.do)}
        {odcinek.wymiarPracy ? `, z pracą ${etykietaWymiaru(odcinek.wymiarPracy)}` : ''}
      </p>

      <div className="flex flex-col gap-2">
        <div className={polacz('grid gap-3', krocej ? 'grid-cols-2' : 'grid-cols-1')}>
          {krocej && (
            <Przycisk
              wariant="drugi"
              ikona={<IconMinus size={24} stroke={2.5} />}
              aria-label="Tydzień krócej"
              onClick={() => uruchom(krocej, 'krocej')}
              className={DUZY_PRZYCISK}
              {...zajetosc('krocej')}
            >
              Tydzień krócej
            </Przycisk>
          )}
          <Przycisk
            ikona={<IconPlus size={24} stroke={2.5} />}
            aria-label="Tydzień dłużej"
            onClick={() => uruchom(wydluzOTydzien(odcinek), 'dluzej')}
            className={DUZY_PRZYCISK}
            {...zajetosc('dluzej')}
          >
            Tydzień dłużej
          </Przycisk>
        </div>
        <p className={OPIS}>Koniec tego okresu przesuwa się o 7 dni, początek zostaje.</p>
      </div>

      <section aria-labelledby={`akcja-przesun-${odcinek.id}`} className="flex flex-col gap-2">
        <h4 id={`akcja-przesun-${odcinek.id}`} className={NAGLOWEK_SEKCJI}>
          Przesuń w czasie
        </h4>
        <div className="grid gap-2 sm:grid-cols-2">
          <Przycisk wariant="drugi" onClick={() => uruchom(przesunOTydzien(odcinek, -1), 'wczesniej')} {...zajetosc('wczesniej')}>
            Przesuń o tydzień wcześniej
          </Przycisk>
          <Przycisk wariant="drugi" onClick={() => uruchom(przesunOTydzien(odcinek, 1), 'pozniej')} {...zajetosc('pozniej')}>
            Przesuń o tydzień później
          </Przycisk>
        </div>
        <p className={OPIS}>Cały okres zaczyna się i kończy tydzień wcześniej albo później, jego długość się nie zmienia.</p>
      </section>

      <form
        aria-labelledby={`akcja-koniec-${odcinek.id}`}
        className="flex flex-col gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (nowyKoniec && nowyKoniec !== odcinek.do) void uruchom({ typ: 'zmien_koniec', odcinekId: odcinek.id, nowyDo: nowyKoniec }, 'koniec');
        }}
      >
        <h4 id={`akcja-koniec-${odcinek.id}`} className={NAGLOWEK_SEKCJI}>
          Zmień datę końca
        </h4>
        <Pole etykieta="Nowa data końca" typ="date" value={nowyKoniec} onChange={(e) => setNowyKoniec(e.currentTarget.value)} />
        <Przycisk type="submit" wariant="drugi" {...zajetosc('koniec')} disabled={zajety || !nowyKoniec || nowyKoniec === odcinek.do}>
          Zmień koniec
        </Przycisk>
      </form>

      {(podzial || (inna && rodzina)) && (
        <section aria-labelledby={`akcja-inne-${odcinek.id}`} className="flex flex-col gap-3">
          <h4 id={`akcja-inne-${odcinek.id}`} className={NAGLOWEK_SEKCJI}>
            Podziel albo przenieś
          </h4>
          {podzial && (
            <div className="flex flex-col gap-1.5">
              <Przycisk wariant="drugi" onClick={() => uruchom(podzial, 'podziel')} {...zajetosc('podziel')} className="sm:self-start">
                Podziel na dwie części
              </Przycisk>
              <p className={OPIS}>Dzielimy ten okres w połowie na dwa kolejne kawałki. Potem można przesunąć drugi, żeby między nimi wrócić do pracy.</p>
            </div>
          )}
          {inna && rodzina && (
            <div className="flex flex-col gap-1.5">
              <Przycisk
                wariant="drugi"
                onClick={() => uruchom({ typ: 'przenies_na_osobe', odcinekId: odcinek.id, osobaId: inna.id }, 'przenies')}
                {...zajetosc('przenies')}
                className="sm:self-start"
              >
                {`Przenieś na: ${etykietaOsoby(rodzina, inna.id)}`}
              </Przycisk>
              <p className={OPIS}>Ten okres urlopu weźmie druga osoba, w tych samych dniach.</p>
            </div>
          )}
        </section>
      )}

      {rodzicielski && (
        <section aria-labelledby={`akcja-praca-${odcinek.id}`} className="flex flex-col gap-2">
          <h4 id={`akcja-praca-${odcinek.id}`} className={NAGLOWEK_SEKCJI}>
            Połącz z pracą
          </h4>
          <p className={OPIS}>Praca na część etatu w czasie urlopu wydłuża urlop proporcjonalnie.</p>
          <Wybor
            legenda="Na jakiej części etatu praca w czasie urlopu?"
            dwieKolumny
            opcje={opcjeWymiaru.map((w) => ({ wartosc: wartoscWymiaru(w), etykieta: etykietaWymiaru(w), wylaczona: zajety }))}
            wartosc={wymiar}
            onZmiana={setWymiar}
          />
          <Przycisk
            wariant="drugi"
            {...zajetosc('praca')}
            disabled={zajety || wybranyWymiar === null}
            className="sm:self-start"
            onClick={() => {
              if (wybranyWymiar !== null) void uruchom({ typ: 'polacz_z_praca', odcinekId: odcinek.id, wymiarPracy: wybranyWymiar }, 'praca');
            }}
          >
            Połącz z pracą
          </Przycisk>
        </section>
      )}

      <section aria-labelledby={`akcja-usun-${odcinek.id}`} className="flex flex-col gap-2 border-t border-szary-linia pt-4">
        <h4 id={`akcja-usun-${odcinek.id}`} className={NAGLOWEK_SEKCJI}>
          Usuń okres
        </h4>
        {potwierdzUsuniecie ? (
          <div role="group" aria-label="Potwierdzenie usunięcia" className="flex flex-col gap-3">
            <p className="max-w-prose">Na pewno usunąć ten okres z planu? Można potem dodać go od nowa albo wrócić do innego scenariusza.</p>
            <div className="grid gap-2 sm:grid-cols-2">
              <Przycisk
                onClick={async () => {
                  const ok = await uruchom({ typ: 'usun', odcinekId: odcinek.id }, 'usun');
                  if (ok) wybierzOdcinek(null);
                  else setPotwierdzUsuniecie(false);
                }}
                {...zajetosc('usun')}
              >
                Tak, usuń
              </Przycisk>
              <Przycisk wariant="drugi" onClick={() => setPotwierdzUsuniecie(false)} {...zajetosc('nie')}>
                Nie, zostaw
              </Przycisk>
            </div>
          </div>
        ) : (
          <Przycisk wariant="drugi" onClick={() => setPotwierdzUsuniecie(true)} {...zajetosc('chceusunac')} className="sm:self-start">
            Usuń
          </Przycisk>
        )}
      </section>

      <Przycisk wariant="drugi" onClick={() => wybierzOdcinek(null)} className="sm:self-start">
        Zwiń panel zmian
      </Przycisk>
    </>
  );
}
