import { ObszarLadowania, Szkielet } from '../ui/Szkielet';

/**
 * Szkielet górnej części wyniku w kształcie `KafleSum`: dwa kafle kwot (na telefonie jeden pod drugim, na komputerze obok
 * siebie) i karta „PIT-2 złożony” z dwiema opcjami. Wysokości zmierzone na gotowym ekranie (375 i 1280 px), żeby po
 * wczytaniu kwot siatka sekcji pod spodem nie zjeżdżała.
 */
export function SzkieletKafliSum() {
  return (
    <ObszarLadowania etykieta="Liczymy kwoty…" className="flex flex-col gap-3">
      <div className="grid gap-3 lg:grid-cols-2">
        <KafelKwotySzkielet className="h-[7.125rem] lg:h-[8.4375rem]" />
        <KafelKwotySzkielet className="h-[8.3125rem] lg:h-[8.4375rem]" />
      </div>
      <div className="flex flex-col rounded-karta border border-szary-linia bg-white p-4 lg:p-6">
        <Szkielet className="h-6 w-64 max-w-full" />
        <Szkielet className="mt-0.5 h-[2.625rem] w-full lg:h-[1.3125rem] lg:w-96" />
        <div className="mt-2 grid grid-cols-2 gap-2">
          <Szkielet className="h-[3.625rem]" />
          <Szkielet className="h-[3.625rem]" />
        </div>
      </div>
    </ObszarLadowania>
  );
}

/** Jeden kafel kwoty: etykieta, duża liczba i podpis, w ramce o wymiarach gotowego kafla. */
function KafelKwotySzkielet({ className }: { className: string }) {
  return (
    <div className={`flex flex-col gap-2 rounded-karta border border-szary-linia bg-white p-4 lg:p-6 ${className}`}>
      <Szkielet className="h-4 w-40" />
      <Szkielet className="h-8 w-36 lg:h-9 lg:w-44" />
      <Szkielet className="h-4 w-56 max-w-full" />
    </div>
  );
}

/** Ogólny szkielet treści sekcji (np. w nakładce, zanim dojdą dane): kilka linijek tekstu. */
export function SzkieletTresciSekcji() {
  return (
    <ObszarLadowania etykieta="Wczytujemy dane…" className="flex flex-col gap-3">
      <Szkielet className="h-5 w-3/4" />
      <Szkielet className="h-4 w-full" />
      <Szkielet className="h-4 w-11/12" />
      <Szkielet className="h-4 w-2/3" />
    </ObszarLadowania>
  );
}
