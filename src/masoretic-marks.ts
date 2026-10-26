/**
 * Masoretic marks by profile: which letters are written large, small or
 * suspended, inverted nuns, the broken vav, closed and open mem, and the
 * extraordinary points, as one authority records them.
 *
 * Profiles:
 * - `minchat-shai`: Minchat Shai, each
 *   mark quoting him at Sefaria's address (data/masoretic-marks/minchat-shai.json).
 * - `wlc`: the marks the Westminster Leningrad Codex itself carries, read at
 *   runtime from @metaxia/scriptures-source-openscriptures-ohb (its special
 *   letters and points of tradition "leningrad", and its reversed nuns).
 *
 * No profile overrides another. A `minchat-shai` mark is `disputed` when he
 * gives it only in some books, reports another view, or the WLC marks the same
 * kind of mark in the verse differently; `dispute.quote` is his words.
 *
 * Positions follow the OHB: `wordIndex` is the 1-based word position in the
 * verse (ketiv and qere are separate words) and `letterIndex` the 0-based index
 * among the word's consonants (U+05D0-U+05EA). References are OSIS with Hebrew
 * numbering, e.g. "Deut.6.4".
 */
import { existsSync, readFileSync, readdirSync } from 'fs';
import { createRequire } from 'module';
import { dirname, join } from 'path';
import type { SourceCitation } from '@metaxia/scriptures-core';

export type MasoreticMarkType =
  | 'large'
  | 'small'
  | 'suspended'
  | 'inverted-nun'
  | 'broken'
  | 'closed-mem'
  | 'open-mem'
  | 'extraordinary-points';

export type MarkProfile = 'minchat-shai' | 'wlc';

/** The profiles, in the order compareProfiles() lists them. */
export const MARK_PROFILES: readonly MarkProfile[] = ['minchat-shai', 'wlc'];

/** A Minchat Shai citation at its Sefaria address. */
export interface MinchatShaiCitation extends SourceCitation {
  /** Always "Minchat Shai". */
  text: string;
  /** Sefaria address, book.chapter.verse.comment, e.g. "Minchat_Shai_on_Torah,_Genesis.23.3.1". */
  section: string;
  url: string;
  /** His words naming this mark, verbatim. */
  quoteHebrew: string;
  /** English translation of quoteHebrew, by the package authors (Sefaria has no English for these comments). */
  translation: string;
  /** The verse the comment is about, when Sefaria files it under another verse. */
  aboutVerse?: string;
  /** His qualification, verbatim: "in some books", or the other view he reports. */
  hedge?: string;
  /** English translation of hedge (by the package authors). */
  hedgeTranslation?: string;
  /** His own conclusion where he weighs readings, verbatim. */
  conclusion?: string;
  /** English translation of conclusion (by the package authors). */
  conclusionTranslation?: string;
  /** Inverted nun from the list at Ps 107:40: the list entry naming this verse, verbatim. */
  item?: string;
  /** English of item: the KJV wording, as `KJV <Book> <c>:<v>: "..."`. */
  itemTranslation?: string;
  /** Inverted nun: his words placing the nuns, verbatim. */
  placement?: string;
  /** English translation of placement (by the package authors). */
  placementTranslation?: string;
}

export interface MarkDispute {
  /**
   * `some-books`: he gives the mark only in some books. `reported-view`: he
   * reports another view of it. `wlc-differs`: the WLC marks the same kind of
   * mark in this verse differently.
   */
  reasons: Array<'some-books' | 'reported-view' | 'wlc-differs'>;
  /** His words: the hedge, else his conclusion, else the quote. */
  quote: string;
  /** English translation of quote, by the package authors. */
  translation: string;
  /** For `wlc-differs`: how the WLC has it. */
  wlc?: string;
}

export interface DottedLetter {
  letterIndex: number;
  letter: string;
  /** English name of the letter, e.g. "ayin". */
  letterName: string;
  mark: 'above' | 'below';
}

export interface DottedWord {
  word: number;
  wordText: string;
  /** The dotted letters; null when Minchat Shai names the word but not its letters. */
  letters: DottedLetter[] | null;
}

/** A row of the minchat-shai profile. */
export interface MinchatShaiMark {
  id: string;
  ref: string;
  /** 1-based word position (for points: the first dotted word; for an inverted nun: 1). */
  word: number;
  wordText: string;
  type: MasoreticMarkType;
  letter?: string;
  /** English name of the letter, e.g. "ayin". */
  letterName?: string;
  letterIndex?: number | null;
  placement?: 'before-verse';
  /** Inverted nun: where the WLC writes it. */
  wlcPlacement?: Array<{ after: string }>;
  dots?: DottedWord[];
  wlcNote?: string;
  disputed: boolean;
  dispute?: MarkDispute;
  citation: MinchatShaiCitation;
}

export interface MinchatShaiProfile {
  profile: 'minchat-shai';
  about: string;
  source: { text: string; edition: string; sefariaExport: { repository: string; commit: string } };
  wlc: { text: string; repository: string; commit: string; attribution: string };
  marks: MinchatShaiMark[];
}

/** One mark on one word, as getMarks() returns it. */
export interface Mark {
  profile: MarkProfile;
  /** 1-based word position in the verse. An inverted nun stands before word 1. */
  wordIndex: number;
  /** 0-based consonant index; null for an inverted nun, and for points whose letters are not named. */
  letterIndex: number | null;
  letter: string | null;
  /** English name of the letter, e.g. "ayin"; null when letter is null. */
  letterName: string | null;
  type: MasoreticMarkType;
  /** Extraordinary points: the dot above or below the letter. */
  dot?: 'above' | 'below';
  placement?: 'before-verse';
  citation: SourceCitation;
  disputed: boolean;
  dispute?: MarkDispute;
  /** minchat-shai row id. */
  id?: string;
}

export interface ProfileComparisonRow {
  wordIndex: number;
  letterIndex: number | null;
  type: MasoreticMarkType;
  dot?: 'above' | 'below';
  placement?: 'before-verse';
  /** Each profile's mark at this place, or null when the profile has none there. */
  profiles: Record<MarkProfile, Mark | null>;
}

export interface ProfileComparison {
  ref: string;
  profiles: readonly MarkProfile[];
  /** Every place any profile marks, by word, letter, type and dot. */
  rows: ProfileComparisonRow[];
}

const require = createRequire(import.meta.url);

const LETTER_NAMES: Record<string, string> = {
  א: 'alef', ב: 'bet', ג: 'gimel', ד: 'dalet', ה: 'he', ו: 'vav', ז: 'zayin', ח: 'het', ט: 'tet', י: 'yod',
  כ: 'kaf', ך: 'final kaf', ל: 'lamed', מ: 'mem', ם: 'final mem', נ: 'nun', ן: 'final nun', ס: 'samekh',
  ע: 'ayin', פ: 'pe', ף: 'final pe', צ: 'tsade', ץ: 'final tsade', ק: 'qof', ר: 'resh', ש: 'shin', ת: 'tav',
};
const letterName = (l: string | null): string | null => (l === null ? null : (LETTER_NAMES[l] ?? null));

let minchatShai: MinchatShaiProfile | undefined;
let msByVerse: Map<string, MinchatShaiMark[]> | undefined;

/** The minchat-shai profile data file. */
export function getMinchatShaiProfile(): MinchatShaiProfile {
  minchatShai ??= JSON.parse(
    readFileSync(new URL('../data/masoretic-marks/minchat-shai.json', import.meta.url), 'utf-8'),
  ) as MinchatShaiProfile;
  return minchatShai;
}

function minchatShaiMarks(ref: string): Mark[] {
  if (!msByVerse) {
    msByVerse = new Map();
    for (const m of getMinchatShaiProfile().marks) {
      const list = msByVerse.get(m.ref) ?? [];
      list.push(m);
      msByVerse.set(m.ref, list);
    }
  }
  const out: Mark[] = [];
  for (const m of msByVerse.get(ref) ?? []) {
    const base = {
      profile: 'minchat-shai' as const,
      type: m.type,
      citation: m.citation,
      disputed: m.disputed,
      ...(m.dispute ? { dispute: m.dispute } : {}),
      id: m.id,
    };
    if (m.type === 'extraordinary-points') {
      for (const d of m.dots ?? []) {
        if (d.letters === null) {
          out.push({ ...base, wordIndex: d.word, letterIndex: null, letter: null, letterName: null });
          continue;
        }
        for (const l of d.letters) {
          out.push({ ...base, wordIndex: d.word, letterIndex: l.letterIndex, letter: l.letter, letterName: l.letterName, dot: l.mark });
        }
      }
    } else if (m.type === 'inverted-nun') {
      out.push({ ...base, wordIndex: 1, letterIndex: null, letter: null, letterName: null, placement: 'before-verse' });
    } else {
      out.push({ ...base, wordIndex: m.word, letterIndex: m.letterIndex ?? null, letter: m.letter ?? null, letterName: m.letterName ?? letterName(m.letter ?? null) });
    }
  }
  return out;
}

// ---- wlc profile: read from the OHB package ----

interface OhbWord {
  position: number;
  text: string;
  metadata?: {
    specialLetters?: Array<{ type: string; char: string; index: number; tradition?: string }>;
    points?: Array<{ index: number; char: string; mark: 'upper' | 'lower'; tradition?: string }>;
  };
}
interface OhbVerse {
  words: OhbWord[];
  metadata?: {
    sequence?: Array<{ kind: string; type?: string }>;
    scribalMarks?: Array<{ type: string; position?: string }>;
  };
}

let ohbDir: string | undefined;
function ohbData(): string {
  ohbDir ??= dirname(require.resolve('@metaxia/scriptures-source-openscriptures-ohb/data/openscriptures-OHB/metadata.json'));
  return ohbDir;
}

function readOhb(book: string, chapter: number, verse: number): OhbVerse | undefined {
  const p = join(ohbData(), book, String(chapter), `${verse}.json`);
  return existsSync(p) ? (JSON.parse(readFileSync(p, 'utf-8')) as OhbVerse) : undefined;
}

/** The verse before ref in the OHB, or undefined at the start of a book. */
function previousVerse(book: string, chapter: number, verse: number): OhbVerse | undefined {
  if (verse > 1) return readOhb(book, chapter, verse - 1);
  if (chapter <= 1) return undefined;
  const dir = join(ohbData(), book, String(chapter - 1));
  if (!existsSync(dir)) return undefined;
  const last = Math.max(...readdirSync(dir).filter((f) => f.endsWith('.json')).map((f) => parseInt(f, 10)));
  return readOhb(book, chapter - 1, last);
}

/** True when the verse ends with a reversed nun (OHB 3.x sequence, or 2.x scribalMarks). */
function endsWithReversedNun(v: OhbVerse | undefined): boolean {
  if (!v?.metadata) return false;
  const seq = v.metadata.sequence;
  if (seq) {
    const lastWord = seq.map((x) => x.kind).lastIndexOf('word');
    return seq.slice(lastWord + 1).some((x) => x.kind === 'mark' && x.type === 'reversed-nun');
  }
  return (v.metadata.scribalMarks ?? []).some((x) => x.type === 'reversed-nun' && x.position === 'after');
}

const CONS = /[א-ת]/u;

function wlcCitation(ref: string): SourceCitation {
  return {
    text: 'Westminster Leningrad Codex (Open Scriptures Hebrew Bible, morphhb)',
    section: ref,
    url: 'https://github.com/openscriptures/morphhb',
    note: 'Original work of the Open Scriptures Hebrew Bible available at https://github.com/openscriptures/morphhb (CC BY 4.0).',
  };
}

function wlcMarks(ref: string): Mark[] {
  const [book, c, v] = ref.split('.');
  const chapter = Number(c);
  const verse = Number(v);
  const data = readOhb(book, chapter, verse);
  if (!data) return [];
  const citation = wlcCitation(ref);
  const base = { profile: 'wlc' as const, citation, disputed: false };
  const out: Mark[] = [];
  if (endsWithReversedNun(previousVerse(book, chapter, verse))) {
    out.push({ ...base, wordIndex: 1, letterIndex: null, letter: null, letterName: null, type: 'inverted-nun', placement: 'before-verse' });
  }
  for (const w of data.words) {
    for (const s of w.metadata?.specialLetters ?? []) {
      if (s.tradition !== undefined && s.tradition !== 'leningrad') continue;
      if (s.type !== 'large' && s.type !== 'small' && s.type !== 'suspended') continue;
      const ch = [...s.char].find((x) => CONS.test(x)) ?? s.char;
      out.push({ ...base, wordIndex: w.position, letterIndex: s.index, letter: ch, letterName: letterName(ch), type: s.type as MasoreticMarkType });
    }
    for (const p of w.metadata?.points ?? []) {
      if (p.tradition !== undefined && p.tradition !== 'leningrad') continue;
      out.push({
        ...base,
        wordIndex: w.position,
        letterIndex: p.index,
        letter: p.char,
        letterName: letterName(p.char),
        type: 'extraordinary-points',
        dot: p.mark === 'upper' ? 'above' : 'below',
      });
    }
  }
  return out;
}

/**
 * The marks of one verse in one profile (default `minchat-shai`), one entry per
 * marked letter or dot.
 */
export function getMarks(ref: string, options: { profile?: MarkProfile } = {}): Mark[] {
  const profile = options.profile ?? 'minchat-shai';
  if (profile === 'minchat-shai') return minchatShaiMarks(ref);
  if (profile === 'wlc') return wlcMarks(ref);
  throw new Error(`unknown masoretic-marks profile: ${String(profile)}`);
}

const placeKey = (m: Pick<Mark, 'type' | 'wordIndex' | 'letterIndex' | 'dot' | 'placement'>) =>
  [m.type, m.wordIndex, m.letterIndex ?? '', m.dot ?? '', m.placement ?? ''].join('|');

/** Every profile's marks for one verse, lined up by word, letter, type and dot. */
export function compareProfiles(ref: string): ProfileComparison {
  const rows = new Map<string, ProfileComparisonRow>();
  for (const profile of MARK_PROFILES) {
    for (const m of getMarks(ref, { profile })) {
      const k = placeKey(m);
      let row = rows.get(k);
      if (!row) {
        row = {
          wordIndex: m.wordIndex,
          letterIndex: m.letterIndex,
          type: m.type,
          ...(m.dot ? { dot: m.dot } : {}),
          ...(m.placement ? { placement: m.placement } : {}),
          profiles: Object.fromEntries(MARK_PROFILES.map((p) => [p, null])) as Record<MarkProfile, Mark | null>,
        };
        rows.set(k, row);
      }
      row.profiles[profile] = m;
    }
  }
  const sorted = [...rows.values()].sort(
    (a, b) =>
      (a.placement ? -1 : 0) - (b.placement ? -1 : 0) ||
      a.wordIndex - b.wordIndex ||
      (a.letterIndex ?? -1) - (b.letterIndex ?? -1) ||
      a.type.localeCompare(b.type) ||
      (a.dot ?? '').localeCompare(b.dot ?? ''),
  );
  return { ref, profiles: MARK_PROFILES, rows: sorted };
}
