/**
 * Decyzje na osi (wariant C z design.md): numeracja okien wyboru i dwie drogi każdej decyzji –
 * „W planie” (stan obecnego planu) i alternatywa, którą da się pokazać na osi jedną akcją silnika
 * (`pokazPodglad(akcja)`). Czy akcja jest dozwolona, rozstrzyga silnik; UI tylko składa `AkcjaPlanu`.
 * Liczby z przepisów (tygodnie, stawki) bierzemy z API (`pule`), nie z kodu.
 */
import type { AkcjaPlanu, Mozliwosc, Odcinek, Plan, Rodzina, TypOdcinka, WynikUprawnien } from '../../engine/types';
import { drugaOsoba, mamaWracaPoObowiazkowych, podzielWPolowie } from '../plan/akcje';
import { NAZWY_ROL } from './teksty';

type Kod = Mozliwosc['kod'];

export interface StronaDecyzji {
  etykieta: string;
  opis: string;
}

export interface Alternatywa extends StronaDecyzji {
  /** Akcja pokazująca alternatywę na osi; null, gdy jednej akcji nie wystarczy. */
  akcja: AkcjaPlanu | null;
  /** Dlaczego nie da się jej pokazać jednym dotknięciem (gdy `akcja` = null). */
  powod?: string;
}

export interface Decyzja {
  kod: Kod;
  /** Numer na osi i na karcie (1, 2, …). */
  nr: number;
  mozliwosc: Mozliwosc;
  wPlanie: StronaDecyzji;
  alternatywa: Alternatywa;
}

function porownaj(a: Mozliwosc, b: Mozliwosc): number {
  const x = a.odKiedy ?? a.doKiedy ?? '9999-12-31';
  const y = b.odKiedy ?? b.doKiedy ?? '9999-12-31';
  return x < y ? -1 : x > y ? 1 : 0;
}

/** Numery dostępnych możliwości w kolejności dat (bez daty – na końcu). Niedostępne nie mają numeru. */
export function numeryDecyzji(mozliwosci: Mozliwosc[]): Map<Kod, number> {
  const dostepne = mozliwosci.filter((m) => m.dostepna).sort(porownaj);
  return new Map(dostepne.map((m, i) => [m.kod, i + 1]));
}

const RECZNIE = 'Tę zmianę można wprowadzić ręcznie: proszę wybrać odcinek i go zmienić.';

function wTygodniach(n: number): string {
  return n === 1 ? '1 tygodniu' : `${n} tygodniach`;
}

function odcinkiOsoby(plan: Plan, typ: TypOdcinka, osobaId?: string): Odcinek[] {
  return plan.odcinki.filter((o) => o.typ === typ && (osobaId === undefined || o.osobaId === osobaId)).sort((a, b) => (a.od < b.od ? -1 : 1));
}

function wCzesciach(plan: Plan, typ: TypOdcinka, nazwa: string, osobaId: string | undefined): Pick<Decyzja, 'wPlanie' | 'alternatywa'> {
  const odcinki = odcinkiOsoby(plan, typ, osobaId);
  if (odcinki.length === 0) {
    return {
      wPlanie: { etykieta: `Bez urlopu ${nazwa}`, opis: `W planie nie ma teraz urlopu ${nazwa}.` },
      alternatywa: { etykieta: `Urlop ${nazwa} w częściach`, opis: '', akcja: null, powod: `Najpierw trzeba dodać urlop ${nazwa} na osi.` },
    };
  }
  if (odcinki.length > 1) {
    return {
      wPlanie: { etykieta: `Urlop ${nazwa} w ${odcinki.length} częściach`, opis: 'Części można przesuwać osobno.' },
      alternatywa: { etykieta: `Urlop ${nazwa} w jednym kawałku`, opis: '', akcja: null, powod: RECZNIE },
    };
  }
  const akcja = podzielWPolowie(odcinki[0]);
  return {
    wPlanie: { etykieta: `Urlop ${nazwa} w jednym kawałku`, opis: 'Bez przerwy, od początku do końca.' },
    alternatywa: akcja
      ? { etykieta: `Urlop ${nazwa} w dwóch częściach`, opis: 'Dzielimy go w połowie. Drugą część można potem przesunąć.', akcja }
      : { etykieta: `Urlop ${nazwa} w częściach`, opis: '', akcja: null, powod: RECZNIE },
  };
}

function strony(m: Mozliwosc, rodzina: Rodzina, plan: Plan, uprawnienia: WynikUprawnien): Pick<Decyzja, 'wPlanie' | 'alternatywa'> {
  switch (m.kod) {
    case 'wariant_815': {
      const nierowna: StronaDecyzji = {
        etykieta: 'Najpierw wyższa stawka, potem niższa',
        opis: 'Pełny zasiłek za urlop macierzyński, niższy za rodzicielski.',
      };
      const rowna: StronaDecyzji = {
        etykieta: 'Równa stawka przez cały urlop',
        opis: 'Ta sama kwota co miesiąc za urlop macierzyński i rodzicielski.',
      };
      return plan.wariant815
        ? { wPlanie: rowna, alternatywa: { ...nierowna, akcja: { typ: 'ustaw_wariant_815', wartosc: false } } }
        : { wPlanie: nierowna, alternatywa: { ...rowna, akcja: { typ: 'ustaw_wariant_815', wartosc: true } } };
    }
    case 'rezygnacja_matki_i_przejecie': {
      const matka = rodzina.osoby.find((o) => o.rola === 'matka');
      const druga = matka ? drugaOsoba(rodzina, matka.id) : undefined;
      const kto = druga ? NAZWY_ROL[druga.rola] : 'Druga osoba';
      const przejmuje = plan.odcinki.some(
        (o) => o.osobaId !== matka?.id && (o.typ === 'macierzynski' || o.typ === 'na_warunkach_macierzynskiego'),
      );
      if (przejmuje) {
        return {
          wPlanie: { etykieta: `${kto} przejmuje część urlopu macierzyńskiego`, opis: 'Mama wraca do pracy wcześniej.' },
          alternatywa: { etykieta: 'Mama bierze cały urlop macierzyński', opis: '', akcja: null, powod: RECZNIE },
        };
      }
      const akcja = mamaWracaPoObowiazkowych(rodzina, uprawnienia.pule);
      return {
        wPlanie: { etykieta: 'Mama bierze cały urlop macierzyński', opis: 'Nikt go nie przejmuje.' },
        alternatywa: akcja
          ? {
              etykieta: `Mama wraca po ${wTygodniach(uprawnienia.pule.obowiazkoweMatkiTyg)}`,
              opis: `Resztę urlopu macierzyńskiego przejmuje ${kto.toLowerCase()}.`,
              akcja,
            }
          : { etykieta: 'Przejęcie urlopu przez drugą osobę', opis: '', akcja: null, powod: 'Żeby to pokazać, trzeba dodać drugą osobę.' },
      };
    }
    case 'podzial_rodzicielskiego':
      return wCzesciach(plan, 'rodzicielski', 'rodzicielskiego', m.ktoDecyduje);
    case 'ojcowski_w_czesciach':
      return wCzesciach(plan, 'ojcowski', 'ojcowskiego', m.ktoDecyduje);
    default:
      return {
        wPlanie: { etykieta: 'Tak jak teraz w planie', opis: 'Plan zostaje bez zmian.' },
        alternatywa: { etykieta: 'Inny układ urlopu', opis: '', akcja: null, powod: RECZNIE },
      };
  }
}

/** Dostępne możliwości jako ponumerowane decyzje (kolejność jak numery na osi). */
export function decyzje(rodzina: Rodzina, plan: Plan, uprawnienia: WynikUprawnien): Decyzja[] {
  const numery = numeryDecyzji(uprawnienia.mozliwosci);
  return uprawnienia.mozliwosci
    .filter((m) => numery.has(m.kod))
    .map((m) => ({ kod: m.kod, nr: numery.get(m.kod)!, mozliwosc: m, ...strony(m, rodzina, plan, uprawnienia) }))
    .sort((a, b) => a.nr - b.nr);
}
