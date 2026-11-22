import { useId } from 'react';
import { IconCheck } from '@tabler/icons-react';
import type { ReactNode } from 'react';
import { BladPola, PodpowiedzPola } from './KomunikatPola';
import { klasyKafelka } from './Wybor';
import { polacz } from './klasy';

export interface PrzelacznikTakNieProps {
  /** Pytanie, na które odpowiada się „Tak” albo „Nie”. */
  pytanie: string;
  /** Sterowane: true / false; null = brak odpowiedzi. Bez tej właściwości pole działa samo. */
  wartosc?: boolean | null;
  domyslna?: boolean;
  onZmiana?: (wartosc: boolean) => void;
  name?: string;
  podpowiedz?: ReactNode;
  blad?: string;
  znacznik?: ReactNode;
  etykietaTak?: string;
  etykietaNie?: string;
  wymagane?: boolean;
  className?: string;
}

/** Pytanie tak/nie: dwa duże kafelki (min. 56 px) obok siebie na całą szerokość (radio), także na telefonie. */
export function PrzelacznikTakNie({
  pytanie,
  wartosc,
  domyslna,
  onZmiana,
  name,
  podpowiedz,
  blad,
  znacznik,
  etykietaTak = 'Tak',
  etykietaNie = 'Nie',
  wymagane,
  className,
}: PrzelacznikTakNieProps) {
  const wygenerowane = useId();
  const nazwa = name ?? `taknie-${wygenerowane}`;
  const idPodpowiedzi = `${nazwa}-podpowiedz`;
  const idBledu = `${nazwa}-blad`;
  const opisy = [podpowiedz ? idPodpowiedzi : null, blad ? idBledu : null].filter(Boolean).join(' ') || undefined;
  const sterowane = wartosc !== undefined;

  const opcje: { w: boolean; etykieta: string }[] = [
    { w: true, etykieta: etykietaTak },
    { w: false, etykieta: etykietaNie },
  ];

  return (
    <fieldset className={polacz('flex min-w-0 flex-col gap-2', className)} aria-describedby={opisy} aria-invalid={blad ? true : undefined}>
      <legend className="mb-0.5 text-base font-bold text-tekst">
        {pytanie}
        {wymagane && <span className="sr-only"> (wymagane)</span>}
      </legend>
      {znacznik && <div className="flex">{znacznik}</div>}
      {podpowiedz && <PodpowiedzPola id={idPodpowiedzi}>{podpowiedz}</PodpowiedzPola>}
      {blad && <BladPola id={idBledu}>{blad}</BladPola>}
      <div className="grid grid-cols-2 gap-2">
        {opcje.map(({ w, etykieta }) => (
          <label key={String(w)} className={polacz(klasyKafelka(Boolean(blad)), 'items-center justify-center gap-2 text-center')}>
            <input
              type="radio"
              name={nazwa}
              value={w ? 'tak' : 'nie'}
              required={wymagane}
              {...(sterowane ? { checked: wartosc === w } : { defaultChecked: domyslna === w })}
              {...(sterowane || onZmiana ? { onChange: (e) => e.currentTarget.checked && onZmiana?.(w) } : {})}
              className="sr-only"
            />
            <IconCheck size={20} stroke={3} aria-hidden className="hidden shrink-0 group-has-checked:inline" />
            <span className="font-bold">{etykieta}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
