'use client';

import { useCallback, useEffect, useId, useLayoutEffect, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { IconX } from '@tabler/icons-react';
import { polacz } from '../ui';

/** Czas otwierania i zamykania nakładki (design.md: ruch 200–350 ms, ease-out). */
const CZAS_MS = 300;
const ZLAGODZENIE = 'cubic-bezier(0.22, 1, 0.36, 1)';

export interface NakladkaSekcjiProps {
  tytul: string;
  /** Mała ikona przy tytule (Tabler, dekoracyjna). */
  ikona: ReactNode;
  /** Prostokąt kafla w chwili kliknięcia (getBoundingClientRect), z którego nakładka rośnie. */
  poczatek: DOMRect;
  /** Aktualny prostokąt kafla, do którego nakładka wraca przy zamknięciu. */
  pobierzCel: () => DOMRect | null;
  /** Wołane po zakończeniu animacji zamknięcia (rodzic przywraca fokus na kafel). */
  onZamknieta: () => void;
  children: ReactNode;
}

function ograniczonyRuch(): boolean {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/** Transformacja ustawiająca pełnoekranowy panel w prostokącie kafla (transform-origin: 0 0). */
function przeksztalcenieDo(r: DOMRect): string {
  const sx = r.width / window.innerWidth;
  const sy = r.height / window.innerHeight;
  return `translate(${r.left}px, ${r.top}px) scale(${sx}, ${sy})`;
}

const FOKUSOWALNE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), summary, [tabindex]:not([tabindex="-1"])';

/**
 * Sekcja wyniku na cały ekran (dialog modalny). Otwiera się jak karta w iOS (technika FLIP):
 * panel startuje w miejscu kafla (translate + scale) i rośnie do pełnego ekranu, przy zamknięciu wraca.
 * Animujemy tylko transform i opacity (border-radius na tle, bez przeliczania układu).
 * Przy ograniczonym ruchu (`prefers-reduced-motion`) bez animacji.
 */
export function NakladkaSekcji({ tytul, ikona, poczatek, pobierzCel, onZamknieta, children }: NakladkaSekcjiProps) {
  const idNaglowka = useId();
  const panel = useRef<HTMLDivElement>(null);
  const tresc = useRef<HTMLDivElement>(null);
  const oslona = useRef<HTMLDivElement>(null);
  const naglowek = useRef<HTMLHeadingElement>(null);
  const zamykanie = useRef(false);

  // Otwarcie: blokada przewijania tła, fokus na nagłówek, animacja z miejsca kafla.
  useLayoutEffect(() => {
    const body = document.body;
    const poprzednie = { overflow: body.style.overflow, padding: body.style.paddingRight };
    const szerokoscPaska = window.innerWidth - document.documentElement.clientWidth;
    body.style.overflow = 'hidden';
    if (szerokoscPaska > 0) body.style.paddingRight = `${szerokoscPaska}px`;
    naglowek.current?.focus({ preventScroll: true });

    const p = panel.current;
    if (p && !ograniczonyRuch() && typeof p.animate === 'function') {
      p.animate([{ transform: przeksztalcenieDo(poczatek), borderRadius: '16px' }, { transform: 'translate(0, 0) scale(1, 1)', borderRadius: '0px' }], {
        duration: CZAS_MS,
        easing: ZLAGODZENIE,
      });
      tresc.current?.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 200, delay: 100, easing: 'ease-out', fill: 'backwards' });
      oslona.current?.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 200, delay: 80, easing: 'ease-out', fill: 'forwards' });
    }
    return () => {
      body.style.overflow = poprzednie.overflow;
      body.style.paddingRight = poprzednie.padding;
    };
    // Animacja tylko przy montażu: prostokąt początkowy nie zmienia się w trakcie życia nakładki.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const zamknij = useCallback(() => {
    if (zamykanie.current) return;
    zamykanie.current = true;
    const p = panel.current;
    const cel = pobierzCel();
    if (!p || !cel || ograniczonyRuch() || typeof p.animate !== 'function') {
      onZamknieta();
      return;
    }
    tresc.current?.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 120, easing: 'ease-in', fill: 'forwards' });
    oslona.current?.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 200, delay: 100, easing: 'ease-in', fill: 'forwards' });
    const a = p.animate([{ transform: 'translate(0, 0) scale(1, 1)', borderRadius: '0px' }, { transform: przeksztalcenieDo(cel), borderRadius: '16px' }], {
      duration: CZAS_MS - 20,
      easing: 'cubic-bezier(0.4, 0, 0.2, 1)',
      fill: 'forwards',
    });
    a.onfinish = () => onZamknieta();
    a.oncancel = () => onZamknieta();
  }, [pobierzCel, onZamknieta]);

  // Esc zamyka; Tab krąży wewnątrz nakładki.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        e.preventDefault();
        zamknij();
        return;
      }
      if (e.key !== 'Tab' || !panel.current) return;
      const elementy = Array.from(panel.current.querySelectorAll<HTMLElement>(FOKUSOWALNE)).filter((el) => el.offsetParent !== null || el === document.activeElement);
      if (elementy.length === 0) return;
      const pierwszy = elementy[0];
      const ostatni = elementy[elementy.length - 1];
      const aktywny = document.activeElement;
      if (e.shiftKey && (aktywny === pierwszy || aktywny === naglowek.current || !panel.current.contains(aktywny))) {
        e.preventDefault();
        ostatni.focus();
      } else if (!e.shiftKey && (aktywny === ostatni || !panel.current.contains(aktywny))) {
        e.preventDefault();
        pierwszy.focus();
      }
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [zamknij]);

  return createPortal(
    <>
    {/* Przyciemnione tło za oknem na komputerze. */}
    <div aria-hidden className="fixed inset-0 z-[99] hidden bg-granat-ciemny/50 lg:block" />
    <div
      ref={panel}
      role="dialog"
      aria-modal="true"
      aria-labelledby={idNaglowka}
      data-nakladka-sekcji
      style={{ transformOrigin: '0 0' }}
      className={polacz(
        // Telefon: pełny ekran. Komputer: duże okno na środku (uwaga zespołu 21.11: na pełnym ekranie było dużo pustego miejsca).
        'fixed inset-0 z-[100] overflow-hidden lg:inset-x-[max(2rem,calc(50vw-38rem))] lg:inset-y-8 lg:rounded-karta lg:shadow-kafel',
        'bg-white',
      )}
    >
      <div ref={tresc} className="flex h-full flex-col bg-white">
        <header className={polacz('flex items-center justify-between gap-3 border-b border-szary-linia px-4 py-2 lg:px-8', 'bg-white text-granat')}>
          <div className="flex min-w-0 items-center gap-3">
            <span aria-hidden className="shrink-0">
              {ikona}
            </span>
            <h2 id={idNaglowka} ref={naglowek} tabIndex={-1} className="text-xl font-black leading-snug outline-none lg:text-2xl">
              {tytul}
            </h2>
          </div>
          <button
            type="button"
            onClick={zamknij}
            className={polacz(
              'inline-flex min-h-11 shrink-0 items-center gap-2 rounded-przycisk px-3 font-bold',
              'text-granat hover:bg-szary-kafel',
            )}
          >
            <IconX size={24} aria-hidden />
            Zamknij
          </button>
        </header>
        <div className="flex-1 overflow-y-auto overscroll-contain bg-tlo">
          <div className="mx-auto flex w-full max-w-3xl flex-col gap-4 px-4 py-6 lg:max-w-none lg:px-8 pb-[max(1.5rem,env(safe-area-inset-bottom))] lg:py-8">{children}</div>
        </div>
      </div>
      {/* Warstwa w kolorze kafla: zasłania początek animacji, żeby panel „wyrastał” z kafla, a nie z białej plamy. */}
      <div ref={oslona} aria-hidden className="pointer-events-none absolute inset-0 bg-white opacity-0" />
    </div>
    </>,
    document.body,
  );
}
