/**
 * Synchronous access to the JSON data shipped by the source packages.
 */
import { existsSync, readFileSync, readdirSync } from 'fs';
import { createRequire } from 'module';
import { dirname, join } from 'path';
import type { LexiconRow } from '@metaxia/scriptures-source-stepbible-lexicon';

const require = createRequire(import.meta.url);

function dataDir(pkg: string, file: string): string {
  return dirname(require.resolve(`${pkg}/data/${file}`));
}

/** Directories of the bundled editions (<dir>/<OSIS book>/<chapter>/<verse>.json). */
export const DATA_DIRS = {
  get ohb() { return dataDir('@metaxia/scriptures-source-openscriptures-ohb', 'openscriptures-OHB/metadata.json'); },
  get kjv() { return dataDir('@metaxia/scriptures-source-crosswire-kjv', 'crosswire-KJV/metadata.json'); },
  get tagnt() { return dataDir('@metaxia/scriptures-source-stepbible-tagnt-tr', 'stepbible-tagnt-tr/metadata.json'); },
};

/** A verse file of a source package: { text, words: [...] }. */
export interface SourceVerse<W = SourceWord> {
  text: string;
  words: W[];
}

export interface SourceWord {
  position: number;
  text: string;
  lemma?: string;
  morph?: string | null;
  strongs?: string[];
  variant?: 'ketiv' | 'qere';
  metadata?: Record<string, unknown>;
  [key: string]: unknown;
}

const verseCache = new Map<string, SourceVerse | null>();

export function readVerse(dir: string, book: string, chapter: number, verse: number): SourceVerse | undefined {
  const file = join(dir, book, String(chapter), `${verse}.json`);
  if (!verseCache.has(file)) verseCache.set(file, existsSync(file) ? JSON.parse(readFileSync(file, 'utf-8')) : null);
  return verseCache.get(file) ?? undefined;
}

function numericEntries(dir: string, suffix = ''): number[] {
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((f) => f.endsWith(suffix) && /^\d+/.test(f))
    .map((f) => parseInt(f, 10))
    .sort((a, b) => a - b);
}

export function chapterNumbers(dir: string, book: string): number[] {
  return numericEntries(join(dir, book));
}

export function verseNumbers(dir: string, book: string, chapter: number): number[] {
  return numericEntries(join(dir, book, String(chapter)), '.json');
}

const rowsCache = new Map<string, Record<string, LexiconRow>>();

/** TBESH ("stepbible-tbesh") or TBESG ("stepbible-tbesg") rows keyed by dStrong. */
export function lexiconRows(id: 'stepbible-tbesh' | 'stepbible-tbesg'): Record<string, LexiconRow> {
  let rows = rowsCache.get(id);
  if (!rows) {
    const dir = dataDir('@metaxia/scriptures-source-stepbible-lexicon', `${id}-rows.json`);
    rows = JSON.parse(readFileSync(join(dir, `${id}-rows.json`), 'utf-8')) as Record<string, LexiconRow>;
    rowsCache.set(id, rows);
  }
  return rows;
}
