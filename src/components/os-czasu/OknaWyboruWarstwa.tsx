'use client';

/**
 * Pas okien wyboru nad siatką miesięcy (wariant C z design.md): każde okno to pasek w zielone pasy
 * od `odKiedy` do `doKiedy` z numerem decyzji; niedostępne – szare, z kłódką, przygaszone.
 * Dotknięcie numeru zaznacza decyzję (karta pod osią i pinezka na wierszu osoby, która decyduje).
 */
import { IconLock } from '@tabler/icons-react';
import type { Mozliwosc } from '../../engine/types';
import { formatujDateKrotko } from '../format';
import { polacz } from '../ui';
import { WZOR_WYBORU, WZOR_WYBORU_NIEDOSTEPNEGO, proc } from './kolory';
import type { OknoWyboru } from './okna-wyboru';

type Kod = Mozliwosc['kod'];

export const WYS_TORU_WYBORU = 40;
const ODSTEP_PASA = 6;
/** Wysokość paska okna (numer decyzji jest większy i siedzi na jego początku). */
const WYS_PASKA = 16;
/** Najmniejsza szerokość okna (ułamek toru), przy której liczymy kolizje – numer ma ok. 36 px. */
const MIN_ULAMEK = 0.05;

export interface OknoNaPasie extends OknoWyboru {
  tor: number;
}

/** Okna nachodzące na siebie (także wizualnie, przez szerokość numeru) dostają kolejne tory. */
export function torOkien(okna: OknoWyboru[]): { okna: OknoNaPasie[]; liczbaTorow: number } {
  const konce: number[] = [];
  const wynik = okna.map((o) => {
    const koniec = o.start + Math.max(o.szerokosc, MIN_ULAMEK);
    let tor = konce.findIndex((k) => k <= o.start);
    if (tor === -1) {
      tor = konce.length;
      konce.push(koniec);
    } else konce[tor] = koniec;
    return { ...o, tor };
  });
  return { okna: wynik, liczbaTorow: konce.length };
}

export function wysokoscPasa(liczbaTorow: number): number {
  return liczbaTorow === 0 ? 0 : ODSTEP_PASA * 2 + liczbaTorow * WYS_TORU_WYBORU;
}

export function okresWyboru(m: Pick<Mozliwosc, 'odKiedy' | 'doKiedy'>): string {
  if (m.odKiedy && m.doKiedy) return `${formatujDateKrotko(m.odKiedy)} – ${formatujDateKrotko(m.doKiedy)}`;
  if (m.odKiedy) return `od ${formatujDateKrotko(m.odKiedy)}`;
  if (m.doKiedy) return `do ${formatujDateKrotko(m.doKiedy)}`;
  return '';
}

export interface OknaWyboruWarstwaProps {
  okna: OknoNaPasie[];
  numery: Map<Kod, number>;
  nazwa: (kod: Kod) => string;
  wybrana: Kod | null;
  onWybierz: (kod: Kod) => void;
}

export function OknaWyboruWarstwa({ okna, numery, nazwa, wybrana, onWybierz }: OknaWyboruWarstwaProps) {
  return (
    <>
      {okna.map((o) => {
        const nr = numery.get(o.kod);
        const aktywne = o.kod === wybrana;
        const opis = o.dostepna
          ? `Decyzja ${nr}: ${nazwa(o.kod)}, ${okresWyboru(o.mozliwosc)}`
          : `Niedostępne: ${nazwa(o.kod)}. ${o.mozliwosc.opis}`;
        return (
          <div
            key={o.kod}
            id={`wybor-${o.kod}`}
            data-wybor={o.kod}
            data-dostepna={String(o.dostepna)}
            {...(aktywne ? { 'data-wybrany': 'true' } : {})}
            className={polacz(
              '@container absolute flex scroll-mt-24 items-center rounded-full border',
              o.dostepna ? 'border-zielen-ciemna' : 'border-dashed border-szary-ramka',
              aktywne && 'border-2 border-granat',
              o.przyciety.lewy && 'rounded-l-none',
              o.przyciety.prawy && 'rounded-r-none',
            )}
            style={{
              left: proc(o.start),
              width: o.punkt ? 0 : proc(o.szerokosc),
              minWidth: o.punkt ? undefined : 8,
              top: ODSTEP_PASA + o.tor * WYS_TORU_WYBORU + (WYS_TORU_WYBORU - WYS_PASKA) / 2,
              height: WYS_PASKA,
              ...(o.punkt ? { border: 'none' } : o.dostepna ? WZOR_WYBORU : WZOR_WYBORU_NIEDOSTEPNEGO),
            }}
          >
            <button
              type="button"
              aria-pressed={aktywne}
              aria-label={opis}
              title={opis}
              onClick={() => onWybierz(o.kod)}
              className={polacz(
                'absolute -left-1.5 top-1/2 flex min-h-11 -translate-y-1/2 items-center gap-1.5 whitespace-nowrap rounded-full pr-2 text-sm font-bold',
                o.punkt && '-translate-x-1/2 pr-0',
                o.dostepna ? 'text-granat' : 'text-tekst-drugi',
              )}
            >
              <span
                aria-hidden
                className={polacz(
                  'flex size-8 shrink-0 items-center justify-center rounded-full border-2 text-sm font-black shadow-[0_0_0_2px_white] motion-safe:transition-colors motion-safe:duration-150',
                  !o.dostepna && 'border-szary-ramka bg-white text-tekst-drugi',
                  o.dostepna && (aktywne ? 'border-granat bg-granat text-white' : 'border-granat bg-white text-granat'),
                )}
              >
                {o.dostepna ? nr : <IconLock size={16} stroke={2} />}
              </span>
              {!o.punkt && (
                <span aria-hidden className={polacz('hidden rounded-full bg-white/90 px-1.5 @[160px]:inline', !o.dostepna && 'font-normal')}>
                  {nazwa(o.kod)}
                </span>
              )}
            </button>
          </div>
        );
      })}
    </>
  );
}
