"use client";

/**
 * Pytanie o źródła ubezpieczenia (tor C, C3, T1.3b): wybór rodzajów jak dotąd, a pod nim
 * osobny blok dla każdej umowy albo działalności („Umowa o pracę 1”, „Umowa o pracę 2”) z przyciskiem
 * „Usuń tę umowę” oraz „Dodaj kolejną umowę lub działalność”.
 *
 * Rodzajów spoza wyboru (`RODZAJE_POZA_WYBOREM`, np. współpraca) nie proponujemy; pokazujemy je tylko
 * wtedy, gdy profil już ma taki tytuł, żeby dało się go zobaczyć i odznaczyć.
 *
 * Odpowiedź „Nie mam teraz ubezpieczenia (np. nie pracuję)” to brak tytułów. Kontrakt nie ma na
 * to osobnej flagi, więc samego wyboru nie zapisujemy: pamięta go tylko ten ekran.
 */
import { useEffect, useRef, useState, type ReactNode } from "react";
import { IconPlus, IconTrash } from "@tabler/icons-react";
import type { RodzajTytulu, TytulUbezpieczenia } from "../../engine/types";
import { Przycisk, Wybor } from "../ui";
import { NAZWY_TYTULOW, RODZAJE_POZA_WYBOREM, nazwaTytulu, opcjeDoWyboru } from "./listy";
import type { DefinicjaPytania, OpcjaPytania } from "./typy";

const BRAK = "__brak";

export interface AkcjeTytulow {
  tytuly: TytulUbezpieczenia[];
  dodaj: () => void;
  usun: (indeks: number) => void;
  zmienRodzaj: (indeks: number, rodzaj: RodzajTytulu) => void;
}

export interface PoleTytulowProps {
  def: DefinicjaPytania;
  akcje: AkcjeTytulow;
  /** Zmiana zaznaczonych rodzajów (przez kodek `rodzaje_tytulow`). */
  onRodzaje: (rodzaje: RodzajTytulu[]) => void;
  /** Nazwa grupy pól formularza. */
  name: string;
  /** Klasy nagłówka pytania (duży albo zwykły). */
  klasaNaglowka: string;
  znacznik?: ReactNode;
  opis?: ReactNode;
  blad?: string;
}

export function PoleTytulow({
  def,
  akcje,
  onRodzaje,
  name,
  klasaNaglowka,
  znacznik,
  opis,
  blad,
}: PoleTytulowProps) {
  const { tytuly } = akcje;
  const [nieMam, ustawNieMam] = useState(false);
  // Listę „Rodzaj” pokazujemy tylko przy umowie dodanej przyciskiem „Dodaj kolejną”: przy umowach z pól
  // zaznaczenia rodzaj jest już wybrany (decyzja Wojtka 21.11, wcześniej wybierało się go dwa razy).
  const [dodanePrzyciskiem, ustawDodanePrzyciskiem] = useState<string[]>([]);
  const idPrzedDodaniem = useRef<string[] | null>(null);
  useEffect(() => {
    const przed = idPrzedDodaniem.current;
    if (!przed) return;
    const nowe = tytuly.map((t) => t.id).filter((id) => !przed.includes(id));
    if (nowe.length === 0) return;
    idPrzedDodaniem.current = null;
    ustawDodanePrzyciskiem((d) => [...d, ...nowe]);
  }, [tytuly]);
  const rodzaje = [...new Set(tytuly.map((t) => t.rodzaj))] as string[];
  const opcje: OpcjaPytania[] = opcjeDoWyboru(def.opcje ?? [], rodzaje);
  const zaznaczone = tytuly.length === 0 && nieMam ? [BRAK] : rodzaje;

  return (
    <div className="flex flex-col gap-4">
      <Wybor
        wielokrotny
        className={klasaNaglowka}
        name={name}
        legenda={def.etykieta}
        znacznik={znacznik}
        podpowiedz={opis}
        blad={blad}
        wymagane={def.wymagane}
        opcje={[
          ...opcje.map((o) => ({
            wartosc: String(o.wartosc),
            etykieta: o.etykieta,
            opis: o.opis,
          })),
          {
            wartosc: BRAK,
            etykieta: "Nie mam teraz ubezpieczenia (np. nie pracuję)",
          },
        ]}
        wartosc={zaznaczone}
        onZmiana={(napisy) => {
          if (!nieMam && napisy.includes(BRAK)) {
            ustawNieMam(true);
            onRodzaje([]);
            return;
          }
          ustawNieMam(false);
          onRodzaje(napisy.filter((n) => n !== BRAK) as RodzajTytulu[]);
        }}
      />

      {tytuly.length > 0 && (
        <ol className="flex flex-col gap-3" aria-label="Umowy i działalność">
          {tytuly.map((t, i) => {
            const nazwa = nazwaTytulu(tytuly, i);
            const idRodzaju = `${name}-rodzaj-${t.id}`;
            return (
              <li key={t.id}>
                <div
                  role="group"
                  aria-label={nazwa}
                  data-tytul={t.id}
                  className="flex flex-col gap-3 rounded-przycisk border border-szary-ramka bg-white p-3"
                >
                  <div className="flex min-h-11 items-center justify-between gap-3">
                    <p className="font-bold text-tekst">{nazwa}</p>
                    <button
                      type="button"
                      onClick={() => akcje.usun(i)}
                      aria-label={`Usuń tę umowę: ${nazwa}`}
                      className="-mr-2 inline-flex min-h-11 items-center gap-1 rounded-przycisk px-2 font-bold text-granat hover:bg-szary-kafel"
                    >
                      <IconTrash size={20} stroke={2} aria-hidden />
                      Usuń tę umowę
                    </button>
                  </div>
                  {dodanePrzyciskiem.includes(t.id) && (
                    <div className="flex flex-col gap-1.5">
                      <label
                        htmlFor={idRodzaju}
                        className="text-base font-bold text-tekst"
                      >
                        Rodzaj ({nazwa})
                      </label>
                      <select
                        id={idRodzaju}
                        value={t.rodzaj}
                        onChange={(e) =>
                          akcje.zmienRodzaj(
                            i,
                            e.currentTarget.value as RodzajTytulu,
                          )
                        }
                        className="h-12 w-full rounded-przycisk border border-szary-ramka bg-white px-3 text-base text-tekst"
                      >
                        {(Object.keys(NAZWY_TYTULOW) as RodzajTytulu[])
                          .filter((r) => r === t.rodzaj || !RODZAJE_POZA_WYBOREM.includes(r))
                          .map((r) => (
                            <option key={r} value={r}>
                              {opcje.find((o) => o.wartosc === r)?.etykieta ??
                                NAZWY_TYTULOW[r]}
                            </option>
                          ))}
                      </select>
                    </div>
                  )}
                </div>
              </li>
            );
          })}
        </ol>
      )}

      <div>
        <Przycisk
          wariant="drugi"
          ikona={<IconPlus size={20} stroke={2} />}
          onClick={() => {
            idPrzedDodaniem.current = tytuly.map((t) => t.id);
            akcje.dodaj();
          }}
          className="w-full md:w-auto"
        >
          Dodaj kolejną umowę lub działalność
        </Przycisk>
      </div>
    </div>
  );
}
