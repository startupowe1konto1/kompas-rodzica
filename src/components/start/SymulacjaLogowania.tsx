'use client';

import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import {
  IconArrowLeft,
  IconBuildingBank,
  IconCheck,
  IconChevronRight,
  IconDeviceMobile,
  IconId,
  IconLoader2,
  IconLock,
  IconPlayerTrackNext,
  IconShieldCheck,
  type Icon,
} from '@tabler/icons-react';
import { Karta, Pole, Przycisk } from '../ui';
import {
  BANKI_SYMULACJA,
  DANE_SYMULACYJNE,
  KOMUNIKATY_FAZ,
  kodWeryfikacyjny,
  przebiegSymulacji,
  type BankSymulacja,
  type FazaSymulacji,
  type IdMetody,
  type MetodaLogowania,
} from './logowanie-gov';
import './logowanie.css';

/** Neutralne ikony konturowe (Tabler), bez logotypów usług. */
export const IKONY_METOD: Record<IdMetody, Icon> = {
  'profil-zaufany': IconShieldCheck,
  mobywatel: IconDeviceMobile,
  'e-dowod': IconId,
  bank: IconBuildingBank,
};

export const LINK_TEKSTOWY =
  'inline-flex min-h-11 items-center gap-1.5 self-start rounded-przycisk font-bold text-zielen underline underline-offset-2 hover:text-zielen-ciemna';

export const NAGLOWEK_KROKU = 'text-xl leading-snug font-bold text-tekst outline-none lg:text-2xl';

/** Pola tylko do odczytu wyglądają na zablokowane (szare tło). */
const POLE_ZABLOKOWANE = '[&_input]:cursor-default [&_input]:bg-szary-kafel';

export interface SymulacjaLogowaniaProps {
  metoda: MetodaLogowania;
  /** id nagłówka (h2): EkranLogowania daje mu fokus po wejściu w krok. */
  idNaglowka: string;
  onZalogowano: () => void;
  onAnuluj: () => void;
}

/**
 * Symulacja logowania w węźle login.gov.pl, osobna dla każdej metody (przebieg i czasy: logowanie-gov.ts).
 * Kończy się wspólnym stanem „Zalogowano (symulacja)”, po którym EkranLogowania pokazuje wybór osoby.
 * „Pomiń symulację” (`data-logowanie-dalej`) przechodzi dalej od razu; „Anuluj” wraca do wyboru metody.
 * Timery sprząta odmontowanie (Anuluj, Pomiń) i każda zmiana fazy.
 */
export function SymulacjaLogowania({ metoda, idNaglowka, onZalogowano, onAnuluj }: SymulacjaLogowaniaProps) {
  const przebieg = przebiegSymulacji(metoda.id);
  const [indeks, setIndeks] = useState(0);
  const [bank, setBank] = useState<BankSymulacja | null>(null);
  const krok = przebieg[indeks];
  const faza = krok.faza;
  const dalej = () => setIndeks((i) => Math.min(i + 1, przebieg.length - 1));

  // Najświeższy callback bez restartu timera, gdy rodzic poda nową funkcję.
  const zalogowanoRef = useRef(onZalogowano);
  useEffect(() => {
    zalogowanoRef.current = onZalogowano;
  });

  useEffect(() => {
    if (krok.czas === null) return;
    const ostatnia = indeks === przebieg.length - 1;
    const t = window.setTimeout(() => (ostatnia ? zalogowanoRef.current() : setIndeks(indeks + 1)), krok.czas);
    return () => window.clearTimeout(t);
  }, [indeks, krok.czas, przebieg.length]);

  // Kliknięty przycisk (np. bank z listy) znika przy zmianie fazy: wtedy fokus wraca na nagłówek, a nie na <body>.
  const pierwsza = useRef(true);
  useEffect(() => {
    if (pierwsza.current) {
      pierwsza.current = false;
      return;
    }
    const aktywny = document.activeElement;
    if (!aktywny || aktywny === document.body || !aktywny.isConnected) document.getElementById(idNaglowka)?.focus();
  }, [indeks, idNaglowka]);

  const komunikat = faza === 'przekierowanie' && bank ? `${KOMUNIKATY_FAZ[faza]} ${bank.nazwa}` : KOMUNIKATY_FAZ[faza];
  const Ikona = IKONY_METOD[metoda.id];

  return (
    <section aria-labelledby={idNaglowka} className="flex flex-col gap-4" data-symulacja={metoda.id} data-faza={faza}>
      <h2 id={idNaglowka} tabIndex={-1} className={NAGLOWEK_KROKU}>
        Logowanie przez {metoda.wZdaniu}
      </h2>
      <p role="status" className="sr-only">
        {komunikat}
      </p>

      <Karta className="flex min-h-80 flex-col gap-4">
        <p className="flex items-center gap-3 border-b border-szary-linia pb-3 font-bold text-granat">
          <span aria-hidden className="flex size-9 shrink-0 items-center justify-center rounded-komunikat bg-granat text-white">
            <Ikona size={22} stroke={1.75} />
          </span>
          {metoda.nazwa}
        </p>
        <div key={grupaFazy(metoda.id, faza)} className="logowanie-faza flex flex-1 flex-col">
          {faza === 'zalogowano' ? (
            <Zalogowano />
          ) : metoda.id === 'profil-zaufany' ? (
            <ProfilZaufany sprawdzanie={faza === 'sprawdzanie'} onZaloguj={dalej} />
          ) : metoda.id === 'mobywatel' ? (
            <Mobywatel />
          ) : metoda.id === 'e-dowod' ? (
            <EDowod faza={faza} czas={krok.czas ?? 0} />
          ) : faza === 'wybor-banku' ? (
            <WyborBanku
              onWybor={(b) => {
                setBank(b);
                dalej();
              }}
            />
          ) : (
            <SerwisBanku bank={bank} faza={faza} czas={krok.czas ?? 0} />
          )}
        </div>
      </Karta>

      <div className="flex flex-col gap-3 md:flex-row-reverse md:items-center md:justify-between">
        <Przycisk wariant="drugi" onClick={onZalogowano} data-logowanie-dalej ikona={<IconPlayerTrackNext size={20} stroke={2} />} className="md:w-auto" pelnaSzerokosc>
          Pomiń symulację
        </Przycisk>
        <button type="button" onClick={onAnuluj} className={LINK_TEKSTOWY} data-logowanie-anuluj>
          <IconArrowLeft size={20} stroke={2} aria-hidden />
          Anuluj
        </button>
      </div>
    </section>
  );
}

/** Fazy z tą samą grupą zostają na ekranie bez ponownego wejścia (np. karta e-dowodu leży dalej na czytniku). */
function grupaFazy(metoda: IdMetody, faza: FazaSymulacji): string {
  if (faza === 'zalogowano' || faza === 'wybor-banku') return faza;
  return metoda === 'bank' ? 'serwis-banku' : metoda;
}

function ProfilZaufany({ sprawdzanie, onZaloguj }: { sprawdzanie: boolean; onZaloguj: () => void }) {
  return (
    <div className="flex flex-col gap-4">
      <p id="pz-uwaga" className="flex max-w-prose items-start gap-2 leading-normal text-tekst-drugi">
        <IconLock size={20} stroke={2} aria-hidden className="mt-0.5 shrink-0 text-granat" />
        W symulacji pola są już wypełnione (hasło jest ukryte) i nie da się ich zmienić. Proszę nigdy nie wpisywać tu
        prawdziwego loginu ani hasła.
      </p>
      <div className="grid gap-4 md:grid-cols-2">
        {/* Pole zwykłe, nie type="password": menedżer haseł nie ma tu czego zapamiętywać. */}
        <Pole etykieta="Login" value={DANE_SYMULACYJNE.login} readOnly autoComplete="off" aria-describedby="pz-uwaga" className={POLE_ZABLOKOWANE} />
        <Pole etykieta="Hasło" value={DANE_SYMULACYJNE.haslo} readOnly autoComplete="off" aria-describedby="pz-uwaga" className={POLE_ZABLOKOWANE} />
      </div>
      <Przycisk onClick={onZaloguj} laduje={sprawdzanie} etykietaLadowania="Sprawdzamy dane" className="md:w-auto md:self-start" pelnaSzerokosc>
        {sprawdzanie ? 'Sprawdzamy dane…' : 'Zaloguj się (symulacja)'}
      </Przycisk>
    </div>
  );
}

/** Telefon z rozchodzącymi się pierścieniami (mObywatel, aplikacja banku). */
function TelefonPuls({ rozmiar = 'duzy' }: { rozmiar?: 'duzy' | 'maly' }) {
  const duzy = rozmiar === 'duzy';
  return (
    <span
      aria-hidden
      className={`logowanie-puls relative flex shrink-0 items-center justify-center rounded-full bg-granat text-white ${duzy ? 'size-24' : 'size-16'}`}
    >
      <IconDeviceMobile size={duzy ? 48 : 32} stroke={1.75} />
    </span>
  );
}

function Czekamy({ children }: { children: ReactNode }) {
  return (
    <p className="flex items-center gap-2 font-bold text-granat">
      <IconLoader2 size={22} stroke={2} aria-hidden className="shrink-0 motion-safe:animate-spin" />
      {children}
    </p>
  );
}

function Mobywatel() {
  // Losowy kod przy każdym wejściu, jak w prawdziwym węźle. Komponent działa tylko po kliknięciu (bez SSR).
  const [kod] = useState(() => kodWeryfikacyjny(Math.random));
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-5 pt-6 pb-2 text-center">
      <TelefonPuls />
      <p className="max-w-md text-lg leading-snug font-bold text-tekst">
        Proszę potwierdzić logowanie w aplikacji mObywatel na telefonie.
      </p>
      <div className="flex flex-col items-center gap-2">
        <p className="text-sm text-tekst-drugi">Kod weryfikacyjny (symulacja)</p>
        <p className="flex gap-2" data-kod-weryfikacyjny={kod}>
          <span className="sr-only">{kod.split('').join(' ')}</span>
          {kod.split('').map((c, i) => (
            <span
              key={i}
              aria-hidden
              className="flex h-14 w-11 items-center justify-center rounded-przycisk border-2 border-granat text-3xl font-black text-granat tabular-nums"
            >
              {c}
            </span>
          ))}
        </p>
        <p className="max-w-sm text-sm leading-normal text-tekst-drugi">Proszę sprawdzić, czy aplikacja pokazuje ten sam kod.</p>
      </div>
      <Czekamy>Czekamy na potwierdzenie…</Czekamy>
    </div>
  );
}

/** Rysunek: karta przykładana do telefonu i fale NFC. Czysto ozdobny (aria-hidden). */
function KartaNaCzytniku() {
  return (
    <div aria-hidden className="relative mx-auto h-44 w-52 shrink-0">
      {/* Telefon albo czytnik: karta zakrywa tylko jego górną część */}
      <div className="absolute top-10 left-16 h-34 w-20 rounded-2xl bg-granat p-1.5">
        <div className="h-full rounded-xl bg-white/15" />
      </div>
      {/* Fale NFC przy miejscu styku */}
      <div className="absolute top-9 left-[164px]">
        {[16, 28, 40].map((r, i) => (
          <span
            key={r}
            className="logowanie-fala absolute rounded-full border-[3px] border-transparent border-r-zielen"
            style={{ width: r, height: r, left: -r / 2, top: -r / 2, animationDelay: `${900 + i * 150}ms` } as CSSProperties}
          />
        ))}
      </div>
      {/* Dowód osobisty */}
      <div className="logowanie-karta absolute top-4 left-5 flex h-[70px] w-[112px] flex-col overflow-hidden rounded-lg border-2 border-granat bg-white">
        <div className="h-3 bg-zielen" />
        <div className="flex flex-1 items-center gap-2 px-2">
          <IconId size={30} stroke={1.75} className="shrink-0 text-granat" />
          <div className="flex flex-1 flex-col gap-1.5">
            <span className="h-1.5 w-full rounded-full bg-szary-ramka" />
            <span className="h-1.5 w-2/3 rounded-full bg-szary-ramka" />
          </div>
        </div>
      </div>
    </div>
  );
}

function PasekPostepu({ czas }: { czas: number }) {
  return (
    <div aria-hidden className="logowanie-pasek h-2 w-full max-w-sm overflow-hidden rounded-full bg-szary-kafel">
      <div className="logowanie-postep h-full w-full rounded-full bg-zielen" style={{ animationDuration: `${czas}ms` }} />
    </div>
  );
}

function EDowod({ faza, czas }: { faza: FazaSymulacji; czas: number }) {
  return (
    <div className="flex flex-1 flex-col items-center gap-4 text-center">
      <KartaNaCzytniku />
      <p className="max-w-md text-lg leading-snug font-bold text-tekst">
        Proszę przyłożyć dowód osobisty do czytnika albo telefonu z NFC.
      </p>
      <Pole
        etykieta="Numer CAN (symulacja)"
        value={DANE_SYMULACYJNE.can}
        readOnly
        autoComplete="off"
        podpowiedz="Sześć cyfr z prawego dolnego rogu dowodu. W symulacji numer jest już wpisany."
        className={`w-full max-w-xs text-left ${POLE_ZABLOKOWANE} [&_input]:tabular-nums`}
      />
      {/* Ta sama wysokość w obu fazach, żeby nic nie skakało. */}
      <div className="flex min-h-16 flex-col items-center gap-2">
        {faza === 'odczyt' ? (
          <div key="odczyt" className="logowanie-faza flex w-full flex-col items-center gap-2">
            <Czekamy>Odczytujemy dane z warstwy elektronicznej…</Czekamy>
            <PasekPostepu czas={czas} />
          </div>
        ) : (
          <Czekamy>Czekamy na dowód…</Czekamy>
        )}
      </div>
    </div>
  );
}

function WyborBanku({ onWybor }: { onWybor: (b: BankSymulacja) => void }) {
  return (
    <div className="flex flex-col gap-3">
      <p className="text-lg leading-snug font-bold text-tekst">Proszę wybrać bank.</p>
      <ul className="grid gap-2 sm:grid-cols-2" aria-label="Banki (symulacja)">
        {BANKI_SYMULACJA.map((b) => (
          <li key={b.id} className="flex">
            <button
              type="button"
              data-bank={b.id}
              onClick={() => onWybor(b)}
              className="flex min-h-14 w-full items-center gap-3 rounded-komunikat border border-szary-ramka bg-white px-4 py-2 text-left font-bold text-tekst transition-colors hover:border-granat hover:bg-szary-kafel"
            >
              <IconBuildingBank size={24} stroke={1.75} aria-hidden className="shrink-0 text-granat" />
              <span className="flex-1">{b.nazwa}</span>
              <IconChevronRight size={22} stroke={2} aria-hidden className="shrink-0 text-zielen" />
            </button>
          </li>
        ))}
      </ul>
      <p className="text-sm leading-normal text-tekst-drugi">Nazwy banków są fikcyjne. Prawdziwy węzeł pokazuje tu listę banków.</p>
    </div>
  );
}

function SerwisBanku({ bank, faza, czas }: { bank: BankSymulacja | null; faza: FazaSymulacji; czas: number }) {
  return (
    <div className="flex flex-1 flex-col gap-5">
      <p className="flex items-center gap-3 rounded-komunikat bg-granat px-4 py-3 text-white">
        <IconBuildingBank size={24} stroke={1.75} aria-hidden className="shrink-0" />
        <span className="leading-snug">
          <span className="block font-bold">{bank?.nazwa ?? 'Bank (symulacja)'}</span>
          <span className="block text-sm">Serwis banku (symulacja)</span>
        </span>
      </p>
      <div key={faza} className="logowanie-faza flex flex-1 flex-col items-center justify-center gap-4 text-center">
        {faza === 'przekierowanie' ? (
          <>
            <Czekamy>Przekierowanie do serwisu banku…</Czekamy>
            <PasekPostepu czas={czas} />
          </>
        ) : (
          <>
            <TelefonPuls rozmiar="maly" />
            <p className="max-w-md text-lg leading-snug font-bold text-tekst">Proszę potwierdzić logowanie w aplikacji banku.</p>
            <Czekamy>Czekamy na potwierdzenie…</Czekamy>
          </>
        )}
      </div>
    </div>
  );
}

function Zalogowano() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 py-6 text-center" data-zalogowano>
      <span aria-hidden className="logowanie-ptaszek flex size-20 items-center justify-center rounded-full bg-zielen text-white">
        <IconCheck size={44} stroke={2.75} />
      </span>
      <p className="text-2xl leading-tight font-black text-tekst">Zalogowano (symulacja)</p>
      <p className="leading-normal text-tekst-drugi">Za chwilę wybór osoby testowej.</p>
    </div>
  );
}
