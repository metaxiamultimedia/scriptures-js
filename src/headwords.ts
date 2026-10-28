/**
 * Headwords of a Strong's number from STEPBible's TBESH (Hebrew, H numbers) and
 * TBESG (Greek, G numbers), by extended Strong's number (eStrong).
 *
 * A Strong's number can have several eStrongs (H1004a בֵּית "place", H1004b
 * בַּ֫יִת "house"). Each eStrong is one headword, in TBESH file order. A
 * headword lists every distinct lemma (with its transliteration) that the
 * TBESH rows of that eStrong give, in file order; nearly every eStrong has one.
 * A lemma written as a comma list (e.g. "אֲבִיגַ֫יִל, אֲבִיגַ֫ל") names spelling
 * variants of a name: each variant is listed with its own gematria, and the
 * values are never added together.
 *
 * Greek works the same way from TBESG. TBESG's eStrongs carry no sense letter
 * (its extended numbers are further numbers, e.g. G6000 and up), so in lexicon
 * 2.2.0 every G number has exactly one headword; its rows can still give more
 * than one lemma (G4672 Σολομών, Σαλωμών), and those are all listed.
 */
import { computeGreek, computeHebrew } from '@metaxia/scriptures-core';
import { lexiconRows, type SourceWord } from './data.js';
import type { HebrewWord } from './hebrew.js';

export interface GematriaTriple {
  standard: number;
  ordinal: number;
  reduced: number;
}

export interface HeadwordVariant {
  /** One spelling, as TBESH/TBESG writes it (pointed or accented). */
  text: string;
  /**
   * Gematria of this spelling (scriptures-core computeHebrew or computeGreek:
   * letters only). Undefined only when scriptures-core cannot compute it: the
   * one case in TBESG is G5516 χξϛ ("666"), whose stigma has no ordinal value.
   */
  gematria?: GematriaTriple;
}

export interface HeadwordForm {
  /** The TBESH/TBESG lemma as written, e.g. "בַּ֫יִת" or a comma list "דָּנִיֵּאל, דָּנִאֵל". */
  lemma: string;
  /** The TBESH/TBESG transliteration of the rows with this lemma, unchanged (undefined if none is given). */
  transliteration?: string;
  /** The lemma split at commas: one entry per spelling. */
  variants: HeadwordVariant[];
  /** The dStrongs (TBESH/TBESG rows) with this lemma and transliteration, in file order. */
  dStrongs: string[];
  /** Gloss of the first of those rows. */
  gloss?: string;
}

export interface Headword {
  /** Extended Strong's number, e.g. "H1004b", "H0430", "G2424". */
  eStrong: string;
  /** Simple Strong's number (at least four digits), e.g. "H1004", "G2424". */
  sStrong: string;
  /** Distinct lemma + transliteration pairs of the eStrong's rows, in file order. */
  forms: HeadwordForm[];
  /** Every dStrong of the eStrong, in file order. */
  dStrongs: string[];
}

/** "H1004", "H01004", "1004", "H1004b" -> "H1004"; "G02424", "G2424G" -> "G2424". No prefix means Hebrew. */
export function sStrongOf(strongs: string): string | undefined {
  const m = /^([HG])?0*(\d+)/i.exec(strongs.trim());
  return m ? `${(m[1] ?? 'H').toUpperCase()}${m[2].padStart(4, '0')}` : undefined;
}

type Lang = 'H' | 'G';
const LEXICON = { H: 'stepbible-tbesh', G: 'stepbible-tbesg' } as const;
const GEMATRIA = { H: computeHebrew, G: computeGreek } as const;
const built = new Map<Lang, { byNumber: Map<string, Headword[]>; eStrongOfDStrong: Map<string, string> }>();

const langOf = (strongs: string | undefined): Lang | undefined => {
  const c = strongs?.trim()[0]?.toUpperCase();
  return c === 'H' || c === 'G' ? c : undefined;
};

function variant(text: string, compute: (t: string) => GematriaTriple): HeadwordVariant {
  try {
    return { text, gematria: compute(text) };
  } catch {
    // computeGreek throws on an archaic letter (stigma, koppa, sampi): it has no ordinal.
    return { text };
  }
}

function build(lang: Lang): { byNumber: Map<string, Headword[]>; eStrongOfDStrong: Map<string, string> } {
  const done = built.get(lang);
  if (done) return done;
  const rows = lexiconRows(LEXICON[lang]);
  const compute = GEMATRIA[lang];
  const byNumber = new Map<string, Headword[]>();
  const eStrongOfDStrong = new Map<string, string>();
  const byEStrong = new Map<string, Headword>();
  // Object key order is the file order (keys are dStrongs, never integer-like).
  for (const [dStrong, row] of Object.entries(rows)) {
    if (!row.strongsExtended?.startsWith(lang)) continue;
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
        variants: row.lemma.split(',').map((t) => t.trim()).filter(Boolean).map((text) => variant(text, compute)),
        dStrongs: [],
        gloss: row.gloss,
      };
      hw.forms.push(form);
    }
    form.dStrongs.push(dStrong);
  }
  const out = { byNumber, eStrongOfDStrong };
  built.set(lang, out);
  return out;
}

/**
 * Every eStrong headword of a Strong's number, in lexicon file order (TBESH for
 * H, TBESG for G): headwordsForSStrong('H1004') -> [H1004a בֵּית bet, H1004b
 * בַּ֫יִת ba.yit]; headwordsForSStrong('G2424') -> [G2424 Ἰησοῦς Iēsous].
 * Accepts "H1004", "H01004", "1004" (Hebrew), "G2424", "G02424". Empty when the
 * lexicon has no row.
 */
export function headwordsForSStrong(strongs: string): Headword[] {
  const s = sStrongOf(strongs);
  return s ? build(s[0] as Lang).byNumber.get(s) ?? [] : [];
}

/** The eStrong a TBESH or TBESG dStrong maps to: "H1004M" -> "H1004b", "G2491K" -> "G2495". */
export function eStrongOfTag(dStrong: string): string | undefined {
  const lang = langOf(dStrong);
  return lang ? build(lang).eStrongOfDStrong.get(dStrong) : undefined;
}

/**
 * The eStrong of a word from hebrewVerseWords(): STEPBible's root tag mapped
 * through TBESH when the word has exactly one root tag with a TBESH row, else
 * the OHB eStrong when TBESH has that eStrong. Undefined otherwise.
 */
export function eStrongOfWord(word: Pick<HebrewWord, 'roots' | 'ohbEStrong'>): string | undefined {
  const { byNumber, eStrongOfDStrong } = build('H');
  if (word.roots?.length === 1) {
    const e = eStrongOfDStrong.get(word.roots[0]);
    if (e) return e;
  }
  const ohb = word.ohbEStrong;
  if (ohb && byNumber.get(sStrongOf(ohb)!)?.some((h) => h.eStrong === ohb)) return ohb;
  return undefined;
}

/**
 * The eStrong of a TAGNT word (a verse word of @metaxia/scriptures-source-
 * stepbible-tagnt-tr): TAGNT's dStrong mapped through TBESG when the word has
 * exactly one Strong's tag with a TBESG row ("G2424G" -> "G2424", "G2491K" ->
 * "G2495"), else TAGNT's extended Strong's number when TBESG has that eStrong
 * (e.g. a bare "G2453"). Undefined otherwise.
 */
export function eStrongOfGreekWord(word: Pick<SourceWord, 'strongs' | 'metadata'>): string | undefined {
  const { byNumber, eStrongOfDStrong } = build('G');
  if (word.strongs?.length === 1) {
    const e = eStrongOfDStrong.get(word.strongs[0]);
    if (e) return e;
  }
  const ext = word.metadata?.extendedStrongs;
  if (typeof ext === 'string' && byNumber.get(sStrongOf(ext)!)?.some((h) => h.eStrong === ext)) return ext;
  return undefined;
}
