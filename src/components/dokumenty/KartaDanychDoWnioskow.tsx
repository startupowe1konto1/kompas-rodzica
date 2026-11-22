'use client';

import { useId, useState, type FormEvent } from 'react';
import { IconCircleCheck } from '@tabler/icons-react';
import type { Rodzina } from '../../engine/types';
import { dzisISO, useProfil } from '../../state/profil';
import { NAZWY_ROL } from '../os-czasu/teksty';
import { Karta, Pole, Przycisk } from '../ui';
import {
  brakujeDanych,
  scalDane,
  sprawdzFormularz,
  wartosciZOsoby,
  type BledyFormularza,
  scalDaneDziecka,
  wartosciZDziecka,
  type PoleDanych,
  type PoleDziecka,
  type WartosciDziecka,
  type WartosciFormularza,
} from './dane-osobowe';

const KOMUNIKAT_ZAPISANO = 'Zapisane. Dane zostają tylko w tej przeglądarce.';

type Stan = Record<string, { wartosci: WartosciFormularza; bledy: BledyFormularza }>;

function stanPoczatkowy(rodzina: Rodzina): Stan {
  return Object.fromEntries(rodzina.osoby.map((o) => [o.id, { wartosci: wartosciZOsoby(o), bledy: {} }]));
}

/**
 * Karta „Dane do wniosków do uzupełnienia”: formularz dla każdej osoby w profilu. Pokazuje się, gdy komuś
 * brakuje danych potrzebnych do wniosku; gdy wszystko jest, zwija się do jednej linii z przyciskiem „Zmień”.
 * Zapis idzie do `rodzina.osoby[i].dane` (scalony z tym, co już jest) i zostaje tylko w przeglądarce.
 */
export function KartaDanychDoWnioskow({ rodzina }: { rodzina: Rodzina }) {
  const { ustawRodzine, oznaczJakoWpisane } = useProfil();
  const naglowekId = useId();
  const [edycja, ustawEdycje] = useState(false);
  const [zapisano, ustawZapisano] = useState(false);
  const [stan, ustawStan] = useState<Stan>(() => stanPoczatkowy(rodzina));
  const [dzieci, ustawDzieci] = useState<WartosciDziecka[]>(() => rodzina.zdarzenie.dzieci.map(wartosciZDziecka));

  const brakuje = rodzina.osoby.some(brakujeDanych);
  const otwarta = brakuje || edycja;

  function zmien(osobaId: string, pole: PoleDanych, wartosc: string) {
    ustawStan((s) => {
      const biezacy = s[osobaId] ?? {
        wartosci: wartosciZOsoby(rodzina.osoby.find((o) => o.id === osobaId)!),
        bledy: {},
      };
      const { [pole]: _usuniety, ...reszta } = biezacy.bledy;
      void _usuniety;
      return {
        ...s,
        [osobaId]: {
          wartosci: { ...biezacy.wartosci, [pole]: wartosc },
          bledy: reszta,
        },
      };
    });
    ustawZapisano(false);
  }

  function zmienDziecko(i: number, pole: PoleDziecka, wartosc: string) {
    ustawDzieci((d) => d.map((x, j) => (j === i ? { ...x, [pole]: wartosc } : x)));
    ustawZapisano(false);
  }

  function zapisz(e: FormEvent) {
    e.preventDefault();
    const dzis = dzisISO();
    const nowy: Stan = {};
    let blad = false;
    for (const o of rodzina.osoby) {
      const wartosci = stan[o.id]?.wartosci ?? wartosciZOsoby(o);
      const bledy = sprawdzFormularz(wartosci, dzis);
      if (Object.keys(bledy).length > 0) blad = true;
      nowy[o.id] = { wartosci, bledy };
    }
    ustawStan(nowy);
    if (blad) {
      ustawZapisano(false);
      // Fokus na pierwszym polu z błędem.
      requestAnimationFrame(() => document.querySelector<HTMLElement>('[data-karta-danych] [aria-invalid="true"]')?.focus());
      return;
    }
    ustawRodzine((r) =>
      r
        ? {
            ...r,
            osoby: r.osoby.map((o) => (nowy[o.id] ? { ...o, dane: scalDane(o.dane, nowy[o.id].wartosci) } : o)),
            zdarzenie: {
              ...r.zdarzenie,
              dzieci: r.zdarzenie.dzieci.map((d, i) => {
                const dane = dzieci[i] ? scalDaneDziecka(d.dane, dzieci[i]) : d.dane;
                const { dane: _stare, ...bezDanych } = d;
                void _stare;
                return dane ? { ...bezDanych, dane } : bezDanych;
              }),
            },
          }
        : r,
    );
    rodzina.osoby.forEach((_, i) => oznaczJakoWpisane(`osoby[${i}].dane`));
    ustawEdycje(false);
    ustawZapisano(true);
  }

  if (!otwarta) {
    return (
      <Karta obramowanie data-karta-danych="zwinieta" className="flex flex-wrap items-center justify-between gap-3">
        <p className="flex items-center gap-2 font-bold text-granat">
          <IconCircleCheck size={24} stroke={2} aria-hidden className="shrink-0 text-sukces" />
          Dane do wniosków: uzupełnione
        </p>
        <Przycisk wariant="drugi" onClick={() => ustawEdycje(true)}>
          Zmień
        </Przycisk>
        <p role="status" className="basis-full text-tekst-drugi empty:hidden">
          {zapisano ? KOMUNIKAT_ZAPISANO : ''}
        </p>
      </Karta>
    );
  }

  return (
    <Karta jako="section" obramowanie aria-labelledby={naglowekId} data-karta-danych="otwarta" className="flex flex-col gap-5">
      <div className="flex flex-col gap-2">
        <h2 id={naglowekId} className="text-xl font-black leading-snug text-granat lg:text-2xl">
          Dane do wniosków do uzupełnienia
        </h2>
        <p className="max-w-prose leading-normal text-tekst-drugi">
          Te dane są potrzebne do wypełnienia wniosków. Zostają tylko w tej przeglądarce.
        </p>
      </div>

      <form onSubmit={zapisz} noValidate className="flex flex-col gap-6">
        {rodzina.osoby.map((o) => {
          const s = stan[o.id] ?? { wartosci: wartosciZOsoby(o), bledy: {} };
          const pole = (p: PoleDanych, etykieta: string, extra: Partial<React.ComponentProps<typeof Pole>> = {}) => (
            <Pole
              key={p}
              etykieta={etykieta}
              id={`dane-${o.id}-${p}`}
              value={s.wartosci[p]}
              blad={s.bledy[p]}
              onChange={(e) => zmien(o.id, p, e.target.value)}
              {...extra}
            />
          );
          return (
            <fieldset key={o.id} className="flex min-w-0 flex-col gap-4">
              <legend className="mb-1 text-lg font-bold text-granat">{NAZWY_ROL[o.rola]}</legend>
              <div className="grid gap-4 sm:grid-cols-2">
                {pole('imie', 'Imię', { autoComplete: 'off' })}
                {pole('nazwisko', 'Nazwisko', { autoComplete: 'off' })}
                {pole('pesel', 'PESEL', {
                  inputMode: 'numeric',
                  maxLength: 11,
                  autoComplete: 'off',
                })}
                {pole('dataUrodzenia', 'Data urodzenia', { typ: 'date' })}
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                {pole('ulica', 'Ulica', {
                  className: 'sm:col-span-2',
                  autoComplete: 'off',
                })}
                {pole('nrDomu', 'Numer domu', { autoComplete: 'off' })}
                {pole('nrLokalu', 'Numer lokalu (opcjonalnie)', {
                  autoComplete: 'off',
                })}
                {pole('kod', 'Kod pocztowy', {
                  placeholder: '00-000',
                  autoComplete: 'off',
                })}
                {pole('miejscowosc', 'Miejscowość', { autoComplete: 'off' })}
                {pole('telefon', 'Telefon (opcjonalnie)', {
                  typ: 'text',
                  inputMode: 'tel',
                  autoComplete: 'off',
                })}
                {pole('rachunekBankowy', 'Numer rachunku (opcjonalnie)', {
                  inputMode: 'numeric',
                  autoComplete: 'off',
                  podpowiedz: 'Do wypłaty zasiłku. 26 cyfr, spacje można zostawić.',
                  className: 'sm:col-span-2',
                })}
              </div>
            </fieldset>
          );
        })}

        {rodzina.zdarzenie.dzieci.map((_, i) => {
          const w = dzieci[i];
          if (!w) return null;
          const wielu = rodzina.zdarzenie.dzieci.length > 1;
          const pole = (p: PoleDziecka, etykieta: string, extra: Partial<React.ComponentProps<typeof Pole>> = {}) => (
            <Pole
              etykieta={etykieta}
              id={`dane-dziecko-${i}-${p}`}
              value={w[p]}
              onChange={(e) => zmienDziecko(i, p, e.target.value)}
              autoComplete="off"
              {...extra}
            />
          );
          return (
            <fieldset key={i} data-dziecko={i} className="flex min-w-0 flex-col gap-4">
              <legend className="mb-1 text-lg font-bold text-granat">{wielu ? `Dziecko ${i + 1}` : 'Dziecko'}</legend>
              <div className="grid gap-4 sm:grid-cols-2">
                {pole('imie', 'Imię dziecka (opcjonalnie)')}
                {pole('nazwisko', 'Nazwisko dziecka (opcjonalnie)')}
                {pole('miejsceUrodzenia', 'Miejsce urodzenia (opcjonalnie)', {
                  className: 'sm:col-span-2',
                })}
              </div>
            </fieldset>
          );
        })}

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <Przycisk type="submit" pelnaSzerokosc className="sm:w-auto">
            Zapisz dane
          </Przycisk>
          {edycja && !brakuje && (
            <Przycisk type="button" wariant="drugi" pelnaSzerokosc className="sm:w-auto" onClick={() => ustawEdycje(false)}>
              Anuluj
            </Przycisk>
          )}
        </div>
      </form>
      <p role="status" className="max-w-prose text-tekst-drugi empty:hidden">
        {zapisano ? KOMUNIKAT_ZAPISANO : ''}
      </p>
    </Karta>
  );
}
