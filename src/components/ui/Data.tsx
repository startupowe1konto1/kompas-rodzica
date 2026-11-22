import { formatujDate, formatujDateKrotko } from '../format';
import { polacz } from './klasy';

export interface DataProps {
  /** Data 'RRRR-MM-DD'. */
  iso: string;
  /** true = „22.12.2026” zamiast „22 grudnia 2026”. */
  krotko?: boolean;
  className?: string;
}

/** Data po polsku w <time dateTime>. Nie łamie się w środku. */
export function Data({ iso, krotko, className }: DataProps) {
  return (
    <time dateTime={iso} className={polacz('whitespace-nowrap', className)}>
      {krotko ? formatujDateKrotko(iso) : formatujDate(iso)}
    </time>
  );
}
