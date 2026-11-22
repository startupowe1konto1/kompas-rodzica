import type { Metadata } from "next";
import { Suspense } from "react";
import { SzkieletAnkiety } from "@/src/components/pytania/SzkieletAnkiety";
import { AnkietaStrony } from "./AnkietaStrony";

// Ankieta „Moja sytuacja” (tor C, C3). Strona serwerowa, żeby tytuł karty szedł z `metadata`
// (WCAG 2.4.2; <title> w komponencie klienckim nie trafiał do karty). Jedyne <h1> ekranu jest ukryte wizualnie.
export const metadata: Metadata = { title: "Moja sytuacja" };

export default function SytuacjaPage() {
  return (
    // min-h-dvh: stopka zaczyna poniżej ekranu, więc nie zjeżdża w dół, gdy wczytuje się profil (bez skoków).
    <main className="flex min-h-dvh flex-1 flex-col">
      <h1 className="sr-only">Moja sytuacja</h1>
      {/* useSearchParams w AnkietaStrony wymaga granicy Suspense przy renderze statycznym. */}
      <Suspense fallback={<SzkieletAnkiety />}>
        <AnkietaStrony />
      </Suspense>
    </main>
  );
}
