// POST /api/forms/odczyt – wgrany wniosek PDF (edytowalny ZAM) → dane do profilu. Bez OCR. Właściciel: tor D.
// Wejście: multipart/form-data, pole „plik”, tylko PDF, najwyżej 10 MB. Plik przetwarzamy w pamięci:
// nie zapisujemy go na dysku i nigdzie dalej nie wysyłamy.
import { MAKS_ROZMIAR_PLIKU, odczytajWniosek } from '@/src/forms/odczyt';
import { BladWniosku } from '@/src/forms/wspolne';

const MB = MAKS_ROZMIAR_PLIKU / 1024 / 1024;

function blad(tresc: string, status: number): Response {
  return Response.json({ blad: tresc }, { status });
}

export async function POST(request: Request) {
  // Zapas na nagłówki multipart; dokładny rozmiar pliku sprawdzamy niżej.
  const dlugosc = Number(request.headers.get('content-length'));
  if (dlugosc > MAKS_ROZMIAR_PLIKU + 64 * 1024) return blad(`Plik jest za duży (najwyżej ${MB} MB).`, 413);

  let dane: FormData;
  try {
    dane = await request.formData();
  } catch {
    return blad('Plik trzeba wysłać jako multipart/form-data w polu „plik”.', 400);
  }
  const plik = dane.get('plik');
  if (!plik || typeof plik === 'string') return blad('Brakuje pliku w polu „plik”.', 400);
  if (plik.size > MAKS_ROZMIAR_PLIKU) return blad(`Plik jest za duży (najwyżej ${MB} MB).`, 413);

  try {
    const wynik = await odczytajWniosek(new Uint8Array(await plik.arrayBuffer()));
    return Response.json(wynik, { headers: { 'Cache-Control': 'no-store' } });
  } catch (e) {
    if (e instanceof BladWniosku) return blad(e.message, 400);
    console.error(e);
    return blad('Błąd serwera przy odczycie wniosku.', 500);
  }
}
