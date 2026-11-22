import type { HTMLAttributes, ReactNode } from 'react';
import { polacz } from './klasy';

export interface KartaProps extends HTMLAttributes<HTMLElement> {
  /** Element HTML karty; 'section' i 'article' wymagają nagłówka w środku. */
  jako?: 'div' | 'section' | 'article' | 'li';
  /** Ramka 1 px szary-linia – gdy karta leży na białym tle, a nie na szarym `tlo`. */
  obramowanie?: boolean;
  /** Kafel „pływający” nad innymi (np. podgląd odcinka): jedyny dozwolony cień `shadow-kafel`. */
  plywajaca?: boolean;
  children: ReactNode;
}

/**
 * Biały kafel bento: promień 16 px, padding 16 px (telefon) / 24 px (komputer).
 * Na tle strony `bg-tlo` nie potrzebuje ramki ani cienia.
 */
export function Karta({ jako: Element = 'div', obramowanie, plywajaca, className, children, ...reszta }: KartaProps) {
  return (
    <Element
      {...reszta}
      className={polacz('rounded-karta bg-white p-4 lg:p-6', obramowanie && 'border border-szary-linia', plywajaca && 'shadow-kafel', className)}
    >
      {children}
    </Element>
  );
}
