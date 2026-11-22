import { useId } from 'react';
import type { InputHTMLAttributes, ReactNode } from 'react';
import { BladPola, PodpowiedzPola } from './KomunikatPola';
import { polacz } from './klasy';

export type TypPola = 'text' | 'number' | 'date';

export interface PoleProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'size' | 'className'> {
  /** Etykieta zawsze widoczna nad polem. */
  etykieta: string;
  typ?: TypPola;
  /** Wskazówka pod etykietą, np. „Kwota brutto z umowy”. */
  podpowiedz?: ReactNode;
  /** Treść błędu. Gdy jest, pole ma czerwoną ramkę 2 px i aria-invalid. */
  blad?: string;
  /** Jednostka po prawej stronie pola, np. „zł”, „tyg.”. Czytnik odczyta ją jako opis pola. */
  przyrostek?: string;
  /** Miejsce obok etykiety, np. na <ZnacznikZrodla />. */
  znacznik?: ReactNode;
  className?: string;
}

/**
 * Pole formularza z design.md: etykieta nad polem, ramka 1 px szary-ramka, wysokość 48 px,
 * błąd = ramka 2 px blad + komunikat z ikoną pod polem (aria-describedby).
 * Typ 'number' ma inputMode="decimal" i step="any", żeby na telefonie była klawiatura z przecinkiem.
 */
export function Pole({ etykieta, typ = 'text', podpowiedz, blad, przyrostek, znacznik, className, id, ...reszta }: PoleProps) {
  const wygenerowane = useId();
  const idPola = id ?? `pole-${wygenerowane}`;
  const idPodpowiedzi = `${idPola}-podpowiedz`;
  const idBledu = `${idPola}-blad`;
  const idPrzyrostka = `${idPola}-przyrostek`;
  const opisy = [podpowiedz ? idPodpowiedzi : null, przyrostek ? idPrzyrostka : null, blad ? idBledu : null, reszta['aria-describedby']]
    .filter(Boolean)
    .join(' ');

  const ramka = blad ? 'border-2 border-blad' : 'border border-szary-ramka';

  const input = (
    <input
      id={idPola}
      type={typ}
      {...(typ === 'number' ? { inputMode: 'decimal' as const, step: 'any' } : {})}
      {...reszta}
      aria-invalid={blad ? true : reszta['aria-invalid']}
      aria-describedby={opisy || undefined}
      className={polacz(
        'h-12 w-full min-w-0 bg-white px-3 text-base text-tekst placeholder:text-tekst-drugi disabled:cursor-not-allowed disabled:bg-szary-kafel',
        typ === 'number' && 'tabular-nums',
        przyrostek ? 'rounded-l-przycisk border-0' : polacz('rounded-przycisk', ramka),
      )}
    />
  );

  return (
    <div className={polacz('flex flex-col gap-1.5', className)}>
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
        <label htmlFor={idPola} className="text-base font-bold text-tekst">
          {etykieta}
        </label>
        {znacznik}
      </div>
      {podpowiedz && <PodpowiedzPola id={idPodpowiedzi}>{podpowiedz}</PodpowiedzPola>}
      {przyrostek ? (
        <div className={polacz('flex items-stretch overflow-hidden rounded-przycisk bg-white has-focus-visible:outline-3 has-focus-visible:outline-offset-2 has-focus-visible:outline-granat', ramka)}>
          <div className="flex-1 [&>input:focus-visible]:outline-none">{input}</div>
          <span
            id={idPrzyrostka}
            className="flex shrink-0 items-center border-l border-szary-ramka bg-szary-kafel px-3 text-base font-bold text-tekst"
          >
            {przyrostek}
          </span>
        </div>
      ) : (
        input
      )}
      {blad && <BladPola id={idBledu}>{blad}</BladPola>}
    </div>
  );
}
