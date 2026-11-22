import type Anthropic from '@anthropic-ai/sdk';
import { describe, expect, it } from 'vitest';
import { obliczKwoty, ustalUprawnienia, WERSJE_DOMYSLNE, zastosujAkcje } from '../../engine';
import type { AkcjaPlanu, Rodzina, ZapytanieCzatu } from '../../engine/types';
import { PRZYKLAD_PLAN, PRZYKLAD_RODZINA } from '../../mocks/przyklad';
import { BladDanych } from '../../server/http';
import { rodzinaDlaModelu } from '../anonimizacja';
import { MAKS_CZAS_MS, MAKS_DLUGOSC_PYTANIA, MAKS_HISTORIA, MAKS_KROKOW, MODEL, rozmawiaj, type WyslijDoModelu } from '../rozmowa';

type Blok = Record<string, unknown>;
type Parametry = Anthropic.Beta.Messages.MessageCreateParamsNonStreaming;

function wiadomosc(content: Blok[], stop_reason: string): Anthropic.Beta.Messages.BetaMessage {
  return {
    id: 'msg_test',
    type: 'message',
    role: 'assistant',
    model: MODEL,
    content,
    stop_reason,
    stop_details: null,
    stop_sequence: null,
    usage: { input_tokens: 1, output_tokens: 1 },
  } as unknown as Anthropic.Beta.Messages.BetaMessage;
}
const tekst = (t: string) => wiadomosc([{ type: 'text', text: t }], 'end_turn');
const narzedzie = (name: string, input: unknown, id = 'tu_1') =>
  wiadomosc([{ type: 'thinking', thinking: '', signature: 'sig' }, { type: 'tool_use', id, name, input }], 'tool_use');

/** Atrapa modelu: zwraca kolejne odpowiedzi ze scenariusza i zapamiętuje, co dostała (kopie, bo pętla dopisuje do tablic). */
function atrapa(...scenariusz: Anthropic.Beta.Messages.BetaMessage[]) {
  const wywolania: Parametry[] = [];
  const wyslij: WyslijDoModelu = async (p) => {
    wywolania.push(structuredClone(p));
    const nastepna = scenariusz[Math.min(wywolania.length - 1, scenariusz.length - 1)];
    return nastepna;
  };
  return { wyslij, wywolania };
}

const zapytanie = (pytanie: string, extra: Partial<ZapytanieCzatu> = {}): ZapytanieCzatu => ({
  rodzina: PRZYKLAD_RODZINA,
  plan: PRZYKLAD_PLAN,
  pytanie,
  ...extra,
});

const r = rodzinaDlaModelu(PRZYKLAD_RODZINA);
const przepis = ustalUprawnienia(r, WERSJE_DOMYSLNE).uprawnienia[0].przepis;

describe('rozmawiaj – zwykła odpowiedź', () => {
  it('zwraca tekst modelu i przepisy z wyniku silnika, na które się powołuje', async () => {
    const { wyslij } = atrapa(tekst(`Przysługuje Ci zasiłek macierzyński (${przepis}).`));
    const w = await rozmawiaj(zapytanie('Dlaczego mam zasiłek?'), WERSJE_DOMYSLNE, wyslij);
    expect(w.kod).toBe('ODPOWIEDZ');
    expect(w.zapytajZus).toBe(false);
    expect(w.zrodla).toContain(przepis);
    expect(w.propozycja).toBeUndefined();
  });

  it('pyta model z ustawieniami czatu: aktualny model, niski wysiłek, bez wymuszania narzędzia', async () => {
    const { wyslij, wywolania } = atrapa(tekst('Ok.'));
    await rozmawiaj(zapytanie('Co mi przysługuje?'), WERSJE_DOMYSLNE, wyslij);
    const p = wywolania[0];
    expect(p.model).toBe(MODEL);
    expect(p.output_config?.effort).toBe('low');
    expect(p.tool_choice).toBeUndefined();
    expect(p.tools?.map((t) => ('name' in t ? t.name : ''))).toEqual(['sprawdz_zmiane_planu', 'odeslij_do_zus']);
    expect(JSON.stringify(p.messages)).toContain('Co mi przysługuje?');
  });

  it('nie wysyła do modelu danych osobowych z profilu ani z pytania', async () => {
    const rodzina: Rodzina = {
      ...PRZYKLAD_RODZINA,
      osoby: PRZYKLAD_RODZINA.osoby.map((o) => ({ ...o, dane: { imie: 'Zofia', nazwisko: 'Testowska', pesel: '90010112345' } })),
    };
    const { wyslij, wywolania } = atrapa(tekst('Ok.'));
    await rozmawiaj(
      zapytanie('Jestem Zofia Testowska, PESEL 90010112345, ile dostanę?', {
        rodzina,
        historia: [{ pytanie: 'Czy Zofia ma zasiłek?', odpowiedz: 'Tak.' }],
      }),
      WERSJE_DOMYSLNE,
      wyslij,
    );
    const json = JSON.stringify(wywolania);
    for (const z of ['Zofia', 'Testowska', '90010112345', 'Przykładowa Firma']) expect(json, z).not.toContain(z);
  });
});

describe('rozmawiaj – „co jeśli”', () => {
  const akcja: AkcjaPlanu = { typ: 'zmien_koniec', odcinekId: 'r1', nowyDo: '2027-10-01' };

  it('liczy zmianę silnikiem i zwraca propozycję, nie zmieniając planu z zapytania', async () => {
    const przed = structuredClone(PRZYKLAD_PLAN);
    const { wyslij, wywolania } = atrapa(narzedzie('sprawdz_zmiane_planu', { akcja }), tekst('Krótszy urlop rodzicielski.'));
    const w = await rozmawiaj(zapytanie('Co jeśli skończę rodzicielski 1.10.2027?'), WERSJE_DOMYSLNE, wyslij);

    const oczekiwana = zastosujAkcje(r, PRZYKLAD_PLAN, akcja, WERSJE_DOMYSLNE);
    expect(w.propozycja?.akcja).toEqual(akcja);
    expect(w.propozycja?.plan).toEqual(oczekiwana.plan);
    expect(w.propozycja?.walidacja).toEqual(oczekiwana.walidacja);
    expect(w.propozycja?.kwoty).toEqual(obliczKwoty(r, oczekiwana.plan, WERSJE_DOMYSLNE));
    expect(PRZYKLAD_PLAN).toEqual(przed);
    expect(w.kod).toBe('ODPOWIEDZ');

    // Druga runda: odpowiedź modelu wraca bez zmian (z blokiem myślenia), potem wynik narzędzia.
    const drugie = wywolania[1].messages;
    expect(drugie[1]).toEqual({ role: 'assistant', content: narzedzie('sprawdz_zmiane_planu', { akcja }).content });
    const wynik = JSON.stringify(drugie[2]);
    expect(wynik).toContain('tool_result');
    expect(wynik).toContain('tu_1');
  });

  it('kwota z wyniku „co jeśli” przechodzi przez strażnika', async () => {
    const nowy = zastosujAkcje(r, PRZYKLAD_PLAN, akcja, WERSJE_DOMYSLNE).plan;
    const kwota = obliczKwoty(r, nowy, WERSJE_DOMYSLNE).odcinki.at(-1)!.razem;
    const zl = kwota.toFixed(2).replace('.', ',');
    const { wyslij } = atrapa(narzedzie('sprawdz_zmiane_planu', { akcja }), tekst(`Za ten odcinek dostaniesz ${zl} zł.`));
    const w = await rozmawiaj(zapytanie('Co jeśli…?'), WERSJE_DOMYSLNE, wyslij);
    expect(w.kod).toBe('ODPOWIEDZ');
  });

  it('błędna akcja wraca do modelu jako błąd narzędzia, bez propozycji', async () => {
    const { wyslij, wywolania } = atrapa(
      narzedzie('sprawdz_zmiane_planu', { akcja: { typ: 'teleportuj', odcinekId: 'r1' } }),
      tekst('Nie da się tego sprawdzić.'),
    );
    const w = await rozmawiaj(zapytanie('Co jeśli…?'), WERSJE_DOMYSLNE, wyslij);
    expect(w.propozycja).toBeUndefined();
    expect(JSON.stringify(wywolania[1].messages[2])).toContain('"is_error":true');
  });
});

describe('rozmawiaj – bez profilu (rodzic nie wypełnił jeszcze ankiety)', () => {
  it('pyta model bez faktów z silnika, tylko z narzędziem kontaktu do ZUS', async () => {
    const { wyslij, wywolania } = atrapa(tekst('Wypełnij ankietę „Moja sytuacja”, a pokażę Ci, co Ci przysługuje.'));
    const w = await rozmawiaj({ rodzina: null, plan: null, pytanie: 'Ile dostanę?' }, WERSJE_DOMYSLNE, wyslij);
    expect(w.kod).toBe('ODPOWIEDZ');
    expect(w.propozycja).toBeUndefined();
    const p = wywolania[0];
    expect(p.tools?.map((t) => ('name' in t ? t.name : ''))).toEqual(['odeslij_do_zus']);
    expect(String(p.messages[0].content)).toContain('"profil":"brak"');
  });

  it('bez faktów strażnik odrzuca każdą kwotę i artykuł z pamięci modelu', async () => {
    const { wyslij } = atrapa(tekst('Zasiłek to 81,5% podstawy, np. 5000 zł (art. 31 ustawy).'));
    const w = await rozmawiaj({ rodzina: null, plan: null, pytanie: 'Ile dostanę?' }, WERSJE_DOMYSLNE, wyslij);
    expect(w.kod).toBe('NIEZWERYFIKOWANA');
  });

  it('bez profilu dalej usuwa PESEL z pytania', async () => {
    const { wyslij, wywolania } = atrapa(tekst('Ok.'));
    await rozmawiaj({ rodzina: null, plan: null, pytanie: 'Mój PESEL to 90010112345' }, WERSJE_DOMYSLNE, wyslij);
    expect(JSON.stringify(wywolania)).not.toContain('90010112345');
  });
});

describe('rozmawiaj – odporność na nietypowe dane i limity', () => {
  it('historia w złym kształcie nie psuje odpowiedzi: złe wpisy pomijamy, zostaje najwyżej MAKS_HISTORIA ostatnich', async () => {
    const historia = [
      ...Array.from({ length: MAKS_HISTORIA + 2 }, (_, i) => ({ pytanie: `pytanie-${i}`, odpowiedz: `odpowiedz-${i}` })),
      { pytanie: 5 },
      null,
      'tekst',
    ] as unknown as ZapytanieCzatu['historia'];
    const { wyslij, wywolania } = atrapa(tekst('Ok.'));
    const w = await rozmawiaj(zapytanie('Pytanie', { historia }), WERSJE_DOMYSLNE, wyslij);
    expect(w.kod).toBe('ODPOWIEDZ');
    const tresc = String(wywolania[0].messages[0].content);
    expect(tresc).not.toContain('pytanie-0\n');
    expect(tresc).not.toContain('pytanie-1\n');
    expect(tresc).toContain(`pytanie-${MAKS_HISTORIA + 1}`);
  });

  it('historia, która nie jest listą, jest pomijana', async () => {
    const { wyslij } = atrapa(tekst('Ok.'));
    const w = await rozmawiaj(zapytanie('Pytanie', { historia: 'x' as unknown as ZapytanieCzatu['historia'] }), WERSJE_DOMYSLNE, wyslij);
    expect(w.kod).toBe('ODPOWIEDZ');
  });

  it(`po przekroczeniu ${MAKS_CZAS_MS / 1000} s nie zaczynamy kolejnego kroku (limit czasu hostingu)`, async () => {
    let teraz = 0;
    const zegar = () => teraz;
    const wolny: WyslijDoModelu = async () => {
      teraz += MAKS_CZAS_MS;
      return narzedzie('odeslij_do_zus', {});
    };
    const w = await rozmawiaj(zapytanie('?'), WERSJE_DOMYSLNE, wolny, { zegar });
    expect(w.kod).toBe('ZA_DUZO_KROKOW');
    expect(teraz).toBe(MAKS_CZAS_MS);
  });

  it('wiedza o ankiecie jest w stałej części zapytania, z pamięcią podręczną', async () => {
    const { wyslij, wywolania } = atrapa(tekst('Ok.'), tekst('Ok.'));
    await rozmawiaj(zapytanie('Co znaczy pytanie o rolę?'), WERSJE_DOMYSLNE, wyslij);
    await rozmawiaj(zapytanie('Inne pytanie'), WERSJE_DOMYSLNE, wyslij);
    const s1 = JSON.stringify(wywolania[0].system);
    expect(s1).toContain('Kim jest Pani/Pan dla dziecka?');
    expect(s1).toContain('cache_control');
    expect(JSON.stringify(wywolania[1].system)).toBe(s1);
  });

  it('stawka z parametrów prawa (81,5%) przechodzi przez strażnika, choć nie ma jej w wyniku planu', async () => {
    const { wyslij } = atrapa(tekst('Możesz wybrać wariant 81,5% za cały okres.'));
    expect((await rozmawiaj(zapytanie('A 81,5%?'), WERSJE_DOMYSLNE, wyslij)).kod).toBe('ODPOWIEDZ');
    const bezProfilu = atrapa(tekst('Możesz wybrać wariant 81,5% za cały okres.'));
    expect((await rozmawiaj({ rodzina: null, plan: null, pytanie: 'A 81,5%?' }, WERSJE_DOMYSLNE, bezProfilu.wyslij)).kod).toBe('ODPOWIEDZ');
  });

  it('usuwa nagłówki Markdown', async () => {
    const { wyslij } = atrapa(tekst('## Kwoty\nDostaniesz 230,11 zł dziennie.'));
    const w = await rozmawiaj(zapytanie('Ile?'), WERSJE_DOMYSLNE, wyslij);
    expect(w.odpowiedz).toBe('Kwoty\nDostaniesz 230,11 zł dziennie.');
  });
});

describe('rozmawiaj – tekst z wielu kroków', () => {
  it('tekst napisany razem z wywołaniem narzędzia nie ginie (błąd z pierwszego prawdziwego testu)', async () => {
    const krok1 = wiadomosc(
      [
        { type: 'text', text: 'Za urlop rodzicielski dostaniesz 230,11 zł dziennie.' },
        { type: 'tool_use', id: 'tu_1', name: 'odeslij_do_zus', input: { powod: 'warunkowo' } },
      ],
      'tool_use',
    );
    const { wyslij } = atrapa(krok1, tekst('Pod tą wiadomością widzisz kontakt do ZUS.'));
    const w = await rozmawiaj(zapytanie('Ile dostanę?'), WERSJE_DOMYSLNE, wyslij);
    expect(w.odpowiedz).toContain('230,11 zł dziennie');
    expect(w.odpowiedz).toContain('kontakt do ZUS');
    expect(w.zapytajZus).toBe(true);
  });

  it('gdy model skończy po narzędziach bez tekstu, prosimy go raz o odpowiedź (błąd z prawdziwego testu)', async () => {
    const akcja: AkcjaPlanu = { typ: 'ustaw_wariant_815', wartosc: true };
    const pusty = wiadomosc([{ type: 'thinking', thinking: '', signature: 'sig' }], 'end_turn');
    const { wyslij, wywolania } = atrapa(
      narzedzie('sprawdz_zmiane_planu', { akcja }),
      narzedzie('odeslij_do_zus', { powod: 'termin' }, 'tu_2'),
      pusty,
      tekst('W wariancie 81,5% dostajesz tyle samo przez cały urlop.'),
    );
    const w = await rozmawiaj(zapytanie('Co jeśli wybiorę 81,5%?'), WERSJE_DOMYSLNE, wyslij);
    expect(w.odpowiedz).toContain('tyle samo przez cały urlop');
    expect(w.kod).toBe('ODESLANO_DO_ZUS');
    expect(w.propozycja?.akcja).toEqual(akcja);
    expect(JSON.stringify(wywolania[3].messages.at(-1))).toContain('Napisz teraz odpowiedź');
  });

  it('gdy tekst powstał razem z odesłaniem do ZUS, model nie dostaje prośby o pisanie od nowa (powtórzona odpowiedź)', async () => {
    const krok1 = wiadomosc(
      [
        { type: 'text', text: 'Wniosek złóż do 22 grudnia 2026.' },
        { type: 'tool_use', id: 'tu_1', name: 'odeslij_do_zus', input: {} },
      ],
      'tool_use',
    );
    const { wyslij, wywolania } = atrapa(krok1, tekst('Kontakt do ZUS jest poniżej.'));
    await rozmawiaj(zapytanie('Do kiedy?'), WERSJE_DOMYSLNE, wyslij);
    const wynik = JSON.stringify(wywolania[1].messages.at(-1));
    expect(wynik).toContain('Nie powtarzaj');
    expect(wynik).not.toContain('Napisz teraz odpowiedź');
  });

  it('usuwa znaczniki pogrubienia Markdown, których panel nie wyświetla', async () => {
    const { wyslij } = atrapa(tekst('Dostaniesz **230,11 zł** dziennie, a __tata__ też.'));
    const w = await rozmawiaj(zapytanie('Ile dostanę?'), WERSJE_DOMYSLNE, wyslij);
    expect(w.odpowiedz).toBe('Dostaniesz 230,11 zł dziennie, a tata też.');
  });
});

describe('rozmawiaj – granice', () => {
  it('pytanie spoza danych: model wywołuje odeslij_do_zus → kontakt do ZUS', async () => {
    const { wyslij } = atrapa(narzedzie('odeslij_do_zus', { powod: 'pytanie o 800+' }), tekst('Zapytaj ZUS.'));
    const w = await rozmawiaj(zapytanie('A 800 plus?'), WERSJE_DOMYSLNE, wyslij);
    expect(w.kod).toBe('ODESLANO_DO_ZUS');
    expect(w.zapytajZus).toBe(true);
  });

  it('zmyślona kwota: odpowiedź odrzucona, kontakt do ZUS', async () => {
    const { wyslij } = atrapa(tekst('Dostaniesz 9 999,99 zł miesięcznie.'));
    const w = await rozmawiaj(zapytanie('Ile dostanę?'), WERSJE_DOMYSLNE, wyslij);
    expect(w.kod).toBe('NIEZWERYFIKOWANA');
    expect(w.zapytajZus).toBe(true);
    expect(w.odpowiedz).not.toContain('9 999,99');
  });

  it('odmowa modelu → kontakt do ZUS', async () => {
    const { wyslij } = atrapa(wiadomosc([], 'refusal'));
    const w = await rozmawiaj(zapytanie('?'), WERSJE_DOMYSLNE, wyslij);
    expect(w.kod).toBe('ODMOWA_MODELU');
    expect(w.zapytajZus).toBe(true);
  });

  it(`model, który nie kończy, zatrzymujemy po ${MAKS_KROKOW} krokach`, async () => {
    const { wyslij, wywolania } = atrapa(narzedzie('odeslij_do_zus', {}));
    const w = await rozmawiaj(zapytanie('?'), WERSJE_DOMYSLNE, wyslij);
    expect(w.kod).toBe('ZA_DUZO_KROKOW');
    expect(wywolania).toHaveLength(MAKS_KROKOW);
  });

  it('puste i za długie pytanie → BladDanych (400), bez wołania modelu', async () => {
    const { wyslij, wywolania } = atrapa(tekst('Ok.'));
    await expect(rozmawiaj(zapytanie('   '), WERSJE_DOMYSLNE, wyslij)).rejects.toBeInstanceOf(BladDanych);
    await expect(rozmawiaj(zapytanie('a'.repeat(MAKS_DLUGOSC_PYTANIA + 1)), WERSJE_DOMYSLNE, wyslij)).rejects.toBeInstanceOf(BladDanych);
    await expect(rozmawiaj({ ...zapytanie('x'), pytanie: 5 } as unknown as ZapytanieCzatu, WERSJE_DOMYSLNE, wyslij)).rejects.toBeInstanceOf(BladDanych);
    expect(wywolania).toHaveLength(0);
  });
});
