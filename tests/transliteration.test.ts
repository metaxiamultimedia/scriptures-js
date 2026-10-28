import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import {
  BOOKS,
  originalChapters,
  hebrewVerseWords,
  consonants,
  headwordsForSStrong,
  eStrongOfWord,
  eStrongOfTag,
  type HebrewWord,
} from '../src/index.js';
import { DATA_DIRS, verseNumbers } from '../src/data.js';

/** Canonical order of the points, so a test literal compares equal to the source's spelling. */
const nfc = (s: string) => s.normalize('NFC');

function word(book: string, ch: number, v: number, cons: string, nth = 1): HebrewWord {
  const w = hebrewVerseWords(book, ch, v)!.filter((x) => consonants(x.text) === cons)[nth - 1];
  if (!w) throw new Error(`${book} ${ch}:${v}: no word ${cons}`);
  return w;
}

/** Every OHB word of the OT, with its OSIS reference. */
function* allWords(): Generator<[string, HebrewWord]> {
  for (const b of BOOKS.filter((x) => x.testament === 'OT')) {
    for (const ch of originalChapters(b.osis)) {
      for (const v of verseNumbers(DATA_DIRS.ohb, b.osis, ch)) {
        for (const w of hebrewVerseWords(b.osis, ch, v) ?? []) yield [`${b.osis}.${ch}.${v}`, w];
      }
    }
  }
}

describe('word transliteration is TAHOT\'s, unchanged', () => {
  it('Gen 1:3 word 1 וַיֹּאמֶר = va/i.Yo.mer', () => {
    const w = hebrewVerseWords('Gen', 1, 3)![0];
    expect(w.transliteration).toBe('va/i.Yo.mer');
    expect(w.transliterationSource).toBe('stepbible-tahot');
    expect(w.ketivTransliteration).toBeUndefined();
  });

  it('Gen 6:21 וְלָהֶם = ve./la./Hem', () => {
    expect(word('Gen', 6, 21, 'ולהם').transliteration).toBe('ve./la./Hem');
  });

  it('a Q(K) row: the Qere reading on both words, the Ketiv\'s K= transliteration (Gen 24:33)', () => {
    const ws = hebrewVerseWords('Gen', 24, 33)!;
    const ketiv = ws.find((w) => w.variant === 'ketiv')!;
    const qere = ws.find((w) => w.variant === 'qere')!;
    expect(ketiv.text).toBe('ויישם');
    expect(ketiv.ketivTransliteration).toBe('va/i.yi.sem');
    expect(ketiv.transliteration).toBe('va/yu.sem');
    expect(qere.transliteration).toBe('va/yu.sem');
    expect(qere.ketivTransliteration).toBe('va/i.yi.sem');
  });

  it('a Q(k) spelling variant has no K= transliteration (Gen 8:17)', () => {
    const ketiv = hebrewVerseWords('Gen', 8, 17)!.find((w) => w.variant === 'ketiv')!;
    expect(ketiv.transliteration).toBe("hay.tze'");
    expect(ketiv.ketivTransliteration).toBeUndefined();
  });

  it('a Qere TAHOT prints as one row with "//": each word takes its part (Gen 30:11)', () => {
    const qere = hebrewVerseWords('Gen', 30, 11)!.filter((w) => w.variant === 'qere');
    expect(qere.map((w) => w.transliteration)).toEqual(['be.', 'gad']);
    const ketiv = hebrewVerseWords('Gen', 30, 11)!.find((w) => w.variant === 'ketiv')!;
    expect(ketiv.ketivTransliteration).toBe('be./gad');
  });

  it('the divine name is TAHOT\'s value, unchanged (Gen 2:4 Yah.weh, Gen 4:3 la./Yah.weh; headword H3068 ye.ho.vah)', () => {
    expect(word('Gen', 2, 4, 'יהוה').transliteration).toBe('Yah.weh');
    expect(word('Gen', 4, 3, 'ליהוה').transliteration).toBe('la./Yah.weh');
    expect(headwordsForSStrong('H3068')[0].forms[0].transliteration).toBe('ye.ho.vah');
  });

  it('words with no TAHOT row have no transliteration, flagged "none"; the list is pinned', { timeout: 120_000 }, () => {
    const fixture = JSON.parse(readFileSync(new URL('./fixtures/transliteration-uncovered.json', import.meta.url), 'utf-8'));
    const uncovered = [];
    let words = 0;
    for (const [ref, w] of allWords()) {
      words++;
      if (w.transliterationSource === 'none') {
        expect(w.transliteration).toBeUndefined();
        expect(['augmented', 'unaligned']).toContain(w.method);
        uncovered.push({ ref, position: w.position, text: w.text, variant: w.variant ?? null, method: w.method });
      } else {
        expect(w.transliterationSource).toBe('stepbible-tahot');
        expect(typeof w.transliteration).toBe('string');
      }
    }
    expect(words).toBe(306785);
    expect(uncovered).toEqual(fixture.words);
    // 40 words the reader shows (20 augmented, 20 unaligned) and 23 Qere words.
    expect(uncovered.filter((u) => u.variant !== 'qere')).toHaveLength(40);
  });
});

describe('headwordsForSStrong: one headword per eStrong, TBESH file order', () => {
  it('H1004: H1004a בֵּית bet, H1004b בַּ֫יִת ba.yit (412)', () => {
    const hw = headwordsForSStrong('H1004');
    expect(hw.map((h) => h.eStrong)).toEqual(['H1004a', 'H1004b']);
    expect(hw.map((h) => [nfc(h.forms[0].lemma), h.forms[0].transliteration])).toEqual([[nfc('בֵּית'), 'bet'], [nfc('בַּ֫יִת'), 'ba.yit']]);
    expect(hw[1].forms[0].variants[0].gematria.standard).toBe(412);
    expect(hw[1].dStrongs).toContain('H1004M');
    expect(headwordsForSStrong('H01004')).toEqual(hw);
    expect(headwordsForSStrong('1004')).toEqual(hw);
  });

  it('H0430 אֱלֹהִים = 86', () => {
    const [h] = headwordsForSStrong('H0430');
    expect(h.forms).toHaveLength(1);
    expect(nfc(h.forms[0].lemma)).toBe(nfc('אֱלֹהִים'));
    expect(h.forms[0].variants[0].gematria.standard).toBe(86);
  });

  it('a comma-list lemma lists each variant with its own gematria, never a sum (H0026)', () => {
    const [h] = headwordsForSStrong('H0026');
    expect(nfc(h.forms[0].lemma)).toBe(nfc('אֲבִיגַ֫יִל, אֲבִיגַ֫ל'));
    expect(h.forms[0].variants.map((v) => [nfc(v.text), v.gematria.standard])).toEqual([[nfc('אֲבִיגַ֫יִל'), 56], [nfc('אֲבִיגַ֫ל'), 46]]);
  });

  it('an eStrong whose rows give two lemmas lists both (H1540: הֶגְלָם H1540G, גָּלָה)', () => {
    const [h] = headwordsForSStrong('H1540');
    expect(h.forms.map((f) => [nfc(f.lemma), f.dStrongs[0]])).toEqual([[nfc('הֶגְלָם'), 'H1540G'], [nfc('גָּלָה'), 'H1540H']]);
  });

  it('at most 6 eStrongs for one number (H5526a-f)', () => {
    expect(headwordsForSStrong('H5526').map((h) => h.eStrong)).toEqual(['H5526a', 'H5526b', 'H5526c', 'H5526d', 'H5526e', 'H5526f']);
  });

  it('eStrongOfWord: STEPBible\'s tag through TBESH, else the OHB eStrong', () => {
    expect(eStrongOfWord(word('Gen', 12, 1, 'ומבית'))).toBe('H1004b');
    expect(eStrongOfTag('H1004A')).toBe('H1004a');
    expect(eStrongOfWord({ roots: ['H0430J'], ohbEStrong: 'H0430' })).toBe('H0430');
    expect(eStrongOfWord({ roots: undefined, ohbEStrong: 'H1004' })).toBeUndefined();
  });
});
