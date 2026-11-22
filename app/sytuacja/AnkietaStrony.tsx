"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Ankieta } from "@/src/components/pytania/Ankieta";

/** Kliencka część ekranu „Moja sytuacja” (router do przejścia na wynik, `?pytanie=` z listy „Popraw te odpowiedzi”). */
export function AnkietaStrony() {
  const router = useRouter();
  const pytanie = useSearchParams().get("pytanie");
  return (
    <Ankieta
      // Inny link „Popraw odpowiedź” przy otwartej ankiecie: nowy klucz = ankieta zaczyna od nowego pytania.
      key={pytanie ?? ""}
      pytanieStartowe={pytanie}
      poZakonczeniu={() => router.push("/wynik")}
      etykietaZakonczenia="Zobacz wynik"
    />
  );
}
