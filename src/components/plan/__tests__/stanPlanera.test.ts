import { describe, expect, it } from 'vitest';
import { PRZYKLAD_PLAN, PRZYKLAD_WALIDACJA } from '../../../mocks/przyklad';
import { PROG_OSI_PX, kodZHasha, kluczPlanu, nadpisanieWalidacji, nowyPodglad, odcinekWPlanie, podgladDlaPlanu, walidacjaZNadpisania, widokDomyslny } from '../stanPlanera';

describe('stan planera (czyste pomocnicze)', () => {
  it('walidacja z odpowiedzi akcji obowiązuje, dopóki plan się nie zmieni', () => {
    const nad = nadpisanieWalidacji(PRZYKLAD_PLAN, PRZYKLAD_WALIDACJA);
    expect(walidacjaZNadpisania(nad, PRZYKLAD_PLAN)).toBe(PRZYKLAD_WALIDACJA);
    // kopia o tej samej treści to ten sam plan (plan wraca z localStorage jako nowy obiekt)
    expect(walidacjaZNadpisania(nad, JSON.parse(JSON.stringify(PRZYKLAD_PLAN)))).toBe(PRZYKLAD_WALIDACJA);
    expect(walidacjaZNadpisania(nad, { ...PRZYKLAD_PLAN, wariant815: !PRZYKLAD_PLAN.wariant815 })).toBeNull();
    expect(walidacjaZNadpisania(nad, null)).toBeNull();
    expect(walidacjaZNadpisania(null, PRZYKLAD_PLAN)).toBeNull();
  });

  it('klucz planu zależy od treści, nie od tożsamości obiektu', () => {
    expect(kluczPlanu(PRZYKLAD_PLAN)).toBe(kluczPlanu({ ...PRZYKLAD_PLAN }));
    expect(kluczPlanu(PRZYKLAD_PLAN)).not.toBe(kluczPlanu({ ...PRZYKLAD_PLAN, odcinki: PRZYKLAD_PLAN.odcinki.slice(1) }));
  });

  it('zaznaczony odcinek znika, gdy plan go już nie ma', () => {
    const id = PRZYKLAD_PLAN.odcinki[0].id;
    expect(odcinekWPlanie(PRZYKLAD_PLAN, id)).toBe(id);
    expect(odcinekWPlanie(PRZYKLAD_PLAN, 'nie-ma')).toBeNull();
    expect(odcinekWPlanie(PRZYKLAD_PLAN, null)).toBeNull();
    expect(odcinekWPlanie(null, id)).toBeNull();
  });

  it('widok domyślny: lista poniżej 768 px, oś od 768 px', () => {
    expect(PROG_OSI_PX).toBe(768);
    expect(widokDomyslny(375)).toBe('lista');
    expect(widokDomyslny(767)).toBe('lista');
    expect(widokDomyslny(768)).toBe('os');
    expect(widokDomyslny(1280)).toBe('os');
  });

  it('kod okna wyboru z hasha #wybor-{kod}', () => {
    expect(kodZHasha('#wybor-wariant_815')).toBe('wariant_815');
    expect(kodZHasha('wybor-wariant_815')).toBe('wariant_815');
    expect(kodZHasha('#cos-innego')).toBeNull();
    expect(kodZHasha('#wybor-')).toBeNull();
    expect(kodZHasha('')).toBeNull();
  });

  it('podgląd „po zmianie” znika, gdy plan bazowy się zmieni', () => {
    const alt = { ...PRZYKLAD_PLAN, wariant815: true };
    const pod = nowyPodglad(PRZYKLAD_PLAN, alt, PRZYKLAD_WALIDACJA);
    expect(podgladDlaPlanu(pod, PRZYKLAD_PLAN)?.plan).toBe(alt);
    expect(podgladDlaPlanu(pod, alt)).toBeNull();
    expect(podgladDlaPlanu(null, PRZYKLAD_PLAN)).toBeNull();
    expect(podgladDlaPlanu(pod, null)).toBeNull();
  });
});
