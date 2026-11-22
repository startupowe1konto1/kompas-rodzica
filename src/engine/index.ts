/**
 * Publiczne API silnika. Czyste funkcje: te same dane dają ten sam wynik, bez zegara i bez sieci.
 * Warstwa REST (app/api) tylko je wywołuje.
 */
export * from './types';
export * as daty from './daty';
export { doGrosza, suma } from './pieniadze';
export { parametryNaDzien, WERSJE_DOMYSLNE, PARAMETRY_2026 } from './params';
export { ustalUprawnienia } from './eligibility';
export { planyDomyslne, przesunPlan, walidujPlan, zastosujAkcje } from './planner';
export { obliczPodstawe, obliczKwoty } from './calculator';
export { dokumentyITerminy, naICS, terminyDlaPlanu, type OpcjeICS } from './documents';
