/**
 * D3: wniosek ZAM wypełniony danymi z aplikacji (PDF).
 *
 * Wypełniamy edytowalny wzór ZUS (`materialy/ZUS/wzory-formularzy/ZAM_edytowalny.pdf`) po nazwach pól.
 * Wartości liczy `wartosciZAM` (zam-mapowanie.ts), tutaj tylko wpisujemy je do PDF:
 *  - usuwamy XFA (pdf-lib go nie obsługuje, a Adobe Reader pokazywałby wtedy pusty formularz XFA)
 *    i podpis rozszerzeń Adobe (/Perms UR3) – po zmianie pliku byłby nieważny i Reader pokazałby ostrzeżenie;
 *  - osadzamy font Noto Sans (SIL OFL 1.1), bo standardowe fonty PDF nie mają polskich znaków,
 *    i nim rysujemy wygląd wypełnionych pól.
 */
import fontkit from '@pdf-lib/fontkit';
import {
  layoutMultilineText,
  layoutSinglelineText,
  PDFDict,
  PDFDocument,
  PDFName,
  TextAlignment,
  type PDFFont,
  type PDFTextField,
} from 'pdf-lib';
import type { Parametry, ZapytanieWniosek } from '../engine/types';
import { BladWniosku, wczytajFont, wczytajWzorZAM } from './wspolne';
import { pelnaNazwaPola, wartosciZAM } from './zam-mapowanie';

/** Rozmiar pisma w polach – taki jak w ustawieniach pól wzoru ZAM (DA: „10 Tf”). */
const ROZMIAR_PISMA = 10;

export interface WypelnionyWniosek {
  pdf: Uint8Array;
  /** Czego zabrakło – po ludzku, ze stroną formularza. Rodzic uzupełni to ręcznie. */
  doUzupelnienia: string[];
}

/** `wersje` – wersje parametrów (panel admina); domyślnie wartości z pliku. */
export async function wypelnijZAM(zapytanie: ZapytanieWniosek, wersje?: Parametry[]): Promise<WypelnionyWniosek> {
  const wartosci = wartosciZAM(zapytanie, wersje);
  const doc = await PDFDocument.load(await wczytajWzorZAM());
  usunXFAiPodpisAdobe(doc);
  doc.registerFontkit(fontkit);
  // Pełny font (bez podzbioru): rodzic może potem poprawić pole w czytniku i dalej ma polskie znaki.
  const font = await doc.embedFont(await wczytajFont(), { subset: false });
  dodajFontDoZasobowFormularza(doc, font);

  const form = doc.getForm();
  for (const [klucz, tekst] of Object.entries(wartosci.teksty)) {
    const pole = form.getTextField(pelnaNazwaPola(klucz as keyof typeof wartosci.teksty));
    const maks = pole.getMaxLength();
    if (maks !== undefined && tekst.length > maks) {
      throw new BladWniosku(`Za długa wartość w polu „${klucz}”: ${tekst.length} znaków, a mieści się ${maks}.`);
    }
    pole.setText(tekst);
    dopasujRozmiarPisma(pole, font, tekst);
    pole.updateAppearances(font);
  }
  for (const klucz of wartosci.zaznaczone) {
    // Pola wyboru mają we wzorze gotowy wygląd „X” (stan /1) – wystarczy zmienić stan.
    form.getCheckBox(pelnaNazwaPola(klucz)).check();
  }

  const pdf = await doc.save({ updateFieldAppearances: false });
  return { pdf, doUzupelnienia: wartosci.doUzupelnienia };
}

export function usunXFAiPodpisAdobe(doc: PDFDocument): void {
  doc.catalog.delete(PDFName.of('Perms'));
  const acro = doc.catalog.getAcroForm();
  acro?.dict.delete(PDFName.of('XFA'));
  acro?.dict.delete(PDFName.of('SigFlags'));
}

/** Font w /DR formularza – czytnik użyje go, gdy rodzic poprawi wypełnione pole. */
function dodajFontDoZasobowFormularza(doc: PDFDocument, font: PDFFont): void {
  const acro = doc.catalog.getOrCreateAcroForm();
  const dr = acro.dict.lookupMaybe(PDFName.of('DR'), PDFDict) ?? doc.context.obj({});
  acro.dict.set(PDFName.of('DR'), dr);
  const fonty = dr.lookupMaybe(PDFName.of('Font'), PDFDict) ?? doc.context.obj({});
  dr.set(PDFName.of('Font'), fonty);
  fonty.set(PDFName.of(font.name), font.ref);
}

/** Zmniejsza pismo, gdy tekst nie mieści się w polu (np. kilka części urlopu w jednym okienku). */
function dopasujRozmiarPisma(pole: PDFTextField, font: PDFFont, tekst: string): void {
  if (pole.isCombed()) return;
  const { width, height } = pole.acroField.getWidgets()[0].getRectangle();
  // Margines jak w pdf-lib: 1 pt z każdej strony (pola wzoru nie mają ramki /BS).
  const bounds = { x: 1, y: 1, width: width - 2, height: height - 2 };
  const opcje = { alignment: TextAlignment.Left, font, bounds };
  const pasuje = pole.isMultiline() ? layoutMultilineText(tekst, opcje).fontSize : layoutSinglelineText(tekst, opcje).fontSize;
  pole.setFontSize(Math.max(1, Math.min(ROZMIAR_PISMA, Math.floor(pasuje * 10) / 10)));
}
