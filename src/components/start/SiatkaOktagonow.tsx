'use client';

import { useEffect, useRef, useState } from 'react';
import { odwzorowaniePerspektywy, zbudujSiatke } from './siatka-oktagonow';

/** Kolor linii: zieleń ZUS (#007834). */
const KOLOR = '0 120 52';
/** Najwyższe krycie linii (blisko, na stoku w stronę światła). Za nagłówkiem maska obniża je dalej. */
const MAKS_KRYCIE = 0.2;

/**
 * Pofalowana siatka oktagonów w perspektywie, w tle ekranu startowego (płótno, bez zdjęć). Rysuje się raz
 * i ponownie tylko przy zmianie rozmiaru. Ruch (bardzo wolny dryf) to tylko CSS transform
 * w start.css, wyłączony przy prefers-reduced-motion. Czysto ozdobna: rodzic ma aria-hidden.
 */
export function SiatkaOktagonow() {
  const plotno = useRef<HTMLCanvasElement>(null);
  const [gotowa, setGotowa] = useState(false);

  useEffect(() => {
    const el = plotno.current;
    if (!el) return;
    let szerOstatnia = 0;
    let wysOstatnia = 0;
    const rysuj = () => {
      // Rozmiar z układu (clientWidth), nie z getBoundingClientRect: ten uwzględnia skalę z animacji dryfu.
      const szer = el.clientWidth;
      const wys = el.clientHeight;
      if (szer < 1 || wys < 1) return;
      if (Math.abs(szer - szerOstatnia) < 1 && Math.abs(wys - wysOstatnia) < 1) return;
      szerOstatnia = szer;
      wysOstatnia = wys;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      el.width = Math.round(szer * dpr);
      el.height = Math.round(wys * dpr);
      const ctx = el.getContext('2d');
      if (!ctx) return;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, szer, wys);
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
      setGotowa(true);
    };

    rysuj();
    let czekaj = 0;
    const obserwator = new ResizeObserver(() => {
      window.clearTimeout(czekaj);
      czekaj = window.setTimeout(rysuj, 120);
    });
    obserwator.observe(el);
    return () => {
      obserwator.disconnect();
      window.clearTimeout(czekaj);
    };
  }, []);

  return (
    <div className="absolute inset-0 start-siatka-maska">
      <canvas ref={plotno} className={`absolute inset-0 h-full w-full start-siatka${gotowa ? ' start-siatka-gotowa' : ''}`} />
    </div>
  );
}
