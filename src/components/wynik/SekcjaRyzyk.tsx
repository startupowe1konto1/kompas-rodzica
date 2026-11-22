import type { Rodzina, WynikUprawnien } from '../../engine/types';
import { KartaRyzyka } from '../ui';
import { etykietaOsoby } from './etykiety';

/** Ryzyka spokojnie: co może się stać, dlaczego, co można zrobić. Bez czerwieni (biała karta z szarą ramką). */
export function TrescRyzyk({ dane, rodzina }: { dane: WynikUprawnien; rodzina: Rodzina }) {
  if (dane.ryzyka.length === 0) return <p className="text-tekst-drugi">Nie widzimy niczego, co wymagałoby szczególnej uwagi.</p>;
  return (
    <ul className="flex flex-col gap-3">
      {dane.ryzyka.map((r) => (
        <li key={`${r.kod}-${r.osobaId ?? ''}`} data-kod={r.kod} className="flex flex-col gap-2">
          {r.osobaId && rodzina.osoby.length > 1 && (
            <div className="flex flex-wrap items-center gap-2">
              {r.osobaId && rodzina.osoby.length > 1 && <span className="text-sm font-bold text-granat">Dotyczy: {etykietaOsoby(rodzina, r.osobaId)}</span>}
            </div>
          )}
          <KartaRyzyka ryzyko={r} termin={r.termin} />
        </li>
      ))}
    </ul>
  );
}
