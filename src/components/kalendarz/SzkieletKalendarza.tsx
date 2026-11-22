import { ObszarLadowania, Szkielet } from '../ui/Szkielet';

/**
 * Szkielet kalendarza w kształcie gotowego ekranu: przycisk „Podejrzyj kalendarz”, rząd kartek dni
 * i karty terminów z blokiem dni po lewej. Wymiary jak w `ListaTerminow` / `KartaTerminu`.
 */
export function SzkieletKalendarza() {
  return (
    <ObszarLadowania etykieta="Wczytujemy terminy…" className="flex flex-col gap-6">
      <Szkielet className="h-12 w-full sm:w-56" />
      <div className="-mx-4 flex gap-3 overflow-hidden px-4 pb-2 lg:mx-0 lg:px-0">
        {Array.from({ length: 5 }, (_, i) => (
          <Szkielet key={i} className="h-[5.5rem] w-20 shrink-0 rounded-karta" />
        ))}
      </div>
      <div className="flex flex-col gap-3">
        {Array.from({ length: 3 }, (_, i) => (
          <div key={i} className="flex h-36 overflow-hidden rounded-karta bg-white">
            <Szkielet className="w-20 shrink-0 rounded-none lg:w-24" />
            <div className="flex flex-1 flex-col gap-3 p-4 lg:px-6">
              <Szkielet className="h-5 w-3/4" />
              <Szkielet className="h-4 w-1/2" />
              <div className="mt-auto flex justify-between">
                <Szkielet className="h-5 w-24" />
                <Szkielet className="h-5 w-28" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </ObszarLadowania>
  );
}
