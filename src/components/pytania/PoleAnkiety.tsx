'use client';

/**
 * Jedno pole ankiety „Moja sytuacja” (tor C, C3): wybiera komponent z `src/components/ui` po typie
 * pytania i dokłada błąd z kodem i znacznik „Do sprawdzenia”.
 *
 * Pola list (`lista_*`) rysuje `PoleListy`, a pytanie o rodzaje ubezpieczenia (kilka umów) `PoleTytulow`.
 * Odpowiedź z wartością startową dostaje ramkę, znacznik „Do sprawdzenia” i przycisk
 * „Tak, zgadza się”.
 */
import { useState, type ReactNode } from 'react';
import { IconEye } from '@tabler/icons-react';
import type { RodzajTytulu } from '../../engine/types';
import { BladPola as KomunikatBledu, Pole, PodpowiedzPola, PrzelacznikTakNie, Przycisk, Wybor, polacz } from '../ui';
import { PoleListy } from './PoleListy';
import { opcjeDoWyboru } from './listy';
import { PoleTytulow, type AkcjeTytulow } from './PoleTytulow';
import type { BladPola, PytanieWidoczne, WartoscOpcji } from './typy';

export interface PoleAnkietyProps {
  pytanie: PytanieWidoczne;
  /** Błędy przy tym polu (z `walidujOdpowiedz`). Błędy z `pole` dotyczą wierszy list. */
  bledy: BladPola[];
  /** Odpowiedź z wartością startową, którą rodzic ma jeszcze sprawdzić. */
  doPotwierdzenia: boolean;
  onZmiana: (wartosc: unknown) => void;
  onBlur: () => void;
  /** „Tak, zgadza się”: rodzic potwierdza wartość startową bez zmiany. */
  onPotwierdz: () => void;
  /** Data analizy rodziny (podpowiedź miesiąca w nowym wierszu listy). */
  dataAnalizy: string;
  /** Tylko pytanie o rodzaje ubezpieczenia: umowy osoby i operacje na nich. */
  akcjeTytulow?: AkcjeTytulow;
  /** Etykieta jako duży nagłówek ekranu (jedno pytanie na ekran). */
  duzy?: boolean;
}

const NAGLOWEK_DUZY_LEGENDA = '[&_legend]:text-2xl [&_legend]:font-black [&_legend]:leading-tight [&_legend]:text-granat';
const NAGLOWEK_DUZY_ETYKIETA = '[&_label]:text-2xl [&_label]:font-black [&_label]:leading-tight [&_label]:text-granat';
const NAGLOWEK_ZWYKLY_LEGENDA = '[&_legend]:text-lg [&_legend]:leading-snug';
const NAGLOWEK_ZWYKLY_ETYKIETA = '[&_label]:text-lg [&_label]:leading-snug';

/** Liczba z pola tekstowego; pusty napis = brak odpowiedzi, nieczytelny = NaN (walidacja zgłosi NIE_LICZBA). */
function liczbaZTekstu(tekst: string): number | undefined {
  const t = tekst.trim().replace(',', '.');
  if (t === '') return undefined;
  return Number(t);
}

function tekstZLiczby(w: unknown): string {
  return typeof w === 'number' && Number.isFinite(w) ? String(w) : '';
}

export function PoleAnkiety({ pytanie, bledy, doPotwierdzenia, onZmiana, onBlur, onPotwierdz, dataAnalizy, akcjeTytulow, duzy = false }: PoleAnkietyProps) {
  const { def, wartosc, klucz } = pytanie;
  const [tekst, ustawTekst] = useState(() => tekstZLiczby(wartosc));
  const [nieWiem, ustawNieWiem] = useState(false);
  const [innaLiczba, ustawInnaLiczba] = useState(false);

  const blad = bledy.find((b) => b.pole === undefined);

  const opis: ReactNode =
    def.pomoc || def.podpowiedz ? (
      <>
        {def.pomoc && <span className="block text-base">{def.pomoc}</span>}
        {def.podpowiedz && <span className={polacz('block', def.pomoc && 'mt-1')}>{def.podpowiedz}</span>}
      </>
    ) : undefined;

  // Bez znaczników źródła danych („z eZUS (symulacja)”, „wpisane przez…”) – decyzja Wojtka 22.11: szum przy pytaniu.
  const znaczniki: ReactNode =
    doPotwierdzenia ? (
      <span className="inline-flex flex-wrap items-center gap-1.5">
        {doPotwierdzenia && (
          <span className="inline-flex items-center gap-1 rounded-przycisk border border-info px-1.5 py-0.5 text-sm font-bold leading-tight text-info">
            <IconEye size={16} stroke={2} aria-hidden className="shrink-0" />
            Do sprawdzenia
          </span>
        )}
      </span>
    ) : undefined;

  const wspolne = { znacznik: znaczniki, podpowiedz: opis, blad: blad?.komunikat, wymagane: def.wymagane };
  const opcje = def.opcje ?? [];
  const poNapisie = (s: string): WartoscOpcji | undefined => opcje.find((o) => String(o.wartosc) === s)?.wartosc;

  let pole: ReactNode;
  switch (def.typ) {
    case 'tak_nie': {
      if (def.nieWiem) {
        const aktualna = nieWiem && wartosc === undefined ? 'nie_wiem' : wartosc === true ? 'tak' : wartosc === false ? 'nie' : null;
        pole = (
          <Wybor
            {...wspolne}
            className={duzy ? NAGLOWEK_DUZY_LEGENDA : NAGLOWEK_ZWYKLY_LEGENDA}
            name={klucz}
            legenda={def.etykieta}
            opcje={[
              { wartosc: 'tak', etykieta: 'Tak' },
              { wartosc: 'nie', etykieta: 'Nie' },
              { wartosc: 'nie_wiem', etykieta: 'Nie wiem' },
            ]}
            wartosc={aktualna}
            onZmiana={(w) => {
              ustawNieWiem(w === 'nie_wiem');
              onZmiana(w === 'tak' ? true : w === 'nie' ? false : undefined);
            }}
          />
        );
      } else {
        pole = (
          <PrzelacznikTakNie
            {...wspolne}
            className={duzy ? NAGLOWEK_DUZY_LEGENDA : NAGLOWEK_ZWYKLY_LEGENDA}
            name={klucz}
            pytanie={def.etykieta}
            wartosc={typeof wartosc === 'boolean' ? wartosc : null}
            onZmiana={onZmiana}
          />
        );
      }
      break;
    }
    case 'wybor': {
      const biezaca = opcje.find((o) => o.wartosc === wartosc);
      pole = (
        <Wybor
          {...wspolne}
          className={duzy ? NAGLOWEK_DUZY_LEGENDA : NAGLOWEK_ZWYKLY_LEGENDA}
          name={klucz}
          legenda={def.etykieta}
          opcje={opcje.map((o) => ({ wartosc: String(o.wartosc), etykieta: o.etykieta, opis: o.opis }))}
          wartosc={biezaca ? String(biezaca.wartosc) : null}
          onZmiana={(s) => onZmiana(poNapisie(s))}
        />
      );
      break;
    }
    case 'wiele': {
      if (def.kodek === 'rodzaje_tytulow' && akcjeTytulow) {
        pole = (
          <PoleTytulow
            def={def}
            akcje={akcjeTytulow}
            name={klucz}
            klasaNaglowka={duzy ? NAGLOWEK_DUZY_LEGENDA : NAGLOWEK_ZWYKLY_LEGENDA}
            znacznik={znaczniki}
            opis={opis}
            blad={blad?.komunikat}
            onRodzaje={(rodzaje: RodzajTytulu[]) => onZmiana(rodzaje)}
          />
        );
        break;
      }
      const wybrane = Array.isArray(wartosc) ? (wartosc as WartoscOpcji[]).map(String) : [];
      const widoczne = opcjeDoWyboru(opcje, Array.isArray(wartosc) ? wartosc : []);
      pole = (
        <Wybor
          {...wspolne}
          wielokrotny
          className={duzy ? NAGLOWEK_DUZY_LEGENDA : NAGLOWEK_ZWYKLY_LEGENDA}
          name={klucz}
          legenda={def.etykieta}
          opcje={widoczne.map((o) => ({ wartosc: String(o.wartosc), etykieta: o.etykieta, opis: o.opis }))}
          wartosc={wybrane}
          onZmiana={(napisy) => onZmiana(napisy.map(poNapisie).filter((w) => w !== undefined))}
        />
      );
      break;
    }
    case 'liczba':
      if (opcje.length > 0) {
        // Liczba z gotowych wartości (np. wymiar etatu): lista rozwijana i „Inna wartość (do wpisania)”,
        // która odsłania pole liczby (uwaga Wojtka 21.11: wybór zamiast wpisywania 0,5).
        const gotowa = opcje.find((o) => o.wartosc === wartosc);
        const inna = innaLiczba || (typeof wartosc === 'number' && !gotowa);
        const idListy = `${klucz}-lista`;
        const idOpisu = `${klucz}-lista-opis`;
        const idBledu = `${klucz}-lista-blad`;
        pole = (
          <div className={polacz('flex flex-col gap-2', duzy ? NAGLOWEK_DUZY_ETYKIETA : NAGLOWEK_ZWYKLY_ETYKIETA)}>
            <div className="flex flex-wrap items-start justify-between gap-2">
              <label htmlFor={idListy} className="font-bold text-tekst">
                {def.etykieta}
              </label>
              {znaczniki}
            </div>
            {opis && <PodpowiedzPola id={idOpisu}>{opis}</PodpowiedzPola>}
            <select
              id={idListy}
              value={inna ? 'inna' : gotowa ? String(gotowa.wartosc) : ''}
              aria-describedby={[opis ? idOpisu : null, blad && !inna ? idBledu : null].filter(Boolean).join(' ') || undefined}
              aria-invalid={blad && !inna ? true : undefined}
              aria-required={def.wymagane || undefined}
              onChange={(e) => {
                const v = e.currentTarget.value;
                if (v === 'inna') {
                  ustawInnaLiczba(true);
                  return;
                }
                ustawInnaLiczba(false);
                ustawTekst(v);
                onZmiana(poNapisie(v));
              }}
              onBlur={onBlur}
              className={polacz(
                'h-12 w-full rounded-przycisk border bg-white px-3 text-base text-tekst',
                blad && !inna ? 'border-2 border-blad' : 'border-szary-ramka',
              )}
            >
              <option value="" disabled>
                Proszę wybrać
              </option>
              {opcje.map((o) => (
                <option key={String(o.wartosc)} value={String(o.wartosc)}>
                  {o.etykieta}
                </option>
              ))}
              <option value="inna">Inna wartość (do wpisania)</option>
            </select>
            {blad && !inna && <KomunikatBledu id={idBledu}>{blad.komunikat}</KomunikatBledu>}
            {inna && (
              <Pole
                etykieta="Proszę wpisać wartość"
                typ="number"
                przyrostek={def.jednostka}
                blad={blad?.komunikat}
                value={tekst}
                onChange={(e) => {
                  ustawTekst(e.currentTarget.value);
                  onZmiana(liczbaZTekstu(e.currentTarget.value));
                }}
                onBlur={onBlur}
              />
            )}
          </div>
        );
        break;
      }
      pole = (
        <Pole
          className={duzy ? NAGLOWEK_DUZY_ETYKIETA : NAGLOWEK_ZWYKLY_ETYKIETA}
          etykieta={def.etykieta}
          typ="number"
          przyrostek={def.jednostka}
          znacznik={znaczniki}
          podpowiedz={opis}
          blad={blad?.komunikat}
          aria-required={def.wymagane || undefined}
          value={tekst}
          onChange={(e) => {
            ustawTekst(e.currentTarget.value);
            onZmiana(liczbaZTekstu(e.currentTarget.value));
          }}
          onBlur={onBlur}
        />
      );
      break;
    case 'kwota':
      pole = (
        <Pole
          className={duzy ? NAGLOWEK_DUZY_ETYKIETA : NAGLOWEK_ZWYKLY_ETYKIETA}
          etykieta={def.etykieta}
          typ="number"
          przyrostek={def.typ === 'kwota' ? (def.jednostka ?? 'zł') : def.jednostka}
          znacznik={znaczniki}
          podpowiedz={opis}
          blad={blad?.komunikat}
          aria-required={def.wymagane || undefined}
          value={tekst}
          onChange={(e) => {
            ustawTekst(e.currentTarget.value);
            onZmiana(liczbaZTekstu(e.currentTarget.value));
          }}
          onBlur={onBlur}
        />
      );
      break;
    case 'data':
      pole = (
        <Pole
          className={duzy ? NAGLOWEK_DUZY_ETYKIETA : NAGLOWEK_ZWYKLY_ETYKIETA}
          etykieta={def.etykieta}
          typ="date"
          znacznik={znaczniki}
          podpowiedz={opis}
          blad={blad?.komunikat}
          aria-required={def.wymagane || undefined}
          value={typeof wartosc === 'string' ? wartosc : ''}
          onChange={(e) => onZmiana(e.currentTarget.value === '' ? undefined : e.currentTarget.value)}
          onBlur={onBlur}
        />
      );
      break;
    case 'lista_miesiecy':
    case 'lista_okresow':
    case 'lista_zwolnien':
      pole = (
        <PoleListy
          def={def}
          wartosc={wartosc}
          bledy={bledy}
          dataAnalizy={dataAnalizy}
          znacznik={znaczniki}
          opis={opis}
          duzy={duzy}
          onZmiana={onZmiana}
          onBlur={onBlur}
        />
      );
      break;
  }

  return (
    <div data-pytanie={def.id} data-kod-bledu={def.typ.startsWith('lista_') ? undefined : blad?.kod}>
      {doPotwierdzenia ? (
        // Ramka w kolorze `info` (nie błędu): to prośba o sprawdzenie, nie pomyłka rodzica.
        <div data-do-potwierdzenia className="flex flex-col gap-3 rounded-przycisk border-2 border-info p-3">
          {pole}
          <div className="flex flex-col items-start gap-2 border-t border-szary-linia pt-3">
            <p className="text-sm leading-normal text-tekst-drugi">To wartość startowa. Proszę ją zmienić albo potwierdzić, że się zgadza.</p>
            <Przycisk wariant="drugi" onClick={onPotwierdz}>
              Tak, zgadza się
            </Przycisk>
          </div>
        </div>
      ) : (
        pole
      )}
    </div>
  );
}
