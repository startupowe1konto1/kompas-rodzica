// GET /api/admin/eli – status aktów prawnych z API ELI Sejmu (obowiązuje / nie / nieznany). Tylko odczyt, bez hasła. Właściciel: tor B.
import { statusAktow } from '@/src/server/eli';

export async function GET() {
  try {
    return Response.json(await statusAktow());
  } catch {
    return Response.json({ blad: 'Nie udało się sprawdzić aktów prawnych. Proszę spróbować ponownie.' }, { status: 500 });
  }
}
