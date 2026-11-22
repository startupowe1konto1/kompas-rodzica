/**
 * PULE TYGODNI – TOR A, zadanie A1 (docs/superpowers/plans/2026-11-21-tor-a.md).
 *
 * `ustalPule(rodzina, p)`: ile tygodni każdego urlopu ma rodzina i do kiedy można z nich korzystać.
 * Wszystkie liczby z przepisów pochodzą z `p`. Daty przez `daty.ts`.
 *
 * Konwencje:
 *  - dzień porodu jest 1. dniem urlopu po porodzie [KP art. 183¹ § 2], więc koniec k-tego tygodnia
 *    po porodzie = `koniecPoTygodniach(porod, k)`;
 *  - „7 dni od dnia zgonu”: dnia zgonu nie wlicza się do terminu [KC art. 111 § 2 w zw. z KP art. 300],
 *    więc ostatni dzień = zgon + 7 dni;
 *  - wiek („do ukończenia przez dziecko N lat / miesięcy”) kończy się z początkiem dnia urodzin
 *    [KC art. 112 zd. 2], więc ostatni dzień = dzień przed urodzinami (Poradnik ZUS 2026, s. 34);
 *  - termin „N miesięcy od dnia zdarzenia” kończy się w dniu, który datą odpowiada początkowi terminu,
 *    a gdy takiego dnia nie ma – w ostatnim dniu miesiąca [KC art. 112 zd. 1] (`dodajMiesiace`).
 */
import { dodajDni, dodajLata, dodajMiesiace, koniecPoTygodniach, koniecRoku, pozniejsza, rok, wczesniejsza } from '../daty';
import type { DataISO, Dziecko, Komunikat, Osoba, Parametry, Pule, Rodzina } from '../types';
import { ustalUzupelniajacy } from './puleUzupelniajacy';

const ZUS = 'DO_POTWIERDZENIA_W_ZUS';

function doPotwierdzenia(tresc: string, przepis: string): Komunikat {
  return { kod: ZUS, poziom: 'info', tresc, przepis };
}

// ───── Odmiana liczebników w tekstach dla rodzica ─────
// Liczby w tekstach pochodzą z `p`; stałe poniżej to reguły gramatyki polskiej, nie przepisy.

function odmiana(n: number, jeden: string, kilka: string, wiele: string): string {
  if (n === 1) return `${n} ${jeden}`;
  const j = n % 10;
  const d = n % 100;
  return `${n} ${j >= 2 && j <= 4 && (d < 12 || d > 14) ? kilka : wiele}`;
}
const tygodni = (n: number) => odmiana(n, 'tydzień', 'tygodnie', 'tygodni');
const dni = (n: number) => odmiana(n, 'dzień', 'dni', 'dni');
const lat = (n: number) => odmiana(n, 'rok', 'lata', 'lat');

// ───── Wymiary ─────

/** KP art. 180 § 1, art. 183 § 1, § 1¹: wymiar według liczby dzieci (ostatnia pozycja: 5 i więcej). */
function wymiarMacierzynskiego(liczbaDzieci: number, p: Parametry): number {
  const tabela = p.wymiaryTyg.macierzynski;
  return tabela[Math.min(liczbaDzieci, tabela.length) - 1];
}

/** KP art. 182¹a § 1–2, art. 183 § 4, § 4¹, § 4³, § 4⁴. */
function wymiarRodzicielskiego(liczbaDzieci: number, zaZyciem: boolean, p: Parametry): number {
  const w = p.wymiaryTyg;
  if (liczbaDzieci > 1) return zaZyciem ? w.rodzicielskiZaZyciemWiecej : w.rodzicielskiWiecej;
  return zaZyciem ? w.rodzicielskiZaZyciem1 : w.rodzicielski1;
}

/** KP art. 182¹f § 1, § 1¹ (przy przyjęciu przez KP art. 183 § 5). */
function maksZPraca(liczbaDzieci: number, zaZyciem: boolean, p: Parametry): number {
  const m = p.wymiaryTyg.rodzicielskiMaxZPraca;
  if (liczbaDzieci > 1) return zaZyciem ? m.zaZyciemWiecej : m.wiecej;
  return zaZyciem ? m.zaZyciemJedno : m.jedno;
}

/** Ostatni dzień przed ukończeniem przez dziecko `liczbaLat` lat [KC art. 112 zd. 2]. */
function dzienPrzedUrodzinami(dataUrodzenia: DataISO, liczbaLat: number): DataISO {
  return dodajDni(dodajLata(dataUrodzenia, liczbaLat), -1);
}

/**
 * Ile tygodni po porodzie matka musi wykorzystać sama.
 *  - 8 przy orzeczeniu o niezdolności do samodzielnej egzystencji [KP art. 180 § 6]
 *    i porzuceniu dziecka [KP art. 180 § 13, art. 182];
 *  - 0 po zgonie matki: ojciec albo inny członek rodziny przejmuje urlop od dnia po zgonie,
 *    bez minimum [KP art. 180 § 12, § 15];
 *  - pobyt matki w szpitalu nie zmienia puli – przerwanie urlopu po 8 tygodniach [KP art. 180 § 10]
 *    ocenia walidacja planu;
 *  - w pozostałych przypadkach 14 [KP art. 180 § 4].
 */
function obowiazkoweMatki(matka: Osoba | undefined, p: Parametry): number {
  const z = matka?.zdrowie;
  if (z?.zgon !== undefined) return 0;
  if (z?.orzeczenieNiezdolnosciSamodzielnejEgzystencji === true || z?.porzucenieDziecka !== undefined) {
    return p.wymiaryTyg.obowiazkoweMatkiSzczegolne;
  }
  return p.wymiaryTyg.obowiazkoweMatki;
}

function puleZerowe(p: Parametry): Pule {
  return {
    macierzynskiTyg: 0,
    macierzynskiPrzedPorodemMaxTyg: 0,
    obowiazkoweMatkiTyg: 0,
    uzupelniajacyTyg: 0,
    rodzicielskiTyg: 0,
    rodzicielskiNieprzenoszalneTyg: 0,
    rodzicielskiMaxZPracaTyg: 0,
    rodzicielskiMaxCzesci: p.limity.rodzicielskiMaxCzesci,
    ojcowskiTyg: 0,
  };
}

function zUwagami(pule: Pule, uwagi: Komunikat[]): Pule {
  return uwagi.length > 0 ? { ...pule, uwagi } : pule;
}

export function ustalPule(rodzina: Rodzina, p: Parametry): Pule {
  const z = rodzina.zdarzenie;
  const uwagi: Komunikat[] = [];

  // Brak danych o dzieciach nie blokuje symulacji: liczymy jak dla jednego dziecka.
  let dzieci: Dziecko[] = z.dzieci;
  if (dzieci.length === 0) {
    dzieci = [{}];
    uwagi.push({
      kod: 'LICZBA_DZIECI_NIEPODANA',
      poziom: 'info',
      tresc: 'Nie podano liczby dzieci. Policzyliśmy urlopy jak dla jednego dziecka. Przy bliźniętach urlopy są dłuższe.',
      przepis: 'KP art. 180 § 1',
    });
  }

  const matka = rodzina.osoby.find((o) => o.rola === 'matka');

  if (z.typ === 'porod') return zUwagami(pulePorodu(z.data, dzieci, matka, p, uwagi), uwagi);
  return zUwagami(pulePrzyjecia(rodzina, dzieci, matka, p, uwagi), uwagi);
}

// ───── Poród ─────

/**
 * Koniec urlopu macierzyńskiego przy zgonach dzieci [KP art. 180¹]. Zgony przechodzimy po kolei:
 * po każdym wymiar według liczby dzieci, które żyją (§ 1 zd. 2, § 2 zd. 2), nie krócej niż 7 dni
 * od dnia zgonu i nie dłużej niż do dotychczasowego końca urlopu. Gdy zmarło ostatnie dziecko:
 * przed upływem 8 tygodni życia – 8 tygodni po porodzie, nie krócej niż 7 dni od zgonu (§ 1 zd. 1);
 * później – 7 dni od zgonu (§ 2 zd. 1). Zgon po końcu urlopu nie zmienia już urlopu.
 */
function macierzynskiPoZgonach(
  porod: DataISO,
  urodzoneZywe: number,
  zgony: DataISO[],
  p: Parametry,
): { tyg: number; koniec: DataISO; zyjeNaKoniec: number } {
  const w = p.wymiaryTyg;
  const koniec8Tyg = koniecPoTygodniach(porod, w.martweUrodzenie);
  let zyje = urodzoneZywe;
  let tyg = wymiarMacierzynskiego(zyje, p);
  let koniec = koniecPoTygodniach(porod, tyg);
  for (const zgon of [...zgony].sort()) {
    if (zgon > koniec) continue;
    const poZgonie = wczesniejsza(dodajDni(zgon, w.dniPoZgonieDziecka), koniec);
    zyje -= 1;
    if (zyje > 0) {
      tyg = wymiarMacierzynskiego(zyje, p);
      koniec = pozniejsza(koniecPoTygodniach(porod, tyg), poZgonie);
    } else if (zgon <= koniec8Tyg) {
      tyg = w.martweUrodzenie;
      koniec = wczesniejsza(pozniejsza(koniec8Tyg, poZgonie), koniec);
    } else {
      koniec = poZgonie;
    }
  }
  return { tyg, koniec, zyjeNaKoniec: zyje };
}

function pulePorodu(porod: DataISO, dzieci: Dziecko[], matka: Osoba | undefined, p: Parametry, uwagi: Komunikat[]): Pule {
  const w = p.wymiaryTyg;
  const urodzoneZywe = dzieci.filter((d) => !d.martwe);
  const zyjace = urodzoneZywe.filter((d) => d.zgon === undefined);
  const zgony = urodzoneZywe.map((d) => d.zgon).filter((d): d is DataISO => d !== undefined);

  const pule: Pule = {
    ...puleZerowe(p),
    // KP art. 180 § 2: do 6 tygodni przed przewidywaną datą porodu.
    macierzynskiPrzedPorodemMaxTyg: w.macierzynskiPrzedPorodemMax,
    // KP art. 182³ § 1: do 2 tygodni, bez względu na liczbę dzieci.
    ojcowskiTyg: w.ojcowski,
    // KP art. 182³ § 1 pkt 1: do ukończenia przez dziecko 12 miesiąca życia – dzień przed pierwszymi urodzinami
    // [KC art. 112 zd. 2; Poradnik ZUS 2026, s. 34].
    ojcowskiDoKiedy: dodajDni(dodajMiesiace(porod, p.limity.ojcowskiDoMiesiecyZycia), -1),
    // KP art. 182¹c: do końca roku kalendarzowego, w którym dziecko kończy 6 rok życia.
    rodzicielskiDoKiedy: koniecRoku(rok(porod) + p.limity.rodzicielskiDoRokuZycia),
    // UZ art. 30a ust. 1: nie później niż 21 dni po porodzie; liczymy od dnia po porodzie (1.12 → 22.12, D18).
    // NIEJASNE (pytanie nr 23): wniosek przed porodem – odpowiedź ZUS na stoisku 21.11, pytanie nr 23 („chyba” tylko razem
    // z wnioskiem o urlop przed porodem); tekst dla rodzica w możliwości `wariant_815` i karcie `TERMIN_815`.
    wniosek815DoKiedy: dodajDni(porod, p.terminyDni.wniosek815PoPorodzie),
  };

  if (urodzoneZywe.length === 0) {
    // KP art. 180¹ § 1: urodzenie martwego dziecka – 8 tygodni po porodzie.
    pule.macierzynskiTyg = w.martweUrodzenie;
    // Odpowiedź ZUS na stoisku 21.11, pytanie nr 8: po martwym urodzeniu nie przysługuje ani urlop rodzicielski, ani ojcowski.
    pule.ojcowskiTyg = 0;
    delete pule.rodzicielskiDoKiedy;
    delete pule.ojcowskiDoKiedy;
  } else {
    const mac = macierzynskiPoZgonach(porod, urodzoneZywe.length, zgony, p);
    pule.macierzynskiTyg = mac.tyg;
    // Gdy w czasie urlopu zmarły wszystkie dzieci, koniec urlopu wynika z daty zgonu – podajemy go wprost.
    if (mac.zyjeNaKoniec === 0 || mac.koniec !== koniecPoTygodniach(porod, mac.tyg)) pule.macierzynskiOstatniDzien = mac.koniec;

    // Rodzicielski według dzieci, które żyją; gdy zmarły wszystkie – według urodzonych żywych.
    const liczone = zyjace.length > 0 ? zyjace : urodzoneZywe;
    const zaZyciem = liczone.some((d) => d.zaZyciem === true);
    pule.rodzicielskiTyg = wymiarRodzicielskiego(liczone.length, zaZyciem, p);
    pule.rodzicielskiMaxZPracaTyg = maksZPraca(liczone.length, zaZyciem, p);
    pule.rodzicielskiNieprzenoszalneTyg = w.rodzicielskiNieprzenoszalne; // KP art. 182¹a § 4

    if (zyjace.length === 1 && dzieci.length > zyjace.length) {
      // NIEJASNE (pytanie nr 8): KP art. 182¹a § 1 odsyła do liczby dzieci urodzonych przy jednym porodzie
      // (art. 180 § 1), a art. 180¹ każe liczyć dzieci żyjące. Przyjmujemy wymiar dla żyjących.
      uwagi.push(
        doPotwierdzenia(
          'Urlop rodzicielski policzyliśmy dla jednego dziecka, które żyje. Czy przysługuje wymiar jak przy porodzie mnogim? To wymaga potwierdzenia w ZUS.',
          'KP art. 182¹a § 1',
        ),
      );
    }

    if (zyjace.length === 0) {
      // KP art. 182¹g w zw. z art. 180¹ § 2: urlop rodzicielski zachowany przez 7 dni od dnia zgonu.
      // NIEJASNE (pytanie nr 8): urlop rodzicielski i ojcowski po zgonie dziecka.
      const ostatniZgon = zgony.reduce(pozniejsza);
      pule.rodzicielskiDoKiedy = wczesniejsza(pule.rodzicielskiDoKiedy as DataISO, dodajDni(ostatniZgon, w.dniPoZgonieDziecka));
      uwagi.push(
        doPotwierdzenia(
          `Urlop macierzyński trwa co najmniej ${dni(w.dniPoZgonieDziecka)} od dnia śmierci dziecka. Czy i jak długo można korzystać z urlopu rodzicielskiego i ojcowskiego? To wymaga potwierdzenia w ZUS.`,
          'KP art. 180¹',
        ),
      );
    }
  }

  // KP art. 180 § 4, § 6, § 12–13: nie więcej niż cały wymiar urlopu.
  pule.obowiazkoweMatkiTyg = Math.min(obowiazkoweMatki(matka, p), pule.macierzynskiTyg);

  // KP art. 180²: uzupełniający.
  const uzup = ustalUzupelniajacy(dzieci, porod, p);
  pule.uzupelniajacyTyg = uzup.tyg;
  uwagi.push(...uzup.uwagi);

  return pule;
}

// ───── Przyjęcie dziecka ─────

function pulePrzyjecia(rodzina: Rodzina, dzieci: Dziecko[], matka: Osoba | undefined, p: Parametry, uwagi: Komunikat[]): Pule {
  const z = rodzina.zdarzenie;
  const w = p.wymiaryTyg;

  // KP art. 183 § 1, § 4; UZ art. 29 ust. 1 pkt 3: rodzina zastępcza zawodowa nie ma prawa do tych urlopów.
  if (z.typ === 'rodzina_zastepcza_zawodowa') return puleZerowe(p);

  const przysposobienie = z.typ === 'przysposobienie';
  // Limit wieku liczymy dla najstarszego z przyjętych dzieci – ono pierwsze go osiąga.
  const zDataUrodzenia = dzieci.filter((d) => d.dataUrodzenia !== undefined);
  const najstarsze = zDataUrodzenia.reduce<Dziecko | undefined>(
    (a, d) => (a === undefined || (d.dataUrodzenia as DataISO) < (a.dataUrodzenia as DataISO) ? d : a),
    undefined,
  );
  const dataUrodzenia = najstarsze?.dataUrodzenia;
  // KP art. 183 § 1¹ (przysposobienie: 14 lat), § 1 (rodzina zastępcza: 7 lat, 10 przy odroczonym obowiązku szkolnym).
  const limitLat = przysposobienie
    ? p.limity.wiekPrzysposobienieLat
    : najstarsze?.odroczonyObowiazekSzkolny
      ? p.limity.wiekRodzinaZastepczaOdroczenieLat
      : p.limity.wiekRodzinaZastepczaLat;
  const granicaWieku = dataUrodzenia ? dzienPrzedUrodzinami(dataUrodzenia, limitLat) : undefined;

  // UZ art. 29 ust. 1 pkt 2–3; KP art. 183 § 1, § 1¹: dziecko przyjęte po limicie wieku – brak urlopów.
  if (granicaWieku !== undefined && granicaWieku < z.data) return puleZerowe(p);

  const zaZyciem = dzieci.some((d) => d.zaZyciem === true);
  const pule: Pule = {
    ...puleZerowe(p),
    // KP art. 183 § 1, § 1¹: urlop na warunkach urlopu macierzyńskiego według liczby przyjętych dzieci.
    macierzynskiTyg: wymiarMacierzynskiego(dzieci.length, p),
    // KP art. 183 § 4, § 4¹, § 4³, § 4⁴.
    rodzicielskiTyg: wymiarRodzicielskiego(dzieci.length, zaZyciem, p),
    // KP art. 183 § 5 w zw. z art. 182¹f.
    rodzicielskiMaxZPracaTyg: maksZPraca(dzieci.length, zaZyciem, p),
    // KP art. 183 § 5 w zw. z art. 182¹a § 4.
    rodzicielskiNieprzenoszalneTyg: w.rodzicielskiNieprzenoszalne,
    // UZ art. 30a ust. 2: nie później niż 21 dni po przyjęciu dziecka.
    wniosek815DoKiedy: dodajDni(z.data, p.terminyDni.wniosek815PoPorodzie),
  };

  // NIEJASNE (pytanie nr 7): kiedy stosuje się KP art. 183 § 3 zamiast § 1 / § 1¹.
  // Stosujemy § 1 / § 1¹ wprost: urlop kończy się najpóźniej w dniu przed ukończeniem limitu wieku.
  const koniecMac = koniecPoTygodniach(z.data, pule.macierzynskiTyg);
  if (granicaWieku !== undefined && granicaWieku < koniecMac) {
    pule.macierzynskiOstatniDzien = granicaWieku;
    const starsze = w.przyjecieStarszegoDziecka;
    uwagi.push(
      doPotwierdzenia(
        `Dziecko skończy ${lat(limitLat)} przed końcem pełnego urlopu, więc urlop kończy się wcześniej. Przepis przewiduje też wariant: ${tygodni(starsze.naWarunkachMacierzynskiego)} urlopu na warunkach urlopu macierzyńskiego i ${tygodni(starsze.rodzicielski)} urlopu rodzicielskiego. Który wariant przysługuje? To wymaga potwierdzenia w ZUS.`,
        'KP art. 183 § 3',
      ),
    );
  }

  // KP art. 180 § 4–7 stosowane odpowiednio [KP art. 183 § 2].
  pule.obowiazkoweMatkiTyg = Math.min(obowiazkoweMatki(matka, p), pule.macierzynskiTyg);

  if (przysposobienie) {
    // KP art. 182³ § 1 pkt 2: urlop ojcowski do upływu 12 miesięcy od dnia uprawomocnienia postanowienia
    // (termin, nie wiek: KC art. 112 zd. 1 – ta sama data 12 miesięcy później), nie dłużej niż
    // do ukończenia przez dziecko 14 roku życia (wiek: KC art. 112 zd. 2 – dzień przed urodzinami).
    // `ojcowskiDoMiesiecyZycia` = 12 miesięcy z art. 182³ § 1, ta sama liczba w pkt 1 i 2.
    pule.ojcowskiTyg = w.ojcowski;
    const poUprawomocnieniu = z.dataUprawomocnienia
      ? dodajMiesiace(z.dataUprawomocnienia, p.limity.ojcowskiDoMiesiecyZycia)
      : undefined;
    const ojcowskiDoKiedy =
      poUprawomocnieniu && granicaWieku ? wczesniejsza(poUprawomocnieniu, granicaWieku) : (poUprawomocnieniu ?? granicaWieku);
    if (ojcowskiDoKiedy) pule.ojcowskiDoKiedy = ojcowskiDoKiedy;
    if (!z.dataUprawomocnienia) {
      uwagi.push({
        kod: 'BRAK_DATY_UPRAWOMOCNIENIA',
        poziom: 'info',
        tresc:
          'Proszę podać datę uprawomocnienia postanowienia o przysposobieniu. Od niej zależy, do kiedy można wziąć urlop ojcowski.',
        przepis: 'KP art. 182³ § 1 pkt 2',
      });
    }
  }
  // Rodzina zastępcza: urlop ojcowski przysługuje ojcu albo przy przysposobieniu [KP art. 182³ § 1] – tu 0.

  if (dataUrodzenia) {
    if (przysposobienie) {
      // KP art. 183 § 4¹: rodzicielski przy przysposobieniu „nie dłużej jednak niż do ukończenia przez dziecko 14 roku
      // życia” – ostatni dzień to dzień przed 14. urodzinami (KC art. 112 zd. 2). Odpowiedź ZUS na stoisku 21.11,
      // pytanie nr 37: przy przysposobieniu urlop rodzicielski do 14. roku życia dziecka.
      pule.rodzicielskiDoKiedy = dzienPrzedUrodzinami(dataUrodzenia, p.limity.wiekPrzysposobienieLat);
    } else {
      // KP art. 183 § 5 w zw. z art. 182¹c: do końca roku kalendarzowego, w którym dziecko kończy 6 rok życia.
      pule.rodzicielskiDoKiedy = koniecRoku(rok(dataUrodzenia) + p.limity.rodzicielskiDoRokuZycia);
      // NIEJASNE (pytanie nr 37): przy rodzinie zastępczej ZUS powiedział tylko, że „jest inaczej” (odpowiedź na stoisku
      // 21.11). Zostaje art. 182¹c i uwaga, gdy pełny urlop nie mieści się w tym terminie.
      const koniecPelnegoUrlopu = koniecPoTygodniach(z.data, pule.macierzynskiTyg + pule.rodzicielskiTyg);
      if (pule.rodzicielskiDoKiedy < koniecPelnegoUrlopu) {
        uwagi.push(
          doPotwierdzenia(
            `Urlop rodzicielski trzeba wykorzystać do końca roku, w którym dziecko kończy ${lat(p.limity.rodzicielskiDoRokuZycia)}. Przy tym wieku dziecka cały urlop się nie zmieści. Czy w rodzinie zastępczej jest na to więcej czasu? To wymaga potwierdzenia w ZUS.`,
            'KP art. 183 § 4, § 5, art. 182¹c',
          ),
        );
      }
    }

    // KP art. 183 § 3¹: uzupełniający, gdy pobyt w szpitalu był po przyjęciu dziecka.
    const uzup = ustalUzupelniajacy(dzieci, dataUrodzenia, p, z.data);
    pule.uzupelniajacyTyg = uzup.tyg;
    uwagi.push(...uzup.uwagi);
  }

  return pule;
}
