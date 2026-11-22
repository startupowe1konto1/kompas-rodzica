/**
 * Strażnik błędu z bundla Next.js (21.11, `ReferenceError: dodajDni is not defined` w /api/plan/validate).
 *
 * Kompilator Next.js przepisuje pętlę `for (let x = …; …; x = funkcja(x))`, gdy zmienną pętli przechwytuje
 * funkcja strzałkowa w jej treści, i gubi wtedy import użyty w wyrażeniu aktualizacji. Vitest kompiluje kod
 * inaczej, więc zwykły test tego nie złapie. Ten test czyta źródła silnika i nie dopuszcza takiego wzorca:
 * zamiast niego piszemy pętlę `while` z aktualizacją na końcu treści.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { describe, expect, it } from 'vitest';

const KATALOG_SILNIKA = join(__dirname, '..', '..');

function plikiZrodlowe(katalog: string): string[] {
  return readdirSync(katalog).flatMap((nazwa) => {
    const sciezka = join(katalog, nazwa);
    if (statSync(sciezka).isDirectory()) return nazwa === '__tests__' ? [] : plikiZrodlowe(sciezka);
    return nazwa.endsWith('.ts') ? [sciezka] : [];
  });
}

/** Treść bloku od klamry otwierającej `start` do pasującej klamry zamykającej. */
function blok(tekst: string, start: number): string {
  let glebokosc = 0;
  for (let i = start; i < tekst.length; i++) {
    if (tekst[i] === '{') glebokosc++;
    if (tekst[i] === '}' && --glebokosc === 0) return tekst.slice(start, i + 1);
  }
  return tekst.slice(start);
}

/** Miejsca `plik:linia` z pętlą `for`, której aktualizacja wywołuje funkcję, a treść ma funkcję strzałkową. */
export function ryzykownePetle(nazwaPliku: string, tekst: string): string[] {
  const wzorzec = /for \(let (\w+) = [^;]+;[^;]+;\s*\1 = [\w.]+\([^)]*\)\)\s*\{/g;
  const wynik: string[] = [];
  for (const m of tekst.matchAll(wzorzec)) {
    const tresc = blok(tekst, m.index + m[0].length - 1);
    if (tresc.includes('=>')) wynik.push(`${nazwaPliku}:${tekst.slice(0, m.index).split('\n').length}`);
  }
  return wynik;
}

describe('pętle bezpieczne dla bundla Next.js', () => {
  it('wykrywa wzorzec, który psuł /api/plan/validate', () => {
    const zly = 'for (let d = z; d <= k; d = dodajDni(d, 1)) {\n  if (xs.some((o) => o === d)) continue;\n}';
    const dobry = 'for (let m = a; m <= k; m = przesunMiesiac(m, 1)) {\n  wynik.push(m);\n}';
    expect(ryzykownePetle('zly.ts', zly)).toEqual(['zly.ts:1']);
    expect(ryzykownePetle('dobry.ts', dobry)).toEqual([]);
  });

  it('silnik nie ma pętli for z wywołaniem w aktualizacji i domknięciem w treści', () => {
    const znalezione = plikiZrodlowe(KATALOG_SILNIKA).flatMap((plik) =>
      ryzykownePetle(relative(KATALOG_SILNIKA, plik), readFileSync(plik, 'utf8')),
    );
    expect(znalezione).toEqual([]);
  });
});
