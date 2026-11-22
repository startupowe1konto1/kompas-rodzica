import { describe, expect, it } from 'vitest';
import { PARAMETRY_2026 } from '../../params';
import type { TypOdcinka } from '../../types';
import { czyZPodwyzszeniem, dniZasilkuWMiesiacu, kwotaOdniesienia, podwyzszenieMiesiaca, wzorKwotyOdniesienia } from '../podwyzszenie';

describe('czyZPodwyzszeniem', () => {
  it('macierzyński, na warunkach macierzyńskiego, uzupełniający i rodzicielski tak; ojcowski, ciąża i w wysokości macierzyńskiego nie', () => {
    const tak: TypOdcinka[] = ['macierzynski', 'na_warunkach_macierzynskiego', 'uzupelniajacy', 'rodzicielski'];
    const nie: TypOdcinka[] = ['ojcowski', 'w_wys_macierzynskiego', 'chorobowy_ciaza', 'praca', 'przerwa', 'wychowawczy'];
    expect(tak.map(czyZPodwyzszeniem)).toEqual([true, true, true, true]);
    expect(nie.map(czyZPodwyzszeniem)).toEqual([false, false, false, false, false, false]);
  });
});

describe('kwotaOdniesienia', () => {
  it('za wszystkie dni miesiąca: pełna kwota świadczenia rodzicielskiego (także w lutym)', () => {
    expect(kwotaOdniesienia('2027-06', 30, PARAMETRY_2026)).toBe(1000);
    expect(kwotaOdniesienia('2027-02', 28, PARAMETRY_2026)).toBe(1000);
  });
  it('przykład ZUS nr 3: 1000 ÷ 31 = 32,26; × 28 = 903,28 → w górę do 10 gr = 903,30', () => {
    expect(kwotaOdniesienia('2027-01', 28, PARAMETRY_2026)).toBe(903.3);
  });
  it('15 dni czerwca: 1000 ÷ 30 = 33,33; × 15 = 499,95 → 500,00', () => {
    expect(kwotaOdniesienia('2027-06', 15, PARAMETRY_2026)).toBe(500);
  });
  it('wynik już równy pełnym 10 gr się nie zmienia: 1000 ÷ 31 = 32,26; × 5 = 161,30', () => {
    expect(kwotaOdniesienia('2027-01', 5, PARAMETRY_2026)).toBe(161.3);
  });
  it('kwotę bierze z parametrów, nie z kodu', () => {
    const inne = { ...PARAMETRY_2026, kwoty: { ...PARAMETRY_2026.kwoty, swiadczenieRodzicielskie: 1500 } };
    expect(kwotaOdniesienia('2027-06', 30, inne)).toBe(1500);
    // 1500 ÷ 30 = 50,00; × 15 = 750,00
    expect(kwotaOdniesienia('2027-06', 15, inne)).toBe(750);
  });
  it('bez dni zasiłku: 0', () => {
    expect(kwotaOdniesienia('2027-06', 0, PARAMETRY_2026)).toBe(0);
  });
  it('wzór do ścieżki jest tylko dla części miesiąca', () => {
    expect(wzorKwotyOdniesienia('2027-06', 30, PARAMETRY_2026)).toBeUndefined();
    expect(wzorKwotyOdniesienia('2027-01', 28, PARAMETRY_2026)).toBeTypeOf('string');
  });
});

describe('podwyzszenieMiesiaca', () => {
  it('EC-90: 724,80 zł zasiłku, zaliczka 87 zł, po zaliczce 637,80 zł → podwyższenie 362,20 zł (bez wariantu brutto)', () => {
    expect(podwyzszenieMiesiaca('2027-06', 30, 724.8, 87, PARAMETRY_2026)).toEqual({
      kwotaOdniesienia: 1000,
      calyMiesiac: true,
      poZaliczce: 637.8,
      podwyzszenie: 362.2,
    });
  });
  it('przykład ZUS nr 3 (zaliczka 12%): 952,00 − 114 = 838,00; 903,30 − 838,00 = 65,30', () => {
    expect(podwyzszenieMiesiaca('2027-01', 28, 952, 114, PARAMETRY_2026)).toMatchObject({ kwotaOdniesienia: 903.3, calyMiesiac: false, poZaliczce: 838, podwyzszenie: 65.3 });
  });
  it('zasiłek po zaliczce nie niższy od kwoty odniesienia: bez podwyższenia', () => {
    expect(podwyzszenieMiesiaca('2027-06', 30, 1200, 144, PARAMETRY_2026)).toMatchObject({ poZaliczce: 1056, podwyzszenie: 0 });
    expect(podwyzszenieMiesiaca('2027-06', 30, 1136, 136, PARAMETRY_2026)).toMatchObject({ poZaliczce: 1000, podwyzszenie: 0 });
  });
});

describe('dniZasilkuWMiesiacu', () => {
  it('dwa tytuły w tych samych dniach liczą się raz: pełny czerwiec = 30', () => {
    expect(dniZasilkuWMiesiacu([{ od: '2027-06-01', do: '2027-06-30' }, { od: '2027-06-01', do: '2027-06-30' }], '2027-06')).toBe(30);
  });
  it('macierzyński do 19.04 i rodzicielski od 20.04 dają pełny kwiecień', () => {
    expect(dniZasilkuWMiesiacu([{ od: '2026-12-01', do: '2027-04-19' }, { od: '2027-04-20', do: '2027-11-29' }], '2027-04')).toBe(30);
  });
  it('liczy tylko dni w danym miesiącu', () => {
    expect(dniZasilkuWMiesiacu([{ od: '2027-01-04', do: '2027-02-10' }], '2027-01')).toBe(28);
    expect(dniZasilkuWMiesiacu([{ od: '2027-01-04', do: '2027-02-10' }], '2027-02')).toBe(10);
    expect(dniZasilkuWMiesiacu([{ od: '2027-01-04', do: '2027-02-10' }], '2027-03')).toBe(0);
  });
});
