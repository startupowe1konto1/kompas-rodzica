import { useId } from 'react';
import type { ReactNode } from 'react';
import { IconCheck } from '@tabler/icons-react';
import { BladPola, PodpowiedzPola } from './KomunikatPola';
import { polacz } from './klasy';

export interface OpcjaWyboru {
  wartosc: string;
  etykieta: string;
  /** Jedno zdanie pod etykietą. */
  opis?: string;
  wylaczona?: boolean;
}

interface WspolneWyboru {
  /** Pytanie nad kafelkami (legend). */
  legenda: string;
  opcje: OpcjaWyboru[];
  /** Nazwa pola formularza; domyślnie generowana. */
  name?: string;
  podpowiedz?: ReactNode;
  blad?: string;
  /** Miejsce obok pytania, np. na <ZnacznikZrodla />. */
  znacznik?: ReactNode;
  /** Dwie kolumny od szerokości tabletu (tylko dla krótkich opcji na komputerze). Domyślnie kafle na całą szerokość. */
  dwieKolumny?: boolean;
  wymagane?: boolean;
  className?: string;
}

export interface WyborJednokrotnyProps extends WspolneWyboru {
  wielokrotny?: false;
  /** Sterowane: wybrana wartość. Bez niej pole działa samo (domyslna). */
  wartosc?: string | null;
  domyslna?: string;
  onZmiana?: (wartosc: string) => void;
}

export interface WyborWielokrotnyProps extends WspolneWyboru {
  wielokrotny: true;
  wartosc?: string[];
  domyslna?: string[];
  onZmiana?: (wartosci: string[]) => void;
}

export type WyborProps = WyborJednokrotnyProps | WyborWielokrotnyProps;

/** Klasy kafelka: cały kafelek klikalny, zaznaczony = pełny granat z białym tekstem. */
export function klasyKafelka(blad = false): string {
  return polacz(
    'group relative flex min-h-14 w-full cursor-pointer rounded-przycisk border-2 bg-white p-3.5 text-tekst transition-colors duration-150',
    blad ? 'border-blad' : 'border-szary-ramka',
    'hover:border-granat has-checked:border-granat has-checked:bg-granat has-checked:text-white',
    'has-focus-visible:outline-3 has-focus-visible:outline-offset-2 has-focus-visible:outline-granat',
    'has-disabled:cursor-not-allowed has-disabled:border-szary-linia has-disabled:bg-szary-kafel has-disabled:text-tekst-drugi',
  );
}

function Wskaznik({ wielokrotny }: { wielokrotny: boolean }) {
  return (
    <span
      aria-hidden
      className={polacz(
        'mt-px flex size-6 shrink-0 items-center justify-center border-2 border-szary-ramka bg-white group-has-checked:border-white',
        wielokrotny ? 'rounded-[3px]' : 'rounded-full',
      )}
    >
      {wielokrotny ? (
        <IconCheck size={18} stroke={3} className="text-granat opacity-0 group-has-checked:opacity-100" />
      ) : (
        <span className="size-3 rounded-full bg-granat opacity-0 group-has-checked:opacity-100" />
      )}
    </span>
  );
}

/**
 * Grupa wyboru jako duże kafelki (cały kafelek to cel dotykowy ≥ 56 px).
 * Jednokrotny = radio, wielokrotny (`wielokrotny`) = checkboxy. Natywne pola zostają w DOM
 * (czytnik i klawiatura działają jak zwykle), widać tylko kafelek.
 */
export function Wybor(props: WyborProps) {
  const { legenda, opcje, podpowiedz, blad, znacznik, dwieKolumny, wymagane, className } = props;
  const wygenerowane = useId();
  const name = props.name ?? `wybor-${wygenerowane}`;
  const idPodpowiedzi = `${name}-podpowiedz`;
  const idBledu = `${name}-blad`;
  const opisy = [podpowiedz ? idPodpowiedzi : null, blad ? idBledu : null].filter(Boolean).join(' ') || undefined;

  function zaznaczona(w: string): { checked?: boolean; defaultChecked?: boolean } {
    if (props.wielokrotny) {
      if (props.wartosc !== undefined) return { checked: props.wartosc.includes(w) };
      return { defaultChecked: props.domyslna?.includes(w) ?? false };
    }
    if (props.wartosc !== undefined) return { checked: props.wartosc === w };
    return { defaultChecked: props.domyslna === w };
  }

  function zmiana(w: string, zaznaczone: boolean) {
    if (props.wielokrotny) {
      const obecne = props.wartosc ?? [];
      props.onZmiana?.(zaznaczone ? [...obecne.filter((x) => x !== w), w] : obecne.filter((x) => x !== w));
    } else if (zaznaczone) {
      props.onZmiana?.(w);
    }
  }

  const sterowane = props.wartosc !== undefined;

  return (
    <fieldset className={polacz('flex min-w-0 flex-col gap-2', className)} aria-describedby={opisy} aria-invalid={blad ? true : undefined}>
      <legend className="mb-0.5 text-base font-bold text-tekst">
        {legenda}
        {wymagane && <span className="sr-only"> (wymagane)</span>}
      </legend>
      {znacznik && <div className="flex">{znacznik}</div>}
      {podpowiedz && <PodpowiedzPola id={idPodpowiedzi}>{podpowiedz}</PodpowiedzPola>}
      {blad && <BladPola id={idBledu}>{blad}</BladPola>}
      <div className={polacz('grid gap-2', dwieKolumny && 'sm:grid-cols-2')}>
        {opcje.map((o) => (
          <label key={o.wartosc} className={polacz(klasyKafelka(Boolean(blad)), 'items-start gap-3')}>
            <input
              type={props.wielokrotny ? 'checkbox' : 'radio'}
              name={name}
              value={o.wartosc}
              disabled={o.wylaczona}
              required={wymagane && !props.wielokrotny}
              {...zaznaczona(o.wartosc)}
              {...(sterowane || props.onZmiana ? { onChange: (e) => zmiana(o.wartosc, e.currentTarget.checked) } : {})}
              className="sr-only"
            />
            <Wskaznik wielokrotny={Boolean(props.wielokrotny)} />
            <span className="flex min-w-0 flex-col">
              <span className="font-bold leading-snug">{o.etykieta}</span>
              {o.opis && <span className="text-sm leading-normal text-tekst-drugi group-has-checked:text-white">{o.opis}</span>}
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
