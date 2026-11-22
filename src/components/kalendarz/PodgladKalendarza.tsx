'use client';

/**
 * „Podejrzyj kalendarz” (K3): jeden widok osi z urlopami obojga rodziców z aktualnego planu
 * i wszystkimi terminami zaznaczonymi na datach (numerowane znaczniki z pionową linią).
 * Otwarty z karty albo kafla dnia podświetla ten jeden termin, pozostałe są wyszarzone.
 *
 * Natywny <dialog> (showModal): fokus zostaje w środku, Esc zamyka, tło jest nieaktywne.
 * Telefon: cały ekran, oś przewijana w poziomie (bez wymuszania obrotu, WCAG 1.3.4); komputer: duże okno.
 *
 * Oś składamy z klocków `os-czasu` (układ, skala, pigułki odcinków) – bez zmian w module osi,
 * bo `OsCzasu` potrzebuje stanu planera i nie ma znaczników terminów.
 */
import { useEffect, useId, useMemo, useRef, type MouseEvent } from 'react';
import { IconX } from '@tabler/icons-react';
import type { Plan, Rodzina } from '../../engine/types';
import { formatujDate } from '../format';
import { proc } from '../os-czasu/kolory';
import { OdcinekOsi, WYS_WIERSZA } from '../os-czasu/OdcinekOsi';
import { skala } from '../os-czasu/skala';
import { ukladOsi } from '../os-czasu/uklad';
import { Data, polacz } from '../ui';
import { TON_STANU } from './KartaTerminu';
import { kluczTerminu, oknoKalendarza, pasyZnacznikow } from './podglad';
import type { Oznaczony } from './typy';

/** Najmniejsza szerokość toru: na telefonie oś przewija się w poziomie. */
const MIN_SZER_TORU = 880;
const SZER_ETYKIETY = 72;
/** Cel dotykowy znacznika (kółko 32 px w środku). */
const CEL = 40;
const WYS_MIESIECY = 28;
const ODSTEP = 8;
/** Dwa wiersze podpisów pod osią: poród i dziś bywają kilka dni od siebie, więc nie mogą stać w jednym. */
const WYS_STOPKI = 48;
const WIERSZ_PODPISU = 22;

const PUSTY_PLAN: Plan = { id: '', nazwa: '', odcinki: [], wariant815: false };

function plynnie(): ScrollBehavior {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth';
}

export interface PodgladKalendarzaProps {
  otwarty: boolean;
  /** Klucz terminu do podświetlenia (`kluczTerminu`); null – wszystkie terminy w pełnym kolorze. */
  podswietlony: string | null;
  onPodswietl: (klucz: string | null) => void;
  onZamknij: () => void;
  rodzina: Rodzina;
  plan: Plan | null;
  terminy: Oznaczony[];
}

export function PodgladKalendarza({ otwarty, podswietlony, onPodswietl, onZamknij, rodzina, plan, terminy }: PodgladKalendarzaProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const torRef = useRef<HTMLDivElement>(null);
  const idTytulu = useId();

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (otwarty && !d.open) d.showModal();
    if (!otwarty && d.open) d.close();
  }, [otwarty]);

  const model = useMemo(() => {
    const okno = oknoKalendarza(terminy, plan, rodzina.dataAnalizy);
    const s = skala(okno);
    const uklad = ukladOsi(rodzina, plan ?? PUSTY_PLAN, okno);
    const pozycje = terminy.map((t) => s.ulamek(t.data) + 0.5 / s.dni);
    const pasy = pasyZnacznikow(pozycje, CEL / MIN_SZER_TORU);
    return { s, uklad, pozycje, pasy, liczbaPasow: Math.max(1, ...pasy.map((p) => p + 1)) };
  }, [terminy, plan, rodzina]);

  const wysZnacznikow = model.liczbaPasow * CEL + ODSTEP;
  const goraWierszy = wysZnacznikow + WYS_MIESIECY;
  const wiersze = model.uklad.sciezki.map((sc) => sc.liczbaWierszy * WYS_WIERSZA + ODSTEP);
  const dolWierszy = goraWierszy + wiersze.reduce((a, b) => a + b, 0);
  const wysokosc = dolWierszy + WYS_STOPKI;

  // Po otwarciu i przy zmianie podświetlenia oś przewija się do terminu (albo do najbliższego przyszłego).
  useEffect(() => {
    if (!otwarty) return;
    const el = torRef.current;
    if (!el) return;
    const i = terminy.findIndex((t) => kluczTerminu(t) === podswietlony);
    const cel = i >= 0 ? i : terminy.findIndex((t) => t.stan !== 'minal');
    if (cel < 0) return;
    const x = model.pozycje[cel] * el.scrollWidth - el.clientWidth / 2;
    el.scrollTo({ left: Math.max(0, x), behavior: plynnie() });
  }, [otwarty, podswietlony, terminy, model]);

  const wybrany = terminy.find((t) => kluczTerminu(t) === podswietlony) ?? null;

  function klikTla(e: MouseEvent<HTMLDialogElement>) {
    // Klik w przyciemnione tło (poza oknem) zamyka podgląd.
    if (e.target === e.currentTarget) onZamknij();
  }

  return (
    <dialog
      ref={ref}
      aria-labelledby={idTytulu}
      onClose={onZamknij}
      onClick={klikTla}
      className="m-0 h-dvh max-h-none w-full max-w-none bg-tlo p-0 text-tekst backdrop:bg-tekst/60 lg:m-auto lg:h-auto lg:max-h-[90dvh] lg:max-w-5xl lg:rounded-karta"
    >
      {otwarty && (
        <div className="flex h-full flex-col lg:max-h-[90dvh]">
          <header className="flex items-start justify-between gap-3 border-b border-szary-linia bg-white px-4 py-3 lg:px-6 lg:py-4">
            <div className="flex min-w-0 flex-col gap-1">
              <h2 id={idTytulu} className="text-xl font-black text-granat lg:text-2xl">
                Kalendarz urlopów i terminów
              </h2>
              <p className="text-tekst-drugi" aria-live="polite">
                {wybrany ? (
                  <>
                    <span className="font-bold text-tekst">{wybrany.tytul}</span>: <Data iso={wybrany.data} />
                  </>
                ) : (
                  'Urlopy z planu i terminy wniosków.'
                )}
              </p>
            </div>
            <button
              type="button"
              aria-label="Zamknij"
              onClick={onZamknij}
              className="flex size-11 shrink-0 items-center justify-center rounded-przycisk border-2 border-zielen text-zielen hover:bg-szary-kafel"
            >
              <IconX size={22} stroke={2.25} aria-hidden />
            </button>
          </header>

          <div className="flex flex-1 flex-col gap-5 overflow-y-auto p-4 lg:p-6">
            <div className="flex overflow-hidden rounded-karta bg-white">
              {/* Etykiety osób stoją w miejscu, tor przewija się obok nich. */}
              <div className="shrink-0 border-r border-szary-linia" style={{ width: SZER_ETYKIETY }} aria-hidden>
                <div style={{ height: goraWierszy }} />
                {model.uklad.sciezki.map((sc, i) => (
                  <div key={sc.osobaId} className="flex items-center px-3 font-bold text-granat" style={{ height: wiersze[i] }}>
                    {sc.etykieta}
                  </div>
                ))}
              </div>

              <div ref={torRef} data-tor-podgladu tabIndex={0} aria-label="Oś czasu: urlopy i terminy" className="min-w-0 flex-1 overflow-x-auto">
                <div className="relative" style={{ minWidth: MIN_SZER_TORU, height: wysokosc }}>
                  {/* Siatka miesięcy */}
                  {model.uklad.podzialka.kreski.map((k) => (
                    <div key={k.data} aria-hidden className="absolute bottom-0 border-l border-szary-linia" style={{ left: proc(k.pozycja), top: wysZnacznikow }}>
                      <span className={polacz('absolute top-1 left-1.5 text-sm whitespace-nowrap', k.poczatekRoku ? 'font-bold text-tekst' : 'text-tekst-drugi')}>
                        {k.poczatekRoku ? `${k.etykieta === String(k.rok) ? '' : `${k.etykieta} `}${k.rok}` : k.etykieta}
                      </span>
                    </div>
                  ))}

                  {/* Wiersze osób z urlopami z planu */}
                  {model.uklad.sciezki.map((sc, i) => (
                    <div
                      key={sc.osobaId}
                      data-sciezka-podgladu={sc.osobaId}
                      role="group"
                      aria-label={sc.etykieta}
                      className="absolute inset-x-0 border-t border-szary-linia"
                      style={{ top: goraWierszy + wiersze.slice(0, i).reduce((a, b) => a + b, 0), height: wiersze[i] }}
                    >
                      <div className="relative" style={{ height: sc.liczbaWierszy * WYS_WIERSZA, marginTop: ODSTEP / 2 }}>
                        {sc.odcinki.map((o) => (
                          <OdcinekOsi key={o.id} odcinek={o} />
                        ))}
                      </div>
                    </div>
                  ))}

                  {/* Poród i dziś */}
                  {model.uklad.znaczniki.map((z) => (
                    <div
                      key={z.rodzaj}
                      aria-hidden
                      className={polacz('absolute', z.rodzaj === 'porod' ? 'border-l-2 border-granat' : 'border-l-2 border-dashed border-tekst-drugi')}
                      style={{ left: proc(z.pozycja), top: goraWierszy, height: dolWierszy - goraWierszy + 4 + (z.rodzaj === 'dzis' ? WIERSZ_PODPISU : 0) }}
                    >
                      <span className={polacz('absolute left-1.5 text-sm font-bold whitespace-nowrap', z.rodzaj === 'porod' ? 'text-granat' : 'text-tekst-drugi')} style={{ top: dolWierszy - goraWierszy + 2 + (z.rodzaj === 'dzis' ? WIERSZ_PODPISU : 0) }}>
                        {z.etykieta}
                      </span>
                    </div>
                  ))}

                  {/* Terminy: pionowa linia przez wiersze i numerowany znacznik u góry */}
                  {terminy.map((t, i) => {
                    const klucz = kluczTerminu(t);
                    const jest = podswietlony === klucz;
                    const wygaszony = podswietlony !== null && !jest;
                    const gora = ODSTEP / 2 + model.pasy[i] * CEL;
                    const opis = `${i + 1}. ${t.tytul}, ${formatujDate(t.data)}`;
                    return (
                      <div key={klucz}>
                        <div
                          aria-hidden
                          className={polacz('absolute -translate-x-1/2', jest ? 'z-20 w-[3px] bg-granat' : wygaszony ? 'w-px bg-szary-linia' : 'w-0.5 bg-szary-ramka')}
                          style={{ left: proc(model.pozycje[i]), top: gora + CEL / 2, height: dolWierszy - gora - CEL / 2 }}
                        />
                        <button
                          type="button"
                          data-znacznik-terminu
                          data-klucz={klucz}
                          data-podswietlony={jest ? 'true' : 'false'}
                          aria-label={opis}
                          aria-pressed={jest}
                          title={opis}
                          onClick={() => onPodswietl(jest ? null : klucz)}
                          className="absolute z-30 flex -translate-x-1/2 items-center justify-center rounded-full"
                          style={{ left: proc(model.pozycje[i]), top: gora, width: CEL, height: CEL }}
                        >
                          <span
                            className={polacz(
                              'flex size-8 items-center justify-center rounded-full text-sm font-black tabular-nums',
                              wygaszony ? 'border-2 border-szary-ramka bg-white text-tekst-drugi' : TON_STANU[t.stan],
                              jest && 'ring-[3px] ring-granat ring-offset-2',
                            )}
                          >
                            {i + 1}
                          </span>
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Legenda: numer, co, kiedy. Klik podświetla termin na osi. */}
            <ol className="flex flex-col gap-2">
              {terminy.map((t, i) => {
                const klucz = kluczTerminu(t);
                const jest = podswietlony === klucz;
                return (
                  <li key={klucz}>
                    <button
                      type="button"
                      data-legenda-terminu={klucz}
                      aria-pressed={jest}
                      onClick={() => onPodswietl(jest ? null : klucz)}
                      className={polacz(
                        'flex min-h-12 w-full items-center gap-3 rounded-komunikat bg-white px-3 py-2 text-left',
                        jest ? 'ring-[3px] ring-granat' : 'hover:bg-szary-kafel',
                        podswietlony !== null && !jest && 'text-tekst-drugi',
                      )}
                    >
                      <span
                        aria-hidden
                        className={polacz(
                          'flex size-8 shrink-0 items-center justify-center rounded-full text-sm font-black tabular-nums',
                          podswietlony !== null && !jest ? 'border-2 border-szary-ramka bg-white text-tekst-drugi' : TON_STANU[t.stan],
                        )}
                      >
                        {i + 1}
                      </span>
                      <span className="min-w-0 flex-1 font-bold">{t.tytul}</span>
                      <Data iso={t.data} krotko className="shrink-0 tabular-nums" />
                    </button>
                  </li>
                );
              })}
            </ol>
          </div>
        </div>
      )}
    </dialog>
  );
}
