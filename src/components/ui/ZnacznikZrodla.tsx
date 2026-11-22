import { IconDatabase } from '@tabler/icons-react';
import type { ZrodloId } from '../../engine/types';
import { ETYKIETY_ZRODEL } from '../pytania/zrodla';
import { polacz } from './klasy';

export interface ZnacznikZrodlaProps {
  zrodlo: ZrodloId;
  /**
   * Czy dopisać „(symulacja)”. Domyślnie tak dla usług (eZUS, mObywatel…),
   * nie dla danych wpisanych przez rodzica i z wgranego wniosku.
   */
  symulacja?: boolean;
  className?: string;
}

const BEZ_SYMULACJI: ZrodloId[] = ['uzytkownik', 'formularz_pdf'];

/**
 * Znacznik źródła danej: ramka 1 px granat, tekst granat 14 px, np. „z eZUS (symulacja)”.
 * Ikona bazy danych przy danych z usług; przy danych wpisanych przez rodzica znacznika nie ma wcale.
 */
export function ZnacznikZrodla({ zrodlo, symulacja, className }: ZnacznikZrodlaProps) {
  // Dane wpisane przez rodzica nie dostają żadnego znacznika (decyzja Wojtka 22.11): znacznik ma sens tylko
  // tam, gdzie dana przyszła z usługi albo z wgranego wniosku.
  if (zrodlo === 'uzytkownik') return null;
  const zSymulacji = symulacja ?? !BEZ_SYMULACJI.includes(zrodlo);
  const zUslugi = zrodlo !== 'formularz_pdf';
  return (
    <span
      className={polacz(
        'inline-flex max-w-full items-center gap-1 rounded-przycisk border border-granat bg-white px-1.5 py-0.5 text-sm leading-tight text-granat',
        className,
      )}
    >
      {zUslugi && <IconDatabase size={16} stroke={2} aria-hidden className="shrink-0" />}
      <span>
        <span className="sr-only">Źródło danych: </span>
        {ETYKIETY_ZRODEL[zrodlo]}
        {zSymulacji && ' (symulacja)'}
      </span>
    </span>
  );
}
