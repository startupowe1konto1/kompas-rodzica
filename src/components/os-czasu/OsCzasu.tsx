'use client';

/**
 * Oś czasu planera (T2.5, design.md: „Jasny gantt z pigułkami”, wybory w wariancie C z linią z B).
 *  - tor na osobę z przypiętą etykietą (przy przewijaniu w poziomie na telefonie),
 *  - pigułki odcinków z `ukladOsi` (kolor typu, liczba tygodni, paski pracy, ramka błędu, kratka „przepadnie”),
 *  - linia „Dziś” ze znacznikiem u góry, linia porodu, siatka miesięcy albo lat, przybliżanie i przesuwanie,
 *  - oś to tylko PODGLĄD „kto, kiedy, jaki urlop”: odcinków nie edytuje się na osi (klik przewija do okresu
 *    w liście pod osią), a okna wyborów (pas z numerowanymi kółkami, pinezka) są nakładką tylko dla decyzji
 *    przekazanej w `nakladka` (po „Pokaż na osi” przy decyzji); bez niej pasa nie ma,
 *  - podgląd alternatywy (`planer.podglad`): pod każdym rodzicem wiersz „po zmianie” z przerywanymi pigułkami
 *    tylko tych odcinków, które się zmieniają; dla wybranej decyzji pinezka na wierszu osoby, która decyduje,
 *    i przerywana linia do pierwszego zmienionego odcinka drugiego rodzica (różnica planów, `podglad.ts`).
 * Kontrakt e2e: kontener `data-okno-od` / `data-okno-do`, pigułki `data-odcinek` `data-typ` `data-wybrany`,
 * znaczniki `data-znacznik`, okna `data-wybor` z `id="wybor-{kod}"`.
 */
import { useEffect, useLayoutEffect, useMemo, useRef, useState, useSyncExternalStore, type CSSProperties, type ReactNode } from 'react';
import { IconArrowLeft, IconArrowRight, IconEye } from '@tabler/icons-react';
import type { DataISO, Mozliwosc, Odcinek, Plan, Rodzina, WynikWalidacji } from '../../engine/types';
import { formatujDateKrotko } from '../format';
import type { Planer } from '../plan/usePlaner';
import { Karta, polacz } from '../ui';
import { nazwaMozliwosci } from '../wynik/etykiety';
import { dodajDni, parsujDate, pozniejsza } from './daty';
import { numeryDecyzji } from './decyzje';
import { KLASY_TYPU, KOLOR_TYPU, KROTKIE_NAZWY, WZOR_PRACY, WZOR_WYBORU, proc, tygodnieKrotko, wzorKratki } from './kolory';
import { NawigacjaOsi } from './NawigacjaOsi';
import { OdcinekOsi, WYS_PIGULKI, WYS_WIERSZA } from './OdcinekOsi';
import { OknaWyboruWarstwa, torOkien, wysokoscPasa } from './OknaWyboruWarstwa';
import { oknaWyboru } from './okna-wyboru';
import { celSkutku, opisStawki, type ZmianyOsoby } from './podglad';
import { skala } from './skala';
import { MIESIACE_MIANOWNIK, NAZWY_TYPOW } from './teksty';
import { ukladOsi, type KreskaPodzialki, type OdcinekNaOsi, type Podzialka, type SciezkaOsi } from './uklad';
import { useZmianyPodgladu } from './useZmianyPodgladu';
import { MIN_OKNO_DNI, dlugoscOkna, oddal, przesunOkno, przybliz, wysrodkujOkno, zakresOsi, type Okno } from './zakres';

type Kod = Mozliwosc['kod'];

// ───────────────────────── Geometria (px w pionie, % w poziomie) ─────────────────────────

const SZER_ETYKIETY = 84;
const MIN_SZER_TORU = 720;
const WYS_DZIS = 34;
const WYS_MIESIECY = 28;
const WYS_PORODU = 38;
const ODSTEP_TORU = 6;
const WYS_PINU = 40;
const WYS_BEZ_ZMIAN = 36;

const ZAPYTANIE_RUCHU = '(prefers-reduced-motion: reduce)';

function plynnie(): ScrollBehavior {
  return typeof window !== 'undefined' && window.matchMedia(ZAPYTANIE_RUCHU).matches ? 'auto' : 'smooth';
}

const ogranicz = (u: number) => Math.min(1, Math.max(0, u));

// ───────────────────────── Pomocnicze ─────────────────────────

/** Tygodnie, które przepadną: odcinek „w kratkę” na torze osoby, zaraz po ostatnim urlopie rodzicielskim w planie. */
function odcinkiPrzepadnie(plan: Plan, walidacja: WynikWalidacji | null): Odcinek[] {
  if (!walidacja) return [];
  const rodz = plan.odcinki.filter((o) => o.typ === 'rodzicielski');
  const mac = plan.odcinki.filter((o) => o.typ === 'macierzynski');
  const baza = rodz.length ? rodz : mac;
  if (!baza.length) return [];
  const po = dodajDni(baza.map((o) => o.do).reduce(pozniejsza), 1);
  return walidacja.wykorzystanie
    .filter((w) => (w.przepadnieDni ?? 0) > 0 && w.osobaId)
    .map((w) => ({ id: `przepadnie-${w.osobaId}-${w.pula}`, osobaId: w.osobaId!, typ: 'rodzicielski', od: po, do: dodajDni(po, (w.przepadnieDni ?? 0) - 1) }));
}

function opisMiesiaca(d: DataISO): string {
  const { rok, miesiac } = parsujDate(d);
  return `${MIESIACE_MIANOWNIK[miesiac - 1]} ${rok}`;
}

/** Podpisy podziałki bez nachodzenia na siebie: styczeń pokazuje rok i ma pierwszeństwo przed sąsiadem. */
function etykietyPodzialki(p: Podzialka, szerToruPx: number): { k: KreskaPodzialki; tekst: string }[] {
  const wynik: { k: KreskaPodzialki; tekst: string }[] = [];
  let koniec = -Infinity;
  for (const k of p.kreski) {
    const tekst = p.rodzaj === 'miesiac' && k.poczatekRoku ? String(k.rok) : k.etykieta;
    const x = k.pozycja * szerToruPx;
    if (x < koniec) {
      const poprzedni = wynik.at(-1);
      if (!k.poczatekRoku || !poprzedni || poprzedni.k.poczatekRoku) continue;
      wynik.pop();
    }
    wynik.push({ k, tekst });
    koniec = x + tekst.length * 6.5 + 8;
  }
  return wynik;
}

/** Za wąska pigułka (np. 2 tygodnie ojcowskiego) dostaje podpis obok, jeśli w wierszu jest za nią wolne miejsce. */
function maPodpisObok(o: OdcinekNaOsi, wszystkie: OdcinekNaOsi[], szerToruPx: number): boolean {
  if (o.szerokosc * szerToruPx >= 120) return false;
  const koniec = o.start + o.szerokosc;
  const potrzeba = 150 / szerToruPx;
  return koniec + potrzeba <= 1 && !wszystkie.some((x) => x.id !== o.id && x.wiersz === o.wiersz && x.start >= koniec && x.start < koniec + potrzeba);
}

// ───────────────────────── Komponent ─────────────────────────

export interface OsCzasuProps {
  planer: Planer;
  /** Kod decyzji pokazanej na osi („Pokaż na osi”): tylko jej okno wyboru i pinezka są nakładką. Null: sam podgląd. */
  nakladka?: Kod | null;
  /** Klik odcinka na osi: ekran przewija do tego okresu w liście (zmiany robi się tam). */
  onOdcinek?: (odcinekId: string) => void;
}

export function OsCzasu({ planer, nakladka = null, onOdcinek }: OsCzasuProps) {
  const { rodzina, plan } = planer;
  if (!rodzina || !plan) return null;
  // Nowa data porodu = nowa oś (okno wraca do domyślnego).
  return <Os key={rodzina.zdarzenie.data} planer={planer} rodzina={rodzina} plan={plan} nakladka={nakladka} onOdcinek={onOdcinek} />;
}

const ZAPYTANIE_PIONU = '(orientation: portrait)';

/** Czy ekran jest pionowy (telefon trzymany pionowo). Na serwerze: nie. Nie wymuszamy obrotu (WCAG 1.3.4), tylko podpowiadamy. */
function useEkranPionowy(): boolean {
  return useSyncExternalStore(
    (zmiana) => {
      const mq = window.matchMedia(ZAPYTANIE_PIONU);
      mq.addEventListener('change', zmiana);
      return () => mq.removeEventListener('change', zmiana);
    },
    () => window.matchMedia(ZAPYTANIE_PIONU).matches,
    () => false,
  );
}

interface OsProps {
  nakladka: Kod | null;
  onOdcinek?: (odcinekId: string) => void;
  planer: Planer;
  rodzina: Rodzina;
  plan: Plan;
}

interface Tor {
  sc: SciezkaOsi;
  gora: number;
  wysokosc: number;
  wiersze: number;
  kratki: OdcinekNaOsi[];
  /** Wiersz „po zmianie”: górna krawędź (od góry osi), wysokość, pigułki. */
  podglad: { gora: number; wysokosc: number; odcinki: OdcinekNaOsi[]; zmiany: ZmianyOsoby } | null;
  /** Pas pinezki (tylko osoba, która decyduje o wybranej decyzji). */
  pin: { gora: number } | null;
}

function Os({ planer, rodzina, plan, nakladka, onOdcinek }: OsProps) {
  const { walidacja, uprawnienia, podglad, wybranyOdcinekId } = planer;
  const pionowo = useEkranPionowy();
  const mozliwosci = useMemo(() => uprawnienia?.mozliwosci ?? [], [uprawnienia]);

  // ── okno widoku
  const zakres = useMemo(() => zakresOsi(rodzina, plan), [rodzina, plan]);
  const [oknoStan, setOkno] = useState<Okno>(() => zakres.oknoDomyslne);
  // Plan mógł poszerzyć zakres (albo go zwęzić): okno zawsze leży w zakresie.
  const okno = useMemo(() => przesunOkno(oknoStan, zakres, 0), [oknoStan, zakres]);
  const s = useMemo(() => skala(okno), [okno]);

  // ── przewijanie w poziomie (telefon)
  const przewijany = useRef<HTMLDivElement>(null);
  const [przewiniecie, setPrzewiniecie] = useState({ lewo: false, prawo: false, przewijalny: false });
  const odswiezPrzewiniecie = () => {
    const el = przewijany.current;
    if (!el) return;
    const przewijalny = el.scrollWidth > el.clientWidth + 1;
    setPrzewiniecie({ przewijalny, lewo: el.scrollLeft > 2, prawo: el.scrollLeft + el.clientWidth < el.scrollWidth - 2 });
  };
  /** Ile px ma tor na ekranie (bez kolumny etykiet). */
  const [szerToruPx, setSzerToruPx] = useState(MIN_SZER_TORU);
  useLayoutEffect(() => {
    const el = przewijany.current;
    if (!el) return;
    const zmierz = () => {
      setSzerToruPx(Math.max(MIN_SZER_TORU, el.clientWidth - SZER_ETYKIETY));
      odswiezPrzewiniecie();
    };
    zmierz();
    const ro = new ResizeObserver(zmierz);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  /** Przewija tak, żeby dzień był ok. 20% od lewej widocznej części toru (tylko gdy oś się przewija). */
  const pokazDzien = (data: DataISO, zachowanie: ScrollBehavior) => {
    const el = przewijany.current;
    if (!el || el.scrollWidth <= el.clientWidth) return;
    const szer = el.scrollWidth - SZER_ETYKIETY;
    const widac = el.clientWidth - SZER_ETYKIETY;
    const x = ogranicz(s.ulamek(data)) * szer;
    if (x >= el.scrollLeft + 8 && x <= el.scrollLeft + widac - 40) return;
    el.scrollTo({ left: Math.max(0, x - widac * 0.2), behavior: zachowanie });
  };

  // Na telefonie oś startuje od początku ciąży – przewijamy od razu do porodu.
  const pierwszePrzewiniecie = useRef(false);
  useEffect(() => {
    if (pierwszePrzewiniecie.current) return;
    pierwszePrzewiniecie.current = true;
    pokazDzien(dodajDni(rodzina.zdarzenie.data, -14), 'auto');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── decyzje i podgląd
  const numery = useMemo(() => numeryDecyzji(mozliwosci), [mozliwosci]);
  const wybranaM = nakladka ? (mozliwosci.find((m) => m.kod === nakladka && m.dostepna) ?? null) : null;

  const zaznaczDecyzje = (kod: Kod) => {
    if (kod !== nakladka && podglad) planer.zamknijPodglad();
    planer.wybierzDecyzje(kod);
    const karta = document.getElementById(`decyzja-${kod}`);
    if (karta) {
      karta.scrollIntoView({ block: 'nearest', behavior: plynnie() });
      karta.querySelector<HTMLElement>('[data-naglowek-decyzji]')?.focus({ preventScroll: true });
    }
  };

  // Wybrana decyzja: na telefonie przewiń do jej okna.
  useEffect(() => {
    if (wybranaM?.odKiedy) pokazDzien(wybranaM.odKiedy, plynnie());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wybranaM?.kod]);

  const { zmiany } = useZmianyPodgladu(planer);

  // ── układ
  const uklad = useMemo(() => ukladOsi(rodzina, plan, okno, walidacja ?? undefined), [rodzina, plan, okno, walidacja]);
  const osoby = useMemo(() => uklad.sciezki.map((sc) => sc.osobaId), [uklad]);
  const sciezkiPodgladu = useMemo(() => {
    if (!zmiany || !podglad) return null;
    const alt = ukladOsi(rodzina, { ...podglad.plan, odcinki: zmiany.flatMap((z) => z.doPodgladu) }, okno);
    return new Map(alt.sciezki.map((sc) => [sc.osobaId, sc]));
  }, [zmiany, podglad, rodzina, okno]);
  const noweStawki = useMemo(() => new Map((zmiany ?? []).flatMap((z) => z.stawki.map((st) => [st.odcinek.id, st.po] as const))), [zmiany]);

  const przepadnie = useMemo(() => {
    const odc = odcinkiPrzepadnie(plan, walidacja);
    if (!odc.length) return new Map<string, OdcinekNaOsi[]>();
    const sc = ukladOsi(rodzina, { ...plan, odcinki: odc }, okno).sciezki;
    return new Map(sc.map((x) => [x.osobaId, x.odcinki]));
  }, [rodzina, plan, walidacja, okno]);

  const okna = useMemo(() => torOkien(oknaWyboru(wybranaM ? [wybranaM] : [], okno)), [wybranaM, okno]);
  const wysPasa = wysokoscPasa(okna.liczbaTorow);
  const decydent = wybranaM?.ktoDecyduje && wybranaM.odKiedy && osoby.includes(wybranaM.ktoDecyduje) ? wybranaM.ktoDecyduje : null;

  const goraTorow = WYS_DZIS + wysPasa + WYS_MIESIECY;
  let y = goraTorow;
  const tory: Tor[] = [];
  for (const sc of uklad.sciezki) {
    const kratki = (przepadnie.get(sc.osobaId) ?? []).map((k) => {
      const kolizja = sc.odcinki.some((o) => o.wiersz === 0 && o.start < k.start + k.szerokosc && k.start < o.start + o.szerokosc);
      return { ...k, wiersz: kolizja ? sc.liczbaWierszy : 0 };
    });
    const wiersze = Math.max(sc.liczbaWierszy, ...kratki.map((k) => k.wiersz + 1));
    const gora = y;
    let wnetrze = ODSTEP_TORU + wiersze * WYS_WIERSZA;
    let podgladToru: Tor['podglad'] = null;
    const z = zmiany?.find((x) => x.osobaId === sc.osobaId);
    if (z) {
      const alt = sciezkiPodgladu?.get(sc.osobaId);
      const wys = z.doPodgladu.length && alt ? alt.liczbaWierszy * WYS_WIERSZA : WYS_BEZ_ZMIAN;
      podgladToru = { gora: gora + wnetrze, wysokosc: wys, odcinki: alt?.odcinki ?? [], zmiany: z };
      wnetrze += wys;
    }
    let pin: Tor['pin'] = null;
    if (decydent === sc.osobaId) {
      pin = { gora: gora + wnetrze };
      wnetrze += WYS_PINU;
    }
    const wysokosc = wnetrze + ODSTEP_TORU;
    y += wysokosc;
    tory.push({ sc, gora, wysokosc, wiersze, kratki, podglad: podgladToru, pin });
  }
  const dolTorow = y;
  const wysokosc = dolTorow + WYS_PORODU;

  const dzis = uklad.znaczniki.find((z) => z.rodzaj === 'dzis');
  const porod = uklad.znaczniki.find((z) => z.rodzaj === 'porod');

  // ── pinezka i linia skutku
  const cel = wybranaM && zmiany ? celSkutku(zmiany, wybranaM.ktoDecyduje) : null;
  const torDecydenta = tory.find((t) => t.pin);
  let linia: ReactNode = null;
  let pinezka: ReactNode = null;
  if (wybranaM && torDecydenta?.pin && wybranaM.odKiedy) {
    const x0 = ogranicz(s.ulamek(wybranaM.odKiedy));
    const x1 = wybranaM.doKiedy ? ogranicz(s.ulamek(dodajDni(wybranaM.doKiedy, 1))) : x0;
    const yPin = torDecydenta.pin.gora + WYS_PINU / 2;
    const kto = torDecydenta.sc.etykieta.toLowerCase();
    const etykietaPoLewej = x0 > 0.62;
    pinezka = (
      <div data-pinezka={wybranaM.kod} data-osoba={torDecydenta.sc.osobaId}>
        {/* klamra okna od–do na wierszu osoby, która decyduje */}
        {x1 > x0 && (
          <div
            aria-hidden
            className="absolute h-3 rounded-b-[5px] border-x-[3px] border-b-[3px] border-granat"
            style={{ left: proc(x0), width: proc(x1 - x0), top: yPin - 10, ...WZOR_WYBORU }}
          />
        )}
        <span
          aria-hidden
          className="absolute flex size-8 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 border-granat bg-granat text-sm font-black text-white shadow-[0_0_0_3px_white]"
          style={{ left: proc(x0), top: yPin }}
        >
          {numery.get(wybranaM.kod)}
        </span>
        <span
          className={polacz('absolute -translate-y-1/2 whitespace-nowrap rounded-full bg-white/90 px-1.5 text-sm font-bold text-granat', etykietaPoLewej && '-translate-x-full')}
          style={{ left: etykietaPoLewej ? `calc(${proc(x0)} - 22px)` : `calc(${proc(Math.max(x0, x1))} + 22px)`, top: yPin }}
        >
          Decyduje {kto}
          <span className="font-normal text-tekst-drugi">
            {' · '}
            {wybranaM.doKiedy ? `do ${formatujDateKrotko(wybranaM.doKiedy)}` : `od ${formatujDateKrotko(wybranaM.odKiedy)}`}
          </span>
        </span>
      </div>
    );

    const torCelu = cel ? tory.find((t) => t.sc.osobaId === cel.osobaId) : undefined;
    if (cel && torCelu) {
      const xT = ogranicz(s.ulamek(cel.data));
      let yT: number | null = null;
      if (cel.wiersz === 'podglad' && torCelu.podglad) {
        const p = torCelu.podglad.odcinki.find((o) => o.id === cel.odcinekId);
        if (p) yT = torCelu.podglad.gora + p.wiersz * WYS_WIERSZA + WYS_WIERSZA / 2;
      } else {
        const p = torCelu.sc.odcinki.find((o) => o.id === cel.odcinekId);
        if (p) yT = torCelu.gora + ODSTEP_TORU + p.wiersz * WYS_WIERSZA + WYS_WIERSZA / 2;
      }
      if (yT !== null) {
        const wDol = torCelu.gora > torDecydenta.gora;
        const yZalom = wDol ? torCelu.gora - 2 : torCelu.gora + torCelu.wysokosc + 2;
        const pion = (x: number, a: number, b: number): CSSProperties => ({ left: proc(x), top: Math.min(a, b), height: Math.abs(b - a) });
        const yStart = wDol ? yPin + 16 : yPin - 16;
        linia = (
          <div aria-hidden data-linia-skutku={cel.osobaId} className="pointer-events-none">
            <div className="absolute -ml-px border-l-2 border-dashed border-granat" style={pion(x0, yStart, yZalom)} />
            <div className="absolute -mt-px border-t-2 border-dashed border-granat" style={{ left: proc(Math.min(x0, xT)), width: proc(Math.abs(xT - x0)), top: yZalom }} />
            <div className="absolute -ml-px border-l-2 border-dashed border-granat" style={pion(xT, yZalom, yT)} />
          </div>
        );
        const kropka = (
          <span
            aria-hidden
            data-cel-skutku={cel.osobaId}
            className="absolute size-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-[3px] border-white bg-granat shadow-[0_0_0_2px_var(--color-granat)]"
            style={{ left: proc(xT), top: yT }}
          />
        );
        pinezka = (
          <>
            {pinezka}
            {kropka}
          </>
        );
      }
    }
  }

  // ── nawigacja okna
  const dlugosc = dlugoscOkna(okno);
  const krok = Math.max(7, Math.round(dlugosc / 4));
  const kotwica = (): DataISO => {
    const el = przewijany.current;
    if (!el || el.scrollWidth <= el.clientWidth) return dodajDni(okno.od, Math.floor(dlugosc / 2));
    const szer = el.scrollWidth - SZER_ETYKIETY;
    const srodek = el.scrollLeft + (el.clientWidth - SZER_ETYKIETY) / 2;
    return s.data(ogranicz(srodek / szer));
  };
  const przesun = (kierunek: 1 | -1) => {
    const el = przewijany.current;
    const mozeTor = el && el.scrollWidth > el.clientWidth && (kierunek < 0 ? el.scrollLeft > 2 : el.scrollLeft + el.clientWidth < el.scrollWidth - 2);
    if (el && mozeTor) {
      el.scrollBy({ left: kierunek * (el.clientWidth - SZER_ETYKIETY) * 0.7, behavior: plynnie() });
      return;
    }
    setOkno((o) => przesunOkno(o, zakres, kierunek * krok));
    if (el && el.scrollWidth > el.clientWidth) el.scrollLeft = kierunek > 0 ? 0 : el.scrollWidth;
  };
  const pelne = okno.od === zakres.od && okno.do === zakres.do;

  const tekstPodgladu = wybranaM && podglad ? `decyzja ${numery.get(wybranaM.kod)}: ${nazwaMozliwosci(wybranaM.kod)}` : null;

  return (
    <Karta jako="section" aria-labelledby="os-naglowek" className="flex flex-col gap-4">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h2 id="os-naglowek" tabIndex={-1} className="text-lg font-black text-granat lg:text-xl">
          Oś czasu
        </h2>
        <Legenda plan={plan} przepadnie={przepadnie.size > 0} wybory={okna.okna.length > 0} podglad={!!podglad} />
      </div>

      <NawigacjaOsi
        onWczesniej={() => przesun(-1)}
        onPozniej={() => przesun(1)}
        onPrzybliz={() => setOkno((o) => przybliz(o, zakres, kotwica()))}
        onOddal={() => setOkno((o) => oddal(o, zakres, kotwica()))}
        onCalosc={() => setOkno({ od: zakres.od, do: zakres.do })}
        moznaWczesniej={okno.od > zakres.od || przewiniecie.lewo}
        moznaPozniej={okno.do < zakres.do || przewiniecie.prawo}
        moznaPrzyblizyc={dlugosc > MIN_OKNO_DNI}
        moznaOddalic={!pelne}
        opisOkna={`${opisMiesiaca(okno.od)} – ${opisMiesiaca(okno.do)}`}
      />

      {uklad.znacznikiPozaOknem.length > 0 && (
        <div className="-mt-1 flex flex-wrap gap-2 text-sm">
          {uklad.znacznikiPozaOknem.map((z) => (
            <button
              key={z.rodzaj}
              type="button"
              data-znacznik-poza={z.rodzaj}
              onClick={() => setOkno((o) => wysrodkujOkno(o, zakres, z.data))}
              className="inline-flex min-h-11 items-center gap-1.5 rounded-full border border-szary-ramka bg-white px-3 font-bold text-granat hover:bg-szary-kafel"
            >
              {z.strona === 'lewo' && <IconArrowLeft size={16} stroke={2.25} aria-hidden />}
              {z.etykieta} {formatujDateKrotko(z.data)}
              {z.strona === 'prawo' && <IconArrowRight size={16} stroke={2.25} aria-hidden />}
              <span className="sr-only">– pokaż na osi</span>
            </button>
          ))}
        </div>
      )}

      <div
        ref={przewijany}
        onScroll={odswiezPrzewiniecie}
        className="-mx-4 overflow-x-auto overscroll-x-contain border-y border-szary-linia [scrollbar-width:thin] lg:-mx-6"
      >
        <div
          className="relative [overflow:clip]"
          style={{ minWidth: SZER_ETYKIETY + MIN_SZER_TORU, height: wysokosc }}
          data-okno-od={okno.od}
          data-okno-do={okno.do}
          data-podzialka={uklad.podzialka.rodzaj}
        >
          {/* Warstwa pod pigułkami: siatka, pas wybranej decyzji. */}
          <div aria-hidden className="pointer-events-none absolute inset-y-0 right-0" style={{ left: SZER_ETYKIETY }}>
            {uklad.podzialka.kreski.map((k) => (
              <div
                key={k.data}
                className={polacz('absolute w-px', k.poczatekRoku ? 'bg-szary-ramka/70' : 'bg-szary-linia')}
                style={{ left: proc(k.pozycja), top: goraTorow - WYS_MIESIECY, bottom: WYS_PORODU }}
              />
            ))}
            {wybranaM?.odKiedy && (
              <div
                className="absolute opacity-40"
                style={{
                  left: proc(ogranicz(s.ulamek(wybranaM.odKiedy))),
                  width: proc(Math.max(0.004, ogranicz(s.ulamek(dodajDni(wybranaM.doKiedy ?? wybranaM.odKiedy, 1))) - ogranicz(s.ulamek(wybranaM.odKiedy)))),
                  top: goraTorow,
                  height: dolTorow - goraTorow,
                  ...WZOR_WYBORU,
                }}
              />
            )}
            {linia}
          </div>

          {/* Podziałka */}
          <div className="absolute right-0" style={{ left: SZER_ETYKIETY, top: goraTorow - WYS_MIESIECY, height: WYS_MIESIECY }}>
            {etykietyPodzialki(uklad.podzialka, szerToruPx).map(({ k, tekst }) => (
              <span
                key={k.data}
                className={polacz(
                  'absolute top-1 whitespace-nowrap pl-1.5 text-sm leading-tight',
                  k.poczatekRoku ? 'font-bold text-tekst' : 'text-tekst-drugi',
                )}
                style={{ left: proc(k.pozycja) }}
                title={k.etykietaPelna}
              >
                {tekst}
              </span>
            ))}
          </div>

          {/* Pas okien wyboru */}
          {wysPasa > 0 && (
            <div className="absolute right-0 z-[6]" style={{ left: SZER_ETYKIETY, top: WYS_DZIS, height: wysPasa }}>
              <span className="sr-only">Okna wyboru:</span>
              <OknaWyboruWarstwa okna={okna.okna} numery={numery} nazwa={nazwaMozliwosci} wybrana={wybranaM?.kod ?? null} onWybierz={zaznaczDecyzje} />
            </div>
          )}

          {/* Tory osób */}
          {tory.map((t) => (
            <div key={t.sc.osobaId} className="absolute inset-x-0 border-t border-szary-linia" style={{ top: t.gora, height: t.wysokosc }} data-osoba={t.sc.osobaId}>
              <div
                className="sticky left-0 z-20 h-full bg-white shadow-[1px_0_0_var(--color-szary-linia)]"
                style={{ width: SZER_ETYKIETY }}
              >
                <span className="absolute left-3 right-1 flex items-center font-bold leading-tight text-granat" style={{ top: ODSTEP_TORU, height: WYS_WIERSZA }}>
                  {t.sc.etykieta}
                </span>
                {t.podglad && (
                  <span
                    className="absolute left-3 right-1 flex items-center text-sm leading-tight text-tekst-drugi"
                    style={{ top: t.podglad.gora - t.gora, height: Math.min(WYS_WIERSZA, t.podglad.wysokosc) }}
                  >
                    po zmianie
                  </span>
                )}
              </div>
              <div
                data-sciezka={t.sc.osobaId}
                role="group"
                aria-label={`${t.sc.etykieta}: odcinki`}
                className="absolute right-0"
                style={{ left: SZER_ETYKIETY, top: ODSTEP_TORU, height: t.wiersze * WYS_WIERSZA }}
              >
                {t.sc.odcinki.map((o) => (
                  <OdcinekOsi
                    key={o.id}
                    odcinek={o}
                    wybrany={o.id === wybranyOdcinekId}
                    onWybierz={onOdcinek}
                  />
                ))}
                {t.sc.odcinki
                  .filter((o) => maPodpisObok(o, t.sc.odcinki, szerToruPx))
                  .map((o) => (
                    <span
                      key={`podpis-${o.id}`}
                      aria-hidden
                      className="pointer-events-none absolute flex items-center whitespace-nowrap pl-1.5 text-sm font-bold text-tekst"
                      style={{ left: proc(o.start + o.szerokosc), top: o.wiersz * WYS_WIERSZA, height: WYS_WIERSZA }}
                    >
                      {KROTKIE_NAZWY[o.typ]} <span className="ml-1 font-normal text-tekst-drugi">{tygodnieKrotko(o.dni)}</span>
                    </span>
                  ))}
                {t.kratki.map((k) => (
                  <KratkaPrzepadnie key={k.id} odcinek={k} />
                ))}
                {t.sc.odcinki.length === 0 && t.kratki.length === 0 && (
                  // Przyklejony do lewej krawędzi widoku (za kolumną etykiet): oś na telefonie startuje przewinięta
                  // do „Dziś”, więc napis na początku toru byłby poza ekranem.
                  <span
                    data-pusty-tor
                    className="sticky flex h-full w-max items-center text-sm text-tekst-drugi"
                    style={{ left: SZER_ETYKIETY + 8 }}
                  >
                    Bez urlopu w tym okresie
                  </span>
                )}
              </div>
              {t.podglad && (
                <div
                  data-podglad-osoba={t.sc.osobaId}
                  data-zmiany={t.podglad.zmiany.pierwszaZmiana ? 'tak' : 'nie'}
                  className="absolute right-0 border-t border-dashed border-szary-ramka bg-tlo/50"
                  style={{ left: SZER_ETYKIETY, top: t.podglad.gora - t.gora, height: t.podglad.wysokosc }}
                >
                  {t.podglad.odcinki.map((o) => (
                    <OdcinekOsi
                      key={o.id}
                      odcinek={o}
                      duch
                      dopisek={
                        noweStawki.has(o.id) ? (
                          <span className="rounded-full bg-granat px-1.5 py-0.5 text-sm font-bold text-white">{opisStawki(noweStawki.get(o.id)!)}</span>
                        ) : undefined
                      }
                    />
                  ))}
                  {t.podglad.odcinki
                    .filter((o) => maPodpisObok(o, t.podglad!.odcinki, szerToruPx))
                    .map((o) => (
                      <span
                        key={`podpis-${o.id}`}
                        aria-hidden
                        className="pointer-events-none absolute flex items-center whitespace-nowrap pl-1.5 text-sm font-bold text-tekst-drugi"
                        style={{ left: proc(o.start + o.szerokosc), top: o.wiersz * WYS_WIERSZA, height: WYS_WIERSZA }}
                      >
                        {KROTKIE_NAZWY[o.typ]}
                      </span>
                    ))}
                  {t.podglad.zmiany.pierwszaZmiana === null ? (
                    <span className="sticky left-0 flex h-full items-center px-2 text-sm text-tekst-drugi">Bez zmian dla tej osoby</span>
                  ) : (
                    t.podglad.odcinki.length === 0 && (
                      <span className="sticky left-0 flex h-full items-center px-2 text-sm text-tekst-drugi">
                        {t.podglad.zmiany.doPodgladu.length === 0 ? 'Odcinek znika z planu' : 'Zmiana poza widocznym okresem'}
                      </span>
                    )
                  )}
                </div>
              )}
            </div>
          ))}

          {/* Linie dziś i porodu nad torami (cienkie, nie zasłaniają treści pigułek). */}
          <div className="pointer-events-none absolute inset-y-0 right-0 z-[5]" style={{ left: SZER_ETYKIETY }}>
            {dzis && (
              <div data-znacznik="dzis" data-data={dzis.data}>
                <div className="absolute -ml-px border-l-2 border-dashed border-tekst-drugi" style={{ left: proc(dzis.pozycja), top: WYS_DZIS - 6, bottom: WYS_PORODU }} />
                <span
                  className="absolute top-1 -translate-x-1/2 whitespace-nowrap rounded-full bg-tekst-drugi px-2.5 py-0.5 text-sm font-bold text-white"
                  style={{ left: proc(dzis.pozycja) }}
                >
                  Dziś
                </span>
              </div>
            )}
            {porod && (
              <div data-znacznik="porod" data-data={porod.data}>
                <div className="absolute -ml-px w-0.5 bg-granat" style={{ left: proc(porod.pozycja), top: goraTorow - WYS_MIESIECY, bottom: WYS_PORODU - 8 }} />
                <span
                  className={polacz(
                    'absolute bottom-1.5 whitespace-nowrap rounded-full bg-granat px-2.5 py-0.5 text-sm font-bold text-white',
                    porod.pozycja > 0.8 ? '-translate-x-full' : '-translate-x-3',
                  )}
                  style={{ left: proc(porod.pozycja) }}
                >
                  {porod.etykieta} {formatujDateKrotko(porod.data)}
                </span>
              </div>
            )}
          </div>

          {/* Pinezka decyzji i cel linii – nad pigułkami. */}
          {pinezka && (
            <div className="pointer-events-none absolute inset-y-0 right-0 z-[7]" style={{ left: SZER_ETYKIETY }}>
              {pinezka}
            </div>
          )}

          {/* Kolumna pod etykietami osób – zasłania pas wyborów i linie przy przewijaniu w poziomie. */}
          <div aria-hidden className="sticky left-0 z-[15] bg-white" style={{ width: SZER_ETYKIETY, height: goraTorow }} />
        </div>
      </div>

      {przewiniecie.przewijalny && (
        <p data-podpowiedz-osi className="-mt-2 text-sm text-tekst-drugi">
          Oś jest szersza niż ekran: można ją przesuwać palcem albo przyciskami „Wcześniej” i „Później”.
          {pionowo && <span data-podpowiedz-obrotu> Po obróceniu telefonu widać więcej.</span>}
        </p>
      )}

      <div role="status" aria-live="polite" className="empty:hidden">
        {tekstPodgladu && (
          <p className="flex flex-col gap-1 rounded-komunikat border-2 border-dashed border-granat px-3 py-2 text-sm font-bold text-granat sm:flex-row sm:items-center sm:gap-3">
            <span className="flex min-w-0 flex-1 gap-2">
              <IconEye size={20} stroke={1.75} aria-hidden className="mt-px shrink-0" />
              <span>Podgląd ({tekstPodgladu}). Przerywane pigułki w wierszach „po zmianie” pokazują, co się zmieni u każdej osoby.</span>
            </span>
            <a href={`#decyzja-${wybranaM!.kod}`} className="min-h-11 content-center underline underline-offset-2">
              Przejdź do decyzji
            </a>
          </p>
        )}
      </div>
    </Karta>
  );
}

// ───────────────────────── Kratka „przepadnie” ─────────────────────────

function KratkaPrzepadnie({ odcinek: o }: { odcinek: OdcinekNaOsi }) {
  const tyg = Math.round(o.dni / 7);
  return (
    <div
      data-przepadnie={o.osobaId}
      role="img"
      aria-label={`${tyg} tyg. urlopu rodzicielskiego tylko dla tej osoby przepadnie, jeśli go nie wykorzysta`}
      className="@container absolute flex items-center justify-center overflow-hidden rounded-odcinek border-2 border-dashed border-odc-rodzicielski"
      style={{
        left: proc(o.start),
        width: proc(o.szerokosc),
        top: o.wiersz * WYS_WIERSZA + (WYS_WIERSZA - WYS_PIGULKI) / 2,
        height: WYS_PIGULKI,
        ...wzorKratki('rgb(0 65 110 / 0.32)'),
      }}
    >
      <span className="whitespace-nowrap rounded-full bg-white px-2 py-0.5 text-sm font-bold text-granat">
        {tyg} tyg.<span className="hidden @[150px]:inline"> przepadnie</span>
      </span>
    </div>
  );
}

// ───────────────────────── Legenda ─────────────────────────

/** Legenda opisuje słowami każdy kolor i wzór, który jest na osi (kolor nigdy nie niesie znaczenia sam). */
function Legenda({ plan, przepadnie, wybory, podglad }: { plan: Plan; przepadnie: boolean; wybory: boolean; podglad: boolean }) {
  // Typy o tym samym kolorze (np. macierzyński i „na warunkach macierzyńskiego”) to jedna pozycja.
  const typy = [...new Map(plan.odcinki.map((o) => [KOLOR_TYPU[o.typ], o.typ] as const)).values()];
  const pozycje: { nazwa: string; probka: ReactNode }[] = typy.map((t) => ({
    nazwa: NAZWY_TYPOW[t],
    probka: <span className={polacz('size-4 rounded-[4px]', KLASY_TYPU[t])} />,
  }));
  if (plan.odcinki.some((o) => o.wymiarPracy)) {
    pozycje.push({ nazwa: 'Białe ukośne paski: urlop łączony z pracą', probka: <span className="size-4 rounded-[4px] bg-odc-rodzicielski" style={WZOR_PRACY} /> });
  }
  if (przepadnie) {
    pozycje.push({ nazwa: 'Kratka: tygodnie, które przepadną', probka: <span className="size-4 rounded-[4px] border border-odc-rodzicielski" style={wzorKratki('rgb(0 65 110 / 0.5)')} /> });
  }
  if (wybory) pozycje.push({ nazwa: 'Prążki z numerem: czas na decyzję', probka: <span className="size-4 rounded-[4px] border border-zielen-ciemna" style={WZOR_WYBORU} /> });
  if (podglad) pozycje.push({ nazwa: 'Przerywana ramka: tak będzie po zmianie', probka: <span className="size-4 rounded-[4px] border-2 border-dashed border-granat bg-white" /> });
  pozycje.push({ nazwa: 'Przerywana linia: dziś', probka: <span className="h-4 w-0 border-l-2 border-dashed border-tekst-drugi" /> });
  pozycje.push({ nazwa: 'Granatowa linia: poród', probka: <span className="h-4 w-0.5 bg-granat" /> });
  return (
    <ul aria-label="Legenda osi" data-legenda-osi className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-tekst-drugi">
      {pozycje.map((p) => (
        <li key={p.nazwa} className="inline-flex items-center gap-1.5">
          <span aria-hidden className="inline-flex">
            {p.probka}
          </span>
          {p.nazwa}
        </li>
      ))}
    </ul>
  );
}
