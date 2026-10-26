import { describe, it, expect } from 'vitest';
import { assembleChapter, originalChapters, sharedEnglishVerses, BOOKS, type AssembledVerse } from '../src/index.js';
import { DATA_DIRS, chapterNumbers, verseNumbers } from '../src/data.js';

const ref = (v: AssembledVerse) => v.original && `${v.original.chapter}:${v.original.verse}`;
const eng = (v: AssembledVerse) => v.english && `${v.english.chapter}:${v.english.verse}`;

describe('assembleChapter: versification (TVTMS), scriptures-js#1', () => {
  it('Deut 29:28 (Hebrew) pairs with KJV 29:29; no phantom 29:29', () => {
    const vs = assembleChapter('Deuteronomy', 29);
    const last = vs[vs.length - 1];
    expect(ref(last)).toBe('29:28');
    expect(eng(last)).toBe('29:29');
    expect(last.note).toBe('[KJV 29:29]');
    expect(vs.filter((v) => v.kind === 'english-only')).toEqual([]);
    expect(vs.map(ref)).toEqual(Array.from({ length: 28 }, (_, i) => `29:${i + 1}`));
    // KJV 29:1 is Hebrew 28:69
    expect(eng(assembleChapter('Deut', 28).at(-1)!)).toBe('29:1');
  });

  it('Num 17:1-15 (Hebrew) = KJV 16:36-50', () => {
    const vs = assembleChapter('Numbers', 17);
    for (let i = 1; i <= 15; i++) {
      const v = vs.find((x) => ref(x) === `17:${i}`)!;
      expect(eng(v)).toBe(`16:${35 + i}`);
      expect(v.note).toBe(`[KJV 16:${35 + i}]`);
    }
    expect(eng(vs.find((x) => ref(x) === '17:16')!)).toBe('17:1');
    expect(assembleChapter('Numbers', 16).map(ref).at(-1)).toBe('16:35');
  });

  it('Mal 3:19-24 (Hebrew) = KJV 4:1-6; Hebrew has no chapter 4', () => {
    const vs = assembleChapter('Malachi', 3);
    expect(vs.slice(-6).map(eng)).toEqual(['4:1', '4:2', '4:3', '4:4', '4:5', '4:6']);
    expect(vs.slice(-6).map(ref)).toEqual(['3:19', '3:20', '3:21', '3:22', '3:23', '3:24']);
    expect(originalChapters('Malachi')).toEqual([1, 2, 3]);
  });

  it('KJV Neh 7:68 has no Hebrew verse: an explicit english-only record after Hebrew 7:67', () => {
    const vs = assembleChapter('Nehemiah', 7);
    const i = vs.findIndex((v) => v.kind === 'english-only');
    expect(eng(vs[i])).toBe('7:68');
    expect(vs[i].hebrewWords).toBeUndefined();
    expect(vs[i].englishVerse?.text).toMatch(/horses/);
    expect(ref(vs[i - 1])).toBe('7:67');
    expect(eng(vs[i + 1])).toBe('7:69');
    expect(ref(vs[i + 1])).toBe('7:68');
  });

  it('KJV Ps 13:6 has no Hebrew verse of its own; Hebrew 13:1 has no KJV verse', () => {
    const vs = assembleChapter('Psalms', 13);
    expect(vs[0].kind).toBe('original-only');
    expect(ref(vs[0])).toBe('13:1');
    expect(vs.at(-1)!.kind).toBe('english-only');
    expect(eng(vs.at(-1)!)).toBe('13:6');
    expect(eng(vs.at(-2)!)).toBe('13:5');
  });

  it('KJV Isa 64:1 has no Hebrew verse of its own: english-only after Hebrew 63:19', () => {
    const vs = assembleChapter('Isaiah', 63);
    expect(vs.at(-1)!.kind).toBe('english-only');
    expect(eng(vs.at(-1)!)).toBe('64:1');
    expect(ref(vs.at(-2)!)).toBe('63:19');
    expect(ref(assembleChapter('Isaiah', 64)[0])).toBe('64:1');
    expect(eng(assembleChapter('Isaiah', 64)[0])).toBe('64:2');
  });

  it('NT Greek Strong\'s come from the TAGNT `strongs` field, glosses from TBESG by the TAGNT tag', () => {
    const [john11] = assembleChapter('John', 1);
    const en = john11.greekWords![0];
    expect(en.text).toBe('Ἐν');
    expect(en.strongs).toEqual(['G1722']);
    expect(en.dStrong).toBe('G1722');
    expect(en.gloss).toBe('in/on/among');
    expect(john11.kind).toBe('paired');
    expect(john11.note).toBeUndefined();
  });
});

describe('English verses that TVTMS maps from two original verses', () => {
  it('are marked on each pairing (Num 25:19 + 26:1 -> KJV 26:1, 1 Sam 20:42 + 21:1, 1 Kgs 22:43-44, 1 Chr 12:4-5)', () => {
    expect([...sharedEnglishVerses('Num')]).toEqual([['26:1', [{ chapter: 25, verse: 19 }, { chapter: 26, verse: 1 }]]]);
    expect([...sharedEnglishVerses('1Sam').keys()]).toEqual(['20:42']);
    expect([...sharedEnglishVerses('1Kgs').keys()]).toEqual(['22:43']);
    expect([...sharedEnglishVerses('1Chr').keys()]).toEqual(['12:4']);
    const shared = BOOKS.filter((b) => sharedEnglishVerses(b.osis).size > 0).map((b) => b.osis);
    expect(shared).toEqual(['Num', '1Sam', '1Kgs', '1Chr']);
    const v = assembleChapter('Num', 25).at(-1)!;
    expect(v.englishSharedBy).toHaveLength(2);
  });
});

describe('every book: no verse twice, no KJV verse lost', { timeout: 300_000 }, () => {
  it.each(BOOKS.map((b) => [b.osis]))('%s', (osis) => {
    const original = new Set<string>();
    const english = new Set<string>();
    for (const ch of originalChapters(osis)) {
      for (const v of assembleChapter(osis, ch)) {
        if (v.original) {
          const k = ref(v)!;
          expect(original.has(k), `${osis} original ${k} twice`).toBe(false);
          original.add(k);
        }
        if (v.english && !sharedEnglishVerses(osis).has(eng(v)!)) {
          const k = eng(v)!;
          expect(english.has(k), `${osis} KJV ${k} twice`).toBe(false);
          english.add(k);
        }
      }
    }
    const origDir = BOOKS.find((b) => b.osis === osis)!.testament === 'OT' ? DATA_DIRS.ohb : DATA_DIRS.tagnt;
    const allOriginal = chapterNumbers(origDir, osis).flatMap((c) => verseNumbers(origDir, osis, c).map((v) => `${c}:${v}`));
    expect([...original].sort()).toEqual(allOriginal.sort());
    const allKjv = chapterNumbers(DATA_DIRS.kjv, osis).flatMap((c) => verseNumbers(DATA_DIRS.kjv, osis, c).map((v) => `${c}:${v}`));
    const shared = [...sharedEnglishVerses(osis).keys()];
    expect([...english, ...shared].sort()).toEqual(allKjv.sort());
  });
});
