/**
 * Wykres miesięczny dwóch wariantów: pary słupków (A granat, B zieleń) we wspólnej skali.
 * Ręcznie, w CSS: bez biblioteki wykresów. Słupki są dla oka (aria-hidden), dla czytnika jest tabela pod spodem.
 */
import type { MiesiacISO } from '../../engine/types';
import { formatujKwote } from '../format';
import { Rozwijane } from '../ui';

export interface MiesiacPary {
  miesiac: MiesiacISO;
  a: number;
  b: number;
}

const SKROTY = ['sty', 'lut', 'mar', 'kwi', 'maj', 'cze', 'lip', 'sie', 'wrz', 'paź', 'lis', 'gru'] as const;

/** '2027-01' → { nazwa: 'sty', rok: '27' }. Niepoprawny napis wraca bez zmian. */
export function skrotMiesiaca(m: MiesiacISO): { nazwa: string; rok: string } {
  const [rok, mies] = m.split('-');
  const nazwa = SKROTY[Number(mies) - 1];
  return nazwa ? { nazwa, rok: rok.slice(2) } : { nazwa: m, rok: '' };
}

const WYSOKOSC_PX = 160;

function Slupek({ wartosc, maks, klasa }: { wartosc: number; maks: number; klasa: string }) {
  const wys = maks > 0 ? Math.max(wartosc > 0 ? 3 : 0, Math.round((wartosc / maks) * WYSOKOSC_PX)) : 0;
  return <span className={`block w-3.5 rounded-t-[4px] ${klasa}`} style={{ height: wys }} />;
}

export function WykresPary({ miesiace }: { miesiace: MiesiacPary[] }) {
  if (miesiace.length === 0) return <p className="text-tekst-drugi">Brak wypłat do pokazania na wykresie.</p>;
  const maks = Math.max(...miesiace.flatMap((m) => [m.a, m.b]));
  return (
    <div className="flex flex-col gap-3" data-slot="wykres-pary">
      <ul className="flex flex-wrap gap-x-5 gap-y-1 text-sm text-tekst" aria-label="Legenda wykresu">
        <li className="flex items-center gap-2">
          <span aria-hidden className="size-3.5 rounded-[4px] bg-granat" />
          Wariant A
        </li>
        <li className="flex items-center gap-2">
          <span aria-hidden className="size-3.5 rounded-[4px] bg-zielen" />
          Wariant B
        </li>
        <li className="text-tekst-drugi">Skala wspólna, najwyższy miesiąc: {formatujKwote(maks)}</li>
      </ul>
      <div
        role="group"
        aria-label="Wykres wypłat miesiąc po miesiącu, przewijany poziomo. Te same dane są w tabeli pod wykresem."
        tabIndex={0}
        className="overflow-x-auto rounded-przycisk pb-1"
      >
        <div aria-hidden className="flex min-w-max items-end gap-1 border-b-2 border-szary-ramka" style={{ height: WYSOKOSC_PX + 8 }}>
          {miesiace.map((m) => (
            <div key={m.miesiac} data-miesiac={m.miesiac} className="flex w-12 items-end justify-center gap-0.5">
              <Slupek wartosc={m.a} maks={maks} klasa="bg-granat" />
              <Slupek wartosc={m.b} maks={maks} klasa="bg-zielen" />
            </div>
          ))}
        </div>
        <div aria-hidden className="mt-1 flex min-w-max gap-1">
          {miesiace.map((m) => {
            const s = skrotMiesiaca(m.miesiac);
            return (
              <div key={m.miesiac} className="flex w-12 flex-col items-center text-sm leading-tight text-tekst-drugi">
                <span>{s.nazwa}</span>
                <span>{s.rok}</span>
              </div>
            );
          })}
        </div>
      </div>
      <Rozwijane tytul="Pokaż kwoty w tabeli">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-base">
            <thead>
              <tr className="text-tekst-drugi">
                <th scope="col" className="py-1 pr-3 font-bold">Miesiąc</th>
                <th scope="col" className="py-1 pr-3 text-right font-bold">Wariant A</th>
                <th scope="col" className="py-1 text-right font-bold">Wariant B</th>
              </tr>
            </thead>
            <tbody>
              {miesiace.map((m) => (
                <tr key={m.miesiac} className="border-t border-szary-linia">
                  <th scope="row" className="py-1 pr-3 font-normal">{m.miesiac}</th>
                  <td className="py-1 pr-3 text-right tabular-nums">{formatujKwote(m.a)}</td>
                  <td className="py-1 text-right tabular-nums">{formatujKwote(m.b)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Rozwijane>
    </div>
  );
}
