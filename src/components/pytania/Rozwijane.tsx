'use client';

/**
 * Stopniowe rozwijanie ankiety: pytanie, które pojawia się po odpowiedzi na wcześniejsze (np. „Data zakończenia
 * umowy” po „na czas określony”), wjeżdża w tej samej karcie: wysokość i przenikanie, 200 ms. Pytania widoczne
 * od wejścia na ekran pojawiają się bez rozwijania (wejście całego ekranu animuje `Ankieta`).
 *
 * `ObszarRozwijania` obejmuje pytania jednego ekranu i musi mieć `key` ekranu: wtedy przy zmianie ekranu zaczyna
 * od nowa i nie rozwija pytań, które były na nim od początku.
 */
import { createContext, useContext, useEffect, useLayoutEffect, useRef, type ReactNode, type RefObject } from 'react';
import { bezRuchu, KRZYWA_WEJSCIA } from './ruch';

const CZAS_MS = 200;
const ODSTEP_MS = 40;
/** Ile miejsca u dołu okna zasłania przyklejony pasek „Wstecz” / „Dalej” (z zapasem). */
const PASEK_DOLNY_PX = 104;

interface Obszar {
  /** true po pierwszym wyrenderowaniu ekranu: każde później zamontowane pytanie jest nowe. */
  gotowy: boolean;
  /** Nowe pytania z jednej zmiany; po rozwinięciu przewijamy tak, żeby było widać pierwsze z nich. */
  nowe: HTMLElement[];
}

const KontekstObszaru = createContext<RefObject<Obszar> | null>(null);

export function ObszarRozwijania({ className, children }: { className?: string; children: ReactNode }) {
  const obszar = useRef<Obszar>({ gotowy: false, nowe: [] });
  // Efekt rodzica rusza po efektach dzieci, więc pytania z pierwszego renderu widzą jeszcze `gotowy: false`.
  // Sprzątanie cofa flagę (podwójne efekty w trybie StrictMode nie mogą rozwinąć pytań startowych).
  useEffect(() => {
    const o = obszar.current;
    o.gotowy = true;
    return () => {
      o.gotowy = false;
    };
  }, []);
  return (
    <KontekstObszaru.Provider value={obszar}>
      <div className={className}>{children}</div>
    </KontekstObszaru.Provider>
  );
}

/** Pokazuje nowe pytanie, jeśli wyszło spod przyklejonego paska na dole okna. Tylko w dół, nigdy w górę. */
function pokazNowe(el: HTMLElement) {
  const r = el.getBoundingClientRect();
  const wystaje = r.bottom - (window.innerHeight - PASEK_DOLNY_PX);
  const doGory = r.top - 16; // nie przewijamy tak daleko, żeby początek pytania uciekł nad okno
  const o = Math.min(wystaje, doGory);
  if (o > 0) window.scrollBy({ top: o, behavior: bezRuchu() ? 'auto' : 'smooth' });
}

/** Opakowanie jednego pytania w obszarze; odstęp między pytaniami to margines, żeby rozwijał się razem z pytaniem. */
export function Rozwijane({ children }: { children: ReactNode }) {
  const obszar = useContext(KontekstObszaru);
  const el = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const e = el.current;
    const o = obszar?.current;
    if (!e || !o?.gotowy) return;
    if (!o.nowe.includes(e)) o.nowe.push(e);
    const kolejny = o.nowe.indexOf(e);
    if (kolejny === 0) {
      // Jedno przewinięcie na zmianę (np. nowa umowa dokłada kilka pytań naraz): do pierwszego nowego pytania.
      window.setTimeout(() => {
        const pierwszy = o.nowe[0];
        o.nowe = [];
        if (pierwszy?.isConnected) pokazNowe(pierwszy);
      }, bezRuchu() ? 0 : CZAS_MS);
    }
    if (bezRuchu()) return;
    const wysokosc = e.offsetHeight;
    const margines = getComputedStyle(e).marginTop;
    e.style.overflow = 'hidden';
    const a = e.animate(
      [
        { height: '0px', marginTop: '0px', opacity: 0 },
        { height: `${wysokosc}px`, marginTop: margines, opacity: 1 },
      ],
      // Kilka pytań naraz (nowa umowa): po kolei co 40 ms, żeby nie wjeżdżały jednym blokiem.
      { duration: CZAS_MS, easing: KRZYWA_WEJSCIA, delay: Math.min(kolejny, 4) * ODSTEP_MS, fill: 'backwards' },
    );
    const sprzatnij = () => {
      e.style.overflow = '';
    };
    a.addEventListener('finish', sprzatnij);
    a.addEventListener('cancel', sprzatnij);
    return () => a.cancel();
  }, [obszar]);

  return (
    <div ref={el} className="mt-4 first:mt-0">
      {children}
    </div>
  );
}
