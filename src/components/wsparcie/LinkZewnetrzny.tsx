import type { ReactNode } from 'react';
import { IconExternalLink } from '@tabler/icons-react';
import { polacz } from '../ui';

/** Link do oficjalnej strony: nowa karta, bezpieczne rel, ukryta informacja dla czytnika ekranu. */
export function LinkZewnetrzny({ href, children, className }: { href: string; children: ReactNode; className?: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={polacz('inline-flex min-h-11 items-center gap-1.5 font-bold text-granat underline underline-offset-2 hover:text-granat-ciemny', className)}
    >
      <span>{children}</span>
      <IconExternalLink size={16} stroke={2} aria-hidden className="shrink-0" />
      <span className="sr-only">(otwiera się w nowej karcie)</span>
    </a>
  );
}
