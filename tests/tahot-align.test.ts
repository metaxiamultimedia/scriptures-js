import { describe, it, expect } from 'vitest';
import { hebrewVerseWords, consonants, type HebrewWord } from '../src/index.js';

/** The word of a verse whose consonants are `cons`. */
function word(book: string, ch: number, v: number, cons: string, nth = 1): HebrewWord {
  const words = hebrewVerseWords(book, ch, v)!.filter((w) => consonants(w.text) === cons);
  const w = words[nth - 1];
  if (!w) throw new Error(`${book} ${ch}:${v}: no word ${cons}`);
  return w;
}

describe('OHB words take STEPBible\'s TAHOT tags and TBESH glosses by dStrong', () => {
  it('Deut 29:28 וְהַנִּגְלֹת -> H1540H (to reveal), not the name Heglam (H1540G)', () => {
    const w = word('Deut', 29, 28, 'והנגלת');
    expect(w.method).toBe('position');
    expect(w.prefixes).toEqual(['H9002', 'H9009']);
    expect(w.roots).toEqual(['H1540H']);
    expect(w.gloss).toBe('to reveal: reveal');
    expect(w.tahot?.ref).toBe('Deu.29.29(29.28)#04=L');
  });

  it('1 Kgs 10:28 הַסּוּסִים -> H5483M (horse), not Horse (Gate)', () => {
    const w = word('1Kgs', 10, 28, 'הסוסים');
    expect(w.roots).toEqual(['H5483M']);
    expect(w.gloss).toBe('horse');
  });

  it('Ps 117:1 הַלְלוּ -> H1984B (to boast: praise)', () => {
    const w = word('Ps', 117, 1, 'הללו');
    expect(w.roots).toEqual(['H1984B']);
    expect(w.gloss).toBe('to boast: praise');
  });

  it('Gen 12:1 וּמִבֵּית -> H9002/H9006/{H1004M} (house: household)', () => {
    const w = word('Gen', 12, 1, 'ומבית');
    expect(w.prefixes).toEqual(['H9002', 'H9006']);
    expect(w.roots).toEqual(['H1004M']);
    expect(w.gloss).toBe('house: household');
    expect(w.glosses?.prefixes.map((g) => g.gloss)).toEqual(['and', 'from']);
  });

  it('Exod 3:7 עַמִּי -> {H5971A}/H9020 (people + my)', () => {
    const w = word('Exod', 3, 7, 'עמי');
    expect(w.roots).toEqual(['H5971A']);
    expect(w.suffixes).toEqual(['H9020']);
    expect(w.gloss).toBe('people');
  });

  it('prefix-only words: Deut 29:28 לָנוּ -> H9005/{H9035}', () => {
    const w = word('Deut', 29, 28, 'לנו');
    expect(w.lemma).toBe('l');
    expect(w.method).toBe('position');
    expect(w.prefixes).toEqual(['H9005']);
    expect(w.roots).toEqual(['H9035']);
    expect(w.gloss).toBe('us');
    expect(w.glosses?.prefixes[0].gloss).toBe('to/for');
  });

  it('a Qere takes its TAHOT row; its Ketiv shares the row as recorded by TAHOT', () => {
    const qere = hebrewVerseWords('Gen', 8, 17)!.find((w) => w.variant === 'qere')!;
    const ketiv = hebrewVerseWords('Gen', 8, 17)!.find((w) => w.variant === 'ketiv')!;
    expect(qere.method).toBe('position');
    expect(qere.roots).toEqual(['H3318H']);
    expect(ketiv.method).toBe('ketiv');
    expect(ketiv.tahot?.word).toBe('14');
    expect(ketiv.roots).toEqual(['H3318H']);
    // Words after the Ketiv/Qere pair keep their TAHOT word numbers.
    expect(word('Gen', 8, 17, 'אתך', 2).tahot?.word).toBe('15');
  });

  it('a Ketiv with its own TAHOT tags (Q(K)) takes those tags: Gen 24:33', () => {
    const ketiv = hebrewVerseWords('Gen', 24, 33)!.find((w) => w.variant === 'ketiv')!;
    expect(ketiv.method).toBe('ketiv');
    expect(ketiv.roots).toEqual(['H3455']);
    const qere = hebrewVerseWords('Gen', 24, 33)!.find((w) => w.variant === 'qere')!;
    expect(qere.roots).toEqual(['H7760H']);
  });

  it('a Qere of two words printed by TAHOT as one row: Gen 30:11 בָּא גָד', () => {
    const qere = hebrewVerseWords('Gen', 30, 11)!.filter((w) => w.variant === 'qere');
    expect(qere.map((w) => w.roots)).toEqual([['H0935G'], ['H1409']]);
    expect(qere.every((w) => w.tahot?.word === '03')).toBe(true);
  });

  it('a word TAHOT does not decide stays unaligned with the OHB eStrong and a reason', () => {
    const w = hebrewVerseWords('Deut', 5, 10)!.find((x) => x.variant === 'ketiv')!;
    expect(w.method).toBe('unaligned');
    expect(w.flagged).toBe(true);
    expect(w.ohbEStrong).toBe('H4687');
    expect(w.roots).toBeUndefined();
    expect(w.note).toMatch(/Ketiv/);
  });
});
