/**
 * Shared verse assembly for the book and the site (scriptures-js#1).
 *
 * Walks the original-language verses of a chapter (Hebrew numbering for the
 * OT, English numbering for the TR Greek NT), pairs each with its English
 * verse through mapVerse() (the registered TVTMS source), and adds an explicit
 * record for each English verse that no original-language verse maps to
 * (e.g. KJV Neh 7:68, Ps 13:6, Isa 64:1). The mapping is followed exactly; no
 * verse is guessed, printed twice or dropped.
 */
import { mapVerse } from '@metaxia/scriptures-core';
import '@metaxia/scriptures-source-stepbible-versification';
import { bookInfo, type BookInfo } from './books.js';
import { DATA_DIRS, chapterNumbers, lexiconRows, readVerse, verseNumbers, type SourceVerse, type SourceWord } from './data.js';
import { hebrewVerseWords, type HebrewWord } from './hebrew.js';

export interface Ref {
  chapter: number;
  verse: number;
}

export interface GreekWord {
  position: number;
  text: string;
  /** Strong's numbers from the TAGNT `strongs` field, e.g. ["G1722"]. */
  strongs: string[];
  /** STEPBible's tag for the word in TAGNT (metadata.extendedStrongs). */
  dStrong?: string;
  /** TBESG gloss of that exact tag; undefined when TBESG has no row for it. */
  gloss?: string;
  source: SourceWord;
}

export interface AssembledVerse {
  /**
   * "paired": an original-language verse and the English verse it maps to.
   * "original-only": an original-language verse with no English equivalent (e.g. a Psalm title).
   * "english-only": an English verse that no original-language verse maps to.
   */
  kind: 'paired' | 'original-only' | 'english-only';
  /** Original-language reference (Hebrew numbering for the OT). Absent for english-only. */
  original?: Ref;
  /** English (KJV) reference. Absent for original-only. */
  english?: Ref;
  originalText?: string;
  hebrewWords?: HebrewWord[];
  greekWords?: GreekWord[];
  englishVerse?: SourceVerse;
  /**
   * Set when TVTMS maps more than one original verse to this English verse
   * (e.g. Num 25:19 and 26:1 -> KJV 26:1): every original verse that maps to
   * it. The English verse is then paired with each of them.
   */
  englishSharedBy?: Ref[];
  /** "[KJV c:v]" when the English reference differs, "[Heb. c:v]" for an English verse placed in another numbering. */
  note?: string;
}

export interface AssembleOptions {
  /** Directory of the English edition (<dir>/<OSIS book>/<chapter>/<verse>.json). Default: the bundled KJV. */
  englishDir?: string;
}

const fmt = (r: Ref) => `${r.chapter}:${r.verse}`;
const key = (r: Ref) => `${r.chapter}:${r.verse}`;

function originalDir(book: BookInfo): string {
  return book.testament === 'OT' ? DATA_DIRS.ohb : DATA_DIRS.tagnt;
}

function toEnglish(book: BookInfo, ch: number, v: number): Ref | null {
  return mapVerse(book.name, ch, v, book.testament === 'OT' ? 'MT' : 'English', 'English');
}

interface BookPlan {
  /** Every original verse of the book, in order, with the English verse it maps to. */
  original: Array<{ ref: Ref; english: Ref | null }>;
  /** English verses that no original verse maps to, keyed by the original verse they follow ("" = start of book). */
  englishOnlyAfter: Map<string, Ref[]>;
  /** English verses mapped from more than one original verse: English key -> original refs. */
  shared: Map<string, Ref[]>;
}

const plans = new Map<string, BookPlan>();

function planBook(book: BookInfo, englishDir: string): BookPlan {
  const cacheKey = `${book.osis}|${englishDir}`;
  const cached = plans.get(cacheKey);
  if (cached) return cached;
  const dir = originalDir(book);
  const original: BookPlan['original'] = [];
  const mappedFrom = new Map<string, Ref[]>();
  for (const ch of chapterNumbers(dir, book.osis)) {
    for (const v of verseNumbers(dir, book.osis, ch)) {
      const english = toEnglish(book, ch, v);
      const exists = english && readVerse(englishDir, book.osis, english.chapter, english.verse);
      original.push({ ref: { chapter: ch, verse: v }, english: exists ? english : null });
      if (exists) mappedFrom.set(key(english), [...(mappedFrom.get(key(english)) ?? []), { chapter: ch, verse: v }]);
    }
  }
  const shared = new Map([...mappedFrom].filter(([, refs]) => refs.length > 1));

  // English verses no original verse maps to go after the original verse
  // paired with the nearest preceding English verse.
  const englishOnlyAfter = new Map<string, Ref[]>();
  let lastOriginal = '';
  for (const ch of chapterNumbers(englishDir, book.osis)) {
    for (const v of verseNumbers(englishDir, book.osis, ch)) {
      const from = mappedFrom.get(`${ch}:${v}`);
      if (from) {
        lastOriginal = key(from[from.length - 1]);
        continue;
      }
      englishOnlyAfter.set(lastOriginal, [...(englishOnlyAfter.get(lastOriginal) ?? []), { chapter: ch, verse: v }]);
    }
  }
  const plan = { original, englishOnlyAfter, shared };
  plans.set(cacheKey, plan);
  return plan;
}

function greekWords(words: SourceWord[]): GreekWord[] {
  const tbesg = lexiconRows('stepbible-tbesg');
  return words.map((w) => {
    const dStrong = typeof w.metadata?.extendedStrongs === 'string' ? (w.metadata.extendedStrongs as string) : undefined;
    return {
      position: w.position,
      text: w.text,
      strongs: w.strongs ?? [],
      dStrong,
      gloss: dStrong ? tbesg[dStrong]?.gloss : undefined,
      source: w,
    };
  });
}

/**
 * The aligned verse list for a chapter in original-language numbering (Hebrew
 * for the OT). English verses that no original verse maps to appear once, as
 * "english-only", after the verse paired with the English verse before them.
 */
export function assembleChapter(book: string, chapter: number, options: AssembleOptions = {}): AssembledVerse[] {
  const info = bookInfo(book);
  const englishDir = options.englishDir ?? DATA_DIRS.kjv;
  const plan = planBook(info, englishDir);
  const out: AssembledVerse[] = [];
  const pushEnglishOnly = (after: string) => {
    for (const ref of plan.englishOnlyAfter.get(after) ?? []) {
      out.push({
        kind: 'english-only',
        english: ref,
        englishVerse: readVerse(englishDir, info.osis, ref.chapter, ref.verse),
        note: `[KJV ${fmt(ref)}]`,
      });
    }
  };
  const inChapter = plan.original.filter((o) => o.ref.chapter === chapter);
  if (plan.original[0] && inChapter[0] === plan.original[0]) pushEnglishOnly('');
  for (const { ref, english } of inChapter) {
    const src = readVerse(originalDir(info), info.osis, ref.chapter, ref.verse)!;
    const verse: AssembledVerse = {
      kind: english ? 'paired' : 'original-only',
      original: ref,
      originalText: src.text,
    };
    if (info.testament === 'OT') verse.hebrewWords = hebrewVerseWords(info.osis, ref.chapter, ref.verse);
    else verse.greekWords = greekWords(src.words);
    if (english) {
      verse.english = english;
      verse.englishVerse = readVerse(englishDir, info.osis, english.chapter, english.verse);
      if (key(english) !== key(ref)) verse.note = `[KJV ${fmt(english)}]`;
      const sharedBy = plan.shared.get(key(english));
      if (sharedBy) verse.englishSharedBy = sharedBy;
    }
    out.push(verse);
    pushEnglishOnly(key(ref));
  }
  return out;
}

/** English verses that more than one original verse maps to (English "c:v" -> original refs). */
export function sharedEnglishVerses(book: string, options: AssembleOptions = {}): Map<string, Ref[]> {
  return planBook(bookInfo(book), options.englishDir ?? DATA_DIRS.kjv).shared;
}

/** Original-language chapter numbers of a book. */
export function originalChapters(book: string): number[] {
  const info = bookInfo(book);
  return chapterNumbers(originalDir(info), info.osis);
}
