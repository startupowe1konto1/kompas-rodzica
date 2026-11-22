'use client';

// Interaktywne przykłady do galerii /wzornik (pola sterowane, ładowanie, ponawianie). Dane fikcyjne.
import { useState } from 'react';
import { IconArrowRight } from '@tabler/icons-react';
import { Pole } from '../Pole';
import { Wybor } from '../Wybor';
import { PrzelacznikTakNie } from '../PrzelacznikTakNie';
import { Przycisk } from '../Przycisk';
import { StanBledu } from '../Stany';

export function PrzykladFormularza() {
  const [kwota, setKwota] = useState('8000');
  const [tytul, setTytul] = useState<string | null>('umowa_o_prace');
  const [inne, setInne] = useState<string[]>(['zlecenie']);
  const [ponad20, setPonad20] = useState<boolean | null>(null);
  const [laduje, setLaduje] = useState(false);

  const liczba = Number(kwota.replace(',', '.'));
  const bladKwoty = kwota === '' ? 'Proszę wpisać kwotę wynagrodzenia brutto.' : Number.isNaN(liczba) || liczba < 0 ? 'Proszę wpisać kwotę w złotych, np. 6500.' : undefined;

  return (
    <form
      className="flex flex-col gap-6"
      onSubmit={(e) => {
        e.preventDefault();
        setLaduje(true);
        window.setTimeout(() => setLaduje(false), 1500);
      }}
    >
      <Pole
        etykieta="Miesięczne wynagrodzenie brutto"
        typ="number"
        przyrostek="zł"
        podpowiedz="Kwota z umowy, przed odliczeniem podatku i składek."
        value={kwota}
        onChange={(e) => setKwota(e.currentTarget.value)}
        blad={bladKwoty}
      />
      <Wybor
        legenda="Na jakiej podstawie Pani/Pan pracuje?"
        wartosc={tytul}
        onZmiana={setTytul}
        opcje={[
          { wartosc: 'umowa_o_prace', etykieta: 'Umowa o pracę', opis: 'Etat, także na czas określony.' },
          { wartosc: 'zlecenie', etykieta: 'Umowa zlecenia', opis: 'Z dobrowolnym ubezpieczeniem chorobowym.' },
          { wartosc: 'dzialalnosc', etykieta: 'Własna firma', opis: 'Działalność gospodarcza.' },
        ]}
      />
      <Wybor
        wielokrotny
        legenda="Czy są też inne źródła ubezpieczenia?"
        podpowiedz="Można zaznaczyć kilka odpowiedzi."
        wartosc={inne}
        onZmiana={setInne}
        opcje={[
          { wartosc: 'zlecenie', etykieta: 'Umowa zlecenia' },
          { wartosc: 'dzialalnosc', etykieta: 'Własna firma' },
          { wartosc: 'wspolpraca', etykieta: 'Współpraca przy firmie' },
          { wartosc: 'brak', etykieta: 'Nie mam innych', wylaczona: inne.length > 1 },
        ]}
      />
      <PrzelacznikTakNie
        pytanie="Czy pracodawca zgłasza do ubezpieczenia chorobowego ponad 20 osób?"
        podpowiedz="Od tego zależy, kto wypłaci zasiłek: pracodawca czy ZUS."
        wartosc={ponad20}
        onZmiana={setPonad20}
        blad={ponad20 === null ? 'Proszę wybrać odpowiedź albo zapytać w kadrach.' : undefined}
      />
      <div className="flex flex-col gap-3 sm:flex-row">
        <Przycisk type="submit" laduje={laduje} ikona={<IconArrowRight size={20} stroke={2} />} etykietaLadowania="Liczymy zasiłek">
          Policz zasiłek
        </Przycisk>
        <Przycisk wariant="drugi" type="reset" onClick={() => setKwota('')}>
          Wyczyść
        </Przycisk>
      </div>
    </form>
  );
}

export function PrzykladBledu() {
  const [ponawia, setPonawia] = useState(false);
  return (
    <StanBledu
      ponawia={ponawia}
      onPonow={() => {
        setPonawia(true);
        window.setTimeout(() => setPonawia(false), 1500);
      }}
    />
  );
}
