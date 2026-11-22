'use client';

/**
 * Decyzje pod osią (T2.5) jako zwarta lista. Każda dostępna możliwość z `uprawnienia.mozliwosci` to wiersz: numer
 * (jak w pasie okna wyboru na osi), tytuł, kto decyduje, termin „Termin decyzji: …” i przycisk „Pokaż na osi”
 * (przełącznik: okno wyboru i podgląd „po zmianie” są nakładką na osi tylko do czasu „Ukryj z osi”, zwinięcia
 * wiersza albo zastosowania zmiany). Rozwinięty wiersz (button z aria-expanded) ma: jedno zdanie, czego dotyczy
 * decyzja, dwa wiersze radio („Tak jak teraz w planie” / alternatywa, każdy z jednym zdaniem skutku), do 3 punktów
 * „Co się wtedy stanie”, zwinięte „Więcej szczegółów” (reszta skutków, okno decyzji) i przepis małym tekstem.
 * Alternatywa bez gotowej akcji ma przycisk „Zmień w liście okresów” (rozwija panel zmian przy okresie).
 * Niedostępne wybory to jedna zwijana linia „N możliwości jest teraz niedostępnych”, w środku zawsze z powodem.
 */
import { useEffect, useState } from 'react';
import { IconArrowRight, IconCheck, IconChevronDown, IconEye, IconEyeOff, IconListDetails, IconLoader2, IconLock } from '@tabler/icons-react';
import type { Mozliwosc } from '../../engine/types';
import { formatujDate } from '../format';
import { decyzje, type Decyzja } from '../os-czasu/decyzje';
import { opisZmian, type ZmianyOsoby } from '../os-czasu/podglad';
import { useZmianyPodgladu, type OsobaPodgladu } from '../os-czasu/useZmianyPodgladu';
import { okresWyboru } from '../os-czasu/OknaWyboruWarstwa';
import { Przycisk, polacz } from '../ui';
import { nazwaMozliwosci } from '../wynik/etykiety';
import { odcinekDlaDecyzji } from './odcinekDecyzji';
import { zdanieNiedostepnych } from './niedostepne';
import type { Planer } from './usePlaner';

type Kod = Mozliwosc['kod'];

export interface KartyDecyzjiProps {
  planer: Planer;
  /** Decyzja pokazana teraz na osi jako nakładka (stan trzyma `EkranPlanu`, bo czyta go też oś). */
  naOsi: Kod | null;
  /** Pokazuje decyzję na osi (rozwija oś i przewija do niej) albo ją ukrywa (null). */
  onNaOsi: (kod: Kod | null) => void;
  /** Przewija do okresu w liście i rozwija jego panel zmian (okres już jest zaznaczony w planerze). */
  onDoListy: (odcinekId: string | null) => void;
}

export function KartyDecyzji({ planer, naOsi, onNaOsi, onDoListy }: KartyDecyzjiProps) {
  const { rodzina, plan, uprawnienia, podglad, wybranaDecyzja } = planer;
  const { zmiany, osoby } = useZmianyPodgladu(planer);
  const [laduje, setLaduje] = useState<Kod | null>(null);
  const [blad, setBlad] = useState<Kod | null>(null);
  const [zastosowano, setZastosowano] = useState<Kod | null>(null);
  // Rozwinięte wiersze. Wybór decyzji (z osi, hasha albo przycisku) rozwija jej wiersz: stan poprawiamy w trakcie renderu.
  const [otwarte, setOtwarte] = useState<Kod[]>([]);
  const [poprzedniaWybrana, setPoprzedniaWybrana] = useState(wybranaDecyzja);
  if (poprzedniaWybrana !== wybranaDecyzja) {
    setPoprzedniaWybrana(wybranaDecyzja);
    if (wybranaDecyzja && !otwarte.includes(wybranaDecyzja)) setOtwarte([...otwarte, wybranaDecyzja]);
  }
  const otworz = (kod: Kod) => setOtwarte((o) => (o.includes(kod) ? o : [...o, kod]));
  const przelacz = (kod: Kod) => {
    // Zwinięcie decyzji zdejmuje jej nakładkę z osi.
    if (otwarte.includes(kod) && naOsi === kod) ukryjZOsi();
    setOtwarte((o) => (o.includes(kod) ? o.filter((k) => k !== kod) : [...o, kod]));
  };
  const [niedostepneOtwarte, setNiedostepneOtwarte] = useState(false);
  const ukryjZOsi = () => {
    if (podglad) planer.zamknijPodglad();
    onNaOsi(null);
  };

  // Odnośniki #wybor-{kod} (z wyniku) i #decyzja-{kod}: zaznacz kartę i przewiń do niej (okna wyboru na osi
  // są teraz tylko nakładką po „Pokaż na osi”, więc #wybor-{kod} też prowadzi do karty). Niedostępna możliwość
  // leży w zwiniętej liście: najpierw ją rozwijamy.
  const gotowe = uprawnienia !== null && plan !== null;
  const { wybierzDecyzje } = planer;
  useEffect(() => {
    if (!gotowe) return;
    const przejdz = () => {
      const m = /^#(wybor|decyzja)-(.+)$/.exec(window.location.hash);
      if (!m) return;
      const karta = document.getElementById(`decyzja-${m[2]}`);
      if (!karta) return;
      if (karta.dataset.dostepna === 'true') {
        wybierzDecyzje(m[2] as Kod);
        karta.scrollIntoView({ block: 'center' });
        karta.querySelector<HTMLElement>('[data-naglowek-decyzji]')?.focus({ preventScroll: true });
      } else {
        setNiedostepneOtwarte(true);
        window.setTimeout(() => karta.scrollIntoView({ block: 'center' }), 50);
      }
    };
    przejdz();
    window.addEventListener('hashchange', przejdz);
    return () => window.removeEventListener('hashchange', przejdz);
  }, [gotowe, wybierzDecyzje]);

  if (!rodzina || !plan || !uprawnienia) return null;
  const lista = decyzje(rodzina, plan, uprawnienia);
  const niedostepne = uprawnienia.mozliwosci.filter((m) => !m.dostepna);
  if (lista.length === 0 && niedostepne.length === 0) return null;

  const etykietaOsoby = (osobaId?: string) => osoby.find((o) => o.osobaId === osobaId)?.etykieta ?? 'Rodzic';

  const wybierzPlan = (d: Decyzja) => {
    setBlad(null);
    setZastosowano(null);
    planer.wybierzDecyzje(d.kod);
    if (podglad) planer.zamknijPodglad();
  };
  /** „Pokaż na osi” jest przełącznikiem: drugi raz ukrywa nakładkę i podgląd. */
  const pokaz = async (d: Decyzja, przelacz = true) => {
    setBlad(null);
    setZastosowano(null);
    planer.wybierzDecyzje(d.kod);
    otworz(d.kod);
    if (przelacz && naOsi === d.kod) {
      ukryjZOsi();
      return;
    }
    if (!d.alternatywa.akcja) {
      if (podglad) planer.zamknijPodglad();
      onNaOsi(d.kod);
      return;
    }
    setLaduje(d.kod);
    const ok = await planer.pokazPodglad(d.alternatywa.akcja);
    setLaduje(null);
    if (!ok) setBlad(d.kod);
    else onNaOsi(d.kod);
  };
  /** Alternatywa bez gotowej akcji: zmianę robi się w liście okresów, przy pasującym okresie. */
  const doListy = (d: Decyzja) => {
    setBlad(null);
    setZastosowano(null);
    if (podglad) planer.zamknijPodglad();
    planer.wybierzDecyzje(d.kod);
    otworz(d.kod);
    const odcinekId = odcinekDlaDecyzji(plan, d.mozliwosc);
    if (odcinekId) planer.wybierzOdcinek(odcinekId);
    onDoListy(odcinekId);
  };
  const zastosuj = (d: Decyzja) => {
    planer.zastosujPodglad();
    setZastosowano(d.kod);
    onNaOsi(null);
  };

  return (
    <section aria-labelledby="decyzje-naglowek" data-slot="karty-decyzji" className="flex flex-col gap-4">
      <div>
        <h2 id="decyzje-naglowek" className="text-lg font-black text-granat lg:text-xl">
          Decyzje do podjęcia
        </h2>
        <p className="mt-1 max-w-prose text-tekst-drugi">
          Po rozwinięciu decyzji widać, co się wtedy stanie. „Pokaż na osi” pokazuje zmianę na osi czasu, zanim cokolwiek zmieni się w planie.
        </p>
      </div>

      {lista.length > 0 && (
        <ol className="flex flex-col gap-3">
          {lista.map((d) => {
            const wybrana = wybranaDecyzja === d.kod;
            const aktywna = wybrana && podglad !== null;
            return (
              <KartaDecyzji
                key={d.kod}
                d={d}
                dzis={rodzina.dataAnalizy}
                wybrana={wybrana}
                aktywna={aktywna}
                laduje={laduje === d.kod}
                zajety={planer.zajety}
                naOsi={naOsi === d.kod}
                blad={blad === d.kod ? (planer.blad?.komunikat ?? null) : null}
                zastosowano={zastosowano === d.kod}
                rozwiniety={otwarte.includes(d.kod)}
                onPrzelacz={() => przelacz(d.kod)}
                onDoListy={() => doListy(d)}
                kto={etykietaOsoby(d.mozliwosc.ktoDecyduje)}
                osoby={osoby}
                zmiany={aktywna ? zmiany : null}
                onPlan={() => wybierzPlan(d)}
                onPokaz={() => void pokaz(d)}
                onAlternatywa={() => void pokaz(d, false)}
                onZastosuj={() => zastosuj(d)}
              />
            );
          })}
        </ol>
      )}

      {niedostepne.length > 0 && (
        <details
          data-slot="niedostepne"
          open={niedostepneOtwarte}
          onToggle={(e) => setNiedostepneOtwarte(e.currentTarget.open)}
          className="group rounded-karta bg-white"
        >
          <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-3 rounded-karta px-4 py-2 font-bold text-granat hover:bg-szary-kafel [&::-webkit-details-marker]:hidden">
            <span className="flex items-center gap-3">
              <IconLock size={20} stroke={1.75} aria-hidden className="shrink-0" />
              {zdanieNiedostepnych(niedostepne.length)}
            </span>
            <IconChevronDown size={24} stroke={2} aria-hidden className="shrink-0 transition-transform duration-150 group-open:rotate-180 motion-reduce:transition-none" />
          </summary>
          <ul className="flex flex-col gap-3 border-t border-szary-linia px-4 py-4">
            {niedostepne.map((m) => (
              <li key={m.kod} id={`decyzja-${m.kod}`} data-decyzja={m.kod} data-dostepna="false" className="flex scroll-mt-24 gap-3">
                <IconLock size={20} stroke={1.75} aria-hidden className="mt-0.5 shrink-0 text-tekst-drugi" />
                <span className="max-w-prose leading-normal">
                  <span className="font-bold">{nazwaMozliwosci(m.kod)}.</span> <span className="text-tekst-drugi">{m.opis}</span>
                </span>
              </li>
            ))}
          </ul>
        </details>
      )}
    </section>
  );
}

// ───────────────────────── Karta jednej decyzji ─────────────────────────

interface KartaDecyzjiProps {
  d: Decyzja;
  dzis: string;
  wybrana: boolean;
  aktywna: boolean;
  rozwiniety: boolean;
  laduje: boolean;
  zajety: boolean;
  blad: string | null;
  zastosowano: boolean;
  /** Ta decyzja jest teraz nakładką na osi. */
  naOsi: boolean;
  kto: string;
  osoby: OsobaPodgladu[];
  zmiany: ZmianyOsoby[] | null;
  onPrzelacz: () => void;
  onPlan: () => void;
  onPokaz: () => void;
  /** Wybór alternatywy w wierszu radio: pokazuje podgląd (bez przełączania nakładki). */
  onAlternatywa: () => void;
  onDoListy: () => void;
  onZastosuj: () => void;
}

function Termin({ m, dzis }: { m: Mozliwosc; dzis: string }) {
  if (m.doKiedy && m.doKiedy < dzis) {
    return <span className="inline-flex rounded-full bg-szary-kafel px-3 py-1 text-sm font-bold text-tekst">Termin minął {formatujDate(m.doKiedy)}</span>;
  }
  if (m.doKiedy) {
    return <span className="inline-flex rounded-full bg-zielen px-3 py-1 text-sm font-bold text-white">Termin decyzji: {formatujDate(m.doKiedy)}</span>;
  }
  if (m.odKiedy) {
    return <span className="inline-flex rounded-full bg-szary-kafel px-3 py-1 text-sm font-bold text-tekst">Możliwe od {formatujDate(m.odKiedy)}</span>;
  }
  return null;
}

function KartaDecyzji(p: KartaDecyzjiProps) {
  const { d, wybrana, aktywna, rozwiniety } = p;
  const m = d.mozliwosc;
  const idNaglowka = `decyzja-${d.kod}-naglowek`;
  const idTresci = `decyzja-${d.kod}-tresc`;
  const alt = d.alternatywa;
  const tytul = nazwaMozliwosci(d.kod);

  return (
    <li
      id={`decyzja-${d.kod}`}
      data-decyzja={d.kod}
      data-dostepna="true"
      data-nr={d.nr}
      {...(wybrana ? { 'data-wybrany': 'true' } : {})}
      aria-labelledby={idNaglowka}
      className={polacz(
        'flex scroll-mt-24 flex-col rounded-karta border-2 bg-white motion-safe:transition-colors motion-safe:duration-150',
        wybrana ? 'border-granat' : 'border-transparent',
      )}
    >
      <div className="flex flex-col gap-2 p-3 sm:flex-row sm:items-center sm:gap-3 lg:px-4">
        <h3 id={idNaglowka} className="min-w-0 flex-1">
          <button
            type="button"
            aria-expanded={rozwiniety}
            aria-controls={idTresci}
            data-naglowek-decyzji
            onClick={p.onPrzelacz}
            className="group flex min-h-14 w-full items-center gap-3 rounded-karta text-left"
          >
            <span
              aria-hidden
              className={polacz(
                'flex size-8 shrink-0 items-center justify-center rounded-full border-2 border-granat text-sm font-black',
                wybrana ? 'bg-granat text-white' : 'bg-white text-granat',
              )}
            >
              {d.nr}
            </span>
            <span className="flex min-w-0 flex-1 flex-col items-start gap-1">
              <span className="text-lg font-bold leading-snug text-granat">{tytul}</span>
              <span className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-tekst-drugi">
                <span className="font-bold uppercase tracking-wide">
                  Decyzja {d.nr} · decyduje: {p.kto}
                </span>
                <Termin m={m} dzis={p.dzis} />
              </span>
            </span>
            <IconChevronDown
              size={24}
              stroke={2}
              aria-hidden
              className="shrink-0 text-granat transition-transform duration-150 group-aria-expanded:rotate-180 motion-reduce:transition-none"
            />
          </button>
        </h3>
        <Przycisk
          wariant="drugi"
          ikona={p.laduje ? <IconLoader2 size={20} className="motion-safe:animate-spin" /> : p.naOsi ? <IconEyeOff size={20} /> : <IconEye size={20} />}
          aria-label={`${p.naOsi ? 'Ukryj z osi' : 'Pokaż na osi'}: ${tytul}`}
          onClick={p.onPokaz}
          disabled={p.zajety}
          aria-busy={p.laduje || undefined}
          className="shrink-0"
        >
          {p.naOsi ? 'Ukryj z osi' : 'Pokaż na osi'}
        </Przycisk>
      </div>

      {rozwiniety && (
        <div id={idTresci} className="flex flex-col gap-4 border-t border-szary-linia p-4 lg:p-6">
          <p className="max-w-prose leading-snug">{m.opis}</p>

          <div role="radiogroup" aria-label={`Decyzja ${d.nr}: jak ma wyglądać plan`} data-opcje-decyzji className="flex flex-col overflow-hidden rounded-karta border-2 border-szary-ramka">
            <WierszRadio
              name={`opcja-${d.kod}`}
              zaznaczony={!aktywna}
              etykieta="Tak jak teraz w planie"
              opis={d.wPlanie.etykieta === 'Tak jak teraz w planie' ? d.wPlanie.opis : d.wPlanie.etykieta}
              onWybierz={p.onPlan}
            />
            <WierszRadio
              name={`opcja-${d.kod}`}
              zaznaczony={aktywna}
              etykieta={alt.etykieta}
              opis={alt.akcja ? alt.opis : (alt.powod ?? '')}
              onWybierz={p.onAlternatywa}
              wylaczony={!alt.akcja || p.zajety}
              zajety={p.laduje}
            />
          </div>
          {!alt.akcja && (
            <Przycisk wariant="drugi" ikona={<IconListDetails size={20} />} onClick={p.onDoListy} className="sm:self-start">
              Zmień w liście okresów
            </Przycisk>
          )}

          {p.blad !== null && (
            <p role="alert" className="rounded-komunikat bg-blad px-3 py-2 text-sm font-bold text-white">
              Nie udało się pokazać tej zmiany. {p.blad}
            </p>
          )}
          {p.zastosowano && (
            <p role="status" className="flex items-center gap-2 rounded-komunikat border-2 border-sukces px-3 py-2 text-sm font-bold text-sukces">
              <IconCheck size={18} stroke={2.5} aria-hidden /> Zmiana jest już w planie.
            </p>
          )}

          {aktywna && (
            <div data-po-zmianie className="flex flex-col gap-3 rounded-komunikat border-2 border-dashed border-granat p-3 lg:p-4">
              <p className="text-sm font-bold uppercase tracking-wide text-granat">Po zmianie</p>
              {p.zmiany ? (
                <div className={polacz('grid gap-3', p.osoby.length > 1 && 'sm:grid-cols-2')}>
                  {p.osoby.map((o) => {
                    const z = p.zmiany!.find((x) => x.osobaId === o.osobaId);
                    const zdania = z ? opisZmian(z) : [];
                    const druga = o.osobaId !== m.ktoDecyduje;
                    return (
                      <div
                        key={o.osobaId}
                        data-skutek-osoba={o.osobaId}
                        data-zmiany={zdania.length ? 'tak' : 'nie'}
                        className={polacz('rounded-komunikat p-3', druga ? 'border-2 border-granat bg-white' : 'bg-tlo')}
                      >
                        <p className="flex flex-wrap items-center gap-x-2 text-sm font-bold uppercase tracking-wide text-granat">
                          Dla: {o.etykieta}
                          <span className="normal-case tracking-normal text-tekst-drugi">{druga ? '(druga osoba)' : '(decyduje)'}</span>
                        </p>
                        {zdania.length ? (
                          <ul className="mt-1.5 flex flex-col gap-1.5">
                            {zdania.map((t) => (
                              <li key={t} className="flex gap-2 leading-snug">
                                <IconArrowRight size={18} stroke={2} aria-hidden className="mt-0.5 shrink-0 text-granat" />
                                <span>{t}</span>
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <p className="mt-1.5 leading-snug text-tekst-drugi">Bez zmian w urlopach.</p>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : null}
              <div className="flex flex-col gap-2 sm:flex-row">
                <Przycisk onClick={p.onZastosuj} ikona={<IconCheck size={20} />} disabled={p.zajety}>
                  Zastosuj w planie
                </Przycisk>
              </div>
            </div>
          )}

          {m.konsekwencje.length > 0 && (
            <div>
              <p className="text-sm font-bold text-tekst">Co się wtedy stanie</p>
              <ListaSkutkow punkty={m.konsekwencje.slice(0, MAX_SKUTKOW)} />
            </div>
          )}

          <details className="group" data-slot="wiecej-szczegolow">
            <summary className="inline-flex min-h-11 cursor-pointer list-none items-center gap-1.5 font-bold text-granat underline underline-offset-4 [&::-webkit-details-marker]:hidden">
              Więcej szczegółów
              <IconChevronDown size={18} stroke={2} aria-hidden className="transition-transform duration-150 group-open:rotate-180 motion-reduce:transition-none" />
            </summary>
            <div className="mt-2 flex flex-col gap-3">
              {m.konsekwencje.length > MAX_SKUTKOW && <ListaSkutkow punkty={m.konsekwencje.slice(MAX_SKUTKOW)} />}
              {d.wPlanie.etykieta !== 'Tak jak teraz w planie' && d.wPlanie.opis && (
                <p className="max-w-prose leading-snug">
                  <span className="font-bold">Teraz w planie:</span> {d.wPlanie.opis}
                </p>
              )}
              {alt.akcja && alt.opis && (
                <p className="max-w-prose leading-snug">
                  <span className="font-bold">{alt.etykieta}:</span> {alt.opis}
                </p>
              )}
              {m.odKiedy && <p className="max-w-prose leading-snug text-tekst-drugi">Czas na decyzję: {okresWyboru(m)}.</p>}
            </div>
          </details>

          {m.przepis && <p className="text-sm text-tekst-drugi">Przepis: {m.przepis}</p>}
        </div>
      )}
    </li>
  );
}

const MAX_SKUTKOW = 3;

function ListaSkutkow({ punkty }: { punkty: string[] }) {
  return (
    <ul className="mt-1.5 flex flex-col gap-1.5">
      {punkty.map((k) => (
        <li key={k} className="flex max-w-prose gap-2 leading-snug">
          <IconArrowRight size={18} stroke={2} aria-hidden className="mt-0.5 shrink-0 text-granat" />
          <span>{k}</span>
        </li>
      ))}
    </ul>
  );
}

/** Zwykły wiersz radio na całą szerokość: kółko, tytuł i jedno zdanie skutku pod spodem. Natywne pole zostaje w DOM. */
function WierszRadio({
  name,
  zaznaczony,
  etykieta,
  opis,
  onWybierz,
  wylaczony,
  zajety,
}: {
  name: string;
  zaznaczony: boolean;
  etykieta: string;
  opis: string;
  onWybierz: () => void;
  wylaczony?: boolean;
  zajety?: boolean;
}) {
  return (
    <label
      className={polacz(
        'group flex min-h-14 cursor-pointer items-start gap-3 border-b border-szary-linia p-3.5 last:border-b-0 has-checked:bg-szary-kafel',
        'has-focus-visible:outline-3 has-focus-visible:-outline-offset-3 has-focus-visible:outline-granat',
        wylaczony && 'cursor-not-allowed text-tekst-drugi',
      )}
    >
      <input
        type="radio"
        name={name}
        checked={zaznaczony}
        disabled={wylaczony}
        aria-busy={zajety || undefined}
        onChange={onWybierz}
        className="peer sr-only"
      />
      <span
        aria-hidden
        className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full border-2 border-szary-ramka bg-white group-has-checked:border-granat"
      >
        <span className="size-3 rounded-full bg-granat opacity-0 group-has-checked:opacity-100" />
      </span>
      <span className="flex min-w-0 flex-col gap-0.5">
        <span className="font-bold leading-snug text-tekst">{etykieta}</span>
        {opis && <span className="text-sm leading-snug text-tekst-drugi">{opis}</span>}
      </span>
    </label>
  );
}
