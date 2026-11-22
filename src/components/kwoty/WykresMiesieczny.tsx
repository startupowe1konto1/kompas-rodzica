'use client';

/**
 * Wykres słupkowy kwot miesięcznych: SVG pisany ręcznie, bez biblioteki wykresów.
 * Słupki są warstwowane po osobach (granat i morski). Kolor niesie tylko legenda ze słowami,
 * a te same liczby są w tabeli pod „Pokaż jako tabelę”. Przy wielu miesiącach wykres przewija się w poziomie.
 * Dotyk albo najechanie na miesiąc pokazuje jego kwotę pod wykresem.
 */
import { useState } from 'react';
import type { MiesiacISO } from '../../engine/types';
import { formatujKwote } from '../format';
import { MIESIACE_MIANOWNIK, MIESIACE_SKROT } from '../os-czasu/teksty';
import { Rozwijane, polacz } from '../ui';

export interface MiesiacWykresu {
  miesiac: MiesiacISO;
  kwoty: Record<string, number>;
  razem: number;
}

export interface WykresMiesiecznyProps {
  miesiace: MiesiacWykresu[];
  osoby: { osobaId: string; etykieta: string }[];
  /** Wspólna górna granica skali (porównanie dwóch wariantów). Domyślnie największy miesiąc. */
  maks?: number;
  /** Podpis wykresu; trafia też do `aria-label`. */
  tytul: string;
}

const KOLORY = ['var(--color-granat)', 'var(--color-odc-ojcowski)', 'var(--color-odc-uzupelniajacy)', 'var(--color-odc-wychowawczy)'];
const SZEROKOSC_MIESIACA = 56;
/** Lewy margines na podpisy osi kwot, żeby nie nachodziły na słupki (uwaga Wojtka 21.11). */
const OS_Y = 84;
const SZEROKOSC_SLUPKA = 30;
const WYSOKOSC_WYKRESU = 180;
const GORA = 22;
const DOL = 28;

function nazwaMiesiaca(m: MiesiacISO, dlugo: boolean): string {
  const rok = Number(m.slice(0, 4));
  const nr = Number(m.slice(5, 7)) - 1;
  return dlugo ? `${MIESIACE_MIANOWNIK[nr]} ${rok}` : `${MIESIACE_SKROT[nr]} ${String(rok).slice(2)}`;
}

/** Skala do okrągłej wartości (1, 2, 2,5, 5 × 10^n), żeby linia siatki nie wypadała na dziwnej kwocie. */
function ladnyMaks(x: number): number {
  if (x <= 0) return 1;
  const p = 10 ** Math.floor(Math.log10(x));
  for (const k of [1, 2, 2.5, 5, 10]) if (k * p >= x) return k * p;
  return 10 * p;
}

export function WykresMiesieczny({ miesiace, osoby, maks, tytul }: WykresMiesiecznyProps) {
  const [wybrany, setWybrany] = useState<MiesiacISO | null>(null);
  const najwiekszy = Math.max(0, ...miesiace.map((m) => m.razem));
  const skalaMaks = ladnyMaks(maks ?? najwiekszy);
  const szerokosc = OS_Y + Math.max(1, miesiace.length) * SZEROKOSC_MIESIACA;
  const wysokosc = GORA + WYSOKOSC_WYKRESU + DOL;
  const y = (v: number) => GORA + WYSOKOSC_WYKRESU - (v / skalaMaks) * WYSOKOSC_WYKRESU;
  const wiele = osoby.length > 1;

  const opis = (m: MiesiacWykresu) =>
    `${nazwaMiesiaca(m.miesiac, true)}: ${formatujKwote(m.razem)}` +
    (wiele ? ` (${osoby.map((o) => `${o.etykieta} ${formatujKwote(m.kwoty[o.osobaId] ?? 0)}`).join(', ')})` : '');

  const calaSuma = miesiace.reduce((s, m) => s + m.razem, 0);
  const podsumowanie = miesiace.length
    ? `${tytul}. ${miesiace.length} mies., od ${nazwaMiesiaca(miesiace[0].miesiac, true)} do ${nazwaMiesiaca(miesiace[miesiace.length - 1].miesiac, true)}. ` +
      `Najwyższa kwota ${formatujKwote(najwiekszy)}, razem ${formatujKwote(calaSuma)}. Wszystkie liczby są w tabeli pod wykresem.`
    : `${tytul}. Brak kwot do pokazania.`;

  const aktywny = miesiace.find((m) => m.miesiac === wybrany) ?? null;
  const linie = [0.5, 1];

  return (
    <figure data-wykres="miesieczny" className="flex flex-col gap-3">
      <figcaption className="font-bold text-granat">{tytul}</figcaption>

      {wiele && (
        <ul className="flex flex-wrap gap-x-4 gap-y-1 text-sm" aria-label="Legenda wykresu">
          {osoby.map((o, i) => (
            <li key={o.osobaId} className="flex items-center gap-2">
              <span aria-hidden className="inline-block size-3 rounded-sm" style={{ background: KOLORY[i % KOLORY.length] }} />
              {o.etykieta}
            </li>
          ))}
        </ul>
      )}

      <div
        tabIndex={0}
        role="region"
        aria-label="Przewijana część wykresu"
        className="overflow-x-auto rounded-karta bg-szary-kafel/50 focus-visible:outline-offset-2"
      >
        <svg
          role="img"
          aria-label={podsumowanie}
          viewBox={`0 0 ${szerokosc} ${wysokosc}`}
          width={szerokosc}
          height={wysokosc}
          className="block max-w-none"
          style={{ minWidth: szerokosc }}
        >
          {linie.map((l) => (
            <g key={l}>
              <line
                x1={OS_Y}
                x2={szerokosc}
                y1={y(skalaMaks * l)}
                y2={y(skalaMaks * l)}
                stroke="var(--color-szary-linia)"
                strokeWidth={1}
                strokeDasharray={l === 1 ? '3 3' : undefined}
              />
              <text
                x={OS_Y - 6}
                y={y(skalaMaks * l) + 4}
                textAnchor="end"
                fontSize={12}
                fill="var(--color-tekst)"
                stroke="white"
                strokeWidth={3}
                paintOrder="stroke"
              >
                {formatujKwote(skalaMaks * l)}
              </text>
            </g>
          ))}
          <line x1={OS_Y} x2={szerokosc} y1={y(0)} y2={y(0)} stroke="var(--color-szary-ramka)" strokeWidth={1} />

          {miesiace.map((m, i) => {
            const x0 = OS_Y + i * SZEROKOSC_MIESIACA;
            const xs = x0 + (SZEROKOSC_MIESIACA - SZEROKOSC_SLUPKA) / 2;
            let narosle = 0;
            const wybranyTen = m.miesiac === wybrany;
            return (
              <g
                key={m.miesiac}
                data-miesiac={m.miesiac}
                data-razem={m.razem}
                data-wybrany={wybranyTen ? 'true' : undefined}
                onMouseEnter={() => setWybrany(m.miesiac)}
                onMouseLeave={() => setWybrany(null)}
                onClick={() => setWybrany(m.miesiac)}
                className="cursor-pointer"
              >
                <rect
                  x={x0}
                  y={0}
                  width={SZEROKOSC_MIESIACA}
                  height={wysokosc}
                  fill={wybranyTen ? 'var(--color-szary-linia)' : 'transparent'}
                  opacity={wybranyTen ? 0.5 : 1}
                />
                {osoby.map((o, k) => {
                  const v = m.kwoty[o.osobaId] ?? 0;
                  if (v <= 0) return null;
                  const dol = y(narosle);
                  narosle += v;
                  const gora = y(narosle);
                  return (
                    <rect
                      key={o.osobaId}
                      x={xs}
                      y={gora}
                      width={SZEROKOSC_SLUPKA}
                      height={Math.max(0, dol - gora)}
                      rx={k === osoby.length - 1 ? 4 : 0}
                      fill={KOLORY[k % KOLORY.length]}
                      stroke={wiele ? 'white' : undefined}
                      strokeWidth={wiele ? 1 : 0}
                    />
                  );
                })}
                <text x={x0 + SZEROKOSC_MIESIACA / 2} y={wysokosc - 9} textAnchor="middle" fontSize={12} fill="var(--color-tekst)">
                  {nazwaMiesiaca(m.miesiac, false)}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      <p aria-live="polite" data-odczyt="miesiac" className={polacz('min-h-6 text-sm', aktywny ? 'font-bold text-tekst' : 'text-tekst-drugi')}>
        {aktywny ? opis(aktywny) : 'Po dotknięciu słupka albo najechaniu na niego widać kwotę za miesiąc.'}
      </p>

      <Rozwijane tytul="Pokaż jako tabelę">
        <div className="overflow-x-auto">
          <table className="w-full min-w-72 text-left text-sm">
            <caption className="sr-only">{tytul}: kwoty brutto za poszczególne miesiące</caption>
            <thead>
              <tr className="border-b border-szary-linia">
                <th scope="col" className="py-2 pr-3 font-bold">
                  Miesiąc
                </th>
                {wiele &&
                  osoby.map((o) => (
                    <th key={o.osobaId} scope="col" className="py-2 pr-3 text-right font-bold">
                      {o.etykieta}
                    </th>
                  ))}
                <th scope="col" className="py-2 text-right font-bold">
                  Razem
                </th>
              </tr>
            </thead>
            <tbody>
              {miesiace.map((m) => (
                <tr key={m.miesiac} data-wiersz={m.miesiac} className="border-b border-szary-linia last:border-0">
                  <th scope="row" className="py-2 pr-3 font-normal capitalize">
                    {nazwaMiesiaca(m.miesiac, true)}
                  </th>
                  {wiele &&
                    osoby.map((o) => (
                      <td key={o.osobaId} className="whitespace-nowrap py-2 pr-3 text-right tabular-nums">
                        {formatujKwote(m.kwoty[o.osobaId] ?? 0)}
                      </td>
                    ))}
                  <td className="whitespace-nowrap py-2 text-right font-bold tabular-nums">{formatujKwote(m.razem)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Rozwijane>
    </figure>
  );
}
