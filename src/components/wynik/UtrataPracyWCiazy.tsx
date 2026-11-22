'use client';

import Link from 'next/link';
import { useId, type ReactNode } from 'react';
import { IconArrowRight, IconLifebuoy } from '@tabler/icons-react';
import type { Rodzina, WynikUprawnien } from '../../engine/types';
import { formatujDate } from '../format';
import { ZnacznikUprawnienia } from '../ui';
import { KLASY_H3, polacz } from '../ui/klasy';
import { etykietaOsoby } from './etykiety';
import { linkDoPytania } from './PanelDoPoprawy';
import { utrataPracyPrzedZdarzeniem, type PunktUtratyPracy, type UtrataPracyOsoby } from './utrataPracy';

/** Jedno zdanie (albo kilka) z przepisem pod spodem. Każda informacja w karcie ma przepis albo znacznik „do potwierdzenia”. */
interface Akapit {
  tekst: string;
  przepis?: string;
}

interface TrescPunktu {
  tytul: string;
  akapity: Akapit[];
  /** Pokazuje znacznik „Do potwierdzenia w ZUS” i zdanie, czego dotyczy. */
  doPotwierdzenia?: string;
  dodatek?: ReactNode;
}

const KLASA_LINKU =
  'inline-flex min-h-11 items-center gap-1 self-start rounded-przycisk px-1 font-bold text-zielen underline underline-offset-4 hover:text-zielen-ciemna';

function trescPunktu(punkt: PunktUtratyPracy, x: UtrataPracyOsoby): TrescPunktu {
  switch (punkt) {
    case 'zakaz_wypowiedzenia':
      return {
        tytul: x.porod ? 'Ochrona przed zwolnieniem w ciąży' : 'Ochrona przed zwolnieniem po wniosku o urlop',
        akapity: [
          {
            tekst: x.porod
              ? 'W okresie ciąży pracodawca nie może wypowiedzieć ani rozwiązać umowy o pracę. Wyjątki to rozwiązanie umowy bez wypowiedzenia z winy pracownicy, za zgodą reprezentującej ją organizacji związkowej, oraz ogłoszenie upadłości albo likwidacja pracodawcy.'
              : 'Od dnia złożenia wniosku o urlop na warunkach urlopu macierzyńskiego do końca tego urlopu pracodawca nie może wypowiedzieć ani rozwiązać umowy o pracę. Wyjątki to rozwiązanie umowy bez wypowiedzenia z winy pracownika, za zgodą reprezentującej go organizacji związkowej, oraz ogłoszenie upadłości albo likwidacja pracodawcy.',
            przepis: 'KP art. 177 § 1 i § 4',
          },
          x.porod
            ? {
                tekst:
                  'Jeśli umowę wypowiedziano albo rozwiązano mimo zakazu, można odwołać się do sądu pracy. Gdy sąd prawomocnym wyrokiem stwierdzi, że naruszono prawo, a ubezpieczenie ustało w ciąży, zasiłek macierzyński przysługuje mimo końca umowy.',
                przepis: 'UZ art. 30 ust. 1 pkt 2',
              }
            : { tekst: 'Jeśli umowę wypowiedziano albo rozwiązano mimo zakazu, można odwołać się do sądu pracy.' },
          {
            tekst:
              'Terminu ani sposobu odwołania ta symulacja nie podaje, bo nie opisują ich przepisy, na których się opiera. Warto sprawdzić je od razu po otrzymaniu wypowiedzenia.',
          },
        ],
      };
    case 'chorobowy_po_ustaniu':
      return {
        tytul: 'Zasiłek chorobowy po końcu ubezpieczenia',
        akapity: [
          {
            tekst:
              'Zasiłek chorobowy przysługuje także po końcu ubezpieczenia chorobowego, jeżeli niezdolność do pracy (zwolnienie lekarskie) powstanie nie później niż 14 dni od końca ubezpieczenia i będzie trwała bez przerwy co najmniej 30 dni. Przy chorobie zakaźnej, której okres wylęgania jest dłuższy niż 14 dni, albo innej chorobie, której objawy ujawniają się po ponad 14 dniach od jej początku, ten termin wynosi 3 miesiące.',
            przepis: 'UZ art. 7',
          },
          x.porod
            ? {
                tekst: 'Gdy niezdolność do pracy przypada w trakcie ciąży, zasiłek przysługuje najwyżej przez 270 dni, a limit 91 dni po końcu ubezpieczenia jej nie dotyczy.',
                przepis: 'UZ art. 8 ust. 1 i 2',
              }
            : { tekst: 'Po końcu ubezpieczenia zasiłek chorobowy przysługuje zwykle najwyżej przez 91 dni.', przepis: 'UZ art. 8 ust. 2' },
          {
            tekst:
              'Za okres po końcu ubezpieczenia zasiłek nie przysługuje między innymi wtedy, gdy przysługuje zasiłek dla bezrobotnych albo trwa lub zaczyna się praca (umowa, działalność), która daje tytuł do ubezpieczenia chorobowego.',
            przepis: 'UZ art. 13 ust. 1 pkt 2 i 4',
          },
        ],
      };
    case 'upadlosc_likwidacja': {
      const tytul = x.tytuly.find((t) => t.rodzaj !== 'dzialalnosc' && t.rodzaj !== 'wspolpraca');
      const etat = x.tytuly.some((t) => t.rodzaj === 'umowa_o_prace');
      return {
        tytul: 'Śmierć, upadłość albo likwidacja pracodawcy',
        akapity: [
          {
            tekst:
              'Jeżeli ubezpieczenie ustało w ciąży wskutek śmierci, ogłoszenia upadłości albo likwidacji pracodawcy, zasiłek macierzyński przysługuje mimo to. Pracownicy, z którą z tego powodu rozwiązano umowę o pracę (albo której umowa wygasła ze śmiercią pracodawcy) i której nie zapewniono innego zatrudnienia, do dnia porodu przysługuje też zasiłek w wysokości zasiłku macierzyńskiego.',
            przepis: 'UZ art. 30 ust. 1 pkt 1 i ust. 3',
          },
        ],
        ...(etat ? {} : { doPotwierdzenia: 'Czy ta zasada dotyczy też umowy zlecenia i innych umów – przepis mówi o pracodawcy.' }),
        dodatek: tytul && (
          <div className="flex flex-col gap-1">
            <p className="max-w-prose leading-normal">Jeśli tak właśnie było, proszę zmienić odpowiedź o przyczynie końca umowy.</p>
            <Link href={linkDoPytania(`ustanie_przyczyna_umowy@o${x.osobaIndeks}.t${tytul.indeks}`)} className={KLASA_LINKU} data-utrata-pracy-link="przyczyna">
              Zmień odpowiedź
              <span className="sr-only">: dlaczego umowa się skończyła</span>
              <IconArrowRight size={18} aria-hidden />
            </Link>
          </div>
        ),
      };
    }
    case 'swiadczenie_rodzicielskie':
      return {
        tytul: 'Świadczenie rodzicielskie',
        akapity: [{ tekst: x.alternatywa ?? '', przepis: 'ustawa o świadczeniach rodzinnych' }],
      };
    case 'urzad_pracy':
      return {
        tytul: 'Rejestracja w urzędzie pracy',
        akapity: [
          {
            tekst: 'Z ustawy zasiłkowej wynika tylko tyle, że prawo do zasiłku dla bezrobotnych wyklucza zasiłek chorobowy za okres po końcu ubezpieczenia.',
            przepis: 'UZ art. 13 ust. 1 pkt 4',
          },
        ],
        doPotwierdzenia: 'Jak sama rejestracja w urzędzie pracy wpływa na zasiłki z ZUS – ta symulacja tego nie rozstrzyga.',
      };
    case 'zawieszenie_dzialalnosci':
      return {
        tytul: 'Zawieszenie działalności',
        akapity: [{ tekst: 'Przed decyzją o zawieszeniu działalności warto zapytać ZUS o jej skutki.' }],
        doPotwierdzenia: x.porod
          ? 'Jak zawieszenie działalności wpływa na dobrowolne ubezpieczenie chorobowe i prawo do zasiłku w ciąży.'
          : 'Jak zawieszenie działalności wpływa na dobrowolne ubezpieczenie chorobowe i prawo do zasiłku.',
      };
  }
}

function wstep(x: UtrataPracyOsoby): string {
  const kiedy = x.porod ? 'przed dniem porodu' : 'przed dniem przyjęcia dziecka';
  const data = x.tytuly.length === 1 ? ` (ostatni dzień: ${formatujDate(x.tytuly[0].data)})` : '';
  return (
    `Z odpowiedzi wynika, że ubezpieczenie chorobowe kończy się ${kiedy}${data}, dlatego w tej symulacji zasiłek macierzyński nie przysługuje. ` +
    'Poniżej są możliwości, które warto sprawdzić.'
  );
}

function KartaOsoby({ x, rodzina }: { x: UtrataPracyOsoby; rodzina: Rodzina }) {
  const id = useId();
  return (
    <section
      aria-labelledby={id}
      data-utrata-pracy={x.osobaId}
      className="rounded-komunikat border border-szary-linia bg-white p-4 text-tekst lg:p-6"
    >
      <div className="flex items-start gap-3">
        <IconLifebuoy size={26} stroke={2} aria-hidden className="mt-0.5 shrink-0 text-bursztyn" />
        <div className="flex flex-col gap-1">
          {rodzina.osoby.length > 1 && <p className="text-sm font-bold text-granat">Dotyczy: {etykietaOsoby(rodzina, x.osobaId)}</p>}
          <h2 id={id} className={polacz(KLASY_H3, 'text-granat')}>
            {x.porod ? 'Koniec ubezpieczenia przed porodem: co można zrobić' : 'Koniec ubezpieczenia przed przyjęciem dziecka: co można zrobić'}
          </h2>
          <p className="max-w-prose leading-normal">{wstep(x)}</p>
        </div>
      </div>

      <ul className="mt-4 flex flex-col gap-3">
        {x.punkty.map((punkt) => {
          const p = trescPunktu(punkt, x);
          return (
            <li key={punkt} data-punkt={punkt} data-do-potwierdzenia={p.doPotwierdzenia ? '' : undefined} className="flex flex-col gap-2 rounded-komunikat bg-tlo p-4">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="font-bold text-granat">{p.tytul}</h3>
                {p.doPotwierdzenia && <ZnacznikUprawnienia przysluguje="warunkowo" />}
              </div>
              {p.akapity.map((a) => (
                <div key={a.tekst} className="flex flex-col gap-0.5">
                  <p className="max-w-prose leading-normal">{a.tekst}</p>
                  {a.przepis && <p className="text-sm text-tekst-drugi">Podstawa prawna: {a.przepis}</p>}
                </div>
              ))}
              {p.doPotwierdzenia && (
                <p className="max-w-prose text-sm leading-normal text-tekst-drugi">
                  <span className="font-bold">Do potwierdzenia w ZUS:</span> {p.doPotwierdzenia}
                </p>
              )}
              {p.dodatek}
            </li>
          );
        })}
      </ul>

      <p className="mt-4 text-sm text-tekst-drugi">To symulacja. Wynik nie jest decyzją ZUS.</p>
    </section>
  );
}

/**
 * Karta „Koniec ubezpieczenia przed porodem: co można zrobić” (audyt scenariusza „utrata pracy w ciąży”, 22.11).
 * Spokojnie, bez czerwieni: biała karta z szarą ramką jak `KartaRyzyka`. Kiedy się pokazuje – `utrataPracy.ts`.
 */
export function UtrataPracyWCiazy({ rodzina, uprawnienia, className }: { rodzina: Rodzina; uprawnienia: WynikUprawnien | null; className?: string }) {
  const osoby = utrataPracyPrzedZdarzeniem(rodzina, uprawnienia);
  if (osoby.length === 0) return null;
  return (
    <div className={polacz('flex flex-col gap-4', className)}>
      {osoby.map((x) => (
        <KartaOsoby key={x.osobaId} x={x} rodzina={rodzina} />
      ))}
    </div>
  );
}
