// GET /api/mock/persony – persony testowe do symulowanego logowania mObywatelem. Właściciel: tor D.
import { PERSONY } from '@/src/mocks/persony';

export async function GET() {
  return Response.json(PERSONY);
}
