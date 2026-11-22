// Tło prezentacji: ta sama pofalowana siatka oktagonów co na ekranie startowym aplikacji.
// Geometria przeniesiona 1:1 z src/components/start/siatka-oktagonow.ts i SiatkaOktagonow.tsx (commit a73d0bf):
// siatka 4.8.8 w perspektywie, fale, mgła w dali, zieleń ZUS z kryciem do 0,2. Zmiana w aplikacji = zmiana tutaj.
(function () {
  'use strict';
  const POL_BOKU = 1 / (1 + Math.SQRT2) / 2;
  const POL_OCZKA = 0.5;
  const POZIOMY = 10;
  const KOLOR = '0 120 52';
  const MAKS_KRYCIE = 0.2;
  const ogranicz = (x, min, max) => Math.min(max, Math.max(min, x));

  function wierzcholkiOktagonu(i, j) {
    const a = POL_BOKU, p = POL_OCZKA;
    return [[i + a, j - p], [i + p, j - a], [i + p, j + a], [i + a, j + p], [i - a, j + p], [i - p, j + a], [i - p, j - a], [i - a, j - p]];
  }

  function wysokoscFali(u, v) {
    return 0.55 * Math.sin(0.32 * u + 0.18 * v) + 0.35 * Math.sin(0.21 * v - 0.27 * u + 1.3) + 0.25 * Math.sin(0.09 * u + 0.11 * v + 2.1);
  }

  function odwzorowaniePerspektywy(szer, wys) {
    const blisko = 54, daleko = 11, D0 = 20, F = blisko * D0, D1 = F / daleko, margines = 40;
    const kamera = (wys + 2 * margines) / (F * (1 / D0 - 1 / D1));
    const horyzont = -margines - (F * kamera) / D1;
    const amplituda = 2.8;
    const kat = -10 * (Math.PI / 180);
    const cos = Math.cos(kat), sin = Math.sin(kat), sx = szer / 2, sy = wys / 2;
    const odwzoruj = (u, v) => {
      const Y = D0 + v;
      if (Y <= 1) return null;
      const glebia = ogranicz((Y - D0) / (D1 - D0), 0, 1);
      const Z = amplituda * wysokoscFali(u, v) * (1 - 0.6 * glebia);
      const x0 = szer * 0.55 + (F * u) / Y;
      const y0 = horyzont + (F * (kamera - Z)) / Y;
      const x = sx + (x0 - sx) * cos - (y0 - sy) * sin;
      const y = sy + (x0 - sx) * sin + (y0 - sy) * cos;
      const stok = wysokoscFali(u + 0.5, v - 0.5) - wysokoscFali(u, v);
      const krycie = ogranicz((1 - glebia) ** 2 * (0.75 + 0.9 * stok), 0, 1);
      return { x, y, krycie };
    };
    const kolumny = Math.ceil((szer * D1) / F / 2) + 6;
    return { odwzoruj, zakres: { i0: -kolumny, i1: kolumny, j0: -2, j1: Math.ceil(D1 - D0) + 2 } };
  }

  function zbudujSiatke(odwzoruj, zakres, szer, wys) {
    const grupy = Array.from({ length: POZIOMY }, () => []);
    const zapas = 80;
    for (let j = zakres.j0; j <= zakres.j1; j++) {
      for (let i = zakres.i0; i <= zakres.i1; i++) {
        const punkty = [];
        let krycie = 0, minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity, pominiety = false;
        for (const [u, v] of wierzcholkiOktagonu(i, j)) {
          const p = odwzoruj(u, v);
          if (!p || !Number.isFinite(p.x) || !Number.isFinite(p.y)) { pominiety = true; break; }
          punkty.push(p.x, p.y);
          krycie += p.krycie;
          minX = Math.min(minX, p.x); maxX = Math.max(maxX, p.x); minY = Math.min(minY, p.y); maxY = Math.max(maxY, p.y);
        }
        if (pominiety) continue;
        if (maxX < -zapas || minX > szer + zapas || maxY < -zapas || minY > wys + zapas) continue;
        krycie /= 8;
        if (!(krycie >= 0.02)) continue;
        grupy[Math.min(POZIOMY - 1, Math.floor(krycie * POZIOMY))].push(punkty);
      }
    }
    return grupy.map((oktagony, poziom) => ({ krycie: (poziom + 0.5) / POZIOMY, oktagony })).filter((g) => g.oktagony.length > 0);
  }

  // Płótno ma 1920 + 48 × 1080 + 48 px sceny (zapas na dryf, jak w aplikacji), w gęstości 1,5 (jak strony PDF).
  const el = document.getElementById('siatka');
  const szer = 1968, wys = 1128, dpr = 1.5;
  el.width = szer * dpr;
  el.height = wys * dpr;
  const ctx = el.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.lineWidth = 1;
  ctx.lineJoin = 'round';
  const { odwzoruj, zakres } = odwzorowaniePerspektywy(szer, wys);
  for (const grupa of zbudujSiatke(odwzoruj, zakres, szer, wys)) {
    const sciezka = new Path2D();
    for (const p of grupa.oktagony) {
      sciezka.moveTo(p[0], p[1]);
      for (let k = 2; k < p.length; k += 2) sciezka.lineTo(p[k], p[k + 1]);
      sciezka.closePath();
    }
    ctx.strokeStyle = `rgb(${KOLOR} / ${(grupa.krycie * MAKS_KRYCIE).toFixed(3)})`;
    ctx.stroke(sciezka);
  }
})();
