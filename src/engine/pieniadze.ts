/** Zaokrąglenie do grosza. Epsilon chroni przed błędami typu 1.005 → 1.00. */
export function doGrosza(kwota: number): number {
  return Math.round((kwota + Number.EPSILON) * 100) / 100;
}

/** Suma kwot zaokrąglona do grosza (unika dryfu liczb zmiennoprzecinkowych). */
export function suma(kwoty: number[]): number {
  return doGrosza(kwoty.reduce((s, k) => s + k, 0));
}
