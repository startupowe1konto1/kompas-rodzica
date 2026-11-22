import type { oznaczTerminy } from './terminy';

/** Termin z oznaczeniem względem „dziś” (stan i liczba dni). */
export type Oznaczony = ReturnType<typeof oznaczTerminy>[number];
