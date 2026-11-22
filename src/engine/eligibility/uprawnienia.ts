/**
 * LISTA UPRAWNIEŃ – TOR A, zadanie A2 (docs/superpowers/plans/2026-11-21-tor-a.md, decyzje D2, D3).
 *
 * Jeden wpis na parę (osoba, świadczenie) (D2). Zestaw świadczeń zależy od roli (D3):
 *  - matka: wszystkie 8,
 *  - ojciec: macierzyński (tylko przejęcie), uzupełniający, rodzicielski, ojcowski,
 *  - przyjmujący: na warunkach macierzyńskiego, uzupełniający, rodzicielski, ojcowski,
 *  - inny członek rodziny: tylko macierzyński (przejęcie w sytuacji szczególnej).
 * Pule przychodzą parametrem (liczy je A1, `ustalPule`).
 */
import { czyWOkresie, dodajDni, dodajLata, koniecPoTygodniach, roznicaDni } from '../daty';
import { doGrosza } from '../pieniadze';
import type { DataISO, Osoba, Parametry, Pule, Rodzina, Swiadczenie, TytulUbezpieczenia, Uprawnienie } from '../types';
import {
  koniecMiesiacaCiazy,
  koniecTytulu,
  poczatekChorobowego,
  poczatekCiazy,
  przedluzenieDoPorodu,
  tytulyOsoby,
  ubezpieczenieWDniu,
  USTANIE_Z_WINY_PRACODAWCY,
  type UbezpieczenieWDniu,
} from './ubezpieczenie';
import { swiadczenieRehabilitacyjne, type Wynik, zasilekChorobowyCiaza, zasilekWWysokosciMacierzynskiego } from './uprawnieniaCiaza';
import {
  alternatywaSwiadczenieRodzicielskie,
  dataSlownie,
  DO_POTWIERDZENIA,
  lat,
  miesiecy,
  proc,
  PRZYKLAD_CZLONKA_RODZINY,
  przysluguje,
  tygodni,
  tygodniach,
  zlote,
} from './uprawnieniaTeksty';

/** Kolejność wpisów = kolejność w typie `Swiadczenie`. */
const KOLEJNOSC: Swiadczenie[] = [
  'zasilek_chorobowy_ciaza',
  'swiadczenie_rehabilitacyjne',
  'zasilek_w_wys_macierzynskiego',
  'macierzynski',
  'na_warunkach_macierzynskiego',
  'uzupelniajacy',
  'rodzicielski',
  'ojcowski',
];

/** D3: świadczenia według roli. */
const SWIADCZENIA_ROLI: Record<Osoba['rola'], Swiadczenie[]> = {
  matka: KOLEJNOSC,
  ojciec: ['macierzynski', 'uzupelniajacy', 'rodzicielski', 'ojcowski'],
  przyjmujacy: ['na_warunkach_macierzynskiego', 'uzupelniajacy', 'rodzicielski', 'ojcowski'],
  inny_czlonek_rodziny: ['macierzynski'],
};

/** Świadczenia, które w ustawie są „zasiłkiem macierzyńskim” (UZ art. 29a ust. 1). */
const RODZINA_MACIERZYNSKIEGO: Swiadczenie[] = ['macierzynski', 'na_warunkach_macierzynskiego', 'uzupelniajacy', 'rodzicielski', 'ojcowski'];

/** Prawo do macierzyńskiego po ustaniu ubezpieczenia (UZ art. 30 ust. 1, ust. 4). */
const KODY_PO_USTANIU = ['USTANIE_Z_PRZYCZYN_PRACODAWCY', 'USTANIE_NARUSZENIE_PRAWA', 'UMOWA_PRZEDLUZONA_DO_PORODU'];

/** Świadczenia wstrzymywane przy zaległości składkowej (UZ art. 2a ust. 1: art. 2 pkt 1, 2, 5). */
const WSTRZYMYWANE_PRZY_ZALEGLOSCI: Swiadczenie[] = ['zasilek_chorobowy_ciaza', 'swiadczenie_rehabilitacyjne', ...RODZINA_MACIERZYNSKIEGO];

interface Kontekst {
  rodzina: Rodzina;
  pule: Pule;
  p: Parametry;
  /** Dzień porodu albo przyjęcia dziecka. */
  z: DataISO;
  porod: boolean;
  /** Prawo matki dziecka (pierwszej osoby z rolą `matka`) do zasiłku macierzyńskiego – od niego zależą prawa ojca. */
  prawoMatki?: Wynik;
  /** Policzone prawa do zasiłku macierzyńskiego po porodzie, według obiektu osoby (W3 liczy na kopiach z częścią tytułów). */
  prawaMatek: Map<Osoba, Wynik>;
  /** Przy przyjęciu dziecka: kto bierze urlop na warunkach macierzyńskiego (pytanie 22). */
  glownyPrzyjmujacy?: string;
}

const nie = (kod: string, powod: string, przepis: string, extra: Partial<Wynik> = {}): Wynik => ({
  kod,
  przysluguje: false,
  powod,
  przepis,
  ...extra,
});

// ───────────────────────── Ubezpieczenie w okresie ─────────────────────────

/**
 * Pierwszy dzień w [od, do] z ubezpieczeniem chorobowym (urlop ojcowski, rodzicielski i przejęty macierzyński
 * bierze się w czasie ubezpieczenia). Kandydaci: `od`, początki chorobowego z tytułów i dzień po końcu urlopu
 * wychowawczego (W7).
 */
function ubezpieczenieWOkresie(osoba: Osoba, od: DataISO, do_: DataISO | undefined, k: Kontekst): { dzien: DataISO; u: UbezpieczenieWDniu } | undefined {
  const poWychowawczym = osoba.urlopWychowawczy ? [dodajDni(osoba.urlopWychowawczy.do, 1)] : [];
  const pozniejsze = [...tytulyOsoby(osoba).map(poczatekChorobowego), ...poWychowawczym].filter((d) => d > od && (do_ === undefined || d <= do_));
  for (const dzien of [od, ...pozniejsze.sort()]) {
    const u = ubezpieczenieWDniu(osoba, dzien, k.p, k.rodzina);
    if (u.ubezpieczona) return { dzien, u };
  }
  return undefined;
}

/** D5: ostatni dzień puli urlopu macierzyńskiego liczonej od dnia porodu (przyjęcia) – granica przejęcia. */
function koniecPuliMacierzynskiego(k: Kontekst): DataISO {
  return k.pule.macierzynskiOstatniDzien ?? koniecPoTygodniach(k.z, k.pule.macierzynskiTyg);
}

/** Prawo z dnia porodu/przyjęcia: ubezpieczenie chorobowe albo urlop wychowawczy (UZ art. 29 ust. 1). */
function prawoWDniu(u: UbezpieczenieWDniu): boolean {
  return u.ubezpieczona || u.kod === 'POROD_W_TRAKCIE_WYCHOWAWCZEGO';
}

/** D1: koniec umowy najwyżej tydzień od granicy 3. miesiąca ciąży – wynik zależy od sposobu liczenia (pytanie 13). */
function blisko3Miesiaca(doDnia: DataISO, k: Kontekst): boolean {
  return Math.abs(roznicaDni(koniecMiesiacaCiazy(k.rodzina, k.p), doDnia)) <= 7;
}

function brakUbezpieczeniaWOkresie(osoba: Osoba, przepis: string, meski: boolean): Wynik {
  if (tytulyOsoby(osoba).every((t) => t.chorobowe === 'brak')) {
    return nie(
      'BRAK_CHOROBOWEGO',
      'Bez ubezpieczenia chorobowego ten zasiłek nie przysługuje. Do dobrowolnego ubezpieczenia ' +
        'chorobowego można przystąpić tylko na przyszłość, nie wstecz.',
      przepis,
    );
  }
  return nie(
    'BRAK_UBEZP_W_OKRESIE_URLOPU',
    'W czasie, w którym można wziąć ten urlop, nie będzie ubezpieczenia chorobowego.',
    przepis,
  );
}

// ───────────────────────── Matka: prawo do zasiłku macierzyńskiego ─────────────────────────

/** Prawo matki do zasiłku macierzyńskiego po porodzie, liczone raz na osobę. */
function prawoMatki(matka: Osoba, k: Kontekst): Wynik {
  let w = k.prawaMatek.get(matka);
  if (!w) {
    w = prawoMatkiDoMacierzynskiego(matka, k);
    k.prawaMatek.set(matka, w);
  }
  return w;
}

/** Prawo matki do zasiłku macierzyńskiego po porodzie (UZ art. 29 ust. 1 pkt 1, art. 30). */
function prawoMatkiDoMacierzynskiego(matka: Osoba, k: Kontekst): Wynik {
  const { rodzina, p, z } = k;
  const u = ubezpieczenieWDniu(matka, z, p, rodzina);
  const t = tytulyOsoby(matka);

  // UZ art. 29 ust. 1 pkt 1 – poród w okresie ubezpieczenia chorobowego.
  if (u.kod === 'UBEZP_W_DNIU_PORODU') {
    return {
      kod: u.kod,
      przysluguje: true,
      powod: `W dniu porodu mama będzie objęta ubezpieczeniem chorobowym${opisTytulu(matka, u.tytulId)}.`,
      przepis: 'UZ art. 29 ust. 1',
      tytulId: u.tytulId,
    };
  }
  // KP art. 177 § 3; UZ art. 30 ust. 4 – umowa na czas określony przedłużona do dnia porodu.
  if (u.kod === 'UMOWA_PRZEDLUZONA_DO_PORODU') {
    const umowa = t.find((x) => x.id === u.tytulId)!;
    // NIEJASNE (pytanie 13): koniec umowy blisko granicy 3. miesiąca.
    const uwaga = blisko3Miesiaca(umowa.do!, k) ? ` Umowa kończy się blisko tej granicy. ${DO_POTWIERDZENIA}` : '';
    return {
      kod: u.kod,
      przysluguje: true,
      powod:
        `Umowa kończyłaby się po ${p.limity.przedluzenieUmowyPoMiesiacuCiazy}. miesiącu ciąży, więc przedłuża się do dnia porodu. ` +
        'Po porodzie zasiłek macierzyński będzie przysługiwał, choć umowa już się skończy.' +
        uwaga,
      przepis: 'KP art. 177 § 3; UZ art. 30 ust. 4',
      tytulId: u.tytulId,
    };
  }
  // UZ art. 29 ust. 1 – poród w okresie urlopu wychowawczego.
  if (u.kod === 'POROD_W_TRAKCIE_WYCHOWAWCZEGO') {
    return {
      kod: u.kod,
      przysluguje: true,
      powod: 'Poród przypada w czasie urlopu wychowawczego, więc zasiłek macierzyński przysługuje.',
      przepis: 'UZ art. 29 ust. 1',
      tytulId: u.tytulId,
    };
  }

  // UZ art. 30 ust. 1 – ubezpieczenie ustało w ciąży z przyczyn po stronie pracodawcy albo z naruszeniem prawa.
  const start = poczatekCiazy(rodzina, p);
  // Umowa o pracę ma pierwszeństwo przed innymi tytułami (wynik nie zależy od kolejności tytułów).
  const poUstaniu = [...t].sort((a, b) => Number(b.rodzaj === 'umowa_o_prace') - Number(a.rodzaj === 'umowa_o_prace'));
  for (const tytul of poUstaniu) {
    const ust = tytul.ustanie;
    // Brak przyczyny ustania (np. dane z eZUS) = nie wiadomo, więc ten przepis nie daje prawa.
    if (!ust?.przyczyna || tytul.chorobowe === 'brak' || ust.data < start || ust.data >= z) continue;
    const zPracodawcy = USTANIE_Z_WINY_PRACODAWCY.includes(ust.przyczyna);
    if (!zPracodawcy && ust.przyczyna !== 'naruszenie_prawa_wyrok') continue;
    const kod = zPracodawcy ? 'USTANIE_Z_PRZYCZYN_PRACODAWCY' : 'USTANIE_NARUSZENIE_PRAWA';
    const przepis = zPracodawcy ? 'UZ art. 30 ust. 1 pkt 1' : 'UZ art. 30 ust. 1 pkt 2';
    const przyczyna = zPracodawcy
      ? 'Ubezpieczenie skończyło się w ciąży z powodu likwidacji, upadłości albo śmierci pracodawcy'
      : `Sąd prawomocnie stwierdził, że ${tytul.rodzaj === 'umowa_o_prace' ? 'umowę o pracę' : 'umowę'} rozwiązano w ciąży ` +
        'z naruszeniem przepisów';
    if (tytul.rodzaj === 'umowa_o_prace') {
      return { kod, przysluguje: true, powod: `${przyczyna}, więc zasiłek macierzyński przysługuje.`, przepis, tytulId: tytul.id };
    }
    // NIEJASNE (pytanie nr 40): czy UZ art. 30 ust. 1 („pracodawcy”) obejmuje tytuły inne niż umowa o pracę.
    return {
      kod,
      przysluguje: 'warunkowo',
      powod: `${przyczyna}. Ten przepis dotyczy przede wszystkim pracownic i nie wiemy, czy obejmuje taką umowę. ${DO_POTWIERDZENIA}`,
      przepis,
      tytulId: tytul.id,
    };
  }

  const alternatywa = alternatywaSwiadczenieRodzicielskie(p);
  if (u.kod === 'BRAK_TYTULU_UBEZPIECZENIA') {
    return nie(u.kod, 'Według podanych danych nie ma żadnego tytułu ubezpieczenia (umowy, działalności), więc zasiłek macierzyński nie przysługuje.', 'UZ art. 29 ust. 1', { alternatywa });
  }
  if (u.kod === 'BRAK_CHOROBOWEGO') {
    return nie(
      u.kod,
      'Bez ubezpieczenia chorobowego zasiłek macierzyński nie przysługuje. Do dobrowolnego ubezpieczenia ' +
        'chorobowego można przystąpić tylko na przyszłość, nie wstecz.',
      'UZ art. 29 ust. 1',
      { alternatywa },
    );
  }
  // KP art. 177 § 3¹ – umowa na zastępstwo nie przedłuża się do porodu.
  const zastepstwo = t.find((x) => przedluzenieDoPorodu(x, rodzina, p) === 'zastepstwo');
  if (zastepstwo) {
    return nie(
      u.kod,
      'Umowa na zastępstwo kończy się przed porodem. Taka umowa nie przedłuża się do dnia porodu, ' +
        'więc w dniu porodu nie będzie ubezpieczenia chorobowego.',
      'KP art. 177 § 3¹; UZ art. 29 ust. 1',
      { alternatywa, tytulId: zastepstwo.id },
    );
  }
  // KP art. 177 § 3 – umowa kończy się przed końcem 3. miesiąca ciąży. NIEJASNE (pytanie 13): granica według D8.
  const krotka = t.find((x) => przedluzenieDoPorodu(x, rodzina, p) === 'przed_koncem_miesiaca' && x.do! >= start);
  if (krotka) {
    // NIEJASNE (pytanie 13): koniec umowy blisko granicy 3. miesiąca.
    const uwaga = blisko3Miesiaca(krotka.do!, k) ? ` Umowa kończy się blisko tej granicy. ${DO_POTWIERDZENIA}` : '';
    return nie(
      u.kod,
      `Umowa kończy się przed końcem ${p.limity.przedluzenieUmowyPoMiesiacuCiazy}. miesiąca ciąży ` +
        `(liczymy, że to ${dataSlownie(koniecMiesiacaCiazy(rodzina, p))}). ` +
        'Dlatego nie przedłuży się do dnia porodu i w dniu porodu nie będzie ubezpieczenia chorobowego.' +
        uwaga,
      'KP art. 177 § 3; UZ art. 29 ust. 1',
      { alternatywa, tytulId: krotka.id },
    );
  }
  return nie(
    u.kod,
    'W dniu porodu nie będzie ubezpieczenia chorobowego, bo umowa albo działalność skończy się wcześniej. ' +
      'Do zasiłku macierzyńskiego potrzebne jest ubezpieczenie chorobowe w dniu porodu.',
    'UZ art. 29 ust. 1',
    { alternatywa },
  );
}

function opisTytulu(osoba: Osoba, tytulId?: string): string {
  const t = tytulyOsoby(osoba).find((x) => x.id === tytulId);
  if (!t) return '';
  const nazwy: Record<string, string> = {
    umowa_o_prace: ' z umowy o pracę',
    zlecenie: ' z umowy zlecenia',
    dzialalnosc: ' z działalności gospodarczej',
    wspolpraca: ' jako osoba współpracująca',
  };
  return nazwy[t.rodzaj] ?? '';
}

function matkaRodziny(rodzina: Rodzina): Osoba | undefined {
  return rodzina.osoby.find((o) => o.rola === 'matka');
}

// ───────────────────────── Przyjęcie dziecka ─────────────────────────

/** KP art. 183 § 1, § 1¹; UZ art. 29 ust. 1 pkt 2–3 – rodzina zastępcza zawodowa i wiek dziecka. */
function warunekPrzyjecia(k: Kontekst): Wynik | undefined {
  const { rodzina, p, z } = k;
  const typ = rodzina.zdarzenie.typ;
  if (typ === 'porod') return undefined;
  if (typ === 'rodzina_zastepcza_zawodowa') {
    return nie(
      'RODZINA_ZAWODOWA_BEZ_PRAWA',
      'Zawodowa rodzina zastępcza nie ma prawa do urlopu na warunkach urlopu macierzyńskiego ani do zasiłku macierzyńskiego.',
      'KP art. 183 § 1; UZ art. 29 ust. 1 pkt 3',
    );
  }
  const przepis = typ === 'przysposobienie' ? 'KP art. 183 § 1¹; UZ art. 29 ust. 1 pkt 2' : 'KP art. 183 § 1; UZ art. 29 ust. 1 pkt 3';
  const limitDla = (odroczony?: boolean) =>
    typ === 'przysposobienie'
      ? p.limity.wiekPrzysposobienieLat
      : odroczony
        ? p.limity.wiekRodzinaZastepczaOdroczenieLat
        : p.limity.wiekRodzinaZastepczaLat;
  const dzieci = rodzina.zdarzenie.dzieci ?? [];
  // W1: wystarczy, że jedno z przyjętych dzieci mieści się w limicie wieku.
  // „Dziecko w wieku do N roku życia” – przed N. urodzinami.
  const wLimicie = dzieci.some((d) => d.dataUrodzenia !== undefined && z < dodajLata(d.dataUrodzenia, limitDla(d.odroczonyObowiazekSzkolny)));
  if (wLimicie) return undefined;
  if (dzieci.length === 0 || dzieci.some((d) => d.dataUrodzenia === undefined)) {
    return {
      kod: 'BRAK_DATY_URODZENIA_DZIECKA',
      przysluguje: 'warunkowo',
      powod: 'Proszę podać datę urodzenia dziecka. Prawo do zasiłku zależy od wieku dziecka w dniu przyjęcia.',
      przepis,
    };
  }
  const limit = Math.min(...dzieci.map((d) => limitDla(d.odroczonyObowiazekSzkolny)));
  return nie(
    'DZIECKO_ZA_STARE',
    `W dniu przyjęcia dziecko ma co najmniej ${lat(limit)}, a zasiłek przysługuje przy przyjęciu młodszego dziecka.`,
    przepis,
  );
}

/**
 * Urlop na warunkach urlopu macierzyńskiego bierze jedna osoba (jak macierzyński) – odpowiedź ZUS na stoisku 21.11,
 * pytanie nr 22. Przyjmujemy pierwszą osobę ubezpieczoną w dniu przyjęcia.
 */
function glownyPrzyjmujacy(k: Kontekst): string | undefined {
  return k.rodzina.osoby.find(
    (o) => o.rola !== 'inny_czlonek_rodziny' && prawoWDniu(ubezpieczenieWDniu(o, k.z, k.p, k.rodzina)),
  )?.id;
}

function naWarunkachMacierzynskiego(osoba: Osoba, k: Kontekst): Wynik {
  if (k.porod) {
    return nie(
      'NA_WARUNKACH_TYLKO_PRZY_PRZYJECIU',
      'Urlop na warunkach urlopu macierzyńskiego jest dla rodziców, którzy przyjmują dziecko na wychowanie. Po porodzie przysługuje urlop macierzyński.',
      'KP art. 183 § 1, § 1¹',
    );
  }
  const przepis =
    k.rodzina.zdarzenie.typ === 'przysposobienie' ? 'KP art. 183 § 1¹; UZ art. 29 ust. 1 pkt 2, ust. 2' : 'KP art. 183 § 1; UZ art. 29 ust. 1 pkt 3, ust. 2';
  const u = ubezpieczenieWDniu(osoba, k.z, k.p, k.rodzina);
  if (!prawoWDniu(u)) {
    return nie(
      u.kod === 'BRAK_UBEZP_W_DNIU_PORODU' ? 'BRAK_UBEZP_W_DNIU_PRZYJECIA' : u.kod,
      'W dniu przyjęcia dziecka nie trwa ani ubezpieczenie chorobowe, ani urlop wychowawczy, więc ten zasiłek nie przysługuje.',
      przepis,
      { alternatywa: alternatywaSwiadczenieRodzicielskie(k.p) },
    );
  }
  if (osoba.id !== k.glownyPrzyjmujacy) {
    // Odpowiedź ZUS na stoisku 21.11, pytanie nr 22: na warunkach urlopu macierzyńskiego jest jedna osoba;
    // oboje jednocześnie mogą być tylko na urlopie rodzicielskim. Druga osoba może najwyżej przejąć część urlopu.
    return {
      kod: 'NA_WARUNKACH_TYLKO_PRZEJECIE',
      przysluguje: 'warunkowo',
      powod:
        'Ten urlop bierze jedna osoba. Druga może przejąć jego część, jeśli pierwsza z niej zrezygnuje. ' +
        'W tym samym czasie oboje rodzice mogą być tylko na urlopie rodzicielskim.',
      przepis: `${przepis}, ust. 4`,
      tytulId: u.tytulId,
    };
  }
  return {
    kod: u.kod === 'UBEZP_W_DNIU_PORODU' ? 'UBEZP_W_DNIU_PRZYJECIA' : 'PRZYJECIE_W_TRAKCIE_WYCHOWAWCZEGO',
    przysluguje: true,
    powod:
      u.kod === 'UBEZP_W_DNIU_PORODU'
        ? 'W dniu przyjęcia dziecka trwa ubezpieczenie chorobowe, więc przysługują urlop i zasiłek na warunkach urlopu macierzyńskiego.'
        : 'Przyjęcie dziecka przypada w czasie urlopu wychowawczego, więc przysługuje zasiłek na warunkach urlopu macierzyńskiego.',
    przepis,
    tytulId: u.tytulId,
  };
}

// ───────────────────────── Świadczenia po porodzie / przyjęciu ─────────────────────────

function macierzynski(osoba: Osoba, k: Kontekst): Wynik {
  if (!k.porod) {
    if (osoba.rola === 'inny_czlonek_rodziny') return przejecieSytuacjaSzczegolna(osoba, k);
    return nie(
      'PRZYJECIE_ZAMIAST_MACIERZYNSKIEGO',
      'Przy przyjęciu dziecka zamiast urlopu macierzyńskiego przysługuje urlop na warunkach urlopu macierzyńskiego.',
      'KP art. 183 § 1, § 1¹',
    );
  }
  if (osoba.rola === 'matka') return prawoMatki(osoba, k);
  if (osoba.rola === 'inny_czlonek_rodziny') return przejecieSytuacjaSzczegolna(osoba, k);

  // Ojciec (i inna rola rodzica): urlop macierzyński tylko przez przejęcie, w granicach puli (D5).
  const ubezp = ubezpieczenieWOkresie(osoba, k.z, koniecPuliMacierzynskiego(k), k);
  if (!ubezp) return brakUbezpieczeniaWOkresie(osoba, 'UZ art. 29 ust. 3', true);
  const matka = matkaRodziny(k.rodzina);
  if (matka && k.prawoMatki?.przysluguje === false) {
    // UZ art. 29 ust. 9 pkt 1–2; KP art. 180 § 15 – zgon albo porzucenie dziecka przez nieubezpieczoną matkę.
    const zd = matka.zdrowie;
    if (zd?.zgon || zd?.porzucenieDziecka) {
      return {
        kod: 'MAC_MATKA_NIEUBEZPIECZONA_ZDARZENIE',
        przysluguje: true,
        // KP art. 180 § 15 pkt 1–2: część urlopu „przypadająca po dniu” zgonu albo porzucenia dziecka.
        powod: zd.zgon
          ? 'Mama nie miała ubezpieczenia chorobowego. Po jej śmierci zasiłek macierzyński może przysługiwać tacie – za czas po dniu jej śmierci.'
          : 'Mama nie jest ubezpieczona i porzuciła dziecko, więc zasiłek macierzyński może przysługiwać tacie – za czas po dniu porzucenia.',
        przepis: 'UZ art. 29 ust. 9; KP art. 180 § 15',
        tytulId: ubezp.u.tytulId,
      };
    }
    // UZ art. 29 ust. 9 pkt 3 – samo orzeczenie nie wystarcza: liczy się niemożność sprawowania opieki (D6).
    if (zd?.orzeczenieNiezdolnosciSamodzielnejEgzystencji) {
      return {
        kod: 'MAC_MATKA_NIEUBEZPIECZONA_ORZECZENIE',
        przysluguje: 'warunkowo',
        powod:
          'Mama nie jest ubezpieczona i ma orzeczenie o niezdolności do samodzielnej egzystencji. Jeśli nie może osobiście ' +
          'opiekować się dzieckiem, zasiłek macierzyński może przysługiwać tacie.',
        przepis: 'UZ art. 29 ust. 9 pkt 3; KP art. 180 § 15',
        tytulId: ubezp.u.tytulId,
      };
    }
    // UZ art. 29 ust. 10 dotyczy matki „nieposiadającej tytułu” do ubezpieczenia (W5).
    if (tytulyOsoby(matka).some((t) => czyWOkresie(k.z, t.od, koniecTytulu(t)))) {
      return nie(
        'MAC_MATKA_BEZ_PRAWA_DO_ZASILKU',
        'Mama nie ma prawa do zasiłku macierzyńskiego, więc nie ma czego przejąć. Zasiłek przysługiwałby tacie, ' +
          'gdyby mama nie mogła opiekować się dzieckiem, np. w razie jej zgonu albo porzucenia dziecka.',
        'UZ art. 29 ust. 3, 9–10',
        { tytulId: ubezp.u.tytulId },
      );
    }
    // UZ art. 29 ust. 10; KP art. 180 § 17 – matka bez tytułu podejmuje pracę na co najmniej pół etatu.
    return {
      kod: 'MAC_GDY_MATKA_PODEJMIE_PRACE',
      przysluguje: 'warunkowo',
      powod:
        'Mama nie jest ubezpieczona. Jeśli podejmie pracę na co najmniej pół etatu, tacie może przysługiwać zasiłek macierzyński ' +
        'za czas jej zatrudnienia, do końca wymiaru urlopu macierzyńskiego.',
      przepis: 'UZ art. 29 ust. 10; KP art. 180 § 17',
      tytulId: ubezp.u.tytulId,
    };
  }
  // KP art. 180 § 4–5; UZ art. 29 ust. 3 – przejęcie po rezygnacji matki (sytuacje szczególne: § 6–13).
  return {
    kod: 'MAC_TYLKO_PRZEJECIE',
    przysluguje: 'warunkowo',
    powod:
      `Urlop macierzyński jest przede wszystkim dla mamy. Tata może przejąć jego część, jeśli mama zrezygnuje z niego po ${tygodniach(k.pule.obowiazkoweMatkiTyg)}. ` +
      'Może go też przejąć w sytuacji szczególnej, np. gdy mama jest w szpitalu.',
    przepis: 'KP art. 180 § 4–5; UZ art. 29 ust. 3',
    tytulId: ubezp.u.tytulId,
  };
}

/** Inny członek najbliższej rodziny – przejęcie w sytuacji szczególnej (KP art. 180 § 6–13, 15; UZ art. 29 ust. 5–7, 9). */
function przejecieSytuacjaSzczegolna(osoba: Osoba, k: Kontekst): Wynik {
  const ubezp = ubezpieczenieWOkresie(osoba, k.z, koniecPuliMacierzynskiego(k), k);
  if (!ubezp) return brakUbezpieczeniaWOkresie(osoba, 'UZ art. 29 ust. 5–7', false);
  // NIEJASNE (pytanie 21): kto jest „członkiem najbliższej rodziny” (UZ art. 29 ust. 5). Odpowiedź ZUS na stoisku 21.11,
  // pytanie nr 21: bez pewności, w praktyce głównie dziadkowie albo rodzeństwo mamy – dopisek zostaje.
  return {
    kod: 'PRZEJECIE_SYTUACJA_SZCZEGOLNA',
    przysluguje: 'warunkowo',
    powod:
      'Część urlopu macierzyńskiego można przejąć, jeśli mama nie może opiekować się dzieckiem (np. jest w szpitalu ' +
      `albo ma orzeczenie o niezdolności do samodzielnej egzystencji). Przejąć go może członek najbliższej rodziny (${PRZYKLAD_CZLONKA_RODZINY}). ` +
      'Kto dokładnie się do niej zalicza, nie wiemy jeszcze na pewno. ' +
      DO_POTWIERDZENIA,
    przepis: 'KP art. 180 § 6–13, § 15; UZ art. 29 ust. 5–7, 9',
    tytulId: ubezp.u.tytulId,
  };
}

/** Czy osoba „bierze” prawo z urlopu macierzyńskiego / na warunkach macierzyńskiego (matka po porodzie, główny przyjmujący). */
function prawoGlowne(osoba: Osoba, k: Kontekst): Wynik | undefined {
  if (k.porod) return osoba.rola === 'matka' ? prawoMatki(osoba, k) : undefined;
  return osoba.id === k.glownyPrzyjmujacy ? naWarunkachMacierzynskiego(osoba, k) : undefined;
}

function uzupelniajacy(osoba: Osoba, k: Kontekst): Wynik {
  const przepis = k.porod ? 'KP art. 180² § 1' : 'KP art. 183 § 3¹, art. 180² § 1';
  const glowne = prawoGlowne(osoba, k);
  if (glowne && glowne.przysluguje === false) return glowne;
  const ubezp = glowne ? undefined : ubezpieczenieWOkresie(osoba, k.z, undefined, k);
  if (!glowne && !ubezp) return brakUbezpieczeniaWOkresie(osoba, przepis, osoba.rola === 'ojciec');
  if (k.pule.uzupelniajacyTyg <= 0) {
    return nie(
      'UZUP_BRAK_PRZESLANEK',
      'Ten urlop jest dla rodziców wcześniaków i dzieci, które po porodzie zostały w szpitalu.',
      przepis,
    );
  }
  if (glowne) {
    return {
      kod: 'UZUP_POBYT_DZIECKA_W_SZPITALU',
      przysluguje: glowne.przysluguje,
      powod: `Dziecko było w szpitalu, więc po urlopie macierzyńskim można wziąć ${tygodni(k.pule.uzupelniajacyTyg)} uzupełniającego urlopu macierzyńskiego.`,
      przepis,
      tytulId: glowne.tytulId,
    };
  }
  // KP art. 180² § 1 – bezpośrednio po wykorzystaniu urlopu macierzyńskiego; tylko jedno z rodziców.
  return {
    kod: 'UZUP_PO_PRZEJECIU_MACIERZYNSKIEGO',
    przysluguje: 'warunkowo',
    powod: 'Uzupełniający urlop macierzyński bierze się zaraz po urlopie macierzyńskim. Można go wziąć po przejęciu końcówki urlopu macierzyńskiego.',
    przepis,
    tytulId: ubezp!.u.tytulId,
  };
}

function rodzicielski(osoba: Osoba, k: Kontekst): Wynik {
  const przepis = k.porod ? 'KP art. 182¹a § 1–4; UZ art. 29a ust. 1, 3' : 'KP art. 183 § 4–4²; UZ art. 29a ust. 1, 3';
  const glowne = prawoGlowne(osoba, k);
  if (glowne && glowne.przysluguje === false) return glowne;
  const ubezp = glowne ? undefined : ubezpieczenieWOkresie(osoba, k.z, k.pule.rodzicielskiDoKiedy, k);
  if (!glowne && !ubezp) return brakUbezpieczeniaWOkresie(osoba, przepis, osoba.rola === 'ojciec');
  if (k.pule.rodzicielskiTyg <= 0) {
    // Odpowiedź ZUS na stoisku 21.11, pytanie nr 8: po martwym urodzeniu urlop rodzicielski nie przysługuje.
    return nie('RODZ_BRAK_WYMIARU', 'W tej sytuacji urlop rodzicielski nie przysługuje.', 'KP art. 180¹ § 1, art. 182¹a');
  }
  if (glowne) {
    // NIEJASNE (pytanie nr 40): zasiłek za okres rodzicielskiego, gdy prawo do macierzyńskiego wynika z UZ art. 30
    // (po ustaniu ubezpieczenia) – urlopu rodzicielskiego udziela pracodawca, a umowy już nie ma.
    const poUstaniu = KODY_PO_USTANIU.includes(glowne.kod)
      ? ` Ubezpieczenie skończyło się przed porodem. Nie wiemy na pewno, czy zasiłek obejmie też okres urlopu rodzicielskiego. ${DO_POTWIERDZENIA}`
      : '';
    return {
      kod: 'RODZ_PO_MACIERZYNSKIM',
      przysluguje: glowne.przysluguje,
      powod:
        `Po urlopie ${k.porod ? 'macierzyńskim' : 'na warunkach urlopu macierzyńskiego'} można wziąć urlop rodzicielski. ` +
        `${tygodni(k.pule.rodzicielskiNieprzenoszalneTyg)} z tej puli ${przysluguje(k.pule.rodzicielskiNieprzenoszalneTyg)} tylko drugiemu rodzicowi.` +
        poUstaniu,
      przepis: poUstaniu ? `${przepis}, art. 30` : przepis,
      tytulId: glowne.tytulId,
    };
  }
  const matka = matkaRodziny(k.rodzina);
  if (k.porod && matka && k.prawoMatki?.przysluguje === false) {
    // UZ art. 31 ust. 3h; KP art. 182¹a § 4. Odpowiedź ZUS na stoisku 21.11, pytania nr 6 i 14: tata dostaje zasiłek
    // za pulę bez 9 tygodni mamy (41 − 9 = 32 przy jednym dziecku), bo te tygodnie są tylko dla mamy i nie przechodzą
    // na niego; wariantu 81,5% nie wybiera, bo wniosek o 81,5% składa mama.
    // Wyjątek (zus.pl): zgon albo porzucenie dziecka przez nieubezpieczoną matkę (UZ art. 29 ust. 9) – wtedy tata może
    // wybrać 81,5% (możliwość `wariant_815`), więc zdania o 70% nie dodajemy.
    const mamy = k.pule.rodzicielskiNieprzenoszalneTyg;
    const tyg = k.pule.rodzicielskiTyg - mamy;
    const odeszla = matka.zdrowie?.zgon !== undefined || matka.zdrowie?.porzucenieDziecka !== undefined;
    const stawka = odeszla
      ? ''
      : ` Zasiłek wynosi ${proc(k.p.stawkiProc.rodzicielski)} podstawy – wariantu ${proc(k.p.stawkiProc.wariant815)} nie można tu wybrać, ` +
        'bo wniosek o niego składa ubezpieczona mama.';
    return {
      kod: 'MATKA_NIEUBEZPIECZONA',
      przysluguje: true,
      powod:
        'Mama nie jest ubezpieczona, więc zasiłek macierzyński za okres urlopu rodzicielskiego może przysługiwać tacie – ' +
        `za ${tygodni(tyg)}. ${tygodni(mamy)} urlopu rodzicielskiego ${przysluguje(mamy)} tylko mamie ` +
        `i nie ${przysluguje(mamy) === 'przysługują' ? 'przechodzą' : 'przechodzi'} na tatę.` +
        stawka,
      przepis: 'KP art. 182¹a § 4; UZ art. 29a ust. 1, art. 31 ust. 2, 3h',
      tytulId: ubezp!.u.tytulId,
    };
  }
  return {
    kod: 'RODZ_UBEZPIECZONY',
    przysluguje: true,
    powod:
      `Część urlopu rodzicielskiego można wziąć w czasie ubezpieczenia chorobowego. ${tygodni(k.pule.rodzicielskiNieprzenoszalneTyg)} ` +
      `${przysluguje(k.pule.rodzicielskiNieprzenoszalneTyg)} tylko temu rodzicowi – jeśli nie zostaną wykorzystane, przepadną.`,
    przepis,
    tytulId: ubezp!.u.tytulId,
  };
}

function ojcowski(osoba: Osoba, k: Kontekst): Wynik {
  const przepis = 'KP art. 182³ § 1; UZ art. 29a ust. 1, art. 31 ust. 1';
  if (osoba.rola === 'matka') {
    return nie('OJC_TYLKO_DLA_OJCA', 'Urlop ojcowski przysługuje ojcu dziecka.', 'KP art. 182³ § 1');
  }
  if (!k.porod && k.rodzina.zdarzenie.typ !== 'przysposobienie') {
    return nie('OJC_NIE_DLA_RODZINY_ZASTEPCZEJ', 'Urlop ojcowski przysługuje po urodzeniu albo przysposobieniu dziecka, nie w rodzinie zastępczej.', 'KP art. 182³ § 1');
  }
  const ubezp = ubezpieczenieWOkresie(osoba, k.z, k.pule.ojcowskiDoKiedy, k);
  if (!ubezp) return brakUbezpieczeniaWOkresie(osoba, przepis, true);
  if (k.pule.ojcowskiTyg <= 0) {
    // Odpowiedź ZUS na stoisku 21.11, pytanie nr 8: po martwym urodzeniu urlop ojcowski nie przysługuje.
    return nie('OJC_BRAK_WYMIARU', 'W tej sytuacji urlop ojcowski nie przysługuje.', 'KP art. 180¹, art. 182³');
  }
  const doKiedy = k.pule.ojcowskiDoKiedy ? ` Można go wykorzystać do ${dataSlownie(k.pule.ojcowskiDoKiedy)}.` : '';
  if (osoba.rola !== 'ojciec') {
    // Rola nie mówi, czy osoba jest ojcem dziecka (D3) – wynik zależy od tego, kim jest.
    return {
      kod: 'OJC_PRZYJMUJACY_DO_POTWIERDZENIA',
      przysluguje: 'warunkowo',
      powod: `Urlop ojcowski (${tygodni(k.pule.ojcowskiTyg)}) przysługuje, jeśli ta osoba jest ojcem dziecka.${doKiedy} ${DO_POTWIERDZENIA}`,
      przepis,
      tytulId: ubezp.u.tytulId,
    };
  }
  const odPorodu = ubezp.dzien === k.z;
  return {
    kod: odPorodu ? 'UBEZP_W_DNIU_PORODU' : 'UBEZP_PO_PORODZIE',
    przysluguje: true,
    powod: odPorodu
      ? `Tata ma ubezpieczenie chorobowe, więc ${przysluguje(k.pule.ojcowskiTyg)} mu ${tygodni(k.pule.ojcowskiTyg)} urlopu ojcowskiego.${doKiedy}`
      : `Ubezpieczenie chorobowe taty zaczyna się ${dataSlownie(ubezp.dzien)}, przed końcem terminu na urlop ojcowski. ` +
        `Od tego dnia można wziąć ${tygodni(k.pule.ojcowskiTyg)} urlopu.${doKiedy}`,
    przepis,
    tytulId: ubezp.u.tytulId,
  };
}

function swiadczenieWCiazy(sw: Swiadczenie, osoba: Osoba, k: Kontekst): Wynik {
  if (!k.porod) {
    return nie('DOTYCZY_TYLKO_CIAZY', 'To świadczenie dotyczy ciąży, a nie przyjęcia dziecka.', 'UZ art. 11 ust. 2, art. 30 ust. 3');
  }
  if (sw === 'zasilek_chorobowy_ciaza') return zasilekChorobowyCiaza(osoba, k.rodzina, k.p);
  if (sw === 'swiadczenie_rehabilitacyjne') return swiadczenieRehabilitacyjne(osoba, k.p);
  return zasilekWWysokosciMacierzynskiego(osoba, k.rodzina, k.p);
}

function ocen(sw: Swiadczenie, osoba: Osoba, k: Kontekst): Wynik {
  if (tytulyOsoby(osoba).length === 0) {
    return nie(
      'BRAK_TYTULU_UBEZPIECZENIA',
      'Według podanych danych nie ma żadnego tytułu ubezpieczenia (umowy, działalności), więc to świadczenie nie przysługuje.',
      'UZ art. 29 ust. 1',
      osoba.rola === 'matka' && (sw === 'macierzynski' || sw === 'rodzicielski') ? { alternatywa: alternatywaSwiadczenieRodzicielskie(k.p) } : {},
    );
  }
  if (RODZINA_MACIERZYNSKIEGO.includes(sw)) {
    const przyjecie = warunekPrzyjecia(k);
    if (przyjecie) return przyjecie;
  }
  switch (sw) {
    case 'zasilek_chorobowy_ciaza':
    case 'swiadczenie_rehabilitacyjne':
    case 'zasilek_w_wys_macierzynskiego':
      return swiadczenieWCiazy(sw, osoba, k);
    case 'macierzynski':
      return macierzynski(osoba, k);
    case 'na_warunkach_macierzynskiego':
      return naWarunkachMacierzynskiego(osoba, k);
    case 'uzupelniajacy':
      return uzupelniajacy(osoba, k);
    case 'rodzicielski':
      return rodzicielski(osoba, k);
    case 'ojcowski':
      return ojcowski(osoba, k);
  }
}

/** Próg zaległości z UZ art. 2a ust. 1: procent płacy minimalnej. */
function progZaleglosci(p: Parametry): number {
  return doGrosza((p.kwoty.placaMinimalna * p.limity.progZaleglosciProcPlacyMinimalnej) / 100);
}

/** Tytuł z działalności albo współpracy z zaległością powyżej progu (UZ art. 2a ust. 1). */
function wstrzymany(t: TytulUbezpieczenia, p: Parametry): boolean {
  return (t.rodzaj === 'dzialalnosc' || t.rodzaj === 'wspolpraca') && (t.zadluzenieSkladkowe ?? 0) > progZaleglosci(p);
}

/**
 * UZ art. 2a ust. 1–2: przy zaległości składkowej powyżej progu prowadzący działalność i osoby współpracujące
 * nie dostają zasiłku do czasu spłaty całości; prawo przedawnia się, gdy zaległość nie zostanie spłacona w terminie.
 * W3: gdy prawo daje też inny, niewstrzymany tytuł, wynik to „tak” z tego tytułu (niezależnie od kolejności tytułów).
 * D8: zaległość oznacza także wpisy „warunkowo”.
 */
function zZalegloscia(sw: Swiadczenie, osoba: Osoba, w: Wynik, k: Kontekst): Wynik {
  if (w.przysluguje === false || !WSTRZYMYWANE_PRZY_ZALEGLOSCI.includes(sw)) return w;
  const tytuly = tytulyOsoby(osoba);
  const wstrzymane = tytuly.filter((t) => wstrzymany(t, k.p));
  if (wstrzymane.length === 0) return w;
  const zWstrzymanych = ocen(sw, { ...osoba, tytuly: wstrzymane }, k);
  if (zWstrzymanych.przysluguje === false) return w; // zaległość dotyczy tytułu, który i tak nie daje prawa

  const pozostale = tytuly.filter((t) => !wstrzymany(t, k.p));
  const zPozostalych = pozostale.length > 0 ? ocen(sw, { ...osoba, tytuly: pozostale }, k) : undefined;
  if (zPozostalych && zPozostalych.przysluguje !== false) {
    // NIEJASNE (pytanie nr 41): zasiłek z jednego tytułu, gdy z drugiego (działalność) jest wstrzymany przez zaległość.
    return {
      ...zPozostalych,
      powod:
        `${zPozostalych.powod} Jest też zaległość w składkach z działalności, więc zasiłek z działalności może być wstrzymany ` +
        `do czasu jej spłaty. ${DO_POTWIERDZENIA}`,
    };
  }

  const dlug = wstrzymane.reduce((s, t) => s + (t.zadluzenieSkladkowe ?? 0), 0);
  const zasady =
    `Zaległość w składkach (${zlote(dlug)}) jest wyższa niż ${zlote(progZaleglosci(k.p))}. ZUS wypłaci zasiłek po spłacie ` +
    `całej zaległości. Jeśli nie zostanie ona spłacona w ciągu ${miesiecy(k.p.limity.splataZaleglosciMiesiecy)} od dnia, w którym powstało prawo ` +
    'do zasiłku, prawo przepadnie.';
  return {
    ...zWstrzymanych,
    kod: 'WSTRZYMANY_DO_SPLATY_ZALEGLOSCI',
    przysluguje: 'warunkowo',
    powod: zWstrzymanych.przysluguje === 'warunkowo' ? `${zWstrzymanych.powod} ${zasady}` : zasady,
    przepis: 'UZ art. 2a ust. 1–2',
  };
}

export function ustalListeUprawnien(rodzina: Rodzina, pule: Pule, p: Parametry): Uprawnienie[] {
  const k: Kontekst = { rodzina, pule, p, z: rodzina.zdarzenie.data, porod: rodzina.zdarzenie.typ === 'porod', prawaMatek: new Map() };
  const matka = matkaRodziny(rodzina);
  if (k.porod && matka) k.prawoMatki = prawoMatki(matka, k);
  if (!k.porod) k.glownyPrzyjmujacy = glownyPrzyjmujacy(k);

  const wynik: Uprawnienie[] = [];
  for (const osoba of rodzina.osoby) {
    const pierwszyTytul = tytulyOsoby(osoba)[0]?.id;
    for (const sw of SWIADCZENIA_ROLI[osoba.rola] ?? []) {
      const w = zZalegloscia(sw, osoba, ocen(sw, osoba, k), k);
      // D2: tytulId = tytuł dający prawo; gdy żaden – pierwszy tytuł osoby albo brak.
      const tytulId = w.tytulId ?? pierwszyTytul;
      wynik.push({ ...w, osobaId: osoba.id, swiadczenie: sw, ...(tytulId ? { tytulId } : {}) });
    }
  }
  return wynik;
}
