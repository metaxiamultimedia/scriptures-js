/**
 * Headwords of a Strong's number from STEPBible's TBESH, by extended Strong's
 * number (eStrong).
 *
 * A Strong's number can have several eStrongs (H1004a בֵּית "place", H1004b
 * בַּ֫יִת "house"). Each eStrong is one headword, in TBESH file order. A
 * headword lists every distinct lemma (with its transliteration) that the
 * TBESH rows of that eStrong give, in file order; nearly every eStrong has one.
 * A lemma written as a comma list (e.g. "אֲבִיגַ֫יִל, אֲבִיגַ֫ל") names spelling
 * variants of a name: each variant is listed with its own gematria, and the
 * values are never added together.
 */
import { computeHebrew } from '@metaxia/scriptures-core';
import { lexiconRows } from './data.js';
import type { HebrewWord } from './hebrew.js';

export interface GematriaTriple {
  standard: number;
  ordinal: number;
  reduced: number;
}

export interface HeadwordVariant {
  /** One spelling, as TBESH writes it (pointed). */
  text: string;
  /** Gematria of this spelling (scriptures-core computeHebrew: consonants only). */
  gematria: GematriaTriple;
}

export interface HeadwordForm {
  /** The TBESH lemma as written, e.g. "בַּ֫יִת" or a comma list "דָּנִיֵּאל, דָּנִאֵל". */
  lemma: string;
  /** The TBESH transliteration of the rows with this lemma, unchanged (undefined if TBESH gives none). */
  transliteration?: string;
  /** The lemma split at commas: one entry per spelling. */
  variants: HeadwordVariant[];
  /** The dStrongs (TBESH rows) with this lemma and transliteration, in file order. */
  dStrongs: string[];
  /** Gloss of the first of those rows. */
  gloss?: string;
}

export interface Headword {
  /** Extended Strong's number, e.g. "H1004b", "H0430". */
  eStrong: string;
  /** Simple Strong's number (four digits), e.g. "H1004". */
  sStrong: string;
  /** Distinct lemma + transliteration pairs of the eStrong's rows, in file order. */
  forms: HeadwordForm[];
  /** Every dStrong of the eStrong, in file order. */
  dStrongs: string[];
}

/** "H1004", "H01004", "1004", "H1004b" -> "H1004". */
export function sStrongOf(strongs: string): string | undefined {
  const m = /^H?0*(\d+)/i.exec(strongs.trim());
  return m ? `H${m[1].padStart(4, '0')}` : undefined;
}

let byNumber: Map<string, Headword[]> | undefined;
let eStrongOfDStrong: Map<string, string> | undefined;

function build(): Map<string, Headword[]> {
  if (byNumber) return byNumber;
  const rows = lexiconRows('stepbible-tbesh');
  byNumber = new Map();
  eStrongOfDStrong = new Map();
  const byEStrong = new Map<string, Headword>();
  // Object key order is the file order (keys are dStrongs, never integer-like).
  for (const [dStrong, row] of Object.entries(rows)) {
    if (!row.strongsExtended?.startsWith('H')) continue;
    eStrongOfDStrong.set(dStrong, row.strongsExtended);
    let hw = byEStrong.get(row.strongsExtended);
    if (!hw) {
      // The eStrong's own number, so a row filed under another eStrong is listed there.
      const sStrong = sStrongOf(row.strongsExtended)!;
      hw = { eStrong: row.strongsExtended, sStrong, forms: [], dStrongs: [] };
      byEStrong.set(row.strongsExtended, hw);
      byNumber.set(sStrong, [...(byNumber.get(sStrong) ?? []), hw]);
    }
    hw.dStrongs.push(dStrong);
    let form: HeadwordForm | undefined = hw.forms.find((f) => f.lemma === row.lemma && f.transliteration === row.transliteration);
    if (!form) {
      form = {
        lemma: row.lemma,
        transliteration: row.transliteration,
        variants: row.lemma.split(',').map((t) => t.trim()).filter(Boolean).map((text) => ({ text, gematria: computeHebrew(text) })),
        dStrongs: [],
        gloss: row.gloss,
      };
      hw.forms.push(form);
    }
    form.dStrongs.push(dStrong);
  }
  return byNumber;
}

/**
 * Every eStrong headword of a Hebrew Strong's number, in TBESH file order:
 * headwordsForSStrong('H1004') -> [H1004a בֵּית bet, H1004b בַּ֫יִת ba.yit].
 * Accepts "H1004", "H01004" or "1004". Empty when TBESH has no row.
 */
export function headwordsForSStrong(strongs: string): Headword[] {
  const s = sStrongOf(strongs);
  return s ? build().get(s) ?? [] : [];
}

/** The eStrong a TBESH dStrong maps to: "H1004M" -> "H1004b". */
export function eStrongOfTag(dStrong: string): string | undefined {
  build();
  return eStrongOfDStrong!.get(dStrong);
}

/**
 * The eStrong of a word from hebrewVerseWords(): STEPBible's root tag mapped
 * through TBESH when the word has exactly one root tag with a TBESH row, else
 * the OHB eStrong when TBESH has that eStrong. Undefined otherwise.
 */
export function eStrongOfWord(word: Pick<HebrewWord, 'roots' | 'ohbEStrong'>): string | undefined {
  build();
  if (word.roots?.length === 1) {
    const e = eStrongOfDStrong!.get(word.roots[0]);
    if (e) return e;
  }
  const ohb = word.ohbEStrong;
  if (ohb && build().get(sStrongOf(ohb)!)?.some((h) => h.eStrong === ohb)) return ohb;
  return undefined;
}
