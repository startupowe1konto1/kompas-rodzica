/** Zdanie nad zwiniętą listą niedostępnych możliwości, z polską odmianą liczebnika. Czyste, testowane w Vitest. */
export function zdanieNiedostepnych(n: number): string {
  if (n === 1) return '1 możliwość jest teraz niedostępna';
  const d = n % 10;
  const dwie = n % 100;
  if (d >= 2 && d <= 4 && !(dwie >= 12 && dwie <= 14)) return `${n} możliwości są teraz niedostępne`;
  return `${n} możliwości jest teraz niedostępnych`;
}
