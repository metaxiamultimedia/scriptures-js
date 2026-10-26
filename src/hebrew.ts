/**
 * OHB words with STEPBible's own tags (from TAHOT) and TBESH glosses by dStrong.
 */
import { getVerseWordsSync, resolveAugmentedStrong } from '@metaxia/scriptures-source-stepbible-tahot';
import { alignVerse, type AlignedWord, type OhbWord } from './tahot-align.js';
import { DATA_DIRS, lexiconRows, readVerse, type SourceWord } from './data.js';
import { bookInfo } from './books.js';

/** A tag with its TBESH gloss ("gloss" undefined when TBESH has no row for the tag). */
export interface TagGloss {
  tag: string;
  gloss?: string;
}

export interface HebrewWord extends AlignedWord {
  /** The OHB word as the source package gives it (text, lemma, morph, metadata, ...). */
  source: SourceWord;
  /**
   * TBESH gloss of the root when the word has exactly one root dStrong;
   * undefined for unaligned words, several roots, or a tag TBESH lacks.
   */
  gloss?: string;
  /** TBESH gloss of every prefix, root and suffix tag. */
  glosses?: { prefixes: TagGloss[]; roots: TagGloss[]; suffixes: TagGloss[] };
  /** True when the word could not be given STEPBible's tags and keeps the OHB eStrong. */
  flagged: boolean;
}

/**
 * Glosses for STEPBible tags from the TBESH row of the exact dStrong.
 */
export function glossTags(tags: string[] | undefined): TagGloss[] {
  const rows = lexiconRows('stepbible-tbesh');
  return (tags ?? []).map((tag) => ({ tag, gloss: rows[tag]?.gloss }));
}

/** Align the OHB words of a Hebrew-numbered verse to TAHOT and gloss them. */
export function hebrewVerseWords(book: string, chapter: number, verse: number): HebrewWord[] | undefined {
  const { osis } = bookInfo(book);
  const ohb = readVerse(DATA_DIRS.ohb, osis, chapter, verse);
  if (!ohb) return undefined;
  return glossAligned(ohb.words, getVerseWordsSync(osis, chapter, verse), `${osis}.${chapter}.${verse}`);
}

export function glossAligned(
  ohbWords: SourceWord[],
  tahot: ReturnType<typeof getVerseWordsSync>,
  osisRef: string,
): HebrewWord[] {
  const tbesh = lexiconRows('stepbible-tbesh');
  const aligned = alignVerse(
    ohbWords as unknown as OhbWord[],
    tahot,
    osisRef,
    resolveAugmentedStrong,
    (tag) => Boolean(tbesh[tag]),
  );
  return aligned.map((w, i) => {
    const out: HebrewWord = { ...w, source: ohbWords[i], flagged: w.method === 'unaligned' };
    if (w.roots) {
      out.glosses = { prefixes: glossTags(w.prefixes), roots: glossTags(w.roots), suffixes: glossTags(w.suffixes) };
      if (w.roots.length === 1) out.gloss = tbesh[w.roots[0]]?.gloss;
    }
    return out;
  });
}
