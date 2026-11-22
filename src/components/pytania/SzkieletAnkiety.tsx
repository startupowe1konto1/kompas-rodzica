import { ObszarLadowania, Szkielet } from '../ui/Szkielet';
import { polacz } from '../ui';
import { UKLAD_PASKA } from './PasekSekcji';

/**
 * Szkielet ankiety w kształcie jej pierwszego ekranu (pierwsze pytania pierwszej sekcji): pasek postępu, pasek sekcji
 * z ikoną i tytułem, karta pytania i przyklejony pasek z „Dalej”. Te same klasy układu co w `Ankieta`
 * i `PasekSekcji`, więc po wczytaniu profilu pasek sekcji i przycisk zostają na miejscu.
 */
export function SzkieletAnkiety() {
  return (
    <ObszarLadowania etykieta="Wczytujemy odpowiedzi…" className="flex min-h-dvh flex-1 flex-col">
      <div className="mx-auto w-full max-w-3xl px-4 pt-3 pb-3">
        <div className="mb-1 flex min-h-11 items-center justify-end">
          <Szkielet className="h-5 w-12" />
        </div>
        <Szkielet className="h-2 w-full rounded-full" />
      </div>
      <div className={UKLAD_PASKA.zewnatrz}>
        <div className={polacz(UKLAD_PASKA.kafel, 'bg-white')}>
          <div className={UKLAD_PASKA.wiersz}>
            <Szkielet className={UKLAD_PASKA.ikona} />
            <div className="flex min-w-0 flex-1 flex-col gap-1">
              <Szkielet className="h-[1.375rem] w-56 max-w-full md:h-[1.875rem] md:w-80" />
              <Szkielet className="mt-1 hidden h-12 w-full max-w-prose md:block" />
            </div>
          </div>
        </div>
      </div>
      <div className="flex flex-1 flex-col">
        <div className="mx-auto w-full max-w-3xl px-4 pb-6">
          <div className="flex flex-col gap-3 rounded-karta bg-white p-4 lg:p-6">
            <Szkielet className="h-7 w-72 max-w-full" />
            <Szkielet className="h-14 w-full" />
            <Szkielet className="h-14 w-full" />
            <Szkielet className="h-14 w-full" />
          </div>
        </div>
      </div>
      <div className="sticky bottom-0 z-10 border-t border-szary-linia bg-white pb-[env(safe-area-inset-bottom)]">
        <div className="mx-auto flex w-full max-w-3xl justify-end px-4 py-3">
          <Szkielet className="h-12 w-full md:w-56" />
        </div>
      </div>
    </ObszarLadowania>
  );
}
