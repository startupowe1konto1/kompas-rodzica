/**
 * D5: wnioski do pracodawcy (bez urzędowego wzoru). Treść według rozporządzenia Ministra Rodziny, Pracy
 * i Polityki Społecznej z 11 marca 2025 r. (Dz.U. 2025 poz. 322, dalej „rozp.”), a wniosek o urlop na warunkach
 * urlopu macierzyńskiego także według KP art. 183 § 6; wniosek o wypłatę zasiłku
 * za pełny wymiar urlopów – UZ art. 30a. Każdy wniosek ma wszystkie elementy wymagane dla niego
 * rozporządzeniem i listę załączników. Czego nie wiemy, zostawiamy jako lukę „……” i dopisujemy
 * do `doUzupelnienia`. PDF: jedna strona A4, font Noto Sans (SIL OFL 1.1) z polskimi znakami.
 *
 * Nie wpisujemy terminów ani liczb tygodni – te są w `Parametry` i w terminarzu (D2).
 */
import fontkit from '@pdf-lib/fontkit';
import { PageSizes, PDFDocument, rgb, type PDFFont } from 'pdf-lib';
import { dodajDni, pozniejsza, wczesniejsza } from '../engine/daty';
import type { DaneOsobowe, Dziecko, KodDokumentu, Odcinek, Osoba, Rodzina, TypOdcinka, ZapytanieWniosek } from '../engine/types';
import { BladWniosku, dataPL, okresPL, wczytajFont, wczytajFontPogrubiony } from './wspolne';

export const KODY_PRACODAWCA = [
  'wniosek_macierzynski_przed_porodem',
  'wniosek_rodzicielski',
  'wniosek_rezygnacja_matki',
  'wniosek_przejecie_macierzynskiego',
  'wniosek_uzupelniajacy',
  'wniosek_ojcowski',
  'wniosek_laczenie_z_praca',
  'wniosek_815',
  'wniosek_na_warunkach_macierzynskiego',
] as const satisfies readonly KodDokumentu[];

export type KodWnioskuDoPracodawcy = (typeof KODY_PRACODAWCA)[number];

export function czyWniosekDoPracodawcy(kod: string): kod is KodWnioskuDoPracodawcy {
  return (KODY_PRACODAWCA as readonly string[]).includes(kod);
}

export interface WniosekDoPracodawcy {
  pdf: Uint8Array;
  /** Treść wniosku w kolejnych akapitach (to samo, co w PDF). */
  tresc: string[];
  doUzupelnienia: string[];
}

/** Miejsce do wpisania ręcznie. */
const LUKA = '………………';

const KP = 'Kodeksu pracy';
const ODPIS_AKTU =
  'Odpis skrócony aktu urodzenia dziecka (albo zagraniczny dokument potwierdzający urodzenie) lub jego kopia.';

// ───────────────────────── Treść ─────────────────────────

interface Pismo {
  adresat: string;
  tytul: string;
  akapity: string[];
  oswiadczenia: string[];
  zalaczniki: string[];
}

class Kontekst {
  readonly braki: string[] = [];
  readonly osoba: Osoba;

  constructor(
    readonly z: ZapytanieWniosek,
    readonly kod: KodWnioskuDoPracodawcy,
  ) {
    const osoba = z.rodzina.osoby.find((o) => o.id === z.osobaId);
    if (!osoba) throw new BladWniosku(`W danych rodziny nie ma osoby "${z.osobaId}".`);
    this.osoba = osoba;
  }

  get rodzina(): Rodzina {
    return this.z.rodzina;
  }

  /** Wartość albo luka z wpisem do `doUzupelnienia`. */
  albo(wartosc: string | undefined, opis: string): string {
    if (wartosc?.trim()) return wartosc.trim();
    if (!this.braki.includes(opis)) this.braki.push(opis);
    return LUKA;
  }

  data(d: string | undefined, opis: string): string {
    return d ? dataPL(d) : this.albo(undefined, opis);
  }

  okres(o: Odcinek | undefined, opis: string): string {
    return o ? okresPL(o.od, o.do) : this.albo(undefined, opis);
  }

  imieINazwisko(d: DaneOsobowe | undefined, opis = 'Imię i nazwisko pracownika'): string {
    return this.albo([d?.imie, d?.nazwisko].filter(Boolean).join(' '), opis);
  }

  /** Odcinek wniosku: wskazany w zapytaniu albo pierwszy odcinek osoby danego typu (spełniający warunek). */
  odcinek(typy: TypOdcinka[], warunek: (o: Odcinek) => boolean = () => true): Odcinek | undefined {
    const { plan, odcinekId, osobaId } = this.z;
    if (odcinekId !== undefined) {
      const o = plan.odcinki.find((x) => x.id === odcinekId);
      if (!o) throw new BladWniosku(`W planie nie ma odcinka "${odcinekId}".`);
      if (o.osobaId !== osobaId) throw new BladWniosku(`Odcinek "${odcinekId}" należy do innej osoby.`);
      if (!typy.includes(o.typ)) throw new BladWniosku(`Odcinek "${odcinekId}" nie pasuje do tego wniosku.`);
      return o;
    }
    return this.odcinkiOsoby(typy).find(warunek);
  }

  odcinkiOsoby(typy: TypOdcinka[], osobaId = this.z.osobaId): Odcinek[] {
    return this.z.plan.odcinki
      .filter((o) => o.osobaId === osobaId && typy.includes(o.typ))
      .sort((a, b) => (a.od < b.od ? -1 : 1));
  }

  get matka(): Osoba | undefined {
    return this.rodzina.osoby.find((o) => o.rola === 'matka');
  }

  get drugiRodzic(): Osoba | undefined {
    const inni = this.rodzina.osoby.filter((o) => o.id !== this.osoba.id);
    return inni.find((o) => o.rola !== 'inny_czlonek_rodziny') ?? inni[0];
  }

  get przyjecie(): boolean {
    return this.rodzina.zdarzenie.typ !== 'porod';
  }

  /**
   * Dane dziecka (dzieci): imię i nazwisko z `Dziecko.dane` i data urodzenia – przy przyjęciu z `Dziecko.dataUrodzenia`,
   * przy porodzie data zdarzenia, a przed porodem luka i przewidywana data porodu [rozp. § 5 ust. 1 pkt 2, § 18 ust. 1 pkt 2].
   */
  dziecko(): string {
    const { zdarzenie } = this.rodzina;
    const nazwa = (d: Dziecko) =>
      this.albo([d.dane?.imie?.trim(), d.dane?.nazwisko?.trim()].filter(Boolean).join(' '), 'Imię i nazwisko dziecka');
    const urodzenie = (d: Dziecko) => {
      if (d.dataUrodzenia) return dataPL(d.dataUrodzenia);
      if (this.przyjecie) return this.albo(undefined, 'Data urodzenia dziecka');
      if (zdarzenie.przewidywana) return this.albo(undefined, 'Data urodzenia dziecka (do wpisania po porodzie)');
      return dataPL(zdarzenie.data);
    };
    const dopisek = this.przyjecie
      ? `, przyjęte na wychowanie ${dataPL(zdarzenie.data)}`
      : zdarzenie.przewidywana
        ? ` (przewidywana data porodu: ${dataPL(zdarzenie.data)})`
        : '';
    const dzieci: Dziecko[] = zdarzenie.dzieci.length ? zdarzenie.dzieci : [{}];
    if (dzieci.length === 1) return `Dziecko: ${nazwa(dzieci[0])}, data urodzenia dziecka: ${urodzenie(dzieci[0])}${dopisek}.`;
    return `Dzieci: ${dzieci.map((d) => `${nazwa(d)}, data urodzenia: ${urodzenie(d)}`).join('; ')}${dopisek}.`;
  }

  /** Załączniki przy przyjęciu dziecka na wychowanie [rozp. § 5 ust. 4, § 14 ust. 4, § 15 ust. 4, § 18 ust. 2]. */
  zalacznikiPrzyjecia(): string[] {
    if (!this.przyjecie) return [];
    const z = [
      this.rodzina.zdarzenie.typ === 'przysposobienie'
        ? 'Kopia wniosku o wszczęcie postępowania w sprawie przysposobienia dziecka (z datą urodzenia dziecka) z poświadczeniem sądu opiekuńczego o dacie wystąpienia do sądu albo zaświadczenie sądu opiekuńczego o dacie wystąpienia o przysposobienie dziecka (z datą urodzenia dziecka).'
        : 'Kopia prawomocnego orzeczenia sądu opiekuńczego o umieszczeniu dziecka w rodzinie zastępczej albo kopia umowy zawartej przez rodzinę zastępczą ze starostą.',
    ];
    if (this.rodzina.zdarzenie.dzieci.some((d) => d.odroczonyObowiazekSzkolny)) {
      z.push('Kopia prawomocnej decyzji o odroczeniu obowiązku szkolnego.');
    }
    return z;
  }

  oswiadczeniePrzyjecia(): string[] {
    if (!this.przyjecie) return [];
    return [`Oświadczam, że data przyjęcia dziecka na wychowanie to ${dataPL(this.rodzina.zdarzenie.data)}.`];
  }
}

/** 0,5 → „1/2 etatu”, 0,25 → „1/4 etatu”, inne → procent etatu. */
function wymiarEtatu(x: number): string {
  for (let mianownik = 2; mianownik <= 8; mianownik++) {
    const licznik = Math.round(x * mianownik);
    if (licznik > 0 && Math.abs(licznik / mianownik - x) < 1e-9) return `${licznik}/${mianownik} etatu`;
  }
  return `${Math.round(x * 100)}% etatu`;
}

function adresatPracodawca(k: Kontekst, odcinek?: Odcinek): string {
  const tytul = k.osoba.tytuly.find((t) => t.id === odcinek?.tytulId) ?? k.osoba.tytuly.find((t) => t.rodzaj === 'umowa_o_prace');
  return k.albo(tytul?.nazwaPlatnika, 'Nazwa pracodawcy');
}

/** Okres macierzyńskiego wykorzystany przed porodem – do oświadczeń przy przejęciu [rozp. § 5 ust. 1 pkt 3]. */
function przedPorodem(k: Kontekst): string {
  const { zdarzenie } = k.rodzina;
  const matka = k.matka;
  const mac = matka ? k.odcinkiOsoby(['macierzynski'], matka.id).find((o) => o.od < zdarzenie.data) : undefined;
  if (!mac) return 'Oświadczam, że przed porodem matka dziecka nie wykorzystała urlopu macierzyńskiego ani zasiłku macierzyńskiego.';
  return `Oświadczam, że przed porodem matka dziecka wykorzystała urlop macierzyński (albo zasiłek macierzyński za ten okres) ${okresPL(mac.od, dodajDni(zdarzenie.data, -1))}.`;
}

const PISMA: Record<KodWnioskuDoPracodawcy, (k: Kontekst) => Pismo> = {
  // KP art. 180 § 2; rozp. § 2
  wniosek_macierzynski_przed_porodem: (k) => {
    const porod = k.rodzina.zdarzenie.data;
    const o = k.odcinek(['macierzynski'], (x) => x.od < porod);
    return {
      adresat: adresatPracodawca(k, o),
      tytul: 'Wniosek o udzielenie części urlopu macierzyńskiego przed przewidywaną datą porodu',
      akapity: [
        `Na podstawie art. 180 § 2 ${KP} wnoszę o udzielenie mi części urlopu macierzyńskiego przed przewidywaną datą porodu od dnia ${k.data(o?.od, 'Data rozpoczęcia urlopu macierzyńskiego')}.`,
        `Przewidywana data porodu: ${dataPL(porod)}.`,
      ],
      oswiadczenia: [],
      zalaczniki: ['Kopia zaświadczenia lekarskiego na zwykłym druku, określającego przewidywaną datę porodu.'],
    };
  },

  // KP art. 180 § 8; rozp. § 3, a przy orzeczeniu o niezdolności do samodzielnej egzystencji – § 4
  wniosek_rezygnacja_matki: (k) => {
    const o = k.odcinek(['macierzynski', 'na_warunkach_macierzynskiego']);
    const orzeczenie = k.osoba.zdrowie?.orzeczenieNiezdolnosciSamodzielnejEgzystencji === true;
    const zalaczniki = [
      'Kopia wniosku ojca dziecka (albo innego członka najbliższej rodziny) o udzielenie pozostałej części urlopu macierzyńskiego albo kopia jego oświadczenia o przerwaniu działalności zarobkowej, żeby opiekować się dzieckiem.',
    ];
    if (orzeczenie) zalaczniki.push('Kopia prawomocnego orzeczenia o niezdolności do samodzielnej egzystencji.');
    return {
      adresat: adresatPracodawca(k, o),
      tytul: 'Wniosek o rezygnację z pozostałej części urlopu macierzyńskiego',
      akapity: [
        `Na podstawie art. 180 § 8 ${KP} rezygnuję z pozostałej części urlopu macierzyńskiego i wracam do pracy od dnia ${k.data(o && dodajDni(o.do, 1), 'Dzień powrotu do pracy')}.`,
        'Pozostałą część urlopu macierzyńskiego wykorzysta ojciec dziecka (albo inny członek najbliższej rodziny).',
        k.dziecko(),
      ],
      oswiadczenia: [],
      zalaczniki,
    };
  },

  // KP art. 180 § 9 i § 14–16; rozp. § 5 (rezygnacja matki), § 6–7 (szpital), § 8 i § 10 (zgon), § 9 i § 11 (porzucenie)
  wniosek_przejecie_macierzynskiego: (k) => {
    const o = k.odcinek(['macierzynski', 'na_warunkach_macierzynskiego']);
    const z = k.matka?.zdrowie;
    const okres = k.okres(o, 'Okres przejmowanego urlopu macierzyńskiego');
    const od = k.data(o?.od, 'Data przejęcia urlopu macierzyńskiego');
    const akapity: string[] = [];
    const oswiadczenia: string[] = [];
    const zalaczniki = [ODPIS_AKTU];
    if (z?.zgon) {
      akapity.push(`Na podstawie art. 180 § 14 ${KP} wnoszę o udzielenie mi części urlopu macierzyńskiego od dnia ${od}.`);
      oswiadczenia.push(`Oświadczam, że matka dziecka zmarła dnia ${dataPL(z.zgon)}.`, przedPorodem(k));
    } else if (z?.porzucenieDziecka) {
      akapity.push(`Na podstawie art. 180 § 15 ${KP} wnoszę o udzielenie mi części urlopu macierzyńskiego od dnia ${od}.`);
      oswiadczenia.push(`Oświadczam, że matka porzuciła dziecko dnia ${dataPL(z.porzucenieDziecka)}.`, przedPorodem(k));
    } else if (o && z?.pobytWSzpitalu?.some((p) => p.od <= o.od && o.od <= p.do)) {
      akapity.push(
        `Na podstawie art. 180 § 16 ${KP} wnoszę o udzielenie mi części urlopu macierzyńskiego od dnia ${od} – od dnia, w którym matka dziecka przerwała urlop macierzyński z powodu pobytu w szpitalu.`,
      );
      oswiadczenia.push(
        przedPorodem(k),
        'Zobowiązuję się poinformować pracodawcę o dacie opuszczenia przez matkę dziecka szpitala (wypisu).',
      );
      zalaczniki.unshift(
        'Oświadczenie matki dziecka, od kiedy przerwała urlop macierzyński na czas pobytu w szpitalu.',
        'Zaświadczenie o terminie przyjęcia matki dziecka do szpitala, wystawione przez szpital.',
      );
    } else {
      akapity.push(
        `Na podstawie art. 180 § 9 ${KP} wnoszę o udzielenie mi pozostałej części urlopu macierzyńskiego ${okres}, w związku z rezygnacją matki dziecka z pozostałej części tego urlopu.`,
      );
      oswiadczenia.push(przedPorodem(k));
      zalaczniki.push(
        'Oświadczenie matki dziecka o zamiarze rezygnacji z pozostałej części urlopu macierzyńskiego (albo z zasiłku macierzyńskiego za ten okres).',
      );
    }
    if (z?.zgon || z?.porzucenieDziecka || akapity[0].includes('§ 16')) akapity.push(`Okres urlopu: ${okres}.`);
    akapity.push(k.dziecko());
    return {
      adresat: adresatPracodawca(k, o),
      tytul: 'Wniosek o udzielenie części urlopu macierzyńskiego',
      akapity,
      oswiadczenia: [...k.oswiadczeniePrzyjecia(), ...oswiadczenia],
      zalaczniki: [...zalaczniki, ...k.zalacznikiPrzyjecia()],
    };
  },

  // KP art. 180² § 4–6; rozp. § 14
  wniosek_uzupelniajacy: (k) => {
    const o = k.odcinek(['uzupelniajacy']);
    const przed = o && dodajDni(o.od, -1);
    const mac =
      k.z.plan.odcinki.find((x) => (x.typ === 'macierzynski' || x.typ === 'na_warunkach_macierzynskiego') && x.do === przed) ??
      k.odcinkiOsoby(['macierzynski', 'na_warunkach_macierzynskiego']).at(-1);
    return {
      adresat: adresatPracodawca(k, o),
      tytul: 'Wniosek o udzielenie uzupełniającego urlopu macierzyńskiego',
      akapity: [
        `Na podstawie art. 180² § 4 ${KP} wnoszę o udzielenie mi uzupełniającego urlopu macierzyńskiego ${k.okres(o, 'Okres uzupełniającego urlopu macierzyńskiego')}.`,
        `Urlop macierzyński kończy się ${k.data(mac?.do, 'Dzień końca urlopu macierzyńskiego')}.`,
        k.dziecko(),
      ],
      oswiadczenia: [
        ...k.oswiadczeniePrzyjecia(),
        'Oświadczam, że drugi rodzic dziecka nie zamierza korzystać z uzupełniającego urlopu macierzyńskiego ani z zasiłku macierzyńskiego za okres tego urlopu.',
      ],
      zalaczniki: [
        'Zaświadczenie ze szpitala, w którym przebywało dziecko: okres pobytu dziecka w szpitalu i tydzień ciąży albo masa urodzeniowa (art. 180² § 5 Kodeksu pracy).',
        ...(k.przyjecie ? ['Oświadczenie o dacie przyjęcia dziecka na wychowanie (w treści wniosku).'] : []),
        ...k.zalacznikiPrzyjecia().slice(0, 1),
      ],
    };
  },

  // KP art. 182¹d § 1; rozp. § 15
  wniosek_rodzicielski: (k) => {
    const o = k.odcinek(['rodzicielski']);
    const drugi = k.drugiRodzic;
    // Części urlopu rodzicielskiego liczą się dla obojga rodziców razem [KP art. 182¹d § 2; ZUS: pytania 35 i 39],
    // więc „dotychczas wykorzystany urlop” obejmuje też części drugiego rodzica rozpoczęte przed tym wnioskiem.
    const wczesniej = o
      ? [
          ...k.odcinkiOsoby(['rodzicielski']).map((x) => ({ ...x, drugiego: false })),
          ...(drugi ? k.odcinkiOsoby(['rodzicielski'], drugi.id).map((x) => ({ ...x, drugiego: true })) : []),
        ]
          .filter((x) => x.od < o.od)
          .sort((a, b) => a.od.localeCompare(b.od))
      : [];
    const nr = o?.czescNr ?? (o ? wczesniej.length + 1 : undefined);
    const drugiegoWOkresie = o && drugi
      ? k.odcinkiOsoby(['rodzicielski'], drugi.id).filter((x) => x.od <= o.do && o.od <= x.do)
      : [];
    if (!drugi) k.albo(undefined, 'Oświadczenie o drugim rodzicu do sprawdzenia – w aplikacji nie ma jego planu urlopu');
    const oswiadczenieDrugi = drugiegoWOkresie.length
      ? `Oświadczam, że drugi rodzic dziecka zamierza korzystać z urlopu rodzicielskiego (albo z zasiłku macierzyńskiego za ten okres) w okresie objętym wnioskiem: ${drugiegoWOkresie.map((x) => okresPL(pozniejsza(x.od, o!.od), wczesniejsza(x.do, o!.do))).join('; ')}.`
      : 'Oświadczam, że drugi rodzic dziecka nie zamierza korzystać z urlopu rodzicielskiego ani z zasiłku macierzyńskiego za okres urlopu rodzicielskiego w okresie objętym wnioskiem.';
    const zalaczniki = k.przyjecie ? k.zalacznikiPrzyjecia() : [ODPIS_AKTU];
    // Wymiar „Za życiem” [KP art. 182¹a § 2; rozp. § 15 ust. 2 pkt 3]
    if (k.rodzina.zdarzenie.dzieci.some((d) => d.zaZyciem)) {
      zalaczniki.push('Kopia zaświadczenia, o którym mowa w art. 4 ust. 3 ustawy z dnia 4 listopada 2016 r. o wsparciu kobiet w ciąży i rodzin „Za życiem”.');
    }
    return {
      adresat: adresatPracodawca(k, o),
      tytul: 'Wniosek o udzielenie urlopu rodzicielskiego',
      akapity: [
        `Na podstawie art. 182¹d § 1 ${KP} wnoszę o udzielenie mi urlopu rodzicielskiego${nr ? ` (część ${nr})` : ''} ${k.okres(o, 'Okres urlopu rodzicielskiego')}.`,
        `Dotychczas wykorzystany urlop rodzicielski: ${wczesniej.length ? wczesniej.map((x) => okresPL(x.od, x.do) + (x.drugiego ? ' (drugi rodzic)' : '')).join('; ') : 'brak'}. Liczba wykorzystanych części: ${wczesniej.length}.`,
        k.dziecko(),
      ],
      oswiadczenia: [...k.oswiadczeniePrzyjecia(), oswiadczenieDrugi],
      zalaczniki,
    };
  },

  // KP art. 182¹e § 2; rozp. § 16
  wniosek_laczenie_z_praca: (k) => {
    const o = k.odcinek(['rodzicielski'], (x) => x.wymiarPracy !== undefined);
    const wymiar = o?.wymiarPracy !== undefined ? wymiarEtatu(o.wymiarPracy) : k.albo(undefined, 'Wymiar czasu pracy w czasie urlopu rodzicielskiego');
    k.albo(undefined, 'Proszę zaznaczyć, czy praca obejmie także część urlopu, o którą urlop się wydłuży, i w jakim wymiarze');
    return {
      adresat: adresatPracodawca(k, o),
      tytul: 'Wniosek o łączenie urlopu rodzicielskiego z pracą',
      akapity: [
        `Na podstawie art. 182¹e § 2 ${KP} wnoszę o umożliwienie mi łączenia korzystania z urlopu rodzicielskiego z wykonywaniem pracy u pracodawcy w wymiarze ${wymiar} ${k.okres(o, 'Okres łączenia urlopu rodzicielskiego z pracą')}.`,
        k.dziecko(),
      ],
      oswiadczenia: [
        `Oświadczam, że [  ] zamierzam łączyć część urlopu rodzicielskiego powstałą w wyniku proporcjonalnego wydłużenia tego urlopu z pracą w wymiarze ${LUKA} etatu / [  ] nie zamierzam łączyć tej części urlopu z pracą.`,
      ],
      zalaczniki: [],
    };
  },

  // KP art. 182³ § 2; rozp. § 17
  wniosek_ojcowski: (k) => {
    const o = k.odcinek(['ojcowski']);
    const wczesniej = o ? k.odcinkiOsoby(['ojcowski']).filter((x) => x.do < o.od) : [];
    const nr = o?.czescNr;
    const zalaczniki = [ODPIS_AKTU];
    if (k.rodzina.zdarzenie.typ === 'przysposobienie') zalaczniki.push('Kopia prawomocnego postanowienia sądu o przysposobieniu dziecka.');
    return {
      adresat: adresatPracodawca(k, o),
      tytul: 'Wniosek o udzielenie urlopu ojcowskiego',
      akapity: [
        `Na podstawie art. 182³ § 2 ${KP} wnoszę o udzielenie mi urlopu ojcowskiego${nr ? ` (część ${nr})` : ''} ${k.okres(o, 'Okres urlopu ojcowskiego')}.`,
        k.dziecko(),
      ],
      oswiadczenia: [
        wczesniej.length
          ? `Oświadczam, że korzystałem z urlopu ojcowskiego ${wczesniej.map((x) => okresPL(x.od, x.do)).join('; ')}.`
          : 'Oświadczam, że nie korzystałem dotychczas z urlopu ojcowskiego na to dziecko.',
      ],
      zalaczniki,
    };
  },

  // KP art. 183 § 1 (rodzina zastępcza niezawodowa), § 1¹ (przysposobienie) i § 6 (wniosek); rozp. § 18
  wniosek_na_warunkach_macierzynskiego: (k) => {
    const { typ } = k.rodzina.zdarzenie;
    if (typ !== 'przysposobienie' && typ !== 'rodzina_zastepcza_niezawodowa') {
      throw new BladWniosku(
        'Urlop na warunkach urlopu macierzyńskiego przysługuje osobie, która przyjmuje dziecko na wychowanie i występuje do sądu o przysposobienie, albo rodzinie zastępczej niezawodowej (KP art. 183 § 1 i § 1¹).',
      );
    }
    const o = k.odcinek(['na_warunkach_macierzynskiego']);
    const przysposobienie = typ === 'przysposobienie';
    const zwiazek = przysposobienie
      ? 'w związku z przyjęciem dziecka na wychowanie i wystąpieniem do sądu opiekuńczego z wnioskiem o wszczęcie postępowania w sprawie przysposobienia dziecka'
      : 'w związku z przyjęciem dziecka na wychowanie jako rodzina zastępcza (niezawodowa)';
    return {
      adresat: adresatPracodawca(k, o),
      tytul: 'Wniosek o udzielenie urlopu na warunkach urlopu macierzyńskiego',
      akapity: [
        `Na podstawie art. 183 § ${przysposobienie ? '1¹' : '1'} i § 6 ${KP} wnoszę o udzielenie mi urlopu na warunkach urlopu macierzyńskiego ${k.okres(o, 'Okres urlopu na warunkach urlopu macierzyńskiego')} ${zwiazek}.`,
        k.dziecko(),
      ],
      oswiadczenia: k.oswiadczeniePrzyjecia(),
      zalaczniki: k.zalacznikiPrzyjecia(),
    };
  },

  // UZ art. 30a ust. 1 (matka) i ust. 2 (osoba przyjmująca dziecko)
  wniosek_815: (k) => {
    const rola = k.osoba.rola;
    if (rola !== 'matka' && rola !== 'przyjmujacy') {
      throw new BladWniosku('Wniosek o zasiłek za pełny wymiar urlopów składa matka dziecka albo osoba, która przyjęła dziecko (UZ art. 30a).');
    }
    const { zdarzenie } = k.rodzina;
    const mac = k.odcinkiOsoby(['macierzynski', 'na_warunkach_macierzynskiego']);
    const rodz = k.odcinkiOsoby(['rodzicielski']);
    const tytul = k.osoba.tytuly.find((t) => t.id === mac[0]?.tytulId) ?? k.osoba.tytuly.find((t) => t.chorobowe !== 'brak');
    // Gdy zasiłek wypłaca ZUS (płatnik do 20 ubezpieczonych), wniosek trafia do ZUS [UZ art. 61].
    const adresat = tytul?.platnikPowyzej20 === false ? 'Zakład Ubezpieczeń Społecznych' : adresatPracodawca(k, mac[0]);
    const przyjecie = rola === 'przyjmujacy' || k.przyjecie;
    const dataZdarzenia = przyjecie
      ? `Data przyjęcia dziecka na wychowanie: ${dataPL(zdarzenie.data)}.`
      : `Data porodu: ${zdarzenie.przewidywana ? k.albo(undefined, 'Data porodu (do wpisania po porodzie)') : dataPL(zdarzenie.data)}.`;
    const okresy = [
      mac.length ? `urlop ${przyjecie ? 'na warunkach urlopu macierzyńskiego' : 'macierzyński'} ${mac.map((o) => okresPL(o.od, o.do)).join('; ')}` : undefined,
      rodz.length ? `urlop rodzicielski ${rodz.map((o) => okresPL(o.od, o.do)).join('; ')}` : undefined,
    ].filter(Boolean);
    return {
      adresat,
      tytul: 'Wniosek o wypłatę zasiłku macierzyńskiego za pełny wymiar urlopu macierzyńskiego i rodzicielskiego',
      akapity: [
        przyjecie
          ? 'Na podstawie art. 30a ust. 2 ustawy z dnia 25 czerwca 1999 r. o świadczeniach pieniężnych z ubezpieczenia społecznego w razie choroby i macierzyństwa wnoszę o wypłacenie mi zasiłku macierzyńskiego za okres odpowiadający okresowi urlopu na warunkach urlopu macierzyńskiego i urlopu rodzicielskiego w pełnym wymiarze, z wyłączeniem części urlopu rodzicielskiego przysługującej drugiemu rodzicowi dziecka (art. 182¹a § 4 Kodeksu pracy).'
          : 'Na podstawie art. 30a ust. 1 ustawy z dnia 25 czerwca 1999 r. o świadczeniach pieniężnych z ubezpieczenia społecznego w razie choroby i macierzyństwa wnoszę o wypłacenie mi zasiłku macierzyńskiego za okres odpowiadający okresowi urlopu macierzyńskiego i urlopu rodzicielskiego w pełnym wymiarze, z wyłączeniem części urlopu rodzicielskiego przysługującej ojcu dziecka (art. 182¹a § 4 Kodeksu pracy).',
        dataZdarzenia,
        `Planowane okresy: ${okresy.length ? okresy.join('; ') : k.albo(undefined, 'Okresy urlopu macierzyńskiego i rodzicielskiego')}.`,
      ],
      oswiadczenia: [],
      zalaczniki: [],
    };
  },
};

export async function wniosekDoPracodawcy(kod: KodDokumentu, zapytanie: ZapytanieWniosek): Promise<WniosekDoPracodawcy> {
  if (!czyWniosekDoPracodawcy(kod)) throw new BladWniosku(`„${kod}” nie jest wnioskiem do pracodawcy.`);
  const k = new Kontekst(zapytanie, kod);
  const pismo = PISMA[kod](k);
  const d = k.osoba.dane;
  const naglowek = {
    miejsce: `${k.albo(d?.adres?.miejscowosc, 'Miejscowość')}, ${dataPL(zapytanie.rodzina.dataAnalizy)}`,
    nadawca: k.imieINazwisko(d),
  };
  k.albo(undefined, 'Podpis pracownika – po wydrukowaniu');

  const bloki: Blok[] = [
    { styl: 'prawo', tekst: naglowek.miejsce },
    { styl: 'zwykly', tekst: naglowek.nadawca },
    { styl: 'maly', tekst: '(imię i nazwisko pracownika)' },
    { styl: 'prawo', tekst: pismo.adresat },
    { styl: 'tytul', tekst: pismo.tytul },
    ...pismo.akapity.map((tekst): Blok => ({ styl: 'zwykly', tekst })),
    ...pismo.oswiadczenia.map((tekst): Blok => ({ styl: 'zwykly', tekst })),
    { styl: 'gruby', tekst: pismo.zalaczniki.length ? 'Załączniki:' : 'Załączniki: brak' },
    ...pismo.zalaczniki.map((tekst, i): Blok => ({ styl: 'punkt', tekst: `${i + 1}. ${tekst}` })),
    { styl: 'podpis', tekst: `${LUKA}${LUKA}` },
    { styl: 'podpisOpis', tekst: '(podpis pracownika)' },
  ];
  const pdf = await narysuj(bloki);
  // Podpis to linia do podpisu, nie treść – w `tresc` opisujemy go słowem.
  const tresc = bloki.filter((b) => b.styl !== 'podpis').map((b) => b.tekst);
  return { pdf, tresc, doUzupelnienia: k.braki };
}

// ───────────────────────── PDF ─────────────────────────

type Styl = 'prawo' | 'zwykly' | 'maly' | 'tytul' | 'gruby' | 'punkt' | 'podpis' | 'podpisOpis';
interface Blok {
  styl: Styl;
  tekst: string;
}

const MARGINES = 56; // ok. 2 cm

function zawijaj(tekst: string, font: PDFFont, rozmiar: number, szerokosc: number): string[] {
  const linie: string[] = [];
  let linia = '';
  for (const slowo of tekst.split(/\s+/)) {
    const proba = linia ? `${linia} ${slowo}` : slowo;
    if (font.widthOfTextAtSize(proba, rozmiar) <= szerokosc || !linia) linia = proba;
    else {
      linie.push(linia);
      linia = slowo;
    }
  }
  if (linia) linie.push(linia);
  return linie;
}

async function narysuj(bloki: Blok[]): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  doc.registerFontkit(fontkit);
  doc.setTitle(bloki.find((b) => b.styl === 'tytul')?.tekst ?? 'Wniosek');
  doc.setLanguage('pl-PL');
  // Pełne fonty: podzbiór budowany przez @pdf-lib/fontkit gubi glify Noto Sans (sprawdzone na podglądzie).
  const zwykly = await doc.embedFont(await wczytajFont(), { subset: false });
  const gruby = await doc.embedFont(await wczytajFontPogrubiony(), { subset: false });
  const strona = doc.addPage(PageSizes.A4);
  const [szer, wys] = PageSizes.A4;
  const szerokosc = szer - 2 * MARGINES;

  // Dobieramy rozmiar pisma tak, żeby wniosek zmieścił się na jednej stronie.
  for (let skala = 1; ; skala -= 0.05) {
    const uklad = rozloz(bloki, { zwykly, gruby }, skala, szerokosc);
    if (uklad.wysokosc <= wys - 2 * MARGINES || skala <= 0.6) {
      let y = wys - MARGINES;
      for (const { linie, font, rozmiar, odstepPrzed, wyrownanie } of uklad.elementy) {
        y -= odstepPrzed;
        for (const linia of linie) {
          y -= rozmiar * 1.3;
          const w = font.widthOfTextAtSize(linia, rozmiar);
          const x = wyrownanie === 'prawo' ? szer - MARGINES - w : wyrownanie === 'srodek' ? (szer - w) / 2 : MARGINES;
          strona.drawText(linia, { x, y, size: rozmiar, font, color: rgb(0, 0, 0) });
        }
      }
      return doc.save();
    }
  }
}

function rozloz(bloki: Blok[], fonty: { zwykly: PDFFont; gruby: PDFFont }, skala: number, szerokosc: number) {
  const elementy = bloki.map((b) => {
    const s = {
      prawo: { font: fonty.zwykly, rozmiar: 11, przed: 0, wyr: 'prawo' },
      zwykly: { font: fonty.zwykly, rozmiar: 11, przed: 8, wyr: 'lewo' },
      maly: { font: fonty.zwykly, rozmiar: 8, przed: 0, wyr: 'lewo' },
      tytul: { font: fonty.gruby, rozmiar: 13, przed: 28, wyr: 'srodek' },
      gruby: { font: fonty.gruby, rozmiar: 11, przed: 14, wyr: 'lewo' },
      punkt: { font: fonty.zwykly, rozmiar: 10, przed: 3, wyr: 'lewo' },
      podpis: { font: fonty.zwykly, rozmiar: 11, przed: 40, wyr: 'prawo' },
      podpisOpis: { font: fonty.zwykly, rozmiar: 8, przed: 0, wyr: 'prawo' },
    }[b.styl];
    const rozmiar = s.rozmiar * skala;
    const linie = s.wyr === 'lewo' ? zawijaj(b.tekst, s.font, rozmiar, szerokosc) : zawijaj(b.tekst, s.font, rozmiar, szerokosc * 0.6);
    return { linie, font: s.font, rozmiar, odstepPrzed: s.przed * skala, wyrownanie: s.wyr };
  });
  const wysokosc = elementy.reduce((h, e) => h + e.odstepPrzed + e.linie.length * e.rozmiar * 1.3, 0);
  return { elementy, wysokosc };
}
