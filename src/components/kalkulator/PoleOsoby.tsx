'use client';

import { useId } from 'react';
import { IconChevronDown, IconInfoCircle } from '@tabler/icons-react';
import { Pole, PrzelacznikTakNie } from '../ui';
import {
  OPCJE_UMOWY,
  kwotaToPodstawaSkladek,
  maDobrowolneChorobowe,
  parsujKwote,
  type FormularzOsoby,
  type RodzajUmowy,
} from './budujRodzine';

interface Props {
  /** Przedrostek nazw pól i atrybutu `data-osoba` („mama” albo „tata”). */
  nazwa: 'mama' | 'tata';
  /** Dopełniacz do etykiet, np. „mamy”. */
  czyje: string;
  wartosc: FormularzOsoby;
  onZmiana: (zmiana: Partial<FormularzOsoby>) => void;
}

/** Pola jednej osoby: lista rodzajów umowy, (dobrowolne chorobowe), wynagrodzenie i od kiedy. */
export function PoleOsoby({ nazwa, czyje, wartosc, onZmiana }: Props) {
  const idListy = useId();
  const ubezpieczona = wartosc.umowa !== 'brak';
  const pytaOChorobowe = maDobrowolneChorobowe(wartosc.umowa);
  const bezChorobowego = pytaOChorobowe && !wartosc.chorobowe;
  const bladZarobkow = ubezpieczona && !bezChorobowego && wartosc.zarobki !== '' && parsujKwote(wartosc.zarobki) === null;

  return (
    <div className="flex flex-col gap-4" data-osoba={nazwa}>
      <div className="flex flex-col gap-1.5">
        <label htmlFor={idListy} className="text-base font-bold text-tekst">
          Umowa {czyje}
        </label>
        <div className="relative">
          <select
            id={idListy}
            name={`umowa-${nazwa}`}
            value={wartosc.umowa}
            onChange={(e) => onZmiana({ umowa: e.target.value as RodzajUmowy })}
            className="h-12 w-full min-w-0 appearance-none rounded-przycisk border border-szary-ramka bg-white pr-10 pl-3 text-base text-tekst"
          >
            {OPCJE_UMOWY.map((o) => (
              <option key={o.wartosc} value={o.wartosc}>
                {o.etykieta}
              </option>
            ))}
          </select>
          <IconChevronDown size={20} stroke={2} aria-hidden className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-tekst" />
        </div>
      </div>

      {pytaOChorobowe && (
        <PrzelacznikTakNie
          pytanie="Czy jest opłacane dobrowolne ubezpieczenie chorobowe?"
          podpowiedz="Jeśli nie ma Pani/Pan pewności, proszę sprawdzić w eZUS albo zapytać płatnika, np. zleceniodawcę."
          name={`chorobowe-${nazwa}`}
          wartosc={wartosc.chorobowe}
          onZmiana={(w) => onZmiana({ chorobowe: w })}
        />
      )}

      {bezChorobowego && (
        <p data-stan="bez-chorobowego" className="flex items-start gap-3 rounded-komunikat bg-szary-kafel p-3 leading-normal">
          <IconInfoCircle size={22} stroke={2} aria-hidden className="mt-px shrink-0 text-info" />
          <span>Bez dobrowolnego ubezpieczenia chorobowego zasiłek nie przysługuje, więc nie pytamy o wynagrodzenie.</span>
        </p>
      )}

      {ubezpieczona && !bezChorobowego && (
        <Pole
          etykieta={kwotaToPodstawaSkladek(wartosc.umowa) ? 'Miesięczna podstawa składek' : 'Wynagrodzenie brutto miesięcznie'}
          podpowiedz={
            kwotaToPodstawaSkladek(wartosc.umowa)
              ? 'Kwota, od której są opłacane składki na ubezpieczenia społeczne.'
              : 'Kwota z umowy przed potrąceniem podatku i składek.'
          }
          typ="number"
          min={0}
          przyrostek="zł"
          name={`zarobki-${nazwa}`}
          value={wartosc.zarobki}
          onChange={(e) => onZmiana({ zarobki: e.target.value })}
          blad={bladZarobkow ? 'Proszę wpisać kwotę większą od zera, np. 6000.' : undefined}
        />
      )}

      {ubezpieczona && (
        <Pole
          etykieta={wartosc.umowa === 'dzialalnosc' ? 'Od kiedy jest prowadzona działalność' : 'Od kiedy trwa umowa'}
          podpowiedz="Domyślnie dwa lata wstecz. Proszę zmienić, jeśli było inaczej."
          typ="date"
          name={`od-${nazwa}`}
          value={wartosc.od}
          onChange={(e) => onZmiana({ od: e.target.value })}
        />
      )}
    </div>
  );
}
