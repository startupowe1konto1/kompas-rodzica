/**
 * SCENARIUSZE (plany domyślne) – TOR A, zadanie A4 (docs/superpowers/plans/2026-11-21-tor-a.md, D11, D13–D17,
 * decyzje integratora z przeglądu A4).
 *
 * Kolejność: `mama-caly-urlop` (pierwszy, gdy matka ma prawo do macierzyńskiego), `po-rowno`, `tata-po-14-tyg`,
 * `tata-swoje-9-tyg`, `mama-pol-etatu`. Zgon ubezpieczonej matki po porodzie: `tata-po-zgonie-mamy`.
 * Matka bez prawa, druga osoba z prawem (EC-56): `tata-pelny-rodzicielski`. Nikt nie ma prawa – pusta lista.
 * Długości wyłącznie z `uprawnienia.pule` i `p`. Każdy plan przechodzi `walidujPlan`.
 */
import { dodajDni, liczbaDni, pozniejsza, wczesniejsza } from '../daty';
import { koniecTytulu, tytulyOsoby } from '../eligibility/ubezpieczenie';
import type { DataISO, Osoba, Parametry, Plan, Rodzina, Swiadczenie, TypOdcinka, WynikUprawnien } from '../types';
import { dlugoscPrzyLaczeniu } from './akcjeLaczenie';
import {
  type Krok,
  KTO,
  ojcowskiDla,
  pierwszyDzienUbezpieczenia,
  poKolei,
  przytnijRodzicielski,
  type Szkic,
  tygodnie,
  wyliczenie,
  zloz,
} from './scenariuszeWspolne';
import { koniecRodzicielskiegoZPrzepisu } from './walidacjaWspolne';

export function zbudujScenariusze(rodzina: Rodzina, uprawnienia: WynikUprawnien, p: Parametry): Plan[] {
  const { pule } = uprawnienia;
  const z = rodzina.zdarzenie.data;
  const porod = rodzina.zdarzenie.typ === 'porod';
  // Termin rodzicielskiego: przycinamy do pełnych tygodni, chyba że urlop kończy przepis (zgon dziecka).
  const zPrzepisu = koniecRodzicielskiegoZPrzepisu(rodzina, pule) !== undefined;
  const przytnij = (szkice: Szkic[]) => przytnijRodzicielski(szkice, pule.rodzicielskiDoKiedy, zPrzepisu);

  // Wpis z `przysluguje` różnym od false (także 'warunkowo') – osoba może mieć to świadczenie w planie (jak w walidacji).
  const wpis = (o: Osoba, s: Swiadczenie) => uprawnienia.uprawnienia.find((u) => u.osobaId === o.id && u.swiadczenie === s);
  const ma = (o: Osoba, s: Swiadczenie) => {
    const u = wpis(o, s);
    return u !== undefined && u.przysluguje !== false;
  };

  const M = pule.macierzynskiTyg;
  const R = pule.rodzicielskiTyg;
  const N = pule.rodzicielskiNieprzenoszalneTyg;
  // Pula macierzyńskiego w dniach; po zgonie dziecka koniec wynika z daty [KP art. 180¹].
  const macDni = pule.macierzynskiOstatniDzien ? liczbaDni(z, pule.macierzynskiOstatniDzien) : M * 7;
  const poMac = dodajDni(z, macDni); // pierwszy dzień po (oczekiwanym) końcu macierzyńskiego

  const plany: Plan[] = [];
  /**
   * Dodaje scenariusz: rodzicielski przycięty do `rodzicielskiDoKiedy`, ojcowski osoby `zOjcowskim` (gdy ma do niego
   * prawo). Scenariusz, któremu termin zabrał cały odcinek rodzicielskiego, nie ma sensu – pomijamy go, chyba że
   * `zawsze` (plan podstawowy). Plan bez odcinków pomijamy zawsze.
   */
  const dodaj = (id: string, nazwa: string, lancuch: Szkic[], zOjcowskim?: Osoba, zawsze = false): void => {
    const { szkice, utracone } = przytnij(lancuch);
    if (utracone && !zawsze) return;
    const ojc = zOjcowskim && ma(zOjcowskim, 'ojcowski') ? ojcowskiDla(rodzina, p, pule, zOjcowskim, szkice) : [];
    if (szkice.length + ojc.length === 0) return;
    plany.push(zloz(rodzina, p, id, nazwa, [...szkice, ...ojc]));
  };

  // Poród: macierzyński matki [KP art. 180 § 1]; przyjęcie dziecka: urlop na warunkach macierzyńskiego [KP art. 183 § 1].
  const typMac: TypOdcinka = porod ? 'macierzynski' : 'na_warunkach_macierzynskiego';
  let glowna = rodzina.osoby.find((o) => (porod ? o.rola === 'matka' : o.rola === 'matka' || o.rola === 'przyjmujacy') && ma(o, typMac));
  const zgonMatki = porod ? glowna?.zdrowie?.zgon : undefined;
  // Zgon matki przed porodem – jak brak prawa matki (decyzja integratora).
  if (zgonMatki && zgonMatki < z) glowna = undefined;

  if (glowna && zgonMatki) {
    // KP art. 180 § 12; UZ art. 29 ust. 7: zgon ubezpieczonej matki – druga osoba ma część macierzyńskiego po dniu zgonu.
    const mama = glowna;
    const drugaOsoba = rodzina.osoby.find((o) => o !== mama && (ma(o, 'macierzynski') || ma(o, 'rodzicielski')));
    const koniecMamy = wczesniejsza(zgonMatki, dodajDni(poMac, -1));
    const macMamy: Szkic = { osobaId: mama.id, typ: 'macierzynski', od: z, do: koniecMamy };
    if (!drugaOsoba) {
      dodaj('mama-caly-urlop', `${KTO[mama.rola]}: urlop macierzyński`, [macMamy], undefined, true);
      return plany;
    }
    const odDnia = dodajDni(koniecMamy, 1);
    const lancuch: Szkic[] = [
      macMamy,
      ...(ma(drugaOsoba, 'macierzynski') && odDnia < poMac
        ? poKolei(odDnia, [{ osobaId: drugaOsoba.id, typ: 'macierzynski', dni: liczbaDni(odDnia, dodajDni(poMac, -1)) }])
        : []),
      // 9 tygodni mamy przepada, nie przechodzi na drugą osobę (odpowiedź ZUS na stoisku 21.11, pytanie nr 14).
      ...(ma(drugaOsoba, 'rodzicielski') ? poKolei(poMac, [{ osobaId: drugaOsoba.id, typ: 'rodzicielski', dni: Math.max(0, R - N) * 7 }]) : []),
    ];
    dodaj('tata-po-zgonie-mamy', `${KTO[drugaOsoba.rola]} przejmuje urlop mamy`, lancuch, drugaOsoba, true);
    return plany;
  }

  if (!glowna) {
    // Matka bez prawa do macierzyńskiego (EC-56): plan od drugiej osoby z prawem do rodzicielskiego.
    const drugi = rodzina.osoby.find((o) => o.rola !== 'matka' && ma(o, 'rodzicielski'));
    if (!drugi) return [];
    // Pula bez 9 tygodni drugiego rodzica [KP art. 182¹a § 4] – także
    // gdy matka nie ma prawa albo jej nie ma: 9 tygodni nie przechodzi na drugiego rodzica (odpowiedź ZUS na stoisku 21.11,
    // pytania nr 6 i 14; EC-56: tata 41 − 9 = 32 tygodnie).
    const rodzDni = Math.max(0, R - N) * 7;

    // KP art. 180 § 15 pkt 1–2; UZ art. 29 ust. 9: zgon albo porzucenie dziecka przez nieubezpieczoną matkę – ojciec ma
    // część macierzyńskiego przypadającą po dniu zdarzenia, do końca puli. Rodzicielski od dnia po macierzyńskim.
    // NIEJASNE (pytania 6 i 21): przy samym orzeczeniu matki (§ 15 pkt 3) uprawnienie jest 'warunkowo' – zależy od tego,
    // czy matka nie może sprawować opieki – więc macierzyńskiego taty nie planujemy (tylko `przysluguje === true`).
    const zd = rodzina.osoby.find((o) => o.rola === 'matka')?.zdrowie;
    const zdarzenia = [zd?.zgon, zd?.porzucenieDziecka].filter((d): d is DataISO => d !== undefined).sort();
    const macOd = zdarzenia.length ? pozniejsza(z, dodajDni(zdarzenia[0], 1)) : undefined;
    const macTatyDni =
      porod && macOd && macOd < poMac && wpis(drugi, 'macierzynski')?.przysluguje === true ? liczbaDni(macOd, dodajDni(poMac, -1)) : 0;
    if (macOd && macTatyDni > 0) {
      const lancuch = [
        ...poKolei(macOd, [{ osobaId: drugi.id, typ: 'macierzynski', dni: macTatyDni }]),
        ...poKolei(poMac, [{ osobaId: drugi.id, typ: 'rodzicielski', dni: rodzDni }]),
      ];
      const nazwa = `${KTO[drugi.rola]}: ${wyliczenie(['urlop macierzyński', ...(ma(drugi, 'ojcowski') ? ['urlop ojcowski'] : []), 'urlop rodzicielski'])}`;
      dodaj('tata-pelny-rodzicielski', nazwa, lancuch, drugi, true);
      return plany;
    }
    // Bez macierzyńskiego w rodzinie rodzicielski taty zaczyna się dzień po jego ojcowskim, a bez ojcowskiego – w pierwszym
    // dniu ubezpieczenia od porodu (przyjęcia). Nie czeka na koniec macierzyńskiego, którego mama nie ma: rodzicielski może
    // zacząć się wcześniej (odpowiedź ZUS na stoisku 21.11, pytanie nr 16; KP art. 182¹a § 1 wiąże start z własnym
    // macierzyńskim osoby).
    const ojc = ma(drugi, 'ojcowski') ? ojcowskiDla(rodzina, p, pule, drugi, []) : [];
    const startRodz = ojc.length > 0 ? dodajDni(ojc[0].do, 1) : (pierwszyDzienUbezpieczenia(rodzina, p, drugi) ?? z);
    const lancuch = [...ojc, ...poKolei(startRodz, [{ osobaId: drugi.id, typ: 'rodzicielski', dni: rodzDni }])];
    const nazwa = `${KTO[drugi.rola]}: ${wyliczenie([...(ojc.length > 0 ? ['urlop ojcowski'] : []), 'urlop rodzicielski'])}`;
    dodaj('tata-pelny-rodzicielski', nazwa, lancuch, undefined, true);
    return plany;
  }

  const mama = glowna;
  // Druga osoba: każda inna osoba z prawem do rodzicielskiego [KP art. 182¹a § 3], także druga osoba przyjmująca.
  const drugi = rodzina.osoby.find((o) => o !== mama && ma(o, 'rodzicielski'));
  const kG = KTO[mama.rola];
  const kD = drugi ? KTO[drugi.rola].toLowerCase() : '';
  const nazwaMac = porod ? 'urlop macierzyński' : 'urlop na warunkach urlopu macierzyńskiego';
  // Matka bierze rodzicielski bez 9 tygodni drugiego rodzica [KP art. 182¹a § 4].
  const rodzG = ma(mama, 'rodzicielski') ? Math.max(0, R - N) * 7 : 0;
  const macG: Krok = { osobaId: mama.id, typ: typMac, dni: macDni };
  // KP art. 180² § 1: uzupełniający urlop macierzyński bezpośrednio po macierzyńskim. Decyzja integratora: w scenariuszach,
  // w których mama wykorzystuje cały macierzyński, bierze go mama; rodzicielski przesuwa się za niego.
  const uzupG: Krok = {
    osobaId: mama.id,
    typ: 'uzupelniajacy',
    dni: porod && pule.uzupelniajacyTyg > 0 && ma(mama, 'uzupelniajacy') ? pule.uzupelniajacyTyg * 7 : 0,
  };
  const rodzMamy = (dni: number): Krok => ({ osobaId: mama.id, typ: 'rodzicielski', dni });

  // Plan wzorcowy (D12): cały macierzyński i swoja część rodzicielskiego, bez ojcowskiego (D13).
  dodaj('mama-caly-urlop', `${kG}: cały ${nazwaMac}${rodzG > 0 ? ' i swoja część rodzicielskiego' : ''}`, poKolei(z, [macG, uzupG, rodzMamy(rodzG)]), undefined, true);

  // Przejęcie macierzyńskiego – tylko po porodzie, przy pełnych tygodniach puli [KP art. 180 § 4–5].
  // NIEJASNE (pytanie nr 45): KP art. 183 § 2 każe stosować art. 180 § 4–17 odpowiednio – czy przyjmujący może przekazać
  // urlop drugiej osobie. Do odpowiedzi przy przyjęciu dziecka scenariuszy z przejęciem nie ma.
  const przejecie = drugi !== undefined && porod && !pule.macierzynskiOstatniDzien && ma(drugi, 'macierzynski');

  if (drugi && rodzG > 0 && !pule.macierzynskiOstatniDzien) {
    // D14: równy łączny czas (macierzyński + rodzicielski) w pełnych tygodniach (pytanie 15), nieparzysty tydzień dla matki.
    const T = M + R;
    const mamaT = Math.ceil(T / 2);
    const tataT = Math.floor(T / 2);
    let kroki: Krok[] | undefined;
    if (tataT <= R - N) {
      // Każde z rodziców bierze co najmniej swoje 9 tygodni [KP art. 182¹a § 4–5].
      if (tataT >= N) kroki = [macG, uzupG, rodzMamy((mamaT - M) * 7), { osobaId: drugi.id, typ: 'rodzicielski', dni: tataT * 7 }];
    } else if (przejecie) {
      // Druga osoba przejmuje końcówkę macierzyńskiego [KP art. 180 § 4–5]; mama zachowuje okres obowiązkowy [§ 4].
      const tataMac = tataT - (R - N);
      const mamaMac = M - tataMac;
      if (mamaMac >= pule.obowiazkoweMatkiTyg) {
        kroki = [
          { ...macG, dni: mamaMac * 7 },
          { osobaId: drugi.id, typ: 'macierzynski', dni: tataMac * 7 },
          { osobaId: drugi.id, typ: 'rodzicielski', dni: (R - N) * 7 },
          rodzMamy(N * 7),
        ];
      }
    }
    if (kroki) dodaj('po-rowno', `Po równo: ${kG.toLowerCase()} ${tygodnie(mamaT)}, ${kD} ${tygodnie(tataT)}`, poKolei(z, kroki), drugi);
  }

  // D15: mama okres obowiązkowy, druga osoba reszta macierzyńskiego od następnego dnia [KP art. 180 § 4–5], potem jej
  // rodzicielski poza 9 tygodniami mamy (walidacja ostrzeże, że przepadną).
  const O = pule.obowiazkoweMatkiTyg;
  if (drugi && przejecie && O > 0 && O < M) {
    const kroki: Krok[] = [
      { ...macG, dni: O * 7 },
      { osobaId: drugi.id, typ: 'macierzynski', dni: (M - O) * 7 },
      { osobaId: drugi.id, typ: 'rodzicielski', dni: Math.max(0, R - N) * 7 },
    ];
    dodaj('tata-po-14-tyg', `${KTO[drugi.rola]} przejmuje urlop macierzyński po ${O} tygodniach`, poKolei(z, kroki), drugi);
  }

  // D17: mama cały urlop, druga osoba swoje 9 tygodni od dnia po mamie [KP art. 182¹a § 4].
  if (drugi && N > 0) {
    const kroki: Krok[] = [macG, uzupG, rodzMamy(rodzG), { osobaId: drugi.id, typ: 'rodzicielski', dni: N * 7 }];
    dodaj('tata-swoje-9-tyg', `${kG} cały urlop, ${kD} swoje ${tygodnie(N)} rodzicielskiego`, poKolei(z, kroki), drugi);
  }

  // D16: rodzicielski matki z pracą na `maxWymiarPracyPrzyLaczeniu` etatu przez cały odcinek, długość
  // floor(dni / (1 − w)) [KP art. 182¹f § 2, § 7], nie dłużej niż łączny limit [KP art. 182¹f § 1, § 1¹].
  // Łączyć może tylko pracownik u pracodawcy, który udzielił urlopu [KP art. 182¹e § 1]: szukamy umowy o pracę trwającej
  // przez cały odcinek łączenia. Gdy kończy się wcześniej – planu nie tworzymy (prostszy wariant decyzji integratora).
  const w = p.limity.maxWymiarPracyPrzyLaczeniu;
  if (rodzG > 0 && w > 0) {
    const dni = Math.min(dlugoscPrzyLaczeniu(rodzG, w), pule.rodzicielskiMaxZPracaTyg * 7);
    const { szkice } = przytnij(poKolei(z, [macG, uzupG, { ...rodzMamy(dni), wymiarPracy: w }]));
    const laczenie = szkice.find((s) => s.typ === 'rodzicielski');
    const umowa =
      laczenie &&
      tytulyOsoby(mama).find((t) => {
        const koniec = koniecTytulu(t);
        return t.rodzaj === 'umowa_o_prace' && t.od <= laczenie.od && (koniec === undefined || koniec >= laczenie.do);
      });
    if (laczenie && umowa) {
      const lancuch = szkice.map((s) => (s === laczenie ? { ...s, tytulId: umowa.id } : s));
      dodaj('mama-pol-etatu', `${kG} pracuje na ${Math.round(w * 100)}% etatu w czasie urlopu rodzicielskiego`, lancuch);
    }
  }

  return plany;
}
