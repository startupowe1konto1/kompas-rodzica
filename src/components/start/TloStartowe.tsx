import { SiatkaOktagonow } from './SiatkaOktagonow';

/**
 * Tło ekranu startowego: jasny gradient, miękka poświata za nagłówkiem i delikatna, pofalowana
 * siatka połączonych oktagonów (płótno, własna geometria w siatka-oktagonow.ts). Czysto ozdobne
 * (aria-hidden). Ruch tylko na transform; przy prefers-reduced-motion siatka stoi (start.css).
 * Rodzic musi mieć `relative isolate overflow-clip`.
 */
export function TloStartowe() {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10">
      <div className="absolute inset-0 start-podstawa" />
      <div className="absolute -top-24 -left-24 h-[28rem] w-[36rem] start-poswiata md:-top-32 md:left-[4%] md:h-[34rem] md:w-[56rem]" />
      <SiatkaOktagonow />
    </div>
  );
}
