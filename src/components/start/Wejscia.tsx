'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useId, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import {
  IconCalculator,
  IconChevronRight,
  IconFileUpload,
  IconFingerprint,
  IconInfoCircle,
  IconLoader2,
  IconPencil,
} from '@tabler/icons-react';
import { dzisISO, useProfil } from '@/src/state/profil';
import { BladApi } from '@/src/lib/api';
import { funkcjaNiegotowa } from '@/src/state/zapytanie';
import { odczytajWniosek } from '@/src/state/formularze';
import { scalOdczytWniosku } from './zrodla-startu';
import { useZacznijRecznie } from './useZacznijRecznie';

/** Komunikat, gdy trasa odczytu nie działa (501/404 albo błąd sieci). Spokojnie, bez słowa „błąd”. */
export const KOMUNIKAT_W_PRZYGOTOWANIU = 'Odczyt wniosku jest w przygotowaniu. Dane można wpisać ręcznie.';
const KOMUNIKAT_NIE_PDF = 'Ten plik nie jest w formacie PDF. Proszę wybrać wniosek PDF albo wpisać dane ręcznie.';
const KOMUNIKAT_ZA_DUZY = 'Ten plik jest większy niż 10 MB. Proszę wybrać mniejszy plik albo wpisać dane ręcznie.';

const MAKS_ROZMIAR = 10 * 1024 * 1024;

// Jasne tło: fokus zostaje domyślny (granat 3 px z globals.css), tylko z większym odstępem.
const FOKUS = 'focus-visible:outline-offset-4!';

const KAFEL =
  'group relative flex h-full min-h-20 w-full items-center gap-4 rounded-karta px-4 py-3 text-left md:min-h-24 no-underline md:flex-col md:items-start md:gap-4 md:p-6';

/** Kolejność wjazdu kafla (opóźnienie 60 ms na pozycję, patrz wejscie.css). */
const ANIM = (i: number) => ({ '--i': i }) as CSSProperties;

type Komunikat = { tekst: string; komunikatSerwera: boolean };

/**
 * Cztery wejścia ekranu startowego (ZADANIA.md, C2): logowanie przez login.gov.pl (symulacja) jako
 * polecane, ankieta ręczna (bez logowania), wgranie wniosku PDF i szybki kalkulator. Plik idzie tylko do `POST /api/forms/odczyt`.
 */
export function Wejscia() {
  const [wysylanie, setWysylanie] = useState(false);
  const [komunikat, setKomunikat] = useState<Komunikat | null>(null);
  const pole = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const profil = useProfil();
  const zacznijRecznie = useZacznijRecznie();

  async function odczytaj(plik: File) {
    const czyPdf = plik.type === 'application/pdf' || plik.name.toLowerCase().endsWith('.pdf');
    if (!czyPdf) return setKomunikat({ tekst: KOMUNIKAT_NIE_PDF, komunikatSerwera: false });
    if (plik.size > MAKS_ROZMIAR) return setKomunikat({ tekst: KOMUNIKAT_ZA_DUZY, komunikatSerwera: false });

    setWysylanie(true);
    setKomunikat(null);
    try {
      const wynik = await odczytajWniosek(plik);
      const scalony = scalOdczytWniosku(profil.rodzina, wynik, dzisISO());
      if (!scalony) {
        // Skan albo plik bez pól formularza: nic nie przenosimy.
        setKomunikat({ tekst: wynik.komunikat || KOMUNIKAT_W_PRZYGOTOWANIU, komunikatSerwera: true });
        return;
      }
      profil.ustawRodzine(scalony.rodzina);
      profil.dopiszPochodzenie(scalony.pochodzenie);
      profil.ustawDoPotwierdzenia(scalony.doPotwierdzenia);
      router.push('/sytuacja');
    } catch (e) {
      // 400/413: serwer pisze po ludzku, co jest nie tak z plikiem. 501/404/sieć: „w przygotowaniu”.
      if (e instanceof BladApi && !funkcjaNiegotowa(e) && e.status < 500) {
        setKomunikat({ tekst: e.message, komunikatSerwera: true });
      } else {
        setKomunikat({ tekst: KOMUNIKAT_W_PRZYGOTOWANIU, komunikatSerwera: false });
      }
    } finally {
      setWysylanie(false);
      // Ten sam plik można wybrać jeszcze raz.
      if (pole.current) pole.current.value = '';
    }
  }

  return (
    <div>
      <ul className="grid gap-2 md:grid-cols-2 md:gap-4 lg:grid-cols-4">
        <li className="start-wjazd-kafel" style={ANIM(0)}>
          <Kafel
            href="/logowanie"
            polecane
            ikona={<IconFingerprint size={26} stroke={1.75} />}
            tytul="Zaloguj się przez login.gov.pl (symulacja)"
            opis="Profil zaufany, mObywatel, e‑dowód albo bank. Dane pobierzemy z eZUS i mObywatela (symulacja)."
          />
        </li>
        <li className="start-wjazd-kafel" style={ANIM(1)}>
          <Kafel
            href="/sytuacja"
            onWybor={zacznijRecznie}
            ikona={<IconPencil size={26} stroke={1.75} />}
            tytul="Wpisz dane ręcznie"
            opis="Bez logowania: proste pytania, jedno po drugim."
          />
        </li>
        <li className="start-wjazd-kafel" style={ANIM(2)}>
          <Kafel
            onClick={() => pole.current?.click()}
            laduje={wysylanie}
            ikona={<IconFileUpload size={26} stroke={1.75} />}
            tytul="Gotowy wniosek? Wgraj PDF"
            opis="Odczytamy dane z wypełnionego wniosku o zasiłek (ZAM), żeby nie trzeba było wpisywać ich drugi raz."
          />
          {/* Ukryte pole pliku: otwiera je kafel powyżej. Bez tabIndex, żeby fokus nie trafiał dwa razy. */}
          <input
            ref={pole}
            type="file"
            accept="application/pdf,.pdf"
            className="sr-only"
            tabIndex={-1}
            aria-hidden="true"
            onChange={(e) => {
              const plik = e.target.files?.[0];
              if (plik) void odczytaj(plik);
            }}
          />
        </li>
        <li data-modul="kalkulator" className="start-wjazd-kafel" style={ANIM(3)}>
          <Kafel
            href="/kalkulator"
            ikona={<IconCalculator size={26} stroke={1.75} />}
            tytul="Szybki kalkulator"
            opis="Wystarczą data porodu i zarobki, żeby od razu zobaczyć okresy i kwoty."
          />
        </li>
      </ul>

      {/* Region na żywo jest zawsze w DOM, żeby czytnik ekranu ogłosił nowy komunikat. */}
      <div role="status" aria-live="polite" className="mt-3 md:mt-4">
        {komunikat && (
          <p className={`flex items-start gap-3 rounded-komunikat border border-szary-linia bg-white p-4 text-base text-tekst`}>
            <IconInfoCircle size={24} stroke={2} aria-hidden="true" className="mt-px shrink-0 text-info" />
            <span>
              {komunikat.tekst}{' '}
              <Link
                href="/sytuacja"
                className={`inline-flex min-h-11 items-center rounded-przycisk font-bold text-granat underline underline-offset-4 hover:decoration-2 md:min-h-0 ${FOKUS}`}
              >
                Wpisz dane ręcznie
              </Link>
            </span>
          </p>
        )}
      </div>
    </div>
  );
}

type KafelProps = {
  ikona: ReactNode;
  tytul: string;
  opis: string;
  polecane?: boolean;
  /** Tylko dla kafla z `href`: dodatkowa akcja przy kliknięciu, przed przejściem. */
  onWybor?: () => void;
} & ({ href: string; onClick?: undefined; laduje?: undefined } | { href?: undefined; onClick: () => void; laduje: boolean });

function Kafel({ ikona, tytul, opis, polecane = false, onWybor, href, onClick, laduje }: KafelProps) {
  const id = useId();
  const tytulId = `${id}-tytul`;
  const opisId = `${id}-opis`;

  const klasy = `${KAFEL} ${FOKUS} ${polecane ? `border border-info bg-info text-white start-polecane` : `border border-szary-linia bg-white text-tekst start-kafel`}`;

  const tresc = (
    <>
      <span
        aria-hidden="true"
        className={`flex size-12 shrink-0 items-center justify-center rounded-komunikat md:size-14 ${
          polecane ? 'bg-white text-info' : 'bg-zielen text-white'
        }`}
      >
        {laduje ? <IconLoader2 size={26} stroke={1.75} className="animate-spin motion-reduce:animate-none" /> : ikona}
      </span>

      <span className="min-w-0 flex-1">
        {polecane && (
          <span className="mb-1.5 inline-flex rounded-full bg-bursztyn px-2.5 py-0.5 text-sm leading-normal font-bold text-granat">
            Polecamy
          </span>
        )}
        <span id={tytulId} className="block text-lg leading-snug font-black md:text-xl">
          {tytul}
        </span>
        {/* Telefon: opis tylko przy polecanym kaflu, żeby cztery wejścia mieściły się na pierwszym ekranie (812 px).
            Ukryty opis nadal czyta czytnik ekranu przez aria-describedby. */}
        <span
          id={opisId}
          className={`mt-1 text-[0.9375rem] leading-normal md:block md:text-base ${polecane ? '' : 'text-tekst-drugi'} ${polecane || laduje ? 'block' : 'hidden'}`}
        >
          {laduje ? 'Wczytujemy wniosek…' : opis}
        </span>
      </span>

      <IconChevronRight
        size={24}
        stroke={2.25}
        aria-hidden="true"
        className="shrink-0 transition-transform duration-150 group-hover:translate-x-0.5 motion-reduce:transition-none md:absolute md:top-6 md:right-6"
      />
    </>
  );

  if (href) {
    return (
      <Link href={href} onClick={onWybor} className={klasy} aria-labelledby={tytulId} aria-describedby={opisId}>
        {tresc}
      </Link>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={laduje}
      aria-busy={laduje || undefined}
      className={`${klasy} cursor-pointer disabled:cursor-wait`}
      aria-labelledby={tytulId}
      aria-describedby={opisId}
    >
      {tresc}
    </button>
  );
}
