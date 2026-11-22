'use client';

/**
 * „Harmonogram wypłat” (/plan/harmonogram): tabela miesiąc po miesiącu dla wybranego planu – kto, jakie świadczenie,
 * jaka stawka i ile pieniędzy. Prośba z testu z użytkowniczką (22.11): „chcę sobie wydrukować kalendarz wypłat…
 * procenty nic mi nie mówią” – plan budżetu domowego na kartce, także z cudzego komputera.
 *
 * Dane tylko z REST: `useKwoty` (kwoty i rozbicie na miesiące) i `useDokumenty` (kto wypłaca). Wiersze składa czysta
 * funkcja `zbudujHarmonogram`. „Drukuj harmonogram” woła `window.print()`; wygląd wydruku: klasy `print:` tutaj
 * i blok `@media print` w `app/globals.css` (chowa pasek kroków, stopkę i przyciski, A4 pionowo).
 *
 * Na telefonie i tablecie (poniżej lg) wiersze tabeli układają się w karty z podpisami (z `data-etykieta`), na komputerze i na wydruku to
 * zwykła tabela.
 */
import { useEffect, useMemo } from 'react';
import { IconArrowLeft, IconPrinter } from '@tabler/icons-react';
import type { Plan, Rodzina, WynikDokumentow, WynikKwot } from '../../engine/types';
import { useProfil } from '../../state/profil';
import { useDokumenty, useKwoty, usePlanyDomyslne } from '../../state/useZapytanie';
import { formatujDate, formatujKwote } from '../format';
import { Przycisk, StanBledu, StanLadowania, StanPusty, polacz } from '../ui';
import { PanelDoPoprawy } from '../wynik/PanelDoPoprawy';
import { czyBrakPlanu } from '../wynik/brakPlanu';
import { etykietaOsoby } from '../wynik/etykiety';
import { zbudujHarmonogram, type WierszHarmonogramu } from './harmonogram';
import { NAZWY_SWIADCZEN_HARMONOGRAMU, dniSlownie, formatujStawke, ktoWyplacaSlownie, nazwaMiesiaca, wymiarSlownie } from './teksty';

const KLASA_STRONY =
  'mx-auto flex min-h-dvh w-full max-w-6xl flex-1 flex-col gap-6 px-4 py-6 lg:py-10 print:min-h-0 print:max-w-none print:gap-4 print:p-0';
const NAGLOWEK = 'text-2xl font-black text-granat lg:text-3xl print:text-xl';
const ZASTRZEZENIE = 'To symulacja. Wynik nie jest decyzją ZUS.';

// Telefon i tablet: wiersz = karta, komórka = „podpis … wartość”. Od lg i na wydruku: zwykła tabela.
const KLASA_WIERSZA = 'max-lg:flex max-lg:flex-col max-lg:gap-1 max-lg:py-3 border-b border-szary-linia print:table-row print:break-inside-avoid';
const KLASA_KOMORKI =
  'px-2 py-2 align-top lg:first:pl-0 lg:last:pr-0 max-lg:flex max-lg:items-baseline max-lg:justify-between max-lg:gap-3 max-lg:p-0 max-lg:before:text-sm max-lg:before:text-tekst-drugi max-lg:before:shrink-0 max-lg:before:content-[attr(data-etykieta)] print:table-cell print:px-1.5 print:py-1 print:before:content-none';
const KLASA_LICZBY = 'whitespace-nowrap text-right tabular-nums';

function nazwaPlatnika(rodzina: Rodzina, w: WierszHarmonogramu): string | undefined {
  if (!w.tytulId) return undefined;
  return rodzina.osoby.find((o) => o.id === w.osobaId)?.tytuly.find((t) => t.id === w.tytulId)?.nazwaPlatnika;
}

interface TabelaProps {
  rodzina: Rodzina;
  plan: Plan;
  kwoty: WynikKwot;
  dokumenty: WynikDokumentow | null;
}

function TabelaHarmonogramu({ rodzina, plan, kwoty, dokumenty }: TabelaProps) {
  const h = useMemo(
    () => zbudujHarmonogram(kwoty, plan, { kolejnoscOsob: rodzina.osoby.map((o) => o.id), ktoWyplaca: dokumenty?.ktoWyplaca }),
    [kwoty, plan, rodzina.osoby, dokumenty],
  );

  if (h.wiersze.length === 0) {
    return (
      <StanPusty
        poziomNaglowka={2}
        tytul="W tym planie nie ma okresów z zasiłkiem"
        opis="Proszę wrócić do planu i dodać urlop, za który przysługuje zasiłek."
        akcja={<Przycisk href="/plan">Wróć do planu</Przycisk>}
      />
    );
  }

  const zNetto = h.wiersze.some((w) => w.netto !== undefined);
  const zKto = h.wiersze.some((w) => w.ktoWyplaca !== undefined);
  const wieleOsob = h.osoby.length > 1;
  const netto = (x: number | undefined) => (x === undefined ? '—' : formatujKwote(x));

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-karta bg-white p-4 lg:p-6 print:rounded-none print:p-0">
        <table data-tabela-harmonogramu className="w-full border-collapse text-left text-base print:text-[10pt] print:leading-snug">
          <caption className="sr-only">Harmonogram wypłat zasiłków miesiąc po miesiącu</caption>
          <thead className="max-lg:sr-only print:not-sr-only print:table-header-group">
            <tr className="border-b-2 border-granat text-sm font-bold text-granat print:border-black">
              <th scope="col" className="px-2 py-2 lg:pl-0">Miesiąc</th>
              <th scope="col" className="px-2 py-2">Osoba</th>
              <th scope="col" className="px-2 py-2">Świadczenie</th>
              <th scope="col" className="px-2 py-2 text-right">Stawka</th>
              <th scope="col" className="px-2 py-2 text-right">Brutto</th>
              {zNetto && <th scope="col" className="px-2 py-2 text-right">Netto (szacunek)</th>}
              {zKto && <th scope="col" className="px-2 py-2 lg:pr-0">Kto wypłaca</th>}
            </tr>
          </thead>
          {h.miesiace.map((m) => (
            <tbody key={m.miesiac} data-miesiac={m.miesiac} className="print:break-inside-avoid">
              {m.wiersze.map((w, i) => (
                <tr
                  key={`${w.osobaId}-${w.odcinekIds.join('-')}-${w.stawkaProc}`}
                  data-wiersz-harmonogramu
                  data-miesiac={w.miesiac}
                  data-osoba={w.osobaId}
                  data-typ={w.typ}
                  data-stawka={w.stawkaProc}
                  data-brutto={w.brutto}
                  {...(w.netto !== undefined ? { 'data-netto': w.netto } : {})}
                  {...(w.ktoWyplaca ? { 'data-kto': w.ktoWyplaca } : {})}
                  className={KLASA_WIERSZA}
                >
                  <th scope="row" className={polacz(KLASA_KOMORKI, 'font-bold text-granat max-lg:before:content-none', i > 0 && 'max-lg:hidden')}>
                    {nazwaMiesiaca(w.miesiac)}
                  </th>
                  <td data-etykieta="Osoba" className={KLASA_KOMORKI}>
                    {etykietaOsoby(rodzina, w.osobaId)}
                  </td>
                  <td data-etykieta="Świadczenie" className={polacz(KLASA_KOMORKI, 'max-lg:flex-col max-lg:items-start max-lg:gap-0')}>
                    <span>
                      {NAZWY_SWIADCZEN_HARMONOGRAMU[w.typ]}
                      {w.wymiarPracy !== undefined && `, przy pracy na ${wymiarSlownie(w.wymiarPracy)}`}
                      <span className="block text-sm text-tekst-drugi">za {dniSlownie(w.dni)}</span>
                    </span>
                  </td>
                  <td data-etykieta="Stawka" className={polacz(KLASA_KOMORKI, KLASA_LICZBY)}>
                    {formatujStawke(w.stawkaProc)}
                  </td>
                  <td data-etykieta="Brutto" className={polacz(KLASA_KOMORKI, KLASA_LICZBY, 'font-bold')}>
                    {formatujKwote(w.brutto)}
                  </td>
                  {zNetto && (
                    <td data-etykieta="Netto (szacunek)" className={polacz(KLASA_KOMORKI, KLASA_LICZBY)}>
                      {netto(w.netto)}
                    </td>
                  )}
                  {zKto && (
                    <td data-etykieta="Kto wypłaca" className={polacz(KLASA_KOMORKI, 'max-lg:text-right')}>
                      {w.ktoWyplaca ? ktoWyplacaSlownie(w.ktoWyplaca, nazwaPlatnika(rodzina, w)) : '—'}
                    </td>
                  )}
                </tr>
              ))}
              {m.wiersze.length > 1 && (
                <tr data-suma-miesiaca={m.miesiac} data-brutto={m.brutto} className={polacz(KLASA_WIERSZA, 'bg-szary-kafel print:bg-white')}>
                  <th scope="row" colSpan={4} className={polacz(KLASA_KOMORKI, 'font-bold max-lg:before:content-none')}>
                    Razem w miesiącu: {nazwaMiesiaca(m.miesiac)}
                  </th>
                  <td data-etykieta="Brutto" className={polacz(KLASA_KOMORKI, KLASA_LICZBY, 'font-bold')}>
                    {formatujKwote(m.brutto)}
                  </td>
                  {zNetto && (
                    <td data-etykieta="Netto (szacunek)" className={polacz(KLASA_KOMORKI, KLASA_LICZBY)}>
                      {netto(m.netto)}
                    </td>
                  )}
                  {zKto && <td aria-hidden className={polacz(KLASA_KOMORKI, 'max-lg:hidden')} />}
                </tr>
              )}
            </tbody>
          ))}
          <tfoot className="print:break-inside-avoid">
            {wieleOsob &&
              h.osoby.map((o) => (
                <tr key={o.osobaId} data-suma-osoby={o.osobaId} data-brutto={o.brutto} className={KLASA_WIERSZA}>
                  <th scope="row" colSpan={4} className={polacz(KLASA_KOMORKI, 'font-bold max-lg:before:content-none')}>
                    Razem: {etykietaOsoby(rodzina, o.osobaId)}
                  </th>
                  <td data-etykieta="Brutto" className={polacz(KLASA_KOMORKI, KLASA_LICZBY, 'font-bold')}>
                    {formatujKwote(o.brutto)}
                  </td>
                  {zNetto && (
                    <td data-etykieta="Netto (szacunek)" className={polacz(KLASA_KOMORKI, KLASA_LICZBY)}>
                      {netto(o.netto)}
                    </td>
                  )}
                  {zKto && <td aria-hidden className={polacz(KLASA_KOMORKI, 'max-lg:hidden')} />}
                </tr>
              ))}
            <tr
              data-suma-harmonogramu
              data-brutto={h.sumaBrutto}
              {...(h.sumaNetto !== undefined ? { 'data-netto': h.sumaNetto } : {})}
              className={polacz(KLASA_WIERSZA, 'border-b-0 border-t-2 border-granat text-lg print:border-black print:text-[11pt]')}
            >
              <th scope="row" colSpan={4} className={polacz(KLASA_KOMORKI, 'font-black text-granat max-lg:before:content-none')}>
                Razem za cały plan
              </th>
              <td data-etykieta="Brutto" className={polacz(KLASA_KOMORKI, KLASA_LICZBY, 'font-black')}>
                {formatujKwote(h.sumaBrutto)}
              </td>
              {zNetto && (
                <td data-etykieta="Netto (szacunek)" className={polacz(KLASA_KOMORKI, KLASA_LICZBY, 'font-bold')}>
                  {netto(h.sumaNetto)}
                </td>
              )}
              {zKto && <td aria-hidden className={polacz(KLASA_KOMORKI, 'max-lg:hidden')} />}
            </tr>
          </tfoot>
        </table>
      </div>

      <ul className="flex max-w-prose list-disc flex-col gap-1 pl-5 text-sm text-tekst-drugi print:max-w-none print:text-[9pt]">
        <li>Stawka to procent podstawy wymiaru zasiłku.</li>
        <li>Kwota brutto to zasiłek przed potrąceniem zaliczki na podatek dochodowy.</li>
        {zNetto && <li>Kwota netto to szacunek po potrąceniu zaliczki na podatek. W miesiącach jest rozłożona proporcjonalnie do kwoty brutto.</li>}
        {h.maPodwyzszenie && <li>Kwota brutto obejmuje podwyższenie zasiłku do kwoty świadczenia rodzicielskiego.</li>}
        <li>W miesiącu, w którym okres zaczyna się albo kończy, kwota obejmuje tylko dni tego okresu.</li>
      </ul>
    </div>
  );
}

export function HarmonogramWyplat() {
  const { gotowy, rodzina, plany, ustawPlany, wybranyPlan } = useProfil();
  const planyDomyslne = usePlanyDomyslne(plany.length === 0 ? rodzina : null);
  const kwoty = useKwoty(rodzina, wybranyPlan);
  const dokumenty = useDokumenty(rodzina, wybranyPlan);

  const planyZApi = planyDomyslne.dane?.plany;
  useEffect(() => {
    if (planyZApi && plany.length === 0) ustawPlany(planyZApi);
  }, [planyZApi, plany.length, ustawPlany]);

  const naglowek = <h1 className={NAGLOWEK}>Harmonogram wypłat</h1>;

  if (!gotowy) {
    return (
      <main className={KLASA_STRONY}>
        {naglowek}
        <StanLadowania etykieta="Wczytujemy plan…" />
      </main>
    );
  }
  if (!rodzina) {
    return (
      <main className={KLASA_STRONY}>
        <h1 className="sr-only">Harmonogram wypłat</h1>
        <StanPusty
          tytul="Nie mamy jeszcze danych"
          opis="Żeby pokazać harmonogram wypłat, potrzebujemy kilku informacji o rodzinie."
          akcja={<Przycisk href="/">Zacznij od początku</Przycisk>}
        />
      </main>
    );
  }

  const brakPlanu = czyBrakPlanu(wybranyPlan, planyDomyslne);
  const blad = kwoty.blad ?? planyDomyslne.blad;

  return (
    <main className={KLASA_STRONY} data-harmonogram>
      {/* Nagłówek wydruku: nazwa aplikacji nad tytułem (na ekranie jest w pasku kroków i stopce). */}
      <p data-naglowek-wydruku className="hidden text-sm font-bold print:block">
        Kompas Rodzica – zasiłkowy przewodnik przyszłego rodzica
      </p>
      <div className="flex flex-col gap-2">
        {naglowek}
        {wybranyPlan && (
          <p data-plan-harmonogramu className="text-tekst-drugi print:text-black">
            Plan: <span className="font-bold text-tekst">{wybranyPlan.nazwa}</span>. Stan na {formatujDate(rodzina.dataAnalizy)}.
          </p>
        )}
        <p className="max-w-prose print:hidden">
          Kwoty zasiłków miesiąc po miesiącu według wybranego planu. Harmonogram można wydrukować i wykorzystać do planowania domowego budżetu.
        </p>
      </div>

      {brakPlanu ? (
        <PanelDoPoprawy rodzina={rodzina} brakWyniku />
      ) : blad ? (
        <StanBledu
          poziomNaglowka={2}
          tytul="Nie udało się policzyć kwot"
          opis={blad.komunikat}
          onPonow={() => {
            kwoty.odswiez();
            planyDomyslne.odswiez();
          }}
        />
      ) : !wybranyPlan || !kwoty.dane ? (
        <StanLadowania etykieta="Liczymy kwoty…" kafel={false} wiersze={5} />
      ) : (
        <>
          <div data-bez-druku className="flex flex-col gap-3 sm:flex-row print:hidden">
            <Przycisk data-drukuj-harmonogram ikona={<IconPrinter size={20} />} onClick={() => window.print()}>
              Drukuj harmonogram
            </Przycisk>
            <Przycisk href="/plan" wariant="drugi" ikona={<IconArrowLeft size={20} />}>
              Wróć do planu
            </Przycisk>
          </div>
          <div aria-busy={kwoty.laduje} className="transition-opacity duration-150 aria-busy:opacity-60 motion-reduce:transition-none">
            <TabelaHarmonogramu rodzina={rodzina} plan={wybranyPlan} kwoty={kwoty.dane} dokumenty={dokumenty.dane} />
          </div>
          <p data-zastrzezenie className="font-bold text-granat print:text-black">
            {ZASTRZEZENIE}
          </p>
        </>
      )}
    </main>
  );
}
