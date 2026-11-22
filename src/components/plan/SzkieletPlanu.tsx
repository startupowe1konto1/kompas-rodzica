import { ObszarLadowania, Szkielet } from '../ui/Szkielet';

/**
 * Szkielety ekranu planu w kształcie gotowej treści (uwaga Wojtka 21.11: sekcje „skaczą” przy przełączaniu).
 * Wysokości zmierzone na gotowym ekranie persony z umową o pracę: telefon 375 px i komputer 1280 px.
 */

/** Kafel „Razem dla rodziny (brutto)”: etykieta, duża kwota i linia „na rękę”. */
export function SzkieletKafliKwot() {
  return (
    <div className="flex h-[7.125rem] flex-col gap-2 rounded-karta border border-szary-linia bg-white p-4 lg:h-[8.4375rem] lg:p-6">
      <Szkielet className="h-4 w-44" />
      <Szkielet className="h-8 w-40 lg:h-9 lg:w-48" />
      <Szkielet className="h-4 w-64 max-w-full" />
    </div>
  );
}

/**
 * Górna część planu, zanim plan przyjdzie z API: zdanie podsumowania z przyciskiem „Dziecko się urodziło”, kafel kwot,
 * termin wniosku, przełącznik osi, oś (tylko od 768 px, jak `PROG_OSI_PX`) i lista okresów.
 */
export function SzkieletPlanu() {
  return (
    <ObszarLadowania etykieta="Układamy plan na podstawie wpisanych danych…" className="flex flex-col gap-6">
      <div className="flex flex-col items-start gap-3">
        <Szkielet className="h-[3.125rem] w-full max-w-prose lg:h-7" />
        <Szkielet className="h-12 w-56" />
      </div>
      <SzkieletKafliKwot />
      <Szkielet className="h-[8.3125rem] rounded-komunikat lg:h-[6.5625rem]" />
      <div className="flex flex-col gap-4">
        <Szkielet className="h-[2.875rem] w-[12.5rem]" />
        <div className="hidden flex-col gap-3 md:flex">
          <Szkielet className="h-[1.6875rem] w-2/3" />
          <div className="flex h-[20.125rem] flex-col gap-4 rounded-karta bg-white p-6">
            <Szkielet className="h-6 w-32" />
            <Szkielet className="h-6 w-full" />
            <Szkielet className="h-10 w-full" />
            <Szkielet className="h-10 w-4/5" />
            <Szkielet className="mt-auto h-5 w-full" />
          </div>
        </div>
        <div className="flex h-[23.0625rem] flex-col gap-5 rounded-karta bg-white p-4 lg:h-[18rem] lg:p-6">
          <Szkielet className="h-7 w-56" />
          {Array.from({ length: 3 }, (_, i) => (
            <div key={i} className="flex items-center gap-3">
              <Szkielet className="size-10 shrink-0 rounded-karta" />
              <div className="flex flex-1 flex-col gap-2">
                <Szkielet className="h-5 w-3/4" />
                <Szkielet className="h-4 w-1/2" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </ObszarLadowania>
  );
}
