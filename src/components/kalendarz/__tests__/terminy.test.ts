import { describe, expect, it } from 'vitest';
import type { Termin } from '../../../engine/types';
import { oznaczTerminy } from '../terminy';

const t = (data: string): Termin => ({ data, tytul: data, opis: '', rodzaj: 'wniosek' });

describe('oznaczTerminy', () => {
  it('sortuje i oznacza: minął / w ciągu 14 dni / później', () => {
    const w = oznaczTerminy([t('2026-12-06'), t('2026-11-20'), t('2026-12-05'), t('2026-11-21')], '2026-11-21');
    expect(w.map((x) => [x.data, x.stan, x.zaIleDni])).toEqual([
      ['2026-11-20', 'minal', -1],
      ['2026-11-21', 'wkrotce', 0],
      ['2026-12-05', 'wkrotce', 14],
      ['2026-12-06', 'pozniej', 15],
    ]);
  });
  it('próg można zmienić', () => {
    const w = oznaczTerminy([t('2026-11-25')], '2026-11-21', 3);
    expect(w[0].stan).toBe('pozniej');
  });
});
