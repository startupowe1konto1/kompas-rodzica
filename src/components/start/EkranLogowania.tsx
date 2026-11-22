'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { IconArrowLeft, IconCheck, IconChevronRight, IconLock } from '@tabler/icons-react';
import type { PersonaTestowa } from '@/src/engine/types';
import { Karta, Przycisk } from '../ui';
import { ListaPerson } from './ListaPerson';
import {
  CZEGO_NIE_POBIERAMY,
  METODY_LOGOWANIA,
  uslugiDoZgody,
  zdanieUslug,
  type MetodaLogowania,
} from './logowanie-gov';
import { PobieranieDanych } from './PobieranieDanych';
import { IKONY_METOD, LINK_TEKSTOWY, NAGLOWEK_KROKU, SymulacjaLogowania } from './SymulacjaLogowania';
import { useZacznijRecznie } from './useZacznijRecznie';

type Krok =
  | { krok: 'metoda' }
  | { krok: 'symulacja'; metoda: MetodaLogowania }
  | { krok: 'osoba'; metoda: MetodaLogowania }
  | { krok: 'zgoda'; metoda: MetodaLogowania; persona: PersonaTestowa }
  | { krok: 'pobieranie'; metoda: MetodaLogowania; persona: PersonaTestowa };

/** Nagłówek (h2) każdego kroku: po zmianie kroku dostaje fokus, żeby czytnik ekranu i klawiatura zaczynały od góry. */
const NAGLOWKI: Record<Krok['krok'], string> = {
  metoda: 'logowanie-metoda',
  symulacja: 'logowanie-symulacja',
  osoba: 'logowanie-osoba',
  zgoda: 'logowanie-zgoda',
  pobieranie: 'pobieranie-naglowek',
};

/**
 * Logowanie przez krajowy węzeł login.gov.pl (symulacja). Kolejność ekranów na /logowanie:
 *  1. wybór metody (profil zaufany, aplikacja mObywatel, e-dowód, bankowość elektroniczna) albo „Kontynuuj bez logowania”,
 *  2. symulacja logowania osobna dla każdej metody (SymulacjaLogowania): formularz, telefon, karta albo bank,
 *     na końcu „Zalogowano (symulacja)”; „Pomiń symulację” przechodzi dalej od razu,
 *  3. wybór osoby testowej (ListaPerson): w czyim imieniu oglądamy przewodnik,
 *  4. zgoda na pobranie danych z e-usług, z listą, co dokładnie przyjdzie (docs/zrodla-danych.md); odmowa = ankieta ręczna,
 *  5. pobieranie danych z mObywatela i eZUS (PobieranieDanych), potem ankieta /sytuacja.
 * Nic nie wychodzi poza aplikację: „usługi” to lokalne trasy /api/mock.
 * Każdy krok wchodzi z krótkim przesunięciem i przenikaniem (logowanie.css, bez ruchu przy prefers-reduced-motion).
 */
export function EkranLogowania() {
  const [stan, setStan] = useState<Krok>({ krok: 'metoda' });
  const zacznijRecznie = useZacznijRecznie();
  const pierwszy = useRef(true);

  useEffect(() => {
    if (pierwszy.current) {
      pierwszy.current = false;
      return;
    }
    document.getElementById(NAGLOWKI[stan.krok])?.focus();
  }, [stan.krok]);

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-5 px-4 py-6 md:py-10">
      <h1 className="text-2xl leading-tight font-black text-tekst md:text-3xl">Zaloguj się (symulacja)</h1>

      {stan.krok !== 'pobieranie' && <PasekWezla />}

      {/* Klucz = krok: każdy krok montuje się od nowa i wchodzi animacją .logowanie-wejscie. */}
      <div key={stan.krok} className="logowanie-wejscie flex flex-col gap-5">
        {stan.krok === 'metoda' && (
          <WyborMetody onWybor={(metoda) => setStan({ krok: 'symulacja', metoda })} onBezLogowania={zacznijRecznie} />
        )}

        {stan.krok === 'symulacja' && (
          <SymulacjaLogowania
            metoda={stan.metoda}
            idNaglowka={NAGLOWKI.symulacja}
            onZalogowano={() => setStan({ krok: 'osoba', metoda: stan.metoda })}
            onAnuluj={() => setStan({ krok: 'metoda' })}
          />
        )}

        {stan.krok === 'osoba' && (
          <section aria-labelledby={NAGLOWKI.osoba} className="flex flex-col gap-4">
            <h2 id={NAGLOWKI.osoba} tabIndex={-1} className={NAGLOWEK_KROKU}>
              Proszę wybrać osobę testową
            </h2>
            <p className="max-w-prose leading-normal text-tekst-drugi">
              Zalogowano przez {stan.metoda.wZdaniu}. W symulacji wybiera się jeszcze osobę testową, której dane pokaże
              przewodnik. Wszystkie osoby i ich dane są fikcyjne.
            </p>
            <ListaPerson onWybor={(persona) => setStan({ krok: 'zgoda', metoda: stan.metoda, persona })} />
            <button type="button" onClick={() => setStan({ krok: 'metoda' })} className={LINK_TEKSTOWY}>
              <IconArrowLeft size={20} stroke={2} aria-hidden />
              Zmień sposób logowania
            </button>
          </section>
        )}

        {stan.krok === 'zgoda' && (
          <Zgoda
            persona={stan.persona}
            metoda={stan.metoda}
            onZgoda={() => setStan({ krok: 'pobieranie', metoda: stan.metoda, persona: stan.persona })}
            onOdmowa={zacznijRecznie}
            onZmiana={() => setStan({ krok: 'osoba', metoda: stan.metoda })}
          />
        )}

        {stan.krok === 'pobieranie' && (
          <PobieranieDanych
            key={stan.persona.id}
            persona={stan.persona}
            metoda={stan.metoda}
            onZmiana={() => setStan({ krok: 'osoba', metoda: stan.metoda })}
          />
        )}
      </div>
    </main>
  );
}

/** Belka „węzła”: tylko tekst, bez godła i logotypów (CLAUDE.md). */
function PasekWezla() {
  return (
    <div className="flex items-center gap-3 rounded-karta bg-granat px-4 py-3 text-white lg:px-6">
      <IconLock size={24} stroke={1.75} aria-hidden className="shrink-0" />
      <p className="leading-snug">
        <span className="block text-lg font-black">
          login.gov.pl <span className="font-normal">(symulacja)</span>
        </span>
        <span className="block text-sm">Krajowy Węzeł Identyfikacji Elektronicznej</span>
      </p>
    </div>
  );
}

function WyborMetody({ onWybor, onBezLogowania }: { onWybor: (m: MetodaLogowania) => void; onBezLogowania: () => void }) {
  return (
    <>
      <section aria-labelledby={NAGLOWKI.metoda} className="flex flex-col gap-4">
        <h2 id={NAGLOWKI.metoda} tabIndex={-1} className={NAGLOWEK_KROKU}>
          Proszę wybrać sposób logowania
        </h2>
        <p className="max-w-prose leading-normal text-tekst-drugi">
          Serwisy publiczne logują przez krajowy węzeł login.gov.pl. Tu to logowanie jest tylko symulacją: nic nie
          wychodzi poza tę przeglądarkę.{' '}
          <a href="#bez-logowania" className="font-bold text-zielen underline underline-offset-2 hover:text-zielen-ciemna">
            Można też kontynuować bez logowania.
          </a>
        </p>
        <ul className="grid auto-rows-fr gap-3 md:grid-cols-2" aria-label="Sposoby logowania">
          {METODY_LOGOWANIA.map((m) => {
            const Ikona = IKONY_METOD[m.id];
            return (
              // Kafle w wierszu siatki mają równą wysokość (h-full): bez tego każdy był wysoki jak jego opis.
              <li key={m.id} className="flex">
                <button
                  type="button"
                  data-metoda={m.id}
                  onClick={() => onWybor(m)}
                  className="flex h-full min-h-16 w-full items-start gap-3 rounded-karta border border-szary-linia bg-white p-4 text-left transition-colors hover:border-granat lg:p-5"
                >
                  <Ikona size={28} stroke={1.75} aria-hidden className="mt-0.5 shrink-0 text-granat" />
                  <span className="flex flex-1 flex-col gap-1">
                    <span className="text-lg leading-snug font-bold text-tekst">{m.nazwa}</span>
                    <span className="leading-normal text-tekst-drugi">{m.opis}</span>
                  </span>
                  <IconChevronRight size={24} stroke={2} aria-hidden className="mt-1 shrink-0 text-zielen" />
                </button>
              </li>
            );
          })}
        </ul>
        <p className="max-w-prose text-sm leading-normal text-tekst-drugi">
          Węzeł przekazuje do przewodnika tylko imię, nazwisko, datę urodzenia i identyfikator. Dane o ubezpieczeniu
          pobieramy dopiero po wyrażeniu zgody.
        </p>
      </section>

      <Karta
        jako="section"
        id="bez-logowania"
        tabIndex={-1}
        aria-labelledby="logowanie-bez"
        className="flex scroll-mt-4 flex-col gap-3 outline-none"
      >
        <h2 id="logowanie-bez" className="text-lg leading-snug font-bold text-tekst">
          Bez logowania
        </h2>
        <p className="max-w-prose leading-normal text-tekst-drugi">
          Do samego planowania konto nie jest potrzebne. Dane wpisuje się ręcznie, odpowiadając na proste pytania. Wynik
          jest taką samą symulacją.
        </p>
        <Przycisk wariant="drugi" href="/sytuacja" onClick={onBezLogowania} className="self-start" data-bez-logowania>
          Kontynuuj bez logowania
        </Przycisk>
      </Karta>
    </>
  );
}

function Zgoda({
  persona,
  metoda,
  onZgoda,
  onOdmowa,
  onZmiana,
}: {
  persona: PersonaTestowa;
  metoda: MetodaLogowania;
  onZgoda: () => void;
  onOdmowa: () => void;
  onZmiana: () => void;
}) {
  const uslugi = uslugiDoZgody(persona.pochodzenie);
  const [a, b, c] = CZEGO_NIE_POBIERAMY;
  return (
    <section aria-labelledby={NAGLOWKI.zgoda} className="flex flex-col gap-4">
      <h2 id={NAGLOWKI.zgoda} tabIndex={-1} className={NAGLOWEK_KROKU}>
        Zgoda na pobranie danych
      </h2>
      <p className="max-w-prose leading-normal text-tekst-drugi">
        Zalogowano jako: {persona.nazwa} – osoba testowa, przez {metoda.wZdaniu}.
      </p>

      <Karta className="flex flex-col gap-4">
        <p id="zgoda-tresc" className="text-lg leading-snug font-bold text-tekst">
          Wyrażam zgodę na pobranie moich danych z {zdanieUslug(uslugi)} (symulacja).
        </p>
        <p className="leading-normal text-tekst-drugi">Pobierzemy tylko to, co te usługi naprawdę mają:</p>
        <div className="grid gap-4 md:grid-cols-2">
          {uslugi.map((u) => (
            <Grupa key={u.zrodlo} tytul={u.nazwa} zrodlo={u.zrodlo}>
              {u.dane.map((d) => (
                <li key={d} className="flex items-start gap-2 leading-normal">
                  <IconCheck size={20} stroke={2.5} aria-hidden className="mt-0.5 shrink-0 text-zielen" />
                  <span>{d}</span>
                </li>
              ))}
            </Grupa>
          ))}
        </div>
        <p className="max-w-prose leading-normal text-tekst-drugi">
          Żadna usługa nie ma {a}, {b} ani {c}. Te dane wpisze Pani/Pan w ankiecie.
        </p>
        <p className="max-w-prose leading-normal text-tekst-drugi">
          Można nie wyrazić zgody. Wtedy nic nie pobieramy, a dane wpisuje się ręcznie.
        </p>
      </Karta>

      <div className="flex flex-col gap-3 md:flex-row md:flex-wrap md:items-center">
        <Przycisk onClick={onZgoda} aria-describedby="zgoda-tresc" data-zgoda="tak" className="md:w-auto" pelnaSzerokosc>
          Wyrażam zgodę
        </Przycisk>
        <Przycisk wariant="drugi" href="/sytuacja" onClick={onOdmowa} data-zgoda="nie" className="md:w-auto" pelnaSzerokosc>
          Nie wyrażam zgody – wpiszę dane ręcznie
        </Przycisk>
      </div>
      <button type="button" onClick={onZmiana} className={LINK_TEKSTOWY}>
        <IconArrowLeft size={20} stroke={2} aria-hidden />
        Wybierz inną osobę
      </button>
    </section>
  );
}

function Grupa({ tytul, zrodlo, children }: { tytul: string; zrodlo: string; children: ReactNode }) {
  const id = `zgoda-${zrodlo}`;
  return (
    <section aria-labelledby={id} data-zgoda-zrodlo={zrodlo} className="rounded-komunikat border border-szary-linia p-4">
      <h3 id={id} className="font-bold leading-snug text-tekst">
        {tytul}
      </h3>
      <ul className="mt-2 flex flex-col gap-2">{children}</ul>
    </section>
  );
}
