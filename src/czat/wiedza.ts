/**
 * Wiedza ZuSika o samej aplikacji: ekrany, kroki ankiety i pytania z wyjaśnieniem „po co pytamy”.
 * Źródło: definicje ankiety (src/content/pytania.ts, tor D) – ZuSik mówi to samo co ekran ankiety.
 * Tekst jest stały, więc stoi na początku zapytania i model może go trzymać w pamięci podręcznej.
 */
import { KROKI_ANKIETY, KROKI_DOKUMENTOW, PYTANIA, PYTANIA_DOKUMENTY, type DowolnePytanie } from '../content/pytania';
import type { KrokAnkiety } from '../content/pytania-typy';

const EKRANY = `Ekrany aplikacji (pasek kroków u góry):
- Start: logowanie przez mObywatel (symulacja) z pobraniem danych z usług (symulacja), wpisanie danych ręcznie, wgranie wniosku PDF albo szybki kalkulator.
- Moja sytuacja: ankieta, jedno pytanie na ekran. Pytania, które nie dotyczą sytuacji rodzica, można pominąć.
- Wynik: co przysługuje i dlaczego (z przepisem), ile tygodni urlopu, kwoty, ryzyka.
- Plan: urlopy na osi czasu dla obojga rodziców, gotowe scenariusze, zmiany planu z oceną na żywo i porównanie wariantów.
- Kalendarz: terminy wniosków, które można dodać do własnego kalendarza.
- Dokumenty: jakie wnioski złożyć, kto je składa i do kiedy, wypełniony wniosek ZAM (PDF).
- Trudne sytuacje: co robić, gdy wydarzy się coś trudnego (np. choroba, pobyt dziecka w szpitalu).
- Inne wsparcie: świadczenia spoza ZUS, np. z gminy.
- Dodaj osobę: drugi rodzic albo inny członek rodziny.`;

function opisPytania(p: DowolnePytanie): string {
  const czesci = [`- ${p.etykieta}`];
  if (p.pomoc) czesci.push(`Po co pytamy: ${p.pomoc}`);
  if (p.podpowiedz) czesci.push(`Podpowiedź: ${p.podpowiedz}`);
  if (p.skadWziac) czesci.push(`Skąd wziąć: ${p.skadWziac}`);
  if (p.opcje?.length) czesci.push(`Odpowiedzi: ${p.opcje.map((o) => o.etykieta).join(' / ')}`);
  return czesci.join(' ');
}

function opisKrokow(naglowek: string, kroki: KrokAnkiety[], pytania: DowolnePytanie[]): string {
  const sekcje = kroki.map((k) => {
    const wKroku = pytania.filter((p) => p.krok === k.id).map(opisPytania);
    return [`### ${k.tytul}${k.opis ? ` – ${k.opis}` : ''}`, ...wKroku].join('\n');
  });
  return [`## ${naglowek}`, ...sekcje].join('\n\n');
}

let pamiec: string | undefined;

export function opisAplikacji(): string {
  pamiec ??= [
    EKRANY,
    opisKrokow('Ankieta „Moja sytuacja” (te odpowiedzi zmieniają wynik)', KROKI_ANKIETY, PYTANIA),
    opisKrokow('Dane do wniosków (krok „Dokumenty”, nie zmieniają wyniku)', KROKI_DOKUMENTOW, PYTANIA_DOKUMENTY),
  ].join('\n\n');
  return pamiec;
}
