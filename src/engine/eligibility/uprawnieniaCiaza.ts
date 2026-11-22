/**
 * Świadczenia w ciąży matki (zadanie A2): zasiłek chorobowy, świadczenie rehabilitacyjne
 * i zasiłek w wysokości zasiłku macierzyńskiego do dnia porodu.
 */
import { dodajDni, liczbaDni, wczesniejsza, czyWOkresie } from '../daty';
import type { Osoba, Parametry, Rodzina, Uprawnienie } from '../types';
import {
  koniecTytulu,
  poczatekCiazy,
  tytulyOsoby,
  ubezpieczenieWDniu,
  USTANIE_Z_WINY_PRACODAWCY,
  wyczekiwanieNaChorobowy,
} from './ubezpieczenie';
import { dataSlownie, dni } from './uprawnieniaTeksty';

export type Wynik = Omit<Uprawnienie, 'osobaId' | 'swiadczenie'>;

function maChorobowe(osoba: Osoba): boolean {
  return tytulyOsoby(osoba).some((t) => t.chorobowe !== 'brak');
}

const BRAK_CHOROBOWEGO_CIAZA: Wynik = {
  kod: 'BRAK_CHOROBOWEGO',
  przysluguje: false,
  powod:
    'Bez ubezpieczenia chorobowego zasiłek chorobowy za czas zwolnienia lekarskiego nie przysługuje. ' +
    'Do dobrowolnego ubezpieczenia chorobowego można przystąpić tylko na przyszłość, nie wstecz.',
  przepis: 'UZ art. 6 ust. 1',
};

/** Zwolnienia z kodem B (ciąża), posortowane. */
function zwolnieniaWCiazy(osoba: Osoba) {
  return (osoba.zdrowie?.eZLA ?? []).filter((z) => z.kodB).sort((a, b) => (a.od < b.od ? -1 : a.od > b.od ? 1 : 0));
}

/**
 * Zasiłek chorobowy w ciąży. Oceniamy dzień początku pierwszego zwolnienia z kodem B, a gdy go nie ma –
 * „dziś” (`dataAnalizy`), nie później niż dzień przed porodem.
 */
export function zasilekChorobowyCiaza(osoba: Osoba, rodzina: Rodzina, p: Parametry): Wynik {
  const [pierwsze] = zwolnieniaWCiazy(osoba);
  const dzien = pierwsze?.od ?? wczesniejsza(rodzina.dataAnalizy, dodajDni(rodzina.zdarzenie.data, -1));

  if (!maChorobowe(osoba)) return BRAK_CHOROBOWEGO_CIAZA;

  // UZ art. 6 ust. 1 – niezdolność do pracy w czasie trwania ubezpieczenia chorobowego.
  const w = wyczekiwanieNaChorobowy(osoba, dzien, p, rodzina);
  if (!w) {
    const u = ubezpieczenieWDniu(osoba, dzien, p, rodzina);
    return {
      kod: 'BRAK_UBEZP_W_DNIU_NIEZDOLNOSCI',
      przysluguje: false,
      powod:
        u.kod === 'POROD_W_TRAKCIE_WYCHOWAWCZEGO'
          ? 'W czasie urlopu wychowawczego nie podlega się ubezpieczeniu chorobowemu z umowy o pracę, więc zasiłek chorobowy nie przysługuje.'
          : `W dniu ${dataSlownie(dzien)} nie ma ubezpieczenia chorobowego. Jeśli choroba zacznie się krótko po końcu umowy, ` +
            'zasiłek może przysługiwać także po ustaniu ubezpieczenia – warto zapytać w ZUS.',
      przepis: 'UZ art. 6 ust. 1, art. 7',
    };
  }

  // UZ art. 4 ust. 1 pkt 1–2 – okres wyczekiwania: obowiązkowe i dobrowolne ubezpieczenie (liczba dni z `p`).
  const dobrowolne = w.dni !== p.limity.wyczekiwanieObowiazkoweDni;
  const wymog =
    `Przy ${dobrowolne ? 'dobrowolnym' : 'obowiązkowym'} ubezpieczeniu chorobowym zasiłek chorobowy przysługuje ` +
    `po ${w.dni} dniach nieprzerwanego ubezpieczenia.`;
  if (w.prawoOd === null || w.prawoOd > dzien) {
    return {
      kod: 'OKRES_WYCZEKIWANIA',
      przysluguje: false,
      powod:
        w.prawoOd === null
          ? `${wymog} Ubezpieczenie skończy się wcześniej.`
          : `${wymog} ` +
            `Zasiłek będzie przysługiwał od ${dataSlownie(w.prawoOd)}. Wcześniejsze okresy ubezpieczenia też się liczą, ` +
            `jeśli przerwa między nimi nie była dłuższa niż ${dni(p.limity.wyczekiwaniePrzerwaMaxDni)} – wtedy proszę je wpisać w aplikacji.`,
      przepis: 'UZ art. 4 ust. 1–2',
      tytulId: w.tytulId,
    };
  }

  return {
    kod: 'CHOROBOWY_PO_WYCZEKIWANIU',
    przysluguje: true,
    powod:
      `Nieprzerwane ${dobrowolne ? 'dobrowolne' : 'obowiązkowe'} ubezpieczenie chorobowe trwa już co najmniej ${w.dni} dni, ` +
      `więc za czas zwolnienia w ciąży przysługuje zasiłek chorobowy w wysokości ${p.stawkiProc.chorobowyCiaza}% podstawy.`,
    przepis: 'UZ art. 4 ust. 1, art. 11 ust. 2',
    tytulId: w.tytulId,
  };
}

/** Liczba dni zwolnień z kodem B; dni nakładających się zwolnień liczymy raz. */
function dniZwolnienWCiazy(osoba: Osoba): number {
  let suma = 0;
  let doKiedy: string | undefined;
  for (const z of zwolnieniaWCiazy(osoba)) {
    const od = doKiedy && z.od <= doKiedy ? dodajDni(doKiedy, 1) : z.od;
    if (od <= z.do) suma += liczbaDni(od, z.do);
    if (!doKiedy || z.do > doKiedy) doKiedy = z.do;
  }
  return suma;
}

/**
 * Świadczenie rehabilitacyjne: po wyczerpaniu zasiłku chorobowego (w ciąży do `okresZasilkowyCiazaDni`),
 * gdy lekarz orzecznik ZUS uzna, że leczenie rokuje powrót do pracy.
 * Uproszczenie: sumujemy wszystkie zwolnienia z kodem B; nie stosujemy przerwy z UZ art. 9 ust. 2
 * ani wyłączenia z art. 9 ust. 3 (brak parametru).
 */
export function swiadczenieRehabilitacyjne(osoba: Osoba, p: Parametry): Wynik {
  if (!maChorobowe(osoba)) return BRAK_CHOROBOWEGO_CIAZA;
  const tytulId = tytulyOsoby(osoba).find((t) => t.chorobowe !== 'brak')?.id;
  // UZ art. 8 ust. 1 – w ciąży zasiłek chorobowy najdłużej przez okresZasilkowyCiazaDni.
  if (dniZwolnienWCiazy(osoba) > p.limity.okresZasilkowyCiazaDni) {
    return {
      kod: 'PO_WYCZERPANIU_ZASILKU',
      przysluguje: 'warunkowo',
      powod:
        `Zwolnienia w ciąży trwają dłużej niż ${p.limity.okresZasilkowyCiazaDni} dni, czyli dłużej, niż można dostawać zasiłek chorobowy. ` +
        `Potem może przysługiwać świadczenie rehabilitacyjne (w ciąży ${p.stawkiProc.rehabilitacyjneCiaza}% podstawy), ` +
        'jeśli lekarz orzecznik ZUS uzna, że leczenie pozwoli wrócić do pracy.',
      przepis: 'UZ art. 8 ust. 1, art. 18 ust. 1 i 3, art. 19 ust. 1',
      tytulId,
    };
  }
  return {
    kod: 'REHAB_ZASILEK_NIEWYCZERPANY',
    przysluguje: false,
    powod:
      'Świadczenie rehabilitacyjne przysługuje dopiero po wykorzystaniu całego zasiłku chorobowego. ' +
      'Zasiłek chorobowy nie został jeszcze wykorzystany w całości.',
    przepis: 'UZ art. 18 ust. 1',
    tytulId,
  };
}

/**
 * Zasiłek w wysokości zasiłku macierzyńskiego do dnia porodu (UZ art. 30 ust. 3): pracownica, której umowa
 * wygasła z powodu śmierci pracodawcy albo została rozwiązana w ciąży z powodu upadłości lub likwidacji
 * pracodawcy, a pracodawca nie zapewnił innego zatrudnienia.
 */
export function zasilekWWysokosciMacierzynskiego(osoba: Osoba, rodzina: Rodzina, p: Parametry): Wynik {
  const start = poczatekCiazy(rodzina, p);
  const porod = rodzina.zdarzenie.data;
  const tytuly = tytulyOsoby(osoba);
  const umowa = tytuly.find(
    (t) =>
      t.rodzaj === 'umowa_o_prace' &&
      t.ustanie?.przyczyna !== undefined && // brak przyczyny = nie wiadomo, więc bez prawa z UZ art. 30 ust. 3
      USTANIE_Z_WINY_PRACODAWCY.includes(t.ustanie.przyczyna) &&
      t.ustanie.data >= start &&
      t.ustanie.data < porod,
  );
  if (!umowa) {
    return {
      kod: 'W_WYS_MAC_BRAK_PRZESLANEK',
      przysluguje: false,
      powod:
        'Ten zasiłek jest dla pracownicy, której umowa skończyła się w ciąży z powodu likwidacji, upadłości albo śmierci pracodawcy.',
      przepis: 'UZ art. 30 ust. 3',
    };
  }
  const nastepnyDzien = dodajDni(umowa.ustanie!.data, 1);
  const inna = tytuly.find((t) => t !== umowa && t.rodzaj === 'umowa_o_prace' && czyWOkresie(nastepnyDzien, t.od, koniecTytulu(t)));
  if (inna) {
    return {
      kod: 'INNE_ZATRUDNIENIE_PO_USTANIU',
      przysluguje: false,
      powod: 'Po końcu umowy trwa inna umowa o pracę, więc ten zasiłek nie przysługuje. Zasiłek macierzyński sprawdzamy osobno.',
      przepis: 'UZ art. 30 ust. 3',
      tytulId: umowa.id,
    };
  }
  return {
    kod: 'USTANIE_Z_PRZYCZYN_PRACODAWCY',
    przysluguje: true,
    powod:
      'Umowa o pracę skończyła się w ciąży z przyczyn leżących po stronie pracodawcy. Do dnia porodu przysługuje zasiłek ' +
      `w wysokości zasiłku macierzyńskiego (${p.stawkiProc.macierzynski}% podstawy).`,
    przepis: 'UZ art. 30 ust. 3',
    tytulId: umowa.id,
  };
}
