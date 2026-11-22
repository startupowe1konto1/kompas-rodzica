'use client';

/**
 * Ankieta „Moja sytuacja” krok po kroku (tor C, C3; wzorzec z design.md, „Decyzje per obszar”).
 *
 *  - telefon: jedno pytanie na ekran, komputer: wszystkie pytania kroku naraz; na końcu „Plan jest gotowy”,
 *  - bez osobnych ekranów otwierających: kolor, ikonę i tytuł sekcji pokazuje pasek sekcji nad pytaniami
 *    (wariant A po testach na stoisku 22.11, „sinusoida” wysokości przy kaflach otwierających),
 *  - u góry pasek z segmentami („3 z 8”), na dole przyklejony pasek „Wstecz” / „Dalej” (telefon i komputer),
 *  - pytanie, które pojawia się po odpowiedzi, rozwija się w tej samej karcie (`Rozwijane`),
 *  - błąd przy polu po opuszczeniu pola i przy „Dalej”; z błędem dalej nie przechodzimy.
 *
 * Kolejkę ekranów liczymy od nowa po każdej odpowiedzi, bo od odpowiedzi zależy, jakie pytania
 * są widoczne. Miejsce pamiętamy po kroku i kluczu pytania (`kolejka.ts`).
 */
import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { IconArrowLeft, IconCircleCheck } from '@tabler/icons-react';
import type { Rodzina } from '../../engine/types';
import { formatujDate } from '../format';
import { dzisISO, useProfil } from '../../state/profil';
import { pustaRodzina } from '../start/zrodla-startu';
import { Karta, Przycisk } from '../ui';
import { KROKI_ANKIETY, PYTANIA } from './definicje';
import { KAFEL_KONCOWY, KSZTALT_KAFLA, PasekSekcji } from './PasekSekcji';
import { ObszarRozwijania, Rozwijane } from './Rozwijane';
import { bezRuchu, KRZYWA_WEJSCIA } from './ruch';
import { SzkieletAnkiety } from './SzkieletAnkiety';
import { ekranWstecz, kolejkaEkranow, miejsceDlaPytania, miejsceEkranu, sekcjeKolejki, znajdzEkran, type Ekran, type Miejsce, type TrybEkranu } from './kolejka';
import { nazwaTytulu, pasujaceDoPotwierdzenia, rodzajNowejUmowy, zmienRodzajTytulu } from './listy';
import { PoleAnkiety } from './PoleAnkiety';
import type { AkcjeTytulow } from './PoleTytulow';
import { dodajTytul, usunTytul, walidujAnkiete, walidujOdpowiedz, widocznePytania, zapiszOdpowiedz, type OpcjeWidocznosci } from './silnik-ankiety';
import type { BladPola, EtapAnkiety, PytanieWidoczne } from './typy';
import { Wyjasnienie } from './Wyjasnienie';
import { znacznikDlaPytania, znacznikiZrodel } from './zrodla';

export interface AnkietaProps {
  /** Np. `{ osoba: i, tylkoOsoba: true }` przy dodawaniu drugiej osoby (T3.1). */
  opcje?: OpcjeWidocznosci;
  /** Wywołane po „Zobacz wynik” (albo innej etykiecie końcowej), gdy cała ankieta jest poprawna. */
  poZakonczeniu: () => void;
  /** Napis na przycisku ekranu końcowego, np. „Zobacz wynik”. */
  etykietaZakonczenia: string;
  /** Klucz pytania z linku „Popraw odpowiedź” (`/sytuacja?pytanie=<klucz>`): ankieta zaczyna od tego pytania. */
  pytanieStartowe?: string | null;
}

const OPCJE_DOMYSLNE: OpcjeWidocznosci = {};

// ───────────────────────── Telefon czy komputer ─────────────────────────

const ZAPYTANIE_KOMPUTERA = '(min-width: 768px)';

function subskrybujEkran(odswiez: () => void): () => void {
  const m = window.matchMedia(ZAPYTANIE_KOMPUTERA);
  m.addEventListener('change', odswiez);
  return () => m.removeEventListener('change', odswiez);
}
const trybEkranu = (): TrybEkranu => (window.matchMedia(ZAPYTANIE_KOMPUTERA).matches ? 'komputer' : 'telefon');
const trybSerwera = (): TrybEkranu => 'telefon';

// ───────────────────────── Pomocnicze ─────────────────────────

const KOMUNIKAT_DO_POTWIERDZENIA = 'Proszę sprawdzić tę odpowiedź: poprawić ją albo potwierdzić, że się zgadza.';

/**
 * Błędy odpowiedzi: te z silnika plus „do potwierdzenia”, gdy odpowiedź ma jeszcze wartość startową,
 * której rodzic nie sprawdził. Najpierw pokazujemy błąd z silnika (zła kwota), bo on wymaga poprawki.
 */
function sprawdz(p: PytanieWidoczne, wartosc: unknown, rodzina: Rodzina, doPotwierdzenia: boolean): BladPola[] {
  const bledy = walidujOdpowiedz(p.def, wartosc, {
    dataAnalizy: rodzina.dataAnalizy,
    rodzina,
    zakres: p.zakres,
  });
  if (bledy.length === 0 && doPotwierdzenia) return [{ kod: 'DO_POTWIERDZENIA', komunikat: KOMUNIKAT_DO_POTWIERDZENIA }];
  return bledy;
}

function odmien(n: number, jeden: string, kilka: string, wiele: string): string {
  if (n === 1) return `${n} ${jeden}`;
  const reszta10 = n % 10;
  const reszta100 = n % 100;
  return `${n} ${reszta10 >= 2 && reszta10 <= 4 && !(reszta100 >= 12 && reszta100 <= 14) ? kilka : wiele}`;
}

/** Podpis nad pytaniem, gdy odpowiedź dotyczy konkretnej umowy, osoby albo dziecka (np. „Umowa o pracę 2”). */
function podpisKontekstu(p: PytanieWidoczne, rodzina: Rodzina): string | null {
  const { osoba, tytul, dziecko } = p.zakres;
  const osoby = rodzina.osoby;
  const kto = osoba !== undefined && osoby.length > 1 ? (osoby[osoba]?.dane?.imie ?? `Osoba ${osoba + 1}`) : null;
  let opis: string | null = null;
  if (osoba !== undefined && tytul !== undefined) {
    opis = nazwaTytulu(osoby[osoba]?.tytuly ?? [], tytul, false) || null;
  } else if (dziecko !== undefined && (rodzina.zdarzenie?.dzieci?.length ?? 0) > 1) {
    opis = `Dziecko ${dziecko + 1}`;
  }
  if (kto && opis) return `${kto}: ${opis}`;
  return kto ?? opis;
}

/** Identyfikator umowy, której dotyczy pytanie. Stały klucz pola: po usunięciu umowy numery się przesuwają, a pola nie mogą dostać cudzego tekstu. */
function idTytulu(p: PytanieWidoczne, rodzina: Rodzina): string {
  const { osoba, tytul } = p.zakres;
  return osoba !== undefined && tytul !== undefined ? (rodzina.osoby[osoba]?.tytuly[tytul]?.id ?? '') : '';
}

function idEkranu(e: Ekran, tryb: TrybEkranu): string {
  if (e.rodzaj === 'pytania') return `pytania:${e.krok}${tryb === 'telefon' ? `:${e.pytania[0].klucz}` : ''}`;
  return 'koniec';
}

// ───────────────────────── Pasek postępu ─────────────────────────

interface Segment {
  id: string;
  tytul: string;
  /** 0–1 */
  wypelnienie: number;
}

function PasekPostepu({ segmenty, numer, lacznie, ukonczona }: { segmenty: Segment[]; numer: number; lacznie: number; ukonczona: boolean }) {
  const tekst = ukonczona ? 'Ankieta ukończona' : `Krok ${numer} z ${lacznie}`;
  return (
    <div
      role="progressbar"
      aria-label="Postęp ankiety"
      aria-valuemin={0}
      aria-valuemax={lacznie}
      aria-valuenow={ukonczona ? lacznie : numer}
      aria-valuetext={tekst}
      className="flex gap-1"
    >
      {segmenty.map((s) => (
        <div key={s.id} className="h-2 flex-1 overflow-hidden rounded-przycisk bg-szary-linia">
          <div className="h-full bg-zielen" style={{ width: `${Math.round(s.wypelnienie * 100)}%` }} />
        </div>
      ))}
    </div>
  );
}

// ───────────────────────── Ekran końcowy ─────────────────────────

const KLUCZ_DATY = (z: Rodzina['zdarzenie']) =>
  z.typ === 'porod' ? (z.przewidywana ? 'Przewidywana data porodu' : 'Data porodu') : 'Data przyjęcia dziecka';

function EkranKoncowy({ rodzina, naglowekRef }: { rodzina: Rodzina; naglowekRef: React.Ref<HTMLHeadingElement> }) {
  const z = rodzina.zdarzenie;
  const umowy = rodzina.osoby.reduce((suma, o) => suma + (o.tytuly?.length ?? 0), 0);
  const wiersze: [string, string][] = [
    [KLUCZ_DATY(z), z.data ? formatujDate(z.data) : '—'],
    ['Osoby w planie', odmien(rodzina.osoby.length, 'osoba', 'osoby', 'osób')],
    ['Umowy i firmy', odmien(umowy, 'umowa', 'umowy', 'umów')],
  ];
  return (
    <section
      aria-labelledby="ankieta-koniec"
      data-ekran="koniec"
      className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-4 pb-4 md:flex-none md:pb-0"
    >
      <div className={`${KSZTALT_KAFLA} ${KAFEL_KONCOWY} items-start`}>
        <div className="flex items-center gap-3">
          <h2 id="ankieta-koniec" ref={naglowekRef} tabIndex={-1} className="text-[1.75rem] font-black leading-tight outline-none! md:text-4xl">
            Plan jest gotowy
          </h2>
          <IconCircleCheck size={40} stroke={1.75} aria-hidden className="shrink-0" />
        </div>
        <p className="max-w-prose text-lg leading-normal">Mamy już to, czego potrzeba, żeby policzyć zasiłki i ułożyć plan na osi czasu.</p>
        <Karta jako="div" className="w-full text-tekst">
          {/* Etykieta nad wartością: wszystkie wartości zaczynają się na tej samej pionowej linii (lewej). */}
          <dl className="flex flex-col divide-y divide-szary-linia">
            {wiersze.map(([nazwa, wartosc]) => (
              <div key={nazwa} className="flex flex-col gap-0.5 py-3 first:pt-0 last:pb-0">
                <dt className="text-sm text-tekst-drugi">{nazwa}</dt>
                <dd className="text-lg font-bold">{wartosc}</dd>
              </div>
            ))}
          </dl>
        </Karta>
      </div>
    </section>
  );
}

/** Etap rodziny do treści pytań (`wgEtapu`); undefined, gdy zdarzenia jeszcze nie ma. */
function etapRodziny(r: Rodzina): EtapAnkiety | undefined {
  const z = r.zdarzenie;
  if (!z) return undefined;
  if (z.typ === 'porod') return z.przewidywana ? 'w_ciazy' : 'urodzone';
  return 'przyjecie';
}

// ───────────────────────── Ankieta ─────────────────────────

export function Ankieta(props: AnkietaProps) {
  const { gotowy, rodzina, ustawRodzine, ustawPochodzenie, ustawDoPotwierdzenia } = useProfil();

  // Wejście „Wpisz dane ręcznie” (albo prosto na /sytuacja) nie ma jeszcze profilu:
  // zakładamy pustą rodzinę i od razu pytamy, zamiast odsyłać na start.
  useEffect(() => {
    if (!gotowy || rodzina) return;
    const pusta = pustaRodzina(dzisISO());
    ustawRodzine(pusta.rodzina);
    ustawPochodzenie(pusta.pochodzenie);
    ustawDoPotwierdzenia(pusta.doPotwierdzenia);
  }, [gotowy, rodzina, ustawRodzine, ustawPochodzenie, ustawDoPotwierdzenia]);

  if (!gotowy || !rodzina) {
    return <SzkieletAnkiety />;
  }
  return <AnkietaZRodzina {...props} rodzina={rodzina} />;
}

function AnkietaZRodzina({ opcje = OPCJE_DOMYSLNE, poZakonczeniu, etykietaZakonczenia, pytanieStartowe, rodzina }: AnkietaProps & { rodzina: Rodzina }) {
  const { ustawRodzine, ustawPlany, oznaczJakoWpisane, potwierdz, pochodzenie, doPotwierdzenia } = useProfil();
  const tryb = useSyncExternalStore(subskrybujEkran, trybEkranu, trybSerwera);

  // Link „Popraw odpowiedź” z listy do poprawy (`/sytuacja?pytanie=<klucz>`): ankieta otwiera się od razu na tym pytaniu
  // i pokazuje przy nim błąd. Klucz przychodzi z `useSearchParams` strony (przy nawigacji klienckiej `window.location`
  // pokazuje jeszcze poprzedni adres).
  const [pytanieZLinku] = useState(() => pytanieStartowe ?? null);
  const [miejsce, ustawMiejsce] = useState<Miejsce>(() => {
    const startowa = kolejkaEkranow(PYTANIA, rodzina, tryb, opcje);
    return (pytanieZLinku && miejsceDlaPytania(startowa, pytanieZLinku)) || miejsceEkranu(startowa[0], 0);
  });
  const [bledy, ustawBledy] = useState<Record<string, BladPola[]>>(() => {
    if (!pytanieZLinku) return {};
    const zPytania = walidujAnkiete(PYTANIA, rodzina, opcje).bledy.filter((b) => b.klucz === pytanieZLinku);
    return zPytania.length > 0 ? { [pytanieZLinku]: zPytania } : {};
  });
  const [fokusBledu, ustawFokusBledu] = useState(0);
  const korzen = useRef<HTMLDivElement>(null);
  const naglowek = useRef<HTMLHeadingElement>(null);
  const tresc = useRef<HTMLDivElement>(null);
  const poprzedniEkran = useRef<string | null>(null);

  const kolejka = kolejkaEkranow(PYTANIA, rodzina, tryb, opcje);
  const indeks = znajdzEkran(kolejka, miejsce);
  const ekran = kolejka[indeks];
  const znaczniki = znacznikiZrodel(pochodzenie);
  const idBiezacego = idEkranu(ekran, tryb);

  // Po przejściu na inny ekran: fokus na nagłówek ekranu (czytnik ogłasza nowy ekran) i początek ankiety na górze okna.
  useEffect(() => {
    if (poprzedniEkran.current !== null && poprzedniEkran.current !== idBiezacego) {
      naglowek.current?.focus({ preventScroll: true });
      korzen.current?.scrollIntoView({ block: 'start' });
      // Delikatne wejście treści (opacity + 8 px w górę, 180 ms); bez ruchu przy prefers-reduced-motion.
      if (!bezRuchu()) {
        tresc.current?.animate(
          [
            { opacity: 0, transform: 'translateY(8px)' },
            { opacity: 1, transform: 'translateY(0)' },
          ],
          { duration: 180, easing: KRZYWA_WEJSCIA },
        );
      }
    }
    poprzedniEkran.current = idBiezacego;
  }, [idBiezacego]);

  // Po nieudanym „Dalej”: fokus na pierwsze błędne pole.
  useEffect(() => {
    if (fokusBledu === 0) return;
    const pole = korzen.current?.querySelector('[data-kod-bledu]');
    pole?.querySelector<HTMLElement>('input, button')?.focus();
  }, [fokusBledu]);

  function idz(i: number) {
    const cel = Math.max(0, Math.min(i, kolejka.length - 1));
    ustawMiejsce(miejsceEkranu(kolejka[cel], cel));
  }

  /** Wpisy z listy „do potwierdzenia”, które dotyczą tego pytania. */
  const wpisyDoPotwierdzenia = (p: PytanieWidoczne) => pasujaceDoPotwierdzenia(p.sciezka, doPotwierdzenia);

  /**
   * Wartość startowa pustego profilu (np. rola „mama”, „Czekamy na poród”) bez źródła danych: pokazujemy pytanie
   * bez zaznaczenia i rodzic wybiera sam (decyzja Wojtka 21.11). „Sprawdź tę odpowiedź” zostaje dla danych z usług.
   */
  const startowa = (p: PytanieWidoczne) => wpisyDoPotwierdzenia(p).length > 0 && !znacznikDlaPytania(znaczniki, p);
  const etap = etapRodziny(rodzina);
  const widok = (p: PytanieWidoczne): PytanieWidoczne => {
    const wariant = etap ? p.def.wgEtapu?.[etap] : undefined;
    const { osoba, tytul } = p.zakres;
    const rodzaj = osoba !== undefined && tytul !== undefined ? rodzina.osoby[osoba]?.tytuly?.[tytul]?.rodzaj : undefined;
    const wariantRodzaju = rodzaj ? p.def.wgRodzaju?.[rodzaj] : undefined;
    const def = wariant || wariantRodzaju ? { ...p.def, ...wariant, ...wariantRodzaju } : p.def;
    return { ...p, def, wartosc: startowa(p) ? undefined : p.wartosc };
  };
  const doSprawdzenia = (p: PytanieWidoczne) => wpisyDoPotwierdzenia(p).length > 0 && !startowa(p);

  /** Rodzic dotknął odpowiedzi: zapamiętujemy, że wpisał ją sam, i zdejmujemy ją z listy „do potwierdzenia”. */
  function oznaczDotkniete(p: PytanieWidoczne) {
    oznaczJakoWpisane(p.sciezka);
    for (const w of wpisyDoPotwierdzenia(p)) potwierdz(w);
  }

  function zmien(p: PytanieWidoczne, wartosc: unknown) {
    ustawRodzine((r) => (r ? zapiszOdpowiedz(p.def, r, p.zakres, wartosc) : r));
    oznaczDotkniete(p);
    // Błąd, który już widać, poprawia się na bieżąco: znika, gdy odpowiedź jest dobra.
    if (bledy[p.klucz])
      ustawBledy((b) => ({
        ...b,
        [p.klucz]: sprawdz(p, wartosc, rodzina, false),
      }));
  }

  /** „Tak, zgadza się”: odpowiedź zostaje, jaka była, ale przestaje wymagać sprawdzenia. */
  function potwierdzOdpowiedz(p: PytanieWidoczne) {
    for (const w of wpisyDoPotwierdzenia(p)) potwierdz(w);
    ustawBledy((b) => ({
      ...b,
      [p.klucz]: (b[p.klucz] ?? []).filter((x) => x.kod !== 'DO_POTWIERDZENIA'),
    }));
  }

  /** Po opuszczeniu pola sprawdzamy błędy odpowiedzi, ale nie „do potwierdzenia” (to dopiero przy „Dalej”). */
  function poOpuszczeniu(p: PytanieWidoczne) {
    ustawBledy((b) => ({
      ...b,
      [p.klucz]: sprawdz(p, widok(p).wartosc, rodzina, false),
    }));
  }

  /** Umowy osoby (pytanie o rodzaje ubezpieczenia): dodanie, usunięcie, zmiana rodzaju. */
  function akcjeTytulow(p: PytanieWidoczne): AkcjeTytulow | undefined {
    const osoba = p.zakres.osoba;
    if (p.def.kodek !== 'rodzaje_tytulow' || osoba === undefined) return undefined;
    const zmienRodzine = (f: (r: Rodzina) => Rodzina) => {
      ustawRodzine((r) => (r ? f(r) : r));
      oznaczDotkniete(p);
    };
    return {
      tytuly: rodzina.osoby[osoba]?.tytuly ?? [],
      dodaj: () => zmienRodzine((r) => dodajTytul(r, osoba, rodzajNowejUmowy(r.osoby[osoba]?.tytuly ?? []))),
      usun: (i) => zmienRodzine((r) => usunTytul(r, osoba, i)),
      zmienRodzaj: (i, rodzaj) => zmienRodzine((r) => zmienRodzajTytulu(r, osoba, i, rodzaj)),
    };
  }

  function dalej() {
    if (ekran.rodzaj === 'pytania') {
      const nowe: Record<string, BladPola[]> = {};
      for (const p of ekran.pytania) nowe[p.klucz] = sprawdz(p, widok(p).wartosc, rodzina, doSprawdzenia(p));
      ustawBledy((b) => ({ ...b, ...nowe }));
      if (Object.values(nowe).some((l) => l.length > 0)) {
        ustawFokusBledu((n) => n + 1);
        return;
      }
    }
    idz(indeks + 1);
  }

  function wstecz() {
    idz(ekranWstecz(kolejka, indeks));
  }

  function zobaczWynik() {
    // Ostatnie sprawdzenie wszystkich widocznych pytań (też tych, które rodzic ominął, cofając się).
    const grupy: Record<string, BladPola[]> = {};
    let pierwszy: string | undefined;
    for (const p of widocznePytania(PYTANIA, rodzina, opcje)) {
      const l = sprawdz(p, widok(p).wartosc, rodzina, doSprawdzenia(p));
      if (l.length === 0) continue;
      grupy[p.klucz] = l;
      pierwszy ??= p.klucz;
    }
    if (pierwszy === undefined) {
      ustawPlany([]);
      poZakonczeniu();
      return;
    }
    ustawBledy((poprzednie) => ({ ...poprzednie, ...grupy }));
    const gdzie = kolejka.findIndex((e) => e.rodzaj === 'pytania' && e.pytania.some((p) => p.klucz === pierwszy));
    if (gdzie >= 0) idz(gdzie);
    ustawFokusBledu((n) => n + 1);
  }

  // ───── Postęp ─────
  const sekcje = sekcjeKolejki(kolejka);
  // Licznik to numer ekranu (faktycznego kroku), nie pierwszego pytania na ekranie: na komputerze ekran ma kilka pytań
  // i licznik skakał (1, 2, 5, 12 z 16) – uwaga Wojtka 22.11. Ekran końcowy się nie liczy.
  const lacznieKrokow = Math.max(kolejka.length - 1, 1);
  const numer = Math.min(indeks + 1, lacznieKrokow);
  const ukonczona = ekran.rodzaj === 'koniec';
  const biezacyNr = ekran.rodzaj === 'koniec' ? sekcje.length : sekcje.indexOf(ekran.krok);
  const segmenty: Segment[] = sekcje.map((krok, nr) => {
    if (nr < biezacyNr) return { id: krok, tytul: '', wypelnienie: 1 };
    if (nr > biezacyNr || ekran.rodzaj !== 'pytania') return { id: krok, tytul: '', wypelnienie: 0 };
    const wKroku = kolejka.filter((e): e is Extract<Ekran, { rodzaj: 'pytania' }> => e.rodzaj === 'pytania' && e.krok === krok);
    const liczbaPytan = wKroku.reduce((s, e) => s + e.pytania.length, 0);
    const poprzedzajace = wKroku.slice(0, wKroku.indexOf(ekran)).reduce((s, e) => s + e.pytania.length, 0);
    return {
      id: krok,
      tytul: '',
      wypelnienie: (poprzedzajace + ekran.pytania.length) / Math.max(liczbaPytan, 1),
    };
  });

  const krokAnkiety = ekran.rodzaj === 'koniec' ? null : KROKI_ANKIETY.find((k) => k.id === ekran.krok);
  const duzy = ekran.rodzaj === 'pytania' && ekran.pytania.length === 1;

  return (
    // min-h-dvh na telefonie i komputerze: pasek „Wstecz” / „Dalej” stoi zawsze przy dolnej krawędzi okna,
    // niezależnie od liczby pytań na ekranie (wariant A, 22.11: przyciski nie mogą skakać).
    <div ref={korzen} className="flex min-h-dvh flex-1 flex-col">
      <header className="mx-auto w-full max-w-3xl px-4 pt-3 pb-3">
        <div className="mb-1 flex min-h-11 items-center justify-end gap-3">
          <p className="text-sm font-bold text-tekst-drugi" data-postep>
            {ukonczona ? 'Gotowe' : `Krok ${numer} z ${lacznieKrokow}`}
          </p>
        </div>
        <PasekPostepu segmenty={segmenty} numer={numer} lacznie={lacznieKrokow} ukonczona={ukonczona} />
      </header>

      {/* Poza animowaną treścią: w obrębie sekcji stoi w miejscu, przy zmianie sekcji płynnie zmienia kolor i tekst. */}
      {ekran.rodzaj === 'pytania' && krokAnkiety && (
        <PasekSekcji ref={naglowek} krok={krokAnkiety} />
      )}

      <div ref={tresc} className="flex flex-1 flex-col">
        {ekran.rodzaj === 'pytania' && krokAnkiety && (
          <section aria-labelledby={`krok-${ekran.krok}`} data-ekran="pytania" className="mx-auto w-full max-w-3xl px-4 pb-6">
            {/* key ekranu: nowy ekran zaczyna bez rozwijania; rozwijają się tylko pytania dołożone później. */}
            <ObszarRozwijania key={idBiezacego} className="flex flex-col">
              {ekran.pytania.map((p) => {
                const podpis = podpisKontekstu(p, rodzina);
                return (
                  <Rozwijane key={`${p.klucz}|${idTytulu(p, rodzina)}`}>
                    <Karta className="flex flex-col gap-3">
                      {podpis && <p className="text-sm font-bold text-tekst-drugi">{podpis}</p>}
                      <PoleAnkiety
                        pytanie={widok(p)}
                        bledy={bledy[p.klucz] ?? []}
                        doPotwierdzenia={doSprawdzenia(p)}
                        duzy={duzy}
                        dataAnalizy={rodzina.dataAnalizy}
                        akcjeTytulow={akcjeTytulow(p)}
                        onZmiana={(w) => zmien(p, w)}
                        onPotwierdz={() => potwierdzOdpowiedz(p)}
                        onBlur={() => poOpuszczeniu(p)}
                      />
                      {p.def.wyjasnienie && <Wyjasnienie {...p.def.wyjasnienie} />}
                    </Karta>
                  </Rozwijane>
                );
              })}
            </ObszarRozwijania>
          </section>
        )}

        {ekran.rodzaj === 'koniec' && <EkranKoncowy rodzina={rodzina} naglowekRef={naglowek} />}
      </div>

      {/* Przyklejony do dołu okna (sticky, nie fixed) na telefonie i komputerze: zawsze w tym samym miejscu, na telefonie
          w zasięgu kciuka; na końcu strony staje nad stopką (wariant A, 22.11; wcześniej na komputerze stał pod pytaniami). */}
      <div className="sticky bottom-0 z-10 border-t border-szary-linia bg-white pb-[env(safe-area-inset-bottom)]">
        {/* „Wstecz” obok „Dalej”, pod ręką (uwaga z testów z użytkownikiem 22.11: mały link u góry był niezauważalny). */}
        <div className="mx-auto flex w-full max-w-3xl justify-end gap-3 px-4 py-3">
          {indeks > 0 && (
            <Przycisk wariant="drugi" onClick={wstecz} ikona={<IconArrowLeft size={20} aria-hidden />} className="shrink-0">
              Wstecz
            </Przycisk>
          )}
          <Przycisk pelnaSzerokosc className="flex-1 md:w-auto md:min-w-56 md:flex-none" onClick={ekran.rodzaj === 'koniec' ? zobaczWynik : dalej}>
            {ekran.rodzaj === 'koniec' ? etykietaZakonczenia : 'Dalej'}
          </Przycisk>
        </div>
      </div>
    </div>
  );
}
