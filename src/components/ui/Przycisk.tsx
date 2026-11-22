import Link from 'next/link';
import type { ButtonHTMLAttributes, ComponentProps, ReactNode } from 'react';
import { IconLoader2 } from '@tabler/icons-react';
import { polacz } from './klasy';

/**
 * Przycisk z design.md:
 *  - 'glowny' – pełna zieleń, jeden na ekran,
 *  - 'drugi' – biały, ramka 2 px zieleni,
 *  - 'na-bursztynie' – pełny granat (akcja w komunikacie terminu).
 * Z `href` renderuje link Next.js wyglądający jak przycisk.
 */
export type WariantPrzycisku = 'glowny' | 'drugi' | 'na-bursztynie';

interface WspolnePrzycisku {
  wariant?: WariantPrzycisku;
  /** Na całą szerokość rodzica. */
  pelnaSzerokosc?: boolean;
  /** Ikona przed tekstem (Tabler, 20 px). Dekoracyjna – tekst przycisku musi wystarczyć. */
  ikona?: ReactNode;
  /** Trwa akcja: przycisk jest wyłączony, ma aria-busy i kręcący się znak. */
  laduje?: boolean;
  /** Tekst dla czytnika ekranu w trakcie ładowania (domyślnie „Trwa wczytywanie”). */
  etykietaLadowania?: string;
  children: ReactNode;
  className?: string;
}

export type PrzyciskJakoPrzycisk = WspolnePrzycisku &
  Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children' | 'className'> & { href?: undefined };

export type PrzyciskJakoLink = WspolnePrzycisku &
  Omit<ComponentProps<typeof Link>, 'children' | 'className' | 'href'> & { href: string };

export type PrzyciskProps = PrzyciskJakoPrzycisk | PrzyciskJakoLink;

const WARIANTY: Record<WariantPrzycisku, string> = {
  glowny: 'border-2 border-zielen bg-zielen text-white hover:border-zielen-ciemna hover:bg-zielen-ciemna active:bg-zielen-ciemna',
  drugi:
    'border-2 border-zielen bg-white text-zielen hover:border-zielen-ciemna hover:bg-szary-kafel hover:text-zielen-ciemna active:bg-szary-kafel',
  'na-bursztynie': 'border-2 border-granat bg-granat text-white hover:border-granat-ciemny hover:bg-granat-ciemny active:bg-granat-ciemny',
};

const WYLACZONY = 'cursor-not-allowed border-szary-ramka bg-szary-kafel text-tekst-drugi hover:border-szary-ramka hover:bg-szary-kafel hover:text-tekst-drugi';

export function klasyPrzycisku(wariant: WariantPrzycisku = 'glowny', pelnaSzerokosc = false, wylaczony = false): string {
  return polacz(
    'inline-flex min-h-12 select-none items-center justify-center gap-2 rounded-przycisk px-5 py-2 text-center text-base font-bold leading-tight no-underline transition-colors duration-150',
    wylaczony ? WYLACZONY : WARIANTY[wariant],
    pelnaSzerokosc && 'w-full',
  );
}

function Zawartosc({ ikona, laduje, etykietaLadowania, children }: Pick<WspolnePrzycisku, 'ikona' | 'laduje' | 'etykietaLadowania' | 'children'>) {
  return (
    <>
      {laduje ? (
        <IconLoader2 size={20} stroke={2} aria-hidden className="shrink-0 motion-safe:animate-spin" />
      ) : (
        ikona && (
          <span aria-hidden className="inline-flex shrink-0">
            {ikona}
          </span>
        )
      )}
      <span>{children}</span>
      {laduje && <span className="sr-only">{etykietaLadowania ?? 'Trwa wczytywanie'}</span>}
    </>
  );
}

export function Przycisk(props: PrzyciskProps) {
  if (props.href !== undefined) {
    const { wariant, pelnaSzerokosc, ikona, laduje, etykietaLadowania, children, className, href, ...reszta } = props;
    return (
      <Link
        href={href}
        {...reszta}
        aria-busy={laduje || undefined}
        aria-disabled={laduje || undefined}
        className={polacz(klasyPrzycisku(wariant, pelnaSzerokosc), laduje && 'pointer-events-none', className)}
      >
        <Zawartosc ikona={ikona} laduje={laduje} etykietaLadowania={etykietaLadowania}>
          {children}
        </Zawartosc>
      </Link>
    );
  }

  const { wariant, pelnaSzerokosc, ikona, laduje, etykietaLadowania, children, className, type, disabled, ...reszta } = props;
  return (
    <button
      type={type ?? 'button'}
      {...reszta}
      disabled={disabled || laduje}
      aria-busy={laduje || undefined}
      className={polacz(klasyPrzycisku(wariant, pelnaSzerokosc, Boolean(disabled) && !laduje), laduje && 'cursor-progress', className)}
    >
      <Zawartosc ikona={ikona} laduje={laduje} etykietaLadowania={etykietaLadowania}>
        {children}
      </Zawartosc>
    </button>
  );
}
