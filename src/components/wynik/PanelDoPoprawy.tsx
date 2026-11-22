'use client';

import Link from 'next/link';
import { useId } from 'react';
import { IconArrowRight, IconListCheck } from '@tabler/icons-react';
import type { Rodzina, Uprawnienie } from '../../engine/types';
import { useUprawnienia } from '../../state/useZapytanie';
import { odpowiedziDoPoprawy } from '../pytania/doPoprawy';
import { Przycisk } from '../ui';
import { KLASY_H3, polacz } from '../ui/klasy';

/** Link do pytania w ankiecie: ankieta otwiera się od razu na nim (`?pytanie=`). */
export function linkDoPytania(klucz: string): string {
  return `/sytuacja?pytanie=${encodeURIComponent(klucz)}`;
}

interface PanelDoPoprawyProps {
  rodzina: Rodzina;
  /** true: nie ma planu, więc nie ma też wyniku; false: wynik jest, ale część odpowiedzi wygląda na pomyłkę. */
  brakWyniku: boolean;
  className?: string;
}

/**
 * „Na podstawie podanych danych nie możemy policzyć wyniku. Popraw te odpowiedzi:” i lista pytań z linkami.
 * Nic nie pokazuje, gdy wynik jest, a odpowiedzi są w porządku.
 */
/**
 * Powody z silnika, dla których nic nie przysługuje (bez powtórzeń). Pokazujemy je wprost w panelu: rodzic widział
 * „nie możemy policzyć wyniku” bez wyjaśnienia dlaczego (uwaga Wojtka 22.11).
 */
function powodyBraku(uprawnienia: Uprawnienie[] | undefined, rodzina: Rodzina) {
  const para = rodzina.osoby.length > 1;
  const widziane = new Set<string>();
  const wynik: { klucz: string; kto: string | null; powod: string; przepis: string; alternatywa?: string }[] = [];
  // Tylko świadczenie, które rozplanowalibyśmy w czasie: przy porodzie zasiłek macierzyński, przy przyjęciu dziecka
  // urlop na warunkach macierzyńskiego. Reszta (np. świadczenie rehabilitacyjne) tylko zaciemniała powód.
  const glowne = rodzina.zdarzenie && rodzina.zdarzenie.typ !== 'porod' ? 'na_warunkach_macierzynskiego' : 'macierzynski';
  for (const u of uprawnienia ?? []) {
    if (u.swiadczenie !== glowne || u.przysluguje !== false || widziane.has(u.powod)) continue;
    widziane.add(u.powod);
    const osoba = rodzina.osoby.find((o) => o.id === u.osobaId);
    wynik.push({ klucz: `${u.osobaId}|${u.kod}`, kto: para ? (osoba?.dane?.imie ?? null) : null, powod: u.powod, przepis: u.przepis, alternatywa: u.alternatywa });
  }
  return wynik;
}

export function PanelDoPoprawy({ rodzina, brakWyniku, className }: PanelDoPoprawyProps) {
  const id = useId();
  const lista = odpowiedziDoPoprawy(rodzina);
  // Powody z silnika są potrzebne tylko wtedy, gdy nie ma planu, a odpowiedzi są poprawne.
  const uprawnienia = useUprawnienia(brakWyniku && lista.length === 0 ? rodzina : null);
  if (!brakWyniku && lista.length === 0) return null;
  const powody = lista.length === 0 ? powodyBraku(uprawnienia.dane?.uprawnienia, rodzina) : [];

  const tytul =
    lista.length > 0
      ? brakWyniku
        ? 'Na podstawie podanych danych nie możemy policzyć wyniku'
        : 'Proszę sprawdzić te odpowiedzi'
      : 'Nie ma urlopu ani zasiłku do zaplanowania';
  const wstep =
    lista.length > 0
      ? brakWyniku
        ? 'Proszę poprawić te odpowiedzi, a od razu policzymy zasiłek i ułożymy plan:'
        : 'Część odpowiedzi wygląda na pomyłkę, więc wynik może być nieprawdziwy. Proszę je poprawić:'
      : 'Odpowiedzi są kompletne, ale wynika z nich, że teraz nie przysługuje zasiłek, który można rozplanować w czasie. Powód:';

  return (
    <section
      aria-labelledby={id}
      data-panel-do-poprawy
      className={polacz('rounded-komunikat border border-szary-linia bg-white p-4 text-tekst lg:p-6', className)}
    >
      <div className="flex items-start gap-3">
        <IconListCheck size={26} stroke={2} aria-hidden className="mt-0.5 shrink-0 text-granat" />
        <div className="flex flex-col gap-1">
          <h2 id={id} className={polacz(KLASY_H3, 'text-granat')}>
            {tytul}
          </h2>
          <p className="max-w-prose leading-normal">{wstep}</p>
        </div>
      </div>

      {lista.length > 0 ? (
        <ol className="mt-4 flex flex-col gap-3">
          {lista.map((x, i) => (
            <li key={x.klucz} data-do-poprawy={x.kod} className="flex flex-col gap-2 rounded-komunikat bg-tlo p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex gap-3">
                <span aria-hidden className="flex size-7 shrink-0 items-center justify-center rounded-przycisk bg-granat text-sm font-black text-white">
                  {i + 1}
                </span>
                <div className="flex flex-col gap-0.5">
                  {x.kontekst && <p className="text-sm font-bold text-tekst-drugi">{x.kontekst}</p>}
                  <p className="font-bold text-granat">{x.pytanie}</p>
                  <p className="max-w-prose leading-normal">{x.powod}</p>
                </div>
              </div>
              <Link
                href={linkDoPytania(x.klucz)}
                className="inline-flex min-h-11 shrink-0 items-center gap-1 self-start rounded-przycisk px-2 font-bold text-zielen underline underline-offset-4 hover:text-zielen-ciemna sm:self-center"
              >
                Popraw odpowiedź
                <span className="sr-only">: {x.pytanie}</span>
                <IconArrowRight size={18} aria-hidden />
              </Link>
            </li>
          ))}
        </ol>
      ) : (
        <>
          {uprawnienia.laduje && powody.length === 0 ? (
            <p className="mt-4 text-tekst-drugi">Sprawdzamy powód…</p>
          ) : (
            <ul className="mt-4 flex flex-col gap-3">
              {powody.map((p) => (
                <li key={p.klucz} data-powod-braku className="flex flex-col gap-1 rounded-komunikat bg-tlo p-4">
                  {p.kto && <p className="text-sm font-bold text-tekst-drugi">{p.kto}</p>}
                  <p className="max-w-prose leading-normal">{p.powod}</p>
                  {p.alternatywa && <p className="max-w-prose leading-normal font-bold text-granat">{p.alternatywa}</p>}
                  {p.przepis && <p className="text-sm text-tekst-drugi">Podstawa prawna: {p.przepis}</p>}
                </li>
              ))}
            </ul>
          )}
          <p className="mt-4 max-w-prose leading-normal">Jeśli któraś odpowiedź jest pomyłką, proszę ją poprawić – wynik policzymy od nowa.</p>
          <Przycisk href="/sytuacja" wariant="drugi" className="mt-3">
            Wróć do pytań
          </Przycisk>
        </>
      )}
    </section>
  );
}
