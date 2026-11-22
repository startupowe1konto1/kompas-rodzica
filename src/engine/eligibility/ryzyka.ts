/**
 * RYZYKA – TOR A, zadanie A3 (docs/superpowers/plans/2026-11-21-tor-a.md: D4, D6, D7; ZADANIA.md „A3”, tabela kodów).
 *
 * Łagodna karta: co może się stać, dlaczego, co możesz zrobić, a tam, gdzie ZUS może poprosić o wyjaśnienia –
 * co warto mieć przygotowane. Nie podpowiadamy, jak obejść przepis; pomagamy udokumentować stan faktyczny.
 *
 * Ryzyka terminowe (D6): karta jest, dopóki termin nie minął. Ostatni dzień terminu jeszcze się liczy
 * (KC art. 110–111 – terminy z UZ; dla terminów z KP w zw. z KP art. 300), więc karta znika dopiero dzień po terminie. `pilne`, gdy do terminu
 * zostało nie więcej niż `limity.ryzykoTerminPilneDni` dni.
 *
 * Progi bez przepisu (D7, pytania 26–28): `ryzykoUmowaPrzedCiazaMies`, `ryzykoPodwyzkaProc`,
 * `ostrzezeniePozneZgloszenieDni`. ZUS nie publikuje progów – w `dlaczego` mówimy wprost, że to założenie aplikacji.
 */
import { czyWOkresie, dodajMiesiace, ostatniDzienMiesiaca, pierwszyDzienMiesiaca, pozniejsza, roznicaDni } from '../daty';
import { doGrosza } from '../pieniadze';
import type { DataISO, Osoba, Parametry, Pule, Rodzina, Ryzyko, TytulUbezpieczenia } from '../types';
import {
  dataSlownie,
  dni,
  DO_POTWIERDZENIA,
  kontekst,
  type KontekstA3,
  lat,
  ma,
  miesiecy,
  orzeczenie,
  osobyZ,
  pracownikWDniu,
  proc,
  trwaWDniu,
  tygodni,
  tygodniDop,
  uprawnienie,
  wniosek815PrzedPorodem,
  zlote,
} from './mozliwosciTeksty';
import { koniecTytulu, poczatekChorobowego, poczatekCiazy, tytulyOsoby, ubezpieczenieWDniu } from './ubezpieczenie';
import { alternatywaSwiadczenieRodzicielskie } from './uprawnieniaTeksty';

/**
 * UZ art. 17 ust. 1d–1e (Dz.U. 2026 poz. 26) obowiązują od 1.01.2027 (pytanie 25 – rozstrzygnięte).
 * Data wejścia w życie przepisu, nie parametr wymiaru.
 */
// PARAMETR DO KONTRAKTU
const UZ_ART17_UST1D_OD: DataISO = '2027-01-01';

export function ustalRyzyka(rodzina: Rodzina, pule: Pule, p: Parametry): Ryzyko[] {
  const k = kontekst(rodzina, pule, p);
  // Po zgonie matki albo porzuceniu przez nią dziecka nie pokazujemy jej kart (KP art. 180 § 12–13, § 15).
  const osoby = rodzina.osoby.filter((o) => !(k.matkaOdeszla && o === k.matka));
  const matka = k.porod && !k.matkaOdeszla ? k.matka : undefined;
  const dlaMatki = <T>(f: (k: KontekstA3, o: Osoba) => T[]): T[] => (matka ? f(k, matka) : []);
  return [
    ...dlaMatki(brakUbezpieczeniaWDniuPorodu),
    ...dlaMatki(zlecenieKonczySiePrzedPorodem),
    ...dlaMatki(pozneZgloszenie),
    ...dlaMatki(umowaDlaPozoru),
    ...dlaMatki(podwyzszeniePodstawy),
    ...osoby.flatMap((o) => zadluzenieSkladkowe(k, o)),
    ...osoby.flatMap((o) => pracaNaZwolnieniu(k, o)),
    ...osoby.flatMap((o) => ponowneZgloszenie(k, o)),
    ...termin815(k),
    ...osoby.flatMap((o) => terminOjcowski(k, o)),
    ...osoby.flatMap((o) => rodzicielski9Tygodni(k, o)),
    ...dlaMatki(brakOchronyPrzedZwolnieniem),
  ];
}

// ───────────────────────── Pomocnicze ─────────────────────────

/** D6: termin i flaga „pilne”; undefined, gdy termin minął albo go nie ma. */
function terminowe(k: KontekstA3, termin: DataISO | undefined): { termin: DataISO; pilne: boolean } | undefined {
  if (termin === undefined || k.dzis > termin) return undefined;
  return { termin, pilne: roznicaDni(k.dzis, termin) <= k.p.limity.ryzykoTerminPilneDni };
}

/** Tytuły osoby z ubezpieczeniem chorobowym. */
const zChorobowym = (o: Osoba) => tytulyOsoby(o).filter((t) => t.chorobowe !== 'brak');

/** Pierwszy dzień okna „krótko przed ciążą” (D7, pytanie 26): początek ciąży minus `ryzykoUmowaPrzedCiazaMies`. */
function poczatekOknaPrzedCiaza(k: KontekstA3): DataISO {
  return dodajMiesiace(poczatekCiazy(k.rodzina, k.p), -k.p.limity.ryzykoUmowaPrzedCiazaMies);
}

/** Umowa o pracę albo zlecenie z chorobowym zawarte w ciąży albo krótko przed nią (D7) i przed porodem. */
function nowaUmowa(k: KontekstA3, t: TytulUbezpieczenia): boolean {
  return (
    (t.rodzaj === 'umowa_o_prace' || t.rodzaj === 'zlecenie') &&
    t.chorobowe !== 'brak' &&
    t.od >= poczatekOknaPrzedCiaza(k) &&
    t.od <= k.z
  );
}

const ZALOZENIE = 'to założenie tej aplikacji, nie kryterium ZUS';

/** Podstawa ogólna kart, przy których ZUS może poprosić o wyjaśnienia (D7): ustalenie prawa do zasiłku i decyzja o podleganiu. */
const PRZEPIS_WYJASNIENIA = 'UZ art. 61a ust. 2; ustawa systemowa art. 83 ust. 1';

// ───────────────────────── Ubezpieczenie w dniu porodu ─────────────────────────

/** UZ art. 29 ust. 1, art. 30 – zasiłek macierzyński tylko przy porodzie w czasie ubezpieczenia chorobowego (EC-03, EC-04). */
function brakUbezpieczeniaWDniuPorodu(k: KontekstA3, matka: Osoba): Ryzyko[] {
  const u = ubezpieczenieWDniu(matka, k.z, k.p, k.rodzina);
  // Urlop wychowawczy i ustanie ubezpieczenia z winy pracodawcy dają prawo mimo braku ubezpieczenia (UZ art. 29 ust. 1, art. 30).
  if (u.ubezpieczona || u.kod === 'POROD_W_TRAKCIE_WYCHOWAWCZEGO' || uprawnienie(k, matka.id, 'macierzynski')?.przysluguje !== false) return [];
  const przed = k.rodzina.zdarzenie.przewidywana && k.dzis < k.z;
  return [
    {
      kod: 'BRAK_UBEZP_W_DNIU_PORODU',
      osobaId: matka.id,
      tytul: przed ? 'W dniu porodu nie będzie ubezpieczenia chorobowego' : 'W dniu porodu nie było ubezpieczenia chorobowego',
      coMozeSieStac: przed
        ? 'Bez ubezpieczenia chorobowego w dniu porodu zasiłek macierzyński nie będzie przysługiwał – ani za urlop macierzyński, ani za okres urlopu rodzicielskiego.'
        : 'Bez ubezpieczenia chorobowego w dniu porodu zasiłek macierzyński nie przysługuje – ani za urlop macierzyński, ani za okres urlopu rodzicielskiego.',
      dlaczego:
        'Zasiłek macierzyński przysługuje, gdy poród nastąpi w czasie ubezpieczenia chorobowego. Liczy się dzień porodu, ' +
        'a nie to, jak długo trwało wcześniejsze ubezpieczenie.',
      coZrobic: przed
        ? 'Warto sprawdzić, czy w dniu porodu będzie trwała któraś z umów albo działalność z ubezpieczeniem chorobowym. ' +
          `Jeśli zasiłku nie będzie: ${alternatywaSwiadczenieRodzicielskie(k.p)}`
        : 'Jeśli w dniu porodu trwała któraś z umów albo działalność z ubezpieczeniem chorobowym, proszę uzupełnić jej dane. ' +
          `Jeśli nie: ${alternatywaSwiadczenieRodzicielskie(k.p)}`,
      przepis: 'UZ art. 29 ust. 1, art. 30',
    },
  ];
}

/** UZ art. 29 ust. 1, art. 30 ust. 4; KP art. 177 § 3 – przedłużenie do porodu dotyczy tylko umowy o pracę (mentor, EC-04). */
function zlecenieKonczySiePrzedPorodem(k: KontekstA3, matka: Osoba): Ryzyko[] {
  const ciaza = poczatekCiazy(k.rodzina, k.p);
  const t = zChorobowym(matka).find((t) => {
    const koniec = koniecTytulu(t);
    return t.rodzaj === 'zlecenie' && koniec !== undefined && koniec < k.z && koniec >= ciaza;
  });
  if (!t) return [];
  const koniec = koniecTytulu(t)!;
  const innyTytul = ubezpieczenieWDniu(matka, k.z, k.p, k.rodzina).ubezpieczona;
  const konczy = koniec < k.dzis ? 'skończyła się' : 'kończy się';
  return [
    {
      kod: 'ZLECENIE_KONCZY_SIE_PRZED_PORODEM',
      osobaId: matka.id,
      tytul: 'Umowa zlecenia kończy się przed porodem',
      coMozeSieStac: innyTytul
        ? `Umowa zlecenia ${konczy} ${dataSlownie(koniec)}, przed porodem. Z tej umowy zasiłek macierzyński nie przysługuje – ` +
          'prawo daje tylko ubezpieczenie, które trwa w dniu porodu.'
        : `Umowa zlecenia ${konczy} ${dataSlownie(koniec)}, przed porodem. Jeśli w dniu porodu nie będzie innego ` +
          'ubezpieczenia chorobowego, zasiłek macierzyński nie będzie przysługiwał.',
      dlaczego:
        'Zasiłek macierzyński przysługuje, gdy poród nastąpi w czasie ubezpieczenia chorobowego. Umowa zlecenia, inaczej niż umowa ' +
        'o pracę na czas określony, nie przedłuża się do dnia porodu.',
      coZrobic: 'Jeśli praca ma trwać dalej, warto porozmawiać ze zleceniodawcą o umowie, która obejmie także dzień porodu.',
      przepis: 'UZ art. 29 ust. 1, art. 30 ust. 4; KP art. 177 § 3',
    },
  ];
}

// ───────────────────────── Krótko przed porodem albo ciążą ─────────────────────────

/**
 * Dobrowolne chorobowe zgłoszone mniej niż `ostrzezeniePozneZgloszenieDni` przed porodem (mentor, EC-10, pytanie 28).
 * Podstawa ogólna: UZ art. 61a ust. 2, ustawa systemowa art. 83 ust. 1. Próg NIE wynika z UZ art. 4 (to okres wyczekiwania na chorobowy).
 * Nowe zlecenie ma już kartę `UMOWA_DLA_POZORU` – nie dublujemy.
 */
function pozneZgloszenie(k: KontekstA3, matka: Osoba): Ryzyko[] {
  const prog = k.p.limity.ostrzezeniePozneZgloszenieDni;
  return zChorobowym(matka)
    .filter((t) => {
      const start = poczatekChorobowego(t);
      return t.chorobowe === 'dobrowolne' && start <= k.z && roznicaDni(start, k.z) < prog && trwaWDniu(t, k.z) && !nowaUmowa(k, t);
    })
    .map((t) => {
      const start = poczatekChorobowego(t);
      const zlecenie = t.rodzaj === 'zlecenie';
      return {
        kod: 'POZNE_ZGLOSZENIE_DO_UBEZPIECZENIA',
        osobaId: matka.id,
        tytul: 'Ubezpieczenie chorobowe od niedawna',
        coMozeSieStac:
          'Prawo do zasiłku nie zależy od tego, jak długo trwa ubezpieczenie, ale ZUS może poprosić o wyjaśnienia i dokumenty, ' +
          `zanim wypłaci zasiłek. Jeśli uzna, że ${zlecenie ? 'zlecenie nie było naprawdę wykonywane' : 'działalność nie była naprawdę prowadzona'}, ` +
          'może wydać decyzję o niepodleganiu ubezpieczeniu – wtedy zasiłku nie będzie.',
        dlaczego:
          `Zgłoszenie do dobrowolnego ubezpieczenia chorobowego nastąpiło ${dataSlownie(start)}, ${dni(roznicaDni(start, k.z))} przed ` +
          `${k.rodzina.zdarzenie.przewidywana ? 'przewidywanym porodem' : 'porodem'}. ZUS czasem sprawdza, czy zgłoszenie krótko przed ` +
          `porodem dotyczy pracy, która jest naprawdę wykonywana. Przepisy nie podają, kiedy zgłoszenie jest „późne” – próg ` +
          `${dni(prog)} ${ZALOZENIE}.`,
        coZrobic: `Warto na bieżąco zbierać dokumenty, które pokazują, że ${zlecenie ? 'zlecenia są naprawdę wykonywane' : 'działalność jest naprawdę prowadzona'}. ` +
          'Gdy ZUS o nie poprosi, wyjaśnienie pójdzie szybciej.',
        coPrzygotowac: zlecenie
          ? ['umowa zlecenia', 'rachunki do umowy i potwierdzenia wypłat', 'dowody wykonywania zleceń (np. e-maile, raporty)']
          : ['faktury i rachunki wystawione klientom', 'umowy i zamówienia od klientów', 'korespondencja z klientami (np. e-maile)'],
        przepis: PRZEPIS_WYJASNIENIA,
      };
    });
}

/** Umowa o pracę albo zlecenie zawarte w ciąży albo do `ryzykoUmowaPrzedCiazaMies` przed nią (EC-16, pytanie 26). */
function umowaDlaPozoru(k: KontekstA3, matka: Osoba): Ryzyko[] {
  const ciaza = poczatekCiazy(k.rodzina, k.p);
  return zChorobowym(matka)
    .filter((t) => nowaUmowa(k, t))
    .map((t) => {
      const etat = t.rodzaj === 'umowa_o_prace';
      return {
        kod: 'UMOWA_DLA_POZORU',
        osobaId: matka.id,
        tytul: 'Umowa zawarta w ciąży albo krótko przed nią',
        coMozeSieStac:
          'ZUS może poprosić o wyjaśnienia i dokumenty, zanim wypłaci zasiłek. Jeśli uzna, że umowa została zawarta tylko dla pozoru, ' +
          'może wydać decyzję o niepodleganiu ubezpieczeniu z tej umowy – wtedy zasiłku z niej nie będzie.',
        dlaczego:
          `${etat ? 'Umowa o pracę' : 'Umowa zlecenia'} zaczęła się ${dataSlownie(t.od)}${t.od >= ciaza ? ', już w czasie ciąży' : ', niedługo przed ciążą'}. ` +
          'Zatrudnienie w ciąży jest zgodne z prawem, ale ZUS może sprawdzić, czy praca jest naprawdę wykonywana. Przepisy nie podają ' +
          `progu – ${miesiecy(k.p.limity.ryzykoUmowaPrzedCiazaMies)} przed początkiem ciąży ${ZALOZENIE}. Początek ciąży liczymy ` +
          'w przybliżeniu od daty porodu.',
        coZrobic: 'Proszę mieć pod ręką dokumenty, które pokazują, jak wygląda ta praca. Gdy ZUS o nie poprosi, wyjaśnienie pójdzie szybciej.',
        coPrzygotowac: etat
          ? ['umowa o pracę', 'zakres obowiązków', 'dowody wykonywania pracy (np. e-maile, dokumenty, grafik, lista obecności)', 'listy płac i potwierdzenia przelewów wynagrodzenia']
          : ['umowa zlecenia', 'opis zadań w umowie', 'dowody wykonywania zleceń (np. e-maile, raporty, rachunki)', 'potwierdzenia wypłat'],
        przepis: `${PRZEPIS_WYJASNIENIA}; KC art. 83 § 1`,
      };
    });
}

/**
 * Podstawa składek w ciąży wyższa o co najmniej `ryzykoPodwyzkaProc` od średniej sprzed ciąży (EC-17, pytanie 27).
 * Miesiąc, w którym zaczęła się ciąża, nie należy ani do „przed”, ani do „w ciąży”. Działalność bez historii podstaw:
 * chorobowe od niedawna (okno jak przy umowie, D7) i zadeklarowana podstawa wyższa o próg od najniższej.
 */
function podwyzszeniePodstawy(k: KontekstA3, matka: Osoba): Ryzyko[] {
  const { p } = k;
  const ciaza = poczatekCiazy(k.rodzina, p);
  const prog = p.limity.ryzykoPodwyzkaProc;
  const wynik: Ryzyko[] = [];
  for (const t of zChorobowym(matka)) {
    const dzialalnosc = t.rodzaj === 'dzialalnosc' || t.rodzaj === 'wspolpraca';
    const miesiace = t.podstawaSkladek ?? [];
    const przed = miesiace.filter((m) => ostatniDzienMiesiaca(m.miesiac) < ciaza).map((m) => m.kwota);
    const wCiazy = miesiace.filter((m) => czyWOkresie(pierwszyDzienMiesiaca(m.miesiac), ciaza, k.z)).map((m) => m.kwota);
    const srednia = (l: number[]) => l.reduce((s, x) => s + x, 0) / l.length;
    let dlaczego: string | undefined;
    let progOpis = `wzrost o ${proc(prog)}`;
    if (przed.length > 0 && wCiazy.length > 0 && srednia(przed) > 0 && srednia(wCiazy) * 100 >= srednia(przed) * (100 + prog)) {
      const [sp, sw] = [srednia(przed), srednia(wCiazy)];
      dlaczego =
        `Średnia podstawa składek w ciąży (${zlote(sw)}) jest o ${Math.round(((sw - sp) / sp) * 100)}% wyższa niż przed ciążą ` +
        `(${zlote(sp)}). Podwyżka w ciąży jest zgodna z prawem, ale ZUS może sprawdzić, czy jest uzasadniona.`;
    } else if (
      dzialalnosc &&
      t.zadeklarowanaPodstawa !== undefined &&
      poczatekChorobowego(t) >= poczatekOknaPrzedCiaza(k) &&
      poczatekChorobowego(t) <= k.z &&
      t.zadeklarowanaPodstawa * 100 >= p.kwoty.najnizszaPodstawaDzialalnosc * (100 + prog)
    ) {
      const min = p.kwoty.najnizszaPodstawaDzialalnosc;
      dlaczego =
        `Ubezpieczenie chorobowe z działalności trwa od ${dataSlownie(poczatekChorobowego(t))}, a zadeklarowana podstawa składek ` +
        `(${zlote(t.zadeklarowanaPodstawa)}) jest o ${Math.round(((t.zadeklarowanaPodstawa - min) / min) * 100)}% wyższa od najniższej ` +
        `(${zlote(min)}). ZUS może sprawdzić, czy jest uzasadniona. Gdy ubezpieczenie trwa krótko, wyższa podstawa wpływa na zasiłek ` +
        'tylko częściowo (UZ art. 48a).';
      progOpis = `podstawa wyższa o ${proc(prog)} od najniższej`;
    }
    if (!dlaczego) continue;
    wynik.push({
      kod: 'PODWYZSZENIE_PODSTAWY_W_CIAZY',
      osobaId: matka.id,
      tytul: 'Wyższa podstawa składek w ciąży',
      coMozeSieStac:
        'ZUS może poprosić o wyjaśnienie, skąd się wziął ten wzrost. Jeśli uzna go za nieuzasadniony, może przyjąć niższą podstawę – ' +
        'wtedy zasiłek będzie niższy, niż pokazuje kalkulator.',
      dlaczego: `${dlaczego} Przepisy nie podają progu – ${progOpis} ${ZALOZENIE}.`,
      coZrobic: 'Warto przygotować dokumenty, które wyjaśniają wzrost. Gdy ZUS o nie poprosi, sprawa pójdzie szybciej.',
      coPrzygotowac: dzialalnosc
        ? ['dowody wyższych przychodów (faktury, ewidencja przychodów)', 'uzasadnienie wyboru wyższej podstawy składek']
        : ['aneks do umowy z uzasadnieniem podwyżki', 'nowy zakres obowiązków albo stanowisko', 'dowody, że zmiana wynika z pracy (np. awans, nowe zadania)'],
      przepis: dzialalnosc ? `${PRZEPIS_WYJASNIENIA}; UZ art. 48a` : PRZEPIS_WYJASNIENIA,
    });
  }
  return wynik;
}

// ───────────────────────── Składki, zwolnienie, dobrowolne chorobowe ─────────────────────────

/** UZ art. 2a ust. 1–2: zaległość powyżej `progZaleglosciProcPlacyMinimalnej` % płacy minimalnej (EC-12, EC-13). */
function zadluzenieSkladkowe(k: KontekstA3, o: Osoba): Ryzyko[] {
  const { p } = k;
  const prog = doGrosza((p.kwoty.placaMinimalna * p.limity.progZaleglosciProcPlacyMinimalnej) / 100);
  const tytuly = tytulyOsoby(o).filter((t) => (t.rodzaj === 'dzialalnosc' || t.rodzaj === 'wspolpraca') && (t.zadluzenieSkladkowe ?? 0) > prog);
  if (tytuly.length === 0) return [];
  const dlug = tytuly.reduce((s, t) => s + (t.zadluzenieSkladkowe ?? 0), 0);
  // Inny tytuł z chorobowym (np. etat) obok działalności z zaległością.
  const drugiTytul = zChorobowym(o).some((t) => !tytuly.includes(t));
  // NIEJASNE (pytanie nr 41): czy przy dwóch tytułach wstrzymany jest tylko zasiłek z działalności.
  const dopisek = drugiTytul ? ` Czy zasiłek z innego tytułu (np. z umowy o pracę) zostanie wypłacony normalnie? ${DO_POTWIERDZENIA}` : '';
  return [
    {
      kod: 'ZADLUZENIE_SKLADKOWE',
      osobaId: o.id,
      tytul: 'Zaległość w składkach',
      coMozeSieStac:
        `ZUS nie wypłaci zasiłku${drugiTytul ? ' z działalności' : ''} do czasu spłaty całej zaległości. Jeśli nie zostanie ona spłacona w ciągu ` +
        `${miesiecy(p.limity.splataZaleglosciMiesiecy)} od dnia, w którym powstało prawo do zasiłku, prawo przepadnie.${dopisek}`,
      dlaczego:
        `Zaległość w składkach (${zlote(dlug)}) jest wyższa niż ${zlote(prog)} (${proc(p.limity.progZaleglosciProcPlacyMinimalnej)} ` +
        'płacy minimalnej). Przy działalności ZUS wypłaca wtedy zasiłek dopiero po spłacie zaległości.',
      coZrobic: `Warto spłacić zaległość jak najszybciej, najlepiej przed ${k.porod ? 'porodem' : 'przyjęciem dziecka'}, i zachować potwierdzenie.`,
      coPrzygotowac: ['potwierdzenie spłaty zaległości', 'zaświadczenie o niezaleganiu w opłacaniu składek (eZUS)'],
      przepis: 'UZ art. 2a',
    },
  ];
}

/**
 * UZ art. 17 ust. 1–1c: praca zarobkowa w czasie zwolnienia odbiera zasiłek chorobowy za cały okres zwolnienia;
 * przy kilku tytułach zwolnienie dotyczy każdego z nich. Od 1.01.2027 ust. 1d–1e: na żądanie ubezpieczonego można nie
 * wystawić zwolnienia z tytułu, przy którym praca jest możliwa. Treść według `dataAnalizy` (pytanie 25 – rozstrzygnięte).
 */
function pracaNaZwolnieniu(k: KontekstA3, o: Osoba): Ryzyko[] {
  const ezla = o.zdrowie?.eZLA ?? [];
  if (ezla.length === 0) return [];
  const wZwolnieniu = tytulyOsoby(o).filter((t) => ezla.some((e) => t.od <= e.do && (koniecTytulu(t) ?? e.od) >= e.od));
  if (wZwolnieniu.length < 2) return [];
  const nowe = k.dzis >= UZ_ART17_UST1D_OD;
  const podstawa =
    'Przy więcej niż jednej umowie albo działalności zwolnienie lekarskie dotyczy każdej z nich, a pracą zarobkową ' +
    'jest każda czynność wykonywana za pieniądze – poza pojedynczymi sprawami, których wymagają ważne okoliczności. ' +
    'Polecenie pracodawcy nie jest taką okolicznością.';
  return [
    {
      kod: 'PRACA_NA_ZWOLNIENIU',
      osobaId: o.id,
      tytul: 'Praca w czasie zwolnienia lekarskiego',
      coMozeSieStac:
        'Jakakolwiek praca zarobkowa w czasie zwolnienia lekarskiego – także z innej umowy, np. zlecenie obok ' +
        'etatu – może oznaczać utratę zasiłku chorobowego za cały okres zwolnienia.',
      dlaczego: nowe
        ? `${podstawa} Od ${dataSlownie(UZ_ART17_UST1D_OD)} r., jeśli rodzaj pracy pozwala ją wykonywać mimo choroby, lekarz ` +
          'na prośbę ubezpieczonego może nie wystawić zwolnienia z tej umowy. Wtedy o okresie zwolnienia z innej umowy trzeba poinformować ' +
          'płatnika, który sam wypłaca zasiłki.'
        : podstawa,
      coZrobic: nowe
        ? 'Na czas zwolnienia trzeba przerwać pracę ze wszystkich umów, których dotyczy zwolnienie. Jeśli przy jednej z nich praca ' +
          'mimo choroby jest możliwa, warto poprosić lekarza, żeby nie wystawiał zwolnienia z tej umowy.'
        : 'Na czas zwolnienia trzeba przerwać każdą pracę zarobkową, także z innych umów. W razie wątpliwości, czy coś jest pracą zarobkową, ' +
          'proszę zapytać w ZUS przed podjęciem takiej czynności.',
      przepis: nowe ? 'UZ art. 17 ust. 1–1c, 1d–1e' : 'UZ art. 17 ust. 1–1c',
    },
  ];
}

/**
 * D4: osoba ma tytuł z dobrowolnym chorobowym i jakieś świadczenie, które przysługuje (także warunkowo).
 * Na czas zasiłku dobrowolne chorobowe nie trwa; wraca dopiero od dnia ponownego zgłoszenia (ustawa systemowa art. 14 ust. 1),
 * a po przerwie dłuższej niż dopuszcza UZ art. 4 ust. 2 znów liczy się okres wyczekiwania.
 * Źródło praktyki: Poradnik dla rodziców ZUS 2026; zus.pl „Zasiłek macierzyński – komu przysługuje”
 * (research/katalog-swiadczen.yaml); EC-69 [W].
 */
function ponowneZgloszenie(k: KontekstA3, o: Osoba): Ryzyko[] {
  const dobrowolne = tytulyOsoby(o).filter((t) => t.chorobowe === 'dobrowolne');
  if (dobrowolne.length === 0) return [];
  if (!k.uprawnienia.some((u) => u.osobaId === o.id && u.przysluguje !== false)) return [];
  const zlecenie = dobrowolne.every((t) => t.rodzaj === 'zlecenie');
  return [
    {
      kod: 'PONOWNE_ZGLOSZENIE_PO_ZASILKU',
      osobaId: o.id,
      tytul: 'Po zasiłku trzeba ponownie zgłosić się do dobrowolnego ubezpieczenia chorobowego',
      coMozeSieStac:
        'Bez ponownego zgłoszenia do dobrowolnego ubezpieczenia chorobowego po zakończeniu zasiłku nie będą przysługiwać ' +
        'kolejne zasiłki, np. chorobowy.',
      dlaczego:
        'Na czas zasiłku dobrowolne ubezpieczenie chorobowe nie trwa, a po zasiłku nie wraca samo. Zaczyna się od nowa dopiero ' +
        'od dnia zgłoszenia, nie wstecz, a po dłuższej przerwie trzeba znowu odczekać na prawo do zasiłku chorobowego.',
      coZrobic: zlecenie
        ? 'Zaraz po zakończeniu zasiłku warto przypomnieć zleceniodawcy o ponownym zgłoszeniu do dobrowolnego ubezpieczenia chorobowego (ZUS ZUA).'
        : 'Zaraz po zakończeniu zasiłku proszę ponownie zgłosić się do dobrowolnego ubezpieczenia chorobowego (ZUS ZUA) – przez eZUS albo w placówce ZUS.',
      przepis: 'ustawa systemowa art. 14 ust. 1; UZ art. 4 ust. 2',
    },
  ];
}

// ───────────────────────── Terminy (D6) ─────────────────────────

/** UZ art. 30a: wniosek o 81,5% najpóźniej 21 dni po porodzie (przyjęciu) – `pule.wniosek815DoKiedy` (D18). */
function termin815(k: KontekstA3): Ryzyko[] {
  const { p } = k;
  // Po zgonie matki albo porzuceniu dziecka karty nie ma – wariant przejmującego jest do potwierdzenia (możliwość `wariant_815`).
  const osoba = k.porod
    ? k.matka && !k.matkaOdeszla && ma(k, k.matka.id, 'macierzynski')
      ? k.matka
      : undefined
    : osobyZ(k, 'na_warunkach_macierzynskiego')[0];
  // Termin z UZ art. 30a liczony według KC art. 110–111: ostatni dzień jeszcze się liczy.
  const t = terminowe(k, k.pule.wniosek815DoKiedy);
  if (!osoba || !t) return [];
  const s = p.stawkiProc;
  const zdarzenie = k.porod ? 'porodu' : 'przyjęcia dziecka';
  return [
    {
      kod: 'TERMIN_815',
      osobaId: osoba.id,
      tytul: `Wariant ${proc(s.wariant815)} wymaga wniosku w ciągu ${dni(p.terminyDni.wniosek815PoPorodzie)}`,
      coMozeSieStac: `Jeśli wniosek nie zostanie złożony do ${dataSlownie(t.termin)}, zostaje wariant ${proc(s.macierzynski)} i ${proc(s.rodzicielski)}.`,
      dlaczego: `Termin liczy się od dnia ${zdarzenie}. Po terminie nie można już wybrać wariantu ${proc(s.wariant815)}.`,
      coZrobic: k.dzis < k.z
        ? `Warto porównać oba warianty w planerze i zdecydować przed ${k.porod ? 'porodem' : 'przyjęciem dziecka'}.` +
          // NIEJASNE (pytanie nr 23): odpowiedź ZUS na stoisku 21.11, pytanie nr 23 – niepewna, dopisek w tekście.
          (k.porod ? ` ${wniosek815PrzedPorodem(p, t.termin)}` : '')
        : `Warto porównać oba warianty w planerze. Przy wyborze wariantu ${proc(s.wariant815)} proszę złożyć wniosek przed terminem.`,
      przepis: 'UZ art. 30a',
      ...t,
    },
  ];
}

/** KP art. 182³ § 1: urlop ojcowski do ukończenia przez dziecko 12 miesięcy (przysposobienie: 12 miesięcy od uprawomocnienia). */
function terminOjcowski(k: KontekstA3, o: Osoba): Ryzyko[] {
  const { p, pule } = k;
  const t = terminowe(k, pule.ojcowskiDoKiedy);
  if (!t || pule.ojcowskiTyg <= 0 || !ma(k, o.id, 'ojcowski')) return [];
  const przysposobienie = k.rodzina.zdarzenie.typ === 'przysposobienie';
  return [
    {
      kod: 'TERMIN_OJCOWSKI',
      osobaId: o.id,
      tytul: 'Urlop ojcowski trzeba wykorzystać w terminie',
      coMozeSieStac: `Jeśli urlop ojcowski (${tygodni(pule.ojcowskiTyg)}) nie zostanie wykorzystany do ${dataSlownie(t.termin)}, prawo do niego wygaśnie.`,
      dlaczego: przysposobienie
        ? `Urlop ojcowski przysługuje przez ${miesiecy(p.limity.ojcowskiDoMiesiecyZycia)} od uprawomocnienia się postanowienia ` +
          `o przysposobieniu, ale nie dłużej niż do ukończenia przez dziecko ${lat(p.limity.wiekPrzysposobienieLat)}.`
        : `Urlop ojcowski przysługuje, dopóki dziecko nie skończy ${miesiecy(p.limity.ojcowskiDoMiesiecyZycia)}.`,
      coZrobic: pracownikWDniu(o, pozniejsza(k.dzis, k.z))
        ? // KP art. 182³ § 2
          `Proszę zaplanować urlop w planerze. Wniosek do pracodawcy trzeba złożyć najpóźniej ${dni(p.terminyDni.wniosekOjcowskiPrzed)} przed jego początkiem.`
        : 'Proszę zaplanować urlop w planerze i złożyć wniosek o zasiłek (ZAM) – przy zleceniu u zleceniodawcy, przy działalności w ZUS.',
      przepis: 'KP art. 182³ § 1–2',
      ...t,
    },
  ];
}

/** KP art. 182¹a § 4–5, art. 182¹c; D4: termin = `pule.rodzicielskiDoKiedy`. Jedna karta na osobę z prawem do rodzicielskiego. */
function rodzicielski9Tygodni(k: KontekstA3, o: Osoba): Ryzyko[] {
  const { p, pule } = k;
  const t = terminowe(k, pule.rodzicielskiDoKiedy);
  const zPrawem = osobyZ(k, 'rodzicielski');
  if (!t || pule.rodzicielskiTyg <= 0 || pule.rodzicielskiNieprzenoszalneTyg <= 0 || !zPrawem.includes(o)) return [];
  const n = tygodni(pule.rodzicielskiNieprzenoszalneTyg);
  const jedna = zPrawem.length === 1;
  // Drugi rodzic jest w rodzinie, ale nie ma prawa (np. EC-56) – nie sugerujemy, że może wykorzystać swoje tygodnie.
  const drugiBezPrawa = k.rodzina.osoby.some((x) => x !== o && (x.rola === 'matka' || x.rola === 'ojciec' || x.rola === 'przyjmujacy'));
  let coMozeSieStac =
    `Własna część urlopu rodzicielskiego (${n}) przepadnie, jeśli nie zostanie wykorzystana do ${dataSlownie(t.termin)}. ` +
    'Nie można jej przekazać drugiemu rodzicowi.';
  if (jedna && !drugiBezPrawa) coMozeSieStac += ` Tak samo przepadną tygodnie drugiego rodzica (${n}), jeśli z nich nie skorzysta.`;
  const matkaNieubezpieczona = uprawnienie(k, o.id, 'rodzicielski')?.kod === 'MATKA_NIEUBEZPIECZONA';
  if (matkaNieubezpieczona) {
    // KP art. 182¹a § 4. Odpowiedź ZUS na stoisku 21.11, pytania nr 6 i 14: 9 tygodni mamy nie przechodzi na tatę.
    coMozeSieStac += ` ${n} mamy nie ${orzeczenie(pule.rodzicielskiNieprzenoszalneTyg, 'przechodzi', 'przechodzą')} na tatę, bo mama nie jest ubezpieczona.`;
  } else if (k.matkaOdeszla) {
    // NIEJASNE (pytanie nr 14): zgon albo porzucenie dziecka przez ubezpieczoną mamę – ZUS odpowiedział przy pytaniu 6
    // (mama nieubezpieczona); o tej sytuacji wprost nie padło, więc dopisek zostaje.
    coMozeSieStac += ` Czy w tej sytuacji można wykorzystać także tygodnie przeznaczone dla mamy? ${DO_POTWIERDZENIA}`;
  }
  return [
    {
      kod: 'RODZ_9_TYG_PRZEPADNIE',
      osobaId: o.id,
      tytul: `${n} urlopu rodzicielskiego, których nie można przekazać drugiemu rodzicowi`,
      coMozeSieStac,
      dlaczego:
        `Każde z rodziców ma wyłączne prawo do ${tygodniDop(pule.rodzicielskiNieprzenoszalneTyg)} z ${tygodniDop(pule.rodzicielskiTyg)} urlopu rodzicielskiego. ` +
        (k.rodzina.zdarzenie.typ === 'przysposobienie'
          ? // KP art. 183 § 4¹; odpowiedź ZUS na stoisku 21.11, pytanie nr 37.
            `Urlop można wykorzystać, dopóki dziecko nie skończy ${lat(p.limity.wiekPrzysposobienieLat)}.`
          : `Urlop można wykorzystać do końca roku, w którym dziecko kończy ${lat(p.limity.rodzicielskiDoRokuZycia)}.`),
      coZrobic: !jedna
        ? 'Warto zaplanować w planerze tygodnie każdego z rodziców, żeby żaden tydzień nie przepadł.'
        : drugiBezPrawa
          ? 'Proszę zaplanować te tygodnie w planerze.'
          : 'Proszę zaplanować te tygodnie w planerze. Jeśli drugi rodzic ma ubezpieczenie chorobowe, warto go dodać – planer pokaże, jak wykorzystać też jego tygodnie.',
      przepis: k.rodzina.zdarzenie.typ === 'przysposobienie' ? 'KP art. 182¹a § 4–5, art. 183 § 4¹' : 'KP art. 182¹a § 4–5, art. 182¹c',
      ...t,
    },
  ];
}

// ───────────────────────── Ochrona przed zwolnieniem ─────────────────────────

/** KP art. 177 § 1, § 3 – ochrona w ciąży i przedłużenie umowy do porodu dotyczą tylko pracownicy (brief 7.8). */
function brakOchronyPrzedZwolnieniem(k: KontekstA3, matka: Osoba): Ryzyko[] {
  // Umowa o pracę trwająca w dniu porodu daje ochronę i prawo do zasiłku – karta byłaby myląca.
  if (pracownikWDniu(matka, k.z)) return [];
  const ciaza = poczatekCiazy(k.rodzina, k.p);
  const poza = tytulyOsoby(matka).filter(
    (t) => (t.rodzaj === 'zlecenie' || t.rodzaj === 'dzialalnosc' || t.rodzaj === 'wspolpraca') && (koniecTytulu(t) ?? ciaza) >= ciaza,
  );
  if (poza.length === 0) return [];
  const zlecenie = poza.some((t) => t.rodzaj === 'zlecenie');
  return [
    {
      kod: 'BRAK_OCHRONY_PRZED_ZWOLNIENIEM',
      osobaId: matka.id,
      tytul: zlecenie ? 'Umowa zlecenia nie daje ochrony w ciąży' : 'Działalność nie daje ochrony z Kodeksu pracy',
      coMozeSieStac: zlecenie
        ? 'Zleceniodawca może rozwiązać tę umowę także w ciąży. Jeśli skończy się ona przed porodem, zasiłek macierzyński może nie przysługiwać.'
        : 'Przy działalności nie ma ochrony z Kodeksu pracy. O zasiłku decyduje to, czy w dniu porodu trwa dobrowolne ubezpieczenie chorobowe z działalności.',
      dlaczego:
        'Zakaz wypowiedzenia umowy w ciąży i przedłużenie umowy do dnia porodu są w Kodeksie pracy i dotyczą tylko pracowników.',
      coZrobic: zlecenie
        ? 'Proszę sprawdzić w umowie, kiedy się kończy i jaki ma okres wypowiedzenia. Jeśli praca ma trwać dalej, warto porozmawiać ze zleceniodawcą o umowie, która obejmie dzień porodu.'
        : 'Żeby zasiłek przysługiwał, dobrowolne ubezpieczenie chorobowe z działalności musi trwać w dniu porodu – warto tego pilnować.',
      przepis: 'KP art. 177 § 1, § 3; UZ art. 29 ust. 1',
    },
  ];
}
