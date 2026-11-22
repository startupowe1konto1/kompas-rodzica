'use client';

/**
 * Pola list w ankiecie (tor C, C3, T1.3b): miesiące z kwotą (`lista_miesiecy`), okresy od–do
 * (`lista_okresow`) i zwolnienia lekarskie z kodem B (`lista_zwolnien`).
 *
 *  - każdy wiersz to osobna ramka z numerem i przyciskiem „Usuń”, na dole „Dodaj …”,
 *  - błąd wiersza stoi przy właściwym polu (`data-kod-bledu`), błąd całej listy pod listą,
 *  - błędy sprawdzamy po opuszczeniu CAŁEGO wiersza, nie pojedynczego pola, żeby nie ganić
 *    rodzica za pustą kwotę w chwili, gdy dopiero do niej przechodzi.
 *
 * Pola w wierszu mają krótkie etykiety („Kwota brutto”), a kontekst daje grupa z nazwą wiersza („Miesiąc 2”).
 * Liczby trzymamy w polu jako tekst (pisanie „12,” nie może gubić przecinka); do profilu idzie liczba.
 */
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { IconPlus, IconTrash } from '@tabler/icons-react';
import { BladPola as KomunikatBledu, Pole, Przycisk, Rozwijane, polacz } from '../ui';
import { bledyWiersza, miesiacDoDodania } from './listy';
import type { BladPola, DefinicjaPytania } from './typy';

type Wiersz = Record<string, unknown>;

export interface PoleListyProps {
  def: DefinicjaPytania;
  /** Aktualna lista z profilu (brak = pusta). */
  wartosc: unknown;
  /** Wszystkie błędy tego pytania: z `pole` (wiersze) i bez (cała lista). */
  bledy: BladPola[];
  /** Data analizy rodziny: od niej liczymy podpowiedź nowego miesiąca. */
  dataAnalizy: string;
  znacznik?: ReactNode;
  /** „Po co pytamy” i podpowiedź pod pytaniem. */
  opis?: ReactNode;
  /** Pytanie jako duży nagłówek ekranu (jedno pytanie na ekran). */
  duzy?: boolean;
  onZmiana: (wiersze: Wiersz[]) => void;
  onBlur: () => void;
}

const liczbaZTekstu = (tekst: string): number | undefined => {
  const t = tekst.trim().replace(',', '.');
  return t === '' ? undefined : Number(t);
};
const tekstZLiczby = (w: unknown): string => (typeof w === 'number' && Number.isFinite(w) ? String(w) : '');

const NAZWA_WIERSZA = { lista_miesiecy: 'Miesiąc', lista_okresow: 'Okres', lista_zwolnien: 'Zwolnienie' } as const;
const DODAJ = { lista_miesiecy: 'Dodaj miesiąc', lista_okresow: 'Dodaj okres', lista_zwolnien: 'Dodaj zwolnienie' } as const;
const USUN = { lista_miesiecy: 'miesiąc', lista_okresow: 'okres', lista_zwolnien: 'zwolnienie' } as const;

export function PoleListy({ def, wartosc, bledy, dataAnalizy, znacznik, opis, duzy = false, onZmiana, onBlur }: PoleListyProps) {
  const typ = def.typ as keyof typeof NAZWA_WIERSZA;
  const wiersze = (Array.isArray(wartosc) ? wartosc : []) as Wiersz[];

  // Stały klucz wiersza, żeby po usunięciu środkowego wiersza pola nie dostały cudzego tekstu.
  const [klucze, ustawKlucze] = useState<number[]>(() => wiersze.map((_, i) => i));
  const [nastepnyKlucz, ustawNastepnyKlucz] = useState(wiersze.length);
  const doFokusu = useRef<number | null>(null);
  const korzen = useRef<HTMLFieldSetElement>(null);
  const kluczWiersza = (i: number) => (klucze.length === wiersze.length ? klucze[i] : i);

  // Po dodaniu wiersza fokus idzie do jego pierwszego pola.
  useEffect(() => {
    if (doFokusu.current === null) return;
    korzen.current?.querySelector<HTMLElement>(`[data-wiersz="${doFokusu.current}"] input`)?.focus();
    doFokusu.current = null;
  }, [wiersze.length]);

  function dodaj() {
    const nowy: Wiersz =
      typ === 'lista_miesiecy'
        ? { miesiac: miesiacDoDodania(wiersze as { miesiac: string }[], dataAnalizy) }
        : typ === 'lista_zwolnien'
          ? { od: '', do: '', kodB: false }
          : { od: '', do: '' };
    const k = klucze.length === wiersze.length ? nastepnyKlucz : wiersze.length;
    ustawKlucze([...(klucze.length === wiersze.length ? klucze : wiersze.map((_, i) => i)), k]);
    ustawNastepnyKlucz(k + 1);
    doFokusu.current = k;
    onZmiana([...wiersze, nowy]);
  }

  function usun(i: number) {
    ustawKlucze((stare) => (stare.length === wiersze.length ? stare.filter((_, j) => j !== i) : wiersze.map((_, j) => j).filter((j) => j !== i)));
    onZmiana(wiersze.filter((_, j) => j !== i));
    korzen.current?.querySelector<HTMLElement>('[data-dodaj] button')?.focus();
  }

  function zmienPole(i: number, pole: string, v: unknown) {
    onZmiana(
      wiersze.map((w, j) => {
        if (j !== i) return w;
        const nowy = { ...w, [pole]: v };
        if (v === undefined) delete nowy[pole];
        return nowy;
      }),
    );
  }

  const bladListy = bledy.find((b) => b.pole === undefined);

  return (
    <fieldset ref={korzen} className="flex min-w-0 flex-col gap-3 border-0 p-0" aria-describedby={bladListy ? `${def.id}-blad-listy` : undefined}>
      <legend
        className={polacz(
          'mb-1 flex w-full flex-wrap items-center justify-between gap-x-3 gap-y-1 font-bold text-granat',
          duzy ? 'text-2xl font-black leading-tight' : 'text-lg leading-snug',
        )}
      >
        <span>{def.etykieta}</span>
        {znacznik}
      </legend>
      {opis && <div className="text-sm leading-normal text-tekst-drugi">{opis}</div>}

      {wiersze.length > 0 && (
        <ol className="flex flex-col gap-3">
          {wiersze.map((w, i) => (
            <li key={kluczWiersza(i)}>
              <WierszListy
                numer={i + 1}
                nazwa={NAZWA_WIERSZA[typ]}
                usun={USUN[typ]}
                klucz={kluczWiersza(i)}
                wiersz={w}
                typ={typ}
                bledy={bledyWiersza(bledy, i)}
                onPole={(pole, v) => zmienPole(i, pole, v)}
                onUsun={() => usun(i)}
                onBlur={onBlur}
              />
            </li>
          ))}
        </ol>
      )}

      {bladListy && (
        <div data-kod-bledu={bladListy.kod}>
          <KomunikatBledu id={`${def.id}-blad-listy`}>{bladListy.komunikat}</KomunikatBledu>
        </div>
      )}

      <div data-dodaj>
        <Przycisk wariant="drugi" ikona={<IconPlus size={20} stroke={2} />} onClick={dodaj} className="w-full md:w-auto">
          {DODAJ[typ]}
        </Przycisk>
      </div>
    </fieldset>
  );
}

// ───────────────────────── Wiersz ─────────────────────────

interface WierszProps {
  numer: number;
  nazwa: string;
  usun: string;
  klucz: number;
  wiersz: Wiersz;
  typ: keyof typeof NAZWA_WIERSZA;
  bledy: Record<string, BladPola>;
  onPole: (pole: string, wartosc: unknown) => void;
  onUsun: () => void;
  onBlur: () => void;
}

/** Pole w wierszu z własnym znacznikiem błędu (`data-kod-bledu`), żeby test i fokus trafiały we właściwe miejsce. */
function Komorka({ blad, children }: { blad?: BladPola; children: ReactNode }) {
  return (
    <div data-kod-bledu={blad?.kod} className="min-w-0">
      {children}
    </div>
  );
}

function WierszListy({ numer, nazwa, usun, klucz, wiersz, typ, bledy, onPole, onUsun, onBlur }: WierszProps) {
  const [kwota, ustawKwote] = useState(() => tekstZLiczby(wiersz.kwota));
  const [dniPrzepracowane, ustawDniPrzepracowane] = useState(() => tekstZLiczby(wiersz.dniPrzepracowane));
  const [dniObowiazku, ustawDniObowiazku] = useState(() => tekstZLiczby(wiersz.dniObowiazku));
  const etykieta = `${nazwa} ${numer}`;
  const szczegolyWypelnione = wiersz.dniPrzepracowane !== undefined || wiersz.dniObowiazku !== undefined;
  const szczegolyZBledem = Boolean(bledy.dniPrzepracowane || bledy.dniObowiazku);

  const tekst = (pole: string) => (typeof wiersz[pole] === 'string' ? (wiersz[pole] as string) : '');

  return (
    <div
      role="group"
      aria-label={etykieta}
      data-wiersz={klucz}
      className="flex flex-col gap-3 rounded-przycisk border border-szary-ramka bg-white p-3"
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget)) onBlur();
      }}
    >
      <div className="flex min-h-11 items-center justify-between gap-3">
        <p className="font-bold text-tekst">{etykieta}</p>
        <button
          type="button"
          onClick={onUsun}
          aria-label={`Usuń ${usun} ${numer}`}
          className="-mr-2 inline-flex min-h-11 items-center gap-1 rounded-przycisk px-2 font-bold text-granat hover:bg-szary-kafel"
        >
          <IconTrash size={20} stroke={2} aria-hidden />
          Usuń
        </button>
      </div>

      {typ === 'lista_miesiecy' && (
        <>
          <div className="grid gap-3 md:grid-cols-2">
            <Komorka blad={bledy.miesiac}>
              <Pole
                etykieta="Miesiąc i rok"
                // Pole zna tylko text/number/date; `month` przekazujemy jako zwykły atrybut (przeglądarki bez wyboru miesiąca pokażą tekst).
                {...({ type: 'month' } as object)}
                placeholder="RRRR-MM"
                blad={bledy.miesiac?.komunikat}
                value={tekst('miesiac')}
                onChange={(e) => onPole('miesiac', e.currentTarget.value)}
              />
            </Komorka>
            <Komorka blad={bledy.kwota}>
              <Pole
                etykieta="Kwota brutto"
                typ="number"
                przyrostek="zł"
                blad={bledy.kwota?.komunikat}
                value={kwota}
                onChange={(e) => {
                  ustawKwote(e.currentTarget.value);
                  onPole('kwota', liczbaZTekstu(e.currentTarget.value));
                }}
              />
            </Komorka>
          </div>
          <Rozwijane tytul="Tryb szczegółowy" domyslnieOtwarte={szczegolyWypelnione || szczegolyZBledem}>
            <div className="grid gap-3 md:grid-cols-2">
              <Komorka blad={bledy.dniPrzepracowane}>
                <Pole
                  etykieta="Dni przepracowane"
                  typ="number"
                  przyrostek="dni"
                  podpowiedz="Proszę wpisać tylko wtedy, gdy nie przepracowano całego miesiąca."
                  blad={bledy.dniPrzepracowane?.komunikat}
                  value={dniPrzepracowane}
                  onChange={(e) => {
                    ustawDniPrzepracowane(e.currentTarget.value);
                    onPole('dniPrzepracowane', liczbaZTekstu(e.currentTarget.value));
                  }}
                />
              </Komorka>
              <Komorka blad={bledy.dniObowiazku}>
                <Pole
                  etykieta="Dni do przepracowania"
                  typ="number"
                  przyrostek="dni"
                  podpowiedz="Liczba dni roboczych w tym miesiącu według grafiku pracy."
                  blad={bledy.dniObowiazku?.komunikat}
                  value={dniObowiazku}
                  onChange={(e) => {
                    ustawDniObowiazku(e.currentTarget.value);
                    onPole('dniObowiazku', liczbaZTekstu(e.currentTarget.value));
                  }}
                />
              </Komorka>
            </div>
          </Rozwijane>
        </>
      )}

      {typ !== 'lista_miesiecy' && (
        <div className="grid gap-3 md:grid-cols-2">
          <Komorka blad={bledy.od}>
            <Pole
              etykieta="Od kiedy"
              typ="date"
              blad={bledy.od?.komunikat}
              value={tekst('od')}
              onChange={(e) => onPole('od', e.currentTarget.value)}
            />
          </Komorka>
          <Komorka blad={bledy.do}>
            <Pole
              etykieta="Do kiedy"
              typ="date"
              blad={bledy.do?.komunikat}
              value={tekst('do')}
              onChange={(e) => onPole('do', e.currentTarget.value)}
            />
          </Komorka>
        </div>
      )}

      {typ === 'lista_zwolnien' && (
        <label className="flex min-h-11 cursor-pointer items-center gap-3 rounded-przycisk has-focus-visible:outline-3 has-focus-visible:outline-offset-2 has-focus-visible:outline-granat">
          <input
            type="checkbox"
            className="size-6 shrink-0 accent-granat"
            checked={wiersz.kodB === true}
            onChange={(e) => onPole('kodB', e.currentTarget.checked)}
          />
          <span className="text-base text-tekst">Zwolnienie z powodu ciąży (kod B)</span>
        </label>
      )}
    </div>
  );
}
