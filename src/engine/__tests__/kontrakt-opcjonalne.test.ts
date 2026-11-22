/**
 * Pola kontraktu, które stały się opcjonalne (prośby do integratora 9 i 10): brak danej = „nie wiadomo”,
 * więc reguła, która jej potrzebuje, nie daje prawa do zasiłku.
 */
import { describe, expect, it } from 'vitest';
import { parametryNaDzien, ustalUprawnienia, WERSJE_DOMYSLNE } from '..';
import type { Swiadczenie, Uprawnienie } from '../types';
import { etat, mama, rodzina } from './rodziny';

function u(l: Uprawnienie[], sw: Swiadczenie): Uprawnienie {
  const w = l.filter((x) => x.osobaId === 'mama' && x.swiadczenie === sw);
  expect(w, sw).toHaveLength(1);
  return w[0];
}

describe('eZLA bez kodB (IKP zna okres, nie kod)', () => {
  it('zwolnienie bez kodB nie liczy się do okresu zasiłkowego w ciąży (por. EC-103)', () => {
    const bezKodu = rodzina({ osoby: [mama([etat()], { zdrowie: { eZLA: [{ od: '2026-02-25', do: '2026-11-30' }] } })] });
    const l = ustalUprawnienia(bezKodu, WERSJE_DOMYSLNE).uprawnienia;
    expect(u(l, 'swiadczenie_rehabilitacyjne').przysluguje).toBe(false);
  });
});

describe('ustanie bez przyczyny (eZUS zna datę, nie przyczynę w rozumieniu ZAM)', () => {
  const r = rodzina({ osoby: [mama([etat({ ustanie: { data: '2026-09-15' } })])] });
  const l = ustalUprawnienia(r, WERSJE_DOMYSLNE).uprawnienia;

  it('UZ art. 30 ust. 3: zasiłek w wysokości macierzyńskiego – nie, brak przesłanek', () => {
    expect(u(l, 'zasilek_w_wys_macierzynskiego')).toMatchObject({ przysluguje: false, kod: 'W_WYS_MAC_BRAK_PRZESLANEK' });
  });

  it('UZ art. 30 ust. 1: macierzyński nie wynika z ustania z przyczyn pracodawcy', () => {
    const m = u(l, 'macierzynski');
    expect(m.przysluguje).not.toBe(true);
    expect(m.kod).not.toMatch(/^USTANIE_/);
  });
});

describe('parametry: termin wniosku na warunkach macierzyńskiego', () => {
  it('KP art. 183 § 6: 7 dni od przyjęcia dziecka, z przepisem w parametrach', () => {
    const p = parametryNaDzien('2026-12-01', WERSJE_DOMYSLNE);
    expect(p.terminyDni.wniosekNaWarunkachMacierzynskiegoPo).toBe(7);
    expect(p.przepisy?.['terminyDni.wniosekNaWarunkachMacierzynskiegoPo']).toBe('KP art. 183 § 6');
  });
});
