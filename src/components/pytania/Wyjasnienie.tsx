import { IconChevronDown, IconInfoCircle } from '@tabler/icons-react';

/**
 * „Co to jest …?” przy pojęciu, którego rodzic może nie znać (np. „Za życiem”). Natywne <details>:
 * działa z klawiatury i czytnikiem ekranu bez dodatkowego JS. Zwinięte, żeby nie wydłużać ekranu.
 */
export function Wyjasnienie({ pojecie, tresc, pytanie }: { pojecie: string; tresc: string; pytanie?: string }) {
  return (
    <details className="group rounded-przycisk border border-szary-linia bg-tlo">
      <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 rounded-przycisk px-3 py-2 font-bold text-granat [&::-webkit-details-marker]:hidden">
        <IconInfoCircle size={20} stroke={2} aria-hidden className="shrink-0 text-info" />
        <span className="flex-1">{pytanie ?? `Co to jest ${pojecie}?`}</span>
        <IconChevronDown
          size={20}
          stroke={2}
          aria-hidden
          className="shrink-0 transition-transform duration-150 group-open:rotate-180 motion-reduce:transition-none"
        />
      </summary>
      <p className="max-w-prose px-3 pb-3 leading-normal text-tekst">{tresc}</p>
    </details>
  );
}
