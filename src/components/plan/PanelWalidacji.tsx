'use client';

/**
 * Panel walidacji planu (T2.7): trzy grupy komunikatów z `WynikWalidacji`.
 * „Nie można, bo…” (błędy) / „Można, ale…” (ostrzeżenia) / „Co z tego wynika” (konsekwencje).
 * Każdy komunikat niesie `data-kod`; przepis i „Co możesz zrobić” rysuje `KomunikatPlanu`.
 * Gdy nie ma żadnego komunikatu, panelu nie ma: `ZnacznikBezBledow` pokazuje tylko „Plan bez błędów”.
 * Liczniki pul są w „Szczegółach kwot” (`SzczegolyKwot`). Stan „walidacja niedostępna” zostaje.
 */
import { IconCircleCheck } from '@tabler/icons-react';
import type { Komunikat, PoziomKomunikatu, WynikWalidacji } from '../../engine/types';
import { WalidacjaNiedostepna } from './WalidacjaNiedostepna';
import type { Planer } from './usePlaner';
import { Karta, KomunikatPlanu, polacz } from '../ui';

/** Zdanie dla czytnika ekranu: „Plan bez błędów” albo „Plan ma N błędów” (z polską odmianą). */
export function zdanieOBledach(n: number): string {
  if (n === 0) return 'Plan bez błędów';
  const mod10 = n % 10;
  const mod100 = n % 100;
  const slowo = n === 1 ? 'błąd' : mod10 >= 2 && mod10 <= 4 && !(mod100 >= 12 && mod100 <= 14) ? 'błędy' : 'błędów';
  return `Plan ma ${n} ${slowo}`;
}

function Grupa({ id, tytul, poziom, komunikaty }: { id: string; tytul: string; poziom: PoziomKomunikatu; komunikaty: Komunikat[] }) {
  if (komunikaty.length === 0) return null;
  return (
    <section aria-labelledby={id} data-grupa={poziom} className="flex flex-col gap-2">
      <h3 id={id} className="text-lg font-bold leading-snug text-granat lg:text-xl">
        {tytul}
      </h3>
      <ul className="flex flex-col gap-2">
        {komunikaty.map((k, i) => (
          <li key={`${k.kod}-${k.odcinekId ?? ''}-${k.osobaId ?? ''}-${i}`} data-kod={k.kod}>
            {/* Poziom wynika z grupy, więc kolor zawsze zgadza się z nagłówkiem. */}
            <KomunikatPlanu komunikat={{ ...k, poziom }} />
          </li>
        ))}
      </ul>
    </section>
  );
}

/** Plan bez błędów, ostrzeżeń i konsekwencji: wystarczy mały znacznik zamiast panelu. */
export function planCzysty(w: WynikWalidacji): boolean {
  return w.bledy.length === 0 && w.ostrzezenia.length === 0 && w.konsekwencje.length === 0;
}

/** Mały znacznik obok osi: pokazuje się tylko, gdy panelu nie ma (plan czysty). */
export function ZnacznikBezBledow({ planer, className }: { planer: Planer; className?: string }) {
  const { walidacja } = planer;
  if (!walidacja || !planCzysty(walidacja)) return null;
  return (
    <p
      role="status"
      aria-live="polite"
      data-slot="znacznik-walidacji"
      data-poprawny="true"
      className={polacz('inline-flex items-center gap-1.5 rounded-full bg-sukces px-3 py-1 text-sm font-bold text-white', className)}
    >
      <IconCircleCheck size={18} stroke={2.25} aria-hidden />
      {zdanieOBledach(0)}
    </p>
  );
}

export function PanelWalidacji({ planer }: { planer: Planer }) {
  const { walidacja, walidacjaBlad, walidacjaLaduje, ponowWalidacje } = planer;
  if (walidacjaBlad && !walidacja) return <WalidacjaNiedostepna blad={walidacjaBlad} onPonow={ponowWalidacje} laduje={walidacjaLaduje} />;
  if (!walidacja) {
    return (
      <p role="status" data-slot="walidacja-laduje" className="text-sm font-bold text-tekst-drugi">
        Sprawdzamy plan…
      </p>
    );
  }
  if (planCzysty(walidacja)) return null;
  return (
    <Karta jako="section" aria-labelledby="panel-walidacji-naglowek" data-slot="panel-walidacji" className="flex flex-col gap-5">
      <div className="flex flex-col gap-1">
        <h2 id="panel-walidacji-naglowek" className="text-lg font-black text-granat lg:text-xl">
          Sprawdzenie planu
        </h2>
        <p role="status" aria-live="polite" data-poprawny={walidacja.bledy.length === 0} className="font-bold text-tekst">
          {zdanieOBledach(walidacja.bledy.length)}
        </p>
      </div>
      <Grupa id="walidacja-bledy" tytul="Nie można, bo…" poziom="blad" komunikaty={walidacja.bledy} />
      <Grupa id="walidacja-ostrzezenia" tytul="Można, ale…" poziom="ostrzezenie" komunikaty={walidacja.ostrzezenia} />
      <Grupa id="walidacja-konsekwencje" tytul="Co z tego wynika" poziom="konsekwencja" komunikaty={walidacja.konsekwencje} />
    </Karta>
  );
}
