/** Sumy kwot po osobach i rozbicie miesięczne całej rodziny. Zaokrąglenie do grosza tylko tutaj. */
import type { KwotaOdcinka, MiesiacISO, WynikKwot } from '../../engine/types';

const doGrosza = (x: number) => Math.round((x + Number.EPSILON) * 100) / 100;

export function podsumowanieOsoby(
  w: WynikKwot,
  osobaId: string,
): { brutto: number; naReke?: number; odcinki: KwotaOdcinka[] } {
  const odcinki = w.odcinki.filter((o) => o.osobaId === osobaId);
  const brutto = doGrosza(odcinki.reduce((s, o) => s + o.razem, 0));
  const maSzacunek = odcinki.length > 0 && odcinki.every((o) => o.naReke !== undefined);
  const naReke = maSzacunek ? doGrosza(odcinki.reduce((s, o) => s + (o.naReke as number), 0)) : undefined;
  return { brutto, naReke, odcinki };
}

export function rozbicieRodziny(
  w: WynikKwot,
): { miesiac: MiesiacISO; kwoty: Record<string, number>; razem: number }[] {
  const mapa = new Map<MiesiacISO, Record<string, number>>();
  for (const o of w.odcinki) {
    for (const m of o.rozbicieMiesieczne) {
      const kwoty = mapa.get(m.miesiac) ?? {};
      kwoty[o.osobaId] = (kwoty[o.osobaId] ?? 0) + m.kwota;
      mapa.set(m.miesiac, kwoty);
    }
  }
  return [...mapa.keys()].sort().map((miesiac) => {
    const surowe = mapa.get(miesiac) as Record<string, number>;
    const kwoty: Record<string, number> = {};
    for (const [id, k] of Object.entries(surowe)) kwoty[id] = doGrosza(k);
    return { miesiac, kwoty, razem: doGrosza(Object.values(surowe).reduce((s, k) => s + k, 0)) };
  });
}
