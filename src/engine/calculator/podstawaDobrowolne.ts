/**
 * Podstawa wymiaru zasiłku ubezpieczonego niebędącego pracownikiem (zlecenie, działalność, współpraca)
 * oraz reguła art. 43 (podstawa poprzedniego zasiłku), z której korzysta każdy tytuł.
 */
import { czyPoprawna, miesiac, ostatniDzienMiesiaca, pierwszyDzienMiesiaca, pozniejsza, przesunMiesiac, roznicaDni } from '../daty';
import { parametryNaDzien } from '../params';
import { doGrosza } from '../pieniadze';
import type { DataISO, KrokWyliczenia, MetodaPodstawy, MiesiacISO, Osoba, Parametry, PodstawaWymiaru, TytulUbezpieczenia } from '../types';
import { MIESIECY_OKRESU_PODSTAWY, grosze, krokSzacunku, okresPodstawy, ostatnieZnaneMiesiace, sredniaGroszy, wpisyListy } from './miesiace';
import { poOdliczeniuSkladek, proc, procentZ, zl } from './liczby';

const poprawnaKwota = (x: number | undefined): x is number => x !== undefined && Number.isFinite(x) && x >= 0;

/** Stała miesięczna kwota z ankiety; dla działalności i współpracy pierwsza jest zadeklarowana podstawa. */
function kwotaStala(tytul: TytulUbezpieczenia): number | undefined {
  const dzialalnosc = tytul.rodzaj === 'dzialalnosc' || tytul.rodzaj === 'wspolpraca';
  const kwota = dzialalnosc
    ? (tytul.zadeklarowanaPodstawa ?? tytul.wynagrodzenieMiesieczne)
    : (tytul.wynagrodzenieMiesieczne ?? tytul.zadeklarowanaPodstawa);
  return poprawnaKwota(kwota) ? kwota : undefined;
}

/**
 * Kwota jednego miesiąca okresu podstawy z parametrami obowiązującymi w tym miesiącu: limit dobrowolnego chorobowego,
 * najniższa i preferencyjna podstawa składek to wartości z tego miesiąca, nie z dnia powstania prawa
 * (UZ art. 48 ust. 1 i art. 48a ust. 1 mówią o przychodzie i podstawie składek „za” miesiące okresu).
 */
interface KwotaMiesiaca {
  miesiac: MiesiacISO;
  kwota: number;
  p: Parametry;
  /** Kwota przeniesiona ze stałej deklaracji z ankiety, a nie odczytana dla tego miesiąca (lista `podstawaSkladek`). */
  zAnkiety?: boolean;
}

/**
 * Kwoty miesięcy okresu z listy `podstawaSkladek` (błędne miesiące pomijamy, jeden wpis na miesiąc: `wpisyListy`)
 * albo stała kwota z ankiety w każdym miesiącu okresu. Pusta tablica = brak danych.
 */
function kwotyMiesiecy(tytul: TytulUbezpieczenia, okres: MiesiacISO[], wersje: Parametry[]): KwotaMiesiaca[] {
  const zParametrami = (m: MiesiacISO, kwota: number): KwotaMiesiaca => ({ miesiac: m, kwota, p: parametryNaDzien(pierwszyDzienMiesiaca(m), wersje) });
  const zListy = wpisyListy(tytul.podstawaSkladek).filter((m) => okres.includes(m.miesiac) && poprawnaKwota(m.kwota));
  if (zListy.length > 0) return zListy.map((m) => zParametrami(m.miesiac, m.kwota));
  // Lista bez żadnego poprawnego miesiąca z okresu (albo jej brak) wraca do stałej zadeklarowanej kwoty z ankiety.
  const stala = kwotaStala(tytul);
  return stala === undefined ? [] : okres.map((m) => ({ ...zParametrami(m, stala), zAnkiety: true }));
}

/** '3 × 4877,11 zł + 8 × 5194,49 zł': równe kwoty zgrupowane w kolejności pierwszego wystąpienia. */
function wzorSumy(kwoty: number[]): string {
  const grupy = new Map<number, number>();
  for (const k of kwoty) grupy.set(k, (grupy.get(k) ?? 0) + 1);
  return [...grupy].map(([k, ile]) => (ile === 1 ? zl(k) : `${ile} × ${zl(k)}`)).join(' + ');
}

/** Podstawa niebędącego pracownikiem: UZ art. 48, 48a, 49 (z odliczeniem składek, art. 3 pkt 4). */
export function obliczPodstaweNiepracownika(
  osoba: Osoba,
  tytul: TytulUbezpieczenia,
  dataPowstaniaPrawa: DataISO,
  wersje: Parametry[],
): PodstawaWymiaru {
  // Parametry z dnia powstania prawa: procent składek do odliczenia i art. 49 (miesiąc powstania prawa).
  const p = parametryNaDzien(dataPowstaniaPrawa, wersje);
  const okres = okresPodstawy(tytul, dataPowstaniaPrawa);
  const n = okres.length;
  const dzialalnosc = tytul.rodzaj === 'dzialalnosc' || tytul.rodzaj === 'wspolpraca';
  const ograniczenia: string[] = [];
  const sciezka: KrokWyliczenia[] = [];
  const skladki = proc(p.kwoty.skladkiPracownikaProc);

  // UZ art. 49 ust. 1: bez pełnego miesiąca ubezpieczenia liczy się kwota za miesiąc powstania prawa, z jego parametrami.
  const stala = kwotaStala(tytul);
  let miesiace: KwotaMiesiaca[] = n === 0 ? (stala === undefined ? [] : [{ miesiac: miesiac(dataPowstaniaPrawa), kwota: stala, p }]) : kwotyMiesiecy(tytul, okres, wersje);
  // Szacunek (decyzja zespołu): lista nie ma żadnego miesiąca z okresu z UZ art. 48 ust. 1, a kwoty z ankiety nie ma
  // (ona ma pierwszeństwo) – liczymy z ostatnich znanych miesięcy listy, z parametrami tych miesięcy.
  const znane = miesiace.length === 0 ? ostatnieZnaneMiesiace(tytul, okres) : [];
  if (znane.length > 0) miesiace = kwotyMiesiecy(tytul, znane, wersje);
  const szacunek = znane.length > 0 && miesiace.length > 0;
  if (szacunek) {
    ograniczenia.push('podstawa_z_ostatnich_znanych_miesiecy');
    sciezka.push(krokSzacunku(znane, 'UZ art. 48 ust. 1'));
  }
  // Załącznik ZUS: kwota każdego miesiąca ograniczona do maksymalnej podstawy dobrowolnej składki chorobowej z tego miesiąca.
  const obciete = miesiace.map((m) => ({
    ...m,
    kwota: tytul.chorobowe === 'dobrowolne' ? Math.min(m.kwota, m.p.kwoty.maxPodstawaSkladkiDobrowolne) : m.kwota,
  }));
  const brakDanych = miesiace.length === 0;
  const surowa = brakDanych ? 0 : sredniaGroszy(miesiace.map((m) => m.kwota));
  const brutto = brakDanych ? 0 : sredniaGroszy(obciete.map((m) => m.kwota));
  if (brutto < surowa) ograniczenia.push('limit_dobrowolne');
  // Brak danych o przychodzie liczy się tak samo jak u pracownika: kwota 0 i kod. Najniższa podstawa z art. 49 nie zależy od ankiety.
  if (brakDanych && !(n === 0 && dzialalnosc)) ograniczenia.push('brak_danych_o_przychodzie');

  const krokLimitu = (): KrokWyliczenia[] =>
    ograniczenia.includes('limit_dobrowolne')
      ? [
          {
            opis: 'Podstawa dobrowolnego ubezpieczenia chorobowego ograniczona do maksymalnej',
            wartosc: brutto,
            przepis: 'Załącznik ZUS: maksymalna podstawa dobrowolnej składki chorobowej',
          },
        ]
      : [];
  const krokOdliczenia = (kwotaBrutto: number, wynik: number): KrokWyliczenia => ({
    opis: `Odliczenie składek ubezpieczonego (${skladki})`,
    wzor: `${zl(kwotaBrutto)} × (100% − ${skladki})`,
    wartosc: wynik,
    przepis: 'UZ art. 3 pkt 4',
  });

  let metoda: MetodaPodstawy;
  let kwota: number;

  if (n === 0 && dzialalnosc) {
    // UZ art. 49 ust. 1 pkt 1: najniższa miesięczna podstawa składek za miesiąc powstania prawa.
    metoda = 'najnizsza_podstawa';
    const najnizsza = p.kwoty.najnizszaPodstawaDzialalnosc;
    kwota = poOdliczeniuSkladek(najnizsza, p);
    sciezka.push(
      { opis: 'Ubezpieczenie trwa krócej niż pełny miesiąc, więc bierzemy najniższą podstawę składek', wartosc: najnizsza, przepis: 'UZ art. 49 ust. 1 pkt 1' },
      krokOdliczenia(najnizsza, kwota),
    );
  } else if (n === 0) {
    // UZ art. 49 ust. 1 pkt 2: przychód z umowy za miesiąc powstania prawa.
    metoda = 'z_umowy';
    kwota = poOdliczeniuSkladek(brutto, p);
    sciezka.push(
      { opis: 'Ubezpieczenie trwa krócej niż pełny miesiąc, więc bierzemy przychód z umowy', wartosc: surowa, przepis: 'UZ art. 49 ust. 1 pkt 2' },
      ...krokLimitu(),
      krokOdliczenia(brutto, kwota),
    );
  } else if (n < MIESIECY_OKRESU_PODSTAWY && dzialalnosc) {
    // UZ art. 48a ust. 1: przeciętna najniższa podstawa + (część zadeklarowanej ponad najniższą) × n ÷ 12, obie po odliczeniach.
    metoda = 'art_48a';
    if (brakDanych) {
      // Bez zadeklarowanej kwoty nie ma z czego liczyć drugiej części; nie podstawiamy najniższej podstawy w jej miejsce.
      kwota = 0;
      sciezka.push({ opis: 'Brak danych o zadeklarowanej podstawie składek, więc nie da się wyliczyć podstawy', wartosc: 0, przepis: 'UZ art. 48a ust. 1' });
    } else {
      // Wszystkie n miesięcy okresu, każdy z najniższą podstawą składek obowiązującą w tym miesiącu (parametry jego roku),
      // także te bez danych na liście: pkt 1 liczy się za pełne miesiące ubezpieczenia, a nie za miesiące z danymi.
      // UZ art. 48a ust. 5 a contrario: przy składkach preferencyjnych (zadeklarowana kwota poniżej najniższej podstawy
      // tego miesiąca) najniższą podstawą jest podstawa preferencyjna, czyli ustalony procent płacy minimalnej z tego
      // miesiąca; nadwyżka jest wtedy zerowa. Miesiąc bez danych nie ma kwoty, więc preferencji w nim nie rozpoznajemy:
      // bierzemy zwykłą najniższą podstawę, a nadwyżki dla niego nie ma.
      const poMiesiacu = new Map(obciete.map((m) => [m.miesiac, m]));
      // Kwota z ankiety to jedna deklaracja: rodzaj składek (pełne czy preferencyjne) ustalamy raz, względem najniższej
      // podstawy z najwcześniejszego miesiąca okresu (rok, z którego pochodzi deklaracja), i przenosimy na resztę okresu.
      // Bez tego stała kwota 5652 zł (najniższa podstawa 2026 r.) w miesiącach 2027 r. (6019,80 zł) wyglądałaby na
      // składki preferencyjne. Dane z listy miesięcy porównujemy miesiąc po miesiącu.
      const zAnkiety = obciete.length > 0 && obciete.every((m) => m.zAnkiety);
      const najnizszaWOkresie = Math.min(
        ...okres.map((mies) => parametryNaDzien(pierwszyDzienMiesiaca(mies), wersje).kwoty.najnizszaPodstawaDzialalnosc),
      );
      const preferencyjneZAnkiety = zAnkiety && obciete[0].kwota < najnizszaWOkresie;
      const czesciMiesiecy = okres.map((mies) => {
        const dane = poMiesiacu.get(mies);
        const { kwoty } = dane?.p ?? parametryNaDzien(pierwszyDzienMiesiaca(mies), wersje);
        const preferencyjne = zAnkiety ? preferencyjneZAnkiety : dane !== undefined && dane.kwota < kwoty.najnizszaPodstawaDzialalnosc;
        const najnizsza = preferencyjne
          ? procentZ(kwoty.placaMinimalna, kwoty.podstawaPreferencyjnaProcPlacyMinimalnej)
          : kwoty.najnizszaPodstawaDzialalnosc;
        return {
          najnizsza,
          pierwsza: poOdliczeniuSkladek(najnizsza, p),
          nadwyzka: dane === undefined ? undefined : poOdliczeniuSkladek(Math.max(0, dane.kwota - najnizsza), p),
        };
      });
      const nadwyzki = czesciMiesiecy.flatMap((c) => (c.nadwyzka === undefined ? [] : [c.nadwyzka]));
      const k = nadwyzki.length; // miesiące z danymi, k ≤ n
      // UZ art. 48a ust. 1 pkt 1: przeciętna miesięczna najniższa podstawa po odliczeniach za pełne miesiące okresu,
      // czyli średnia (na groszach) najniższych podstaw wszystkich n miesięcy po odliczeniu składek.
      const czescPierwsza = sredniaGroszy(czesciMiesiecy.map((c) => c.pierwsza));
      // UZ art. 48a ust. 1 pkt 2 – tak odczytujemy brzmienie: „iloczyn jednej dwunastej przeciętnej kwoty zadeklarowanej
      // […] w części przewyższającej najniższą podstawę […], po odliczeniach […], za pełne miesiące kalendarzowe
      // ubezpieczenia […] oraz liczby tych miesięcy”. Przeciętna nadwyżka = suma nadwyżek miesięcy (każda ponad najniższą
      // podstawę swojego miesiąca, po odliczeniu składek) ÷ liczba miesięcy z kwotą (k); razy n (pełne miesiące okresu)
      // i ÷ 12. Gdy kwota jest w każdym miesiącu okresu (k = n), to po prostu suma nadwyżek ÷ 12.
      // Mnożenie i dzielenie na groszach całkowitych, jedno zaokrąglenie (połówka w górę).
      const czescDruga = Math.round((nadwyzki.reduce((s, x) => s + grosze(x), 0) * n) / (k * MIESIECY_OKRESU_PODSTAWY)) / 100;
      kwota = doGrosza((grosze(czescPierwsza) + grosze(czescDruga)) / 100);
      const jednaNajnizsza = new Set(czesciMiesiecy.map((c) => c.najnizsza)).size === 1;
      const jednaNadwyzka = new Set(nadwyzki).size === 1;
      sciezka.push(
        { opis: 'Zadeklarowana podstawa składek', wartosc: surowa, przepis: 'UZ art. 48a ust. 1' },
        ...krokLimitu(),
        jednaNajnizsza
          ? {
              opis: 'Najniższa podstawa składek po odliczeniach (pierwsza część)',
              wzor: `${zl(czesciMiesiecy[0].najnizsza)} × (100% − ${skladki})`,
              wartosc: czescPierwsza,
              przepis: 'UZ art. 48a ust. 1 pkt 1',
            }
          : {
              opis: `Przeciętna najniższa podstawa składek z ${n} mies. po odliczeniach (pierwsza część; najniższa podstawa każdego miesiąca z jego roku)`,
              wzor: `(${wzorSumy(czesciMiesiecy.map((c) => c.pierwsza))}) ÷ ${n}`,
              wartosc: czescPierwsza,
              przepis: 'UZ art. 48a ust. 1 pkt 1',
            },
        {
          opis: `Część zadeklarowanej podstawy ponad najniższą, liczona tylko za ${n} z ${MIESIECY_OKRESU_PODSTAWY} mies. ubezpieczenia (druga część; wysoka składka tuż przed zasiłkiem daje niewiele)`,
          wzor:
            k !== n
              ? `(${wzorSumy(nadwyzki)}) ÷ ${k} × ${n} ÷ ${MIESIECY_OKRESU_PODSTAWY}`
              : jednaNadwyzka
                ? `${zl(nadwyzki[0])} × ${n} ÷ ${MIESIECY_OKRESU_PODSTAWY}`
                : `(${wzorSumy(nadwyzki)}) ÷ ${MIESIECY_OKRESU_PODSTAWY}`,
          wartosc: czescDruga,
          przepis: 'UZ art. 48a ust. 1 pkt 2',
        },
        { opis: 'Podstawa wymiaru: suma obu części', wzor: `${zl(czescPierwsza)} + ${zl(czescDruga)}`, wartosc: kwota, przepis: 'UZ art. 48a ust. 1' },
      );
    }
  } else if (n < MIESIECY_OKRESU_PODSTAWY) {
    // UZ art. 36 ust. 2 w związku z art. 48 ust. 2: średnia z pełnych miesięcy ubezpieczenia.
    metoda = 'srednia_pelnych_miesiecy';
    kwota = poOdliczeniuSkladek(brutto, p);
    sciezka.push(
      { opis: `Średni przychód z ${n} pełnych mies. ubezpieczenia`, wartosc: surowa, przepis: 'UZ art. 36 ust. 2 w zw. z art. 48 ust. 2' },
      ...krokLimitu(),
      krokOdliczenia(brutto, kwota),
    );
  } else {
    // UZ art. 48 ust. 1: przeciętny miesięczny przychód z 12 miesięcy.
    metoda = 'srednia_12_miesiecy';
    kwota = poOdliczeniuSkladek(brutto, p);
    sciezka.push(
      {
        opis: szacunek ? `Średnia podstawa składek z ${miesiace.length} ostatnich znanych mies.` : 'Średnia podstawa składek z 12 miesięcy',
        wartosc: surowa,
        przepis: 'UZ art. 48 ust. 1',
      },
      ...krokLimitu(),
      krokOdliczenia(brutto, kwota),
    );
  }

  return { osobaId: osoba.id, tytulId: tytul.id, kwota, metoda, sciezka, ograniczenia };
}

/**
 * UZ art. 43: czy między końcem okresu a początkiem następnego mieści się cały miesiąc kalendarzowy.
 * Pierwszy miesiąc po `koniec` musi skończyć się przed `nastepny`.
 */
export function mieszczyPelnyMiesiac(koniec: DataISO, nastepny: DataISO): boolean {
  return roznicaDni(ostatniDzienMiesiaca(przesunMiesiac(miesiac(koniec), 1)), nastepny) > 0;
}

/**
 * UZ art. 43: początek łańcucha zwolnień (kolejnych bez pełnego miesiąca kalendarzowego przerwy), który sięga
 * dnia powstania prawa; undefined, gdy podstawę liczy się na nowo. Zwolnienia od dnia prawa wzwyż pomijamy.
 */
export function poczatekLancuchaZasilkow(osoba: Osoba, dataPowstaniaPrawa: DataISO): DataISO | undefined {
  const okresy = (osoba.zdrowie?.eZLA ?? [])
    .filter((z) => czyPoprawna(z.od) && czyPoprawna(z.do) && roznicaDni(z.od, z.do) >= 0 && roznicaDni(z.od, dataPowstaniaPrawa) > 0)
    .sort((a, b) => roznicaDni(b.od, a.od));
  if (okresy.length === 0) return undefined;
  let poczatek = okresy[0].od;
  let koniec = okresy[0].do;
  for (const z of okresy.slice(1)) {
    if (mieszczyPelnyMiesiac(koniec, z.od)) poczatek = z.od;
    koniec = pozniejsza(koniec, z.do);
  }
  return mieszczyPelnyMiesiac(koniec, dataPowstaniaPrawa) ? undefined : poczatek;
}
