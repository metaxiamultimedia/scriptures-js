/**
 * Align the words of the Open Hebrew Bible (OHB, from the WLC) to STEPBible's
 * TAHOT, so each OHB word takes STEPBible's own tags (dStrong for prefixes,
 * root and suffixes) and its gloss comes from the TBESH row of that dStrong.
 *
 * Only STEPBible's data and STEPBible's documented methods decide a word:
 *
 *  1. "position": same Hebrew reference and same word number. TAHOT numbers
 *     words in the Ketiv text (TAHOT field description), so the OHB word number
 *     is counted the same way: every OHB word except Qere words. A Qere word
 *     takes the number of the Ketiv word it replaces. The two words must have
 *     the same consonants. An OHB Ketiv word agrees with the TAHOT row whose
 *     Ketiv (recorded by TAHOT as "K=" or as the Leningrad "L=" spelling) has
 *     the same consonants.
 *  2. "instance": STEPBible's sStrong + instance method
 *     (TinyURL.com/UpgradingTags), steps 1, 2 and 4: the OHB word's simple
 *     Strong's number and its instance in the verse against TAHOT's
 *     "Root dStrong+Instance" and "Alternative Strongs+Instance" columns.
 *  3. "augmented": STEPBible's augmented_strongs.txt for the verse and the
 *     occurrence, else its "*" default. This gives a root dStrong only.
 *
 * Every other word is "unaligned": it keeps the OHB eStrong and a reason.
 */

import { parseDStrongs } from '@metaxia/scriptures-source-stepbible-tahot';
import type { TahotWord, AugmentedResolution } from '@metaxia/scriptures-source-stepbible-tahot';

/** The fields of an OHB word that alignment reads. */
export interface OhbWord {
  position: number;
  text: string;
  lemma: string;
  morph?: string;
  variant?: 'ketiv' | 'qere';
}

export type AlignMethod = 'position' | 'ketiv' | 'instance' | 'augmented' | 'unaligned';

export interface AlignedWord {
  /** OHB word number in the verse. */
  position: number;
  text: string;
  /** OHB lemma as given (prefix codes and eStrong), e.g. "c/d/1540". */
  lemma: string;
  variant?: 'ketiv' | 'qere';
  method: AlignMethod;
  /** The TAHOT word this OHB word was aligned to (absent for "augmented" and "unaligned"). */
  tahot?: Pick<TahotWord, 'ref' | 'word' | 'type' | 'hebrew' | 'dStrongs'>;
  /** STEPBible dStrongs. For "augmented" only `roots` is set; for "unaligned" none. */
  prefixes?: string[];
  roots?: string[];
  suffixes?: string[];
  /** The OHB eStrong of the root, e.g. "H1540", "H1004b"; undefined for prefix-only lemmas. */
  ohbEStrong?: string;
  /**
   * TAHOT's Transliteration column for the TAHOT word this OHB word was aligned
   * to, unchanged (e.g. "va/i.Yo.mer"; "/" between prefixes, root and suffixes as
   * STEPBible writes it). For a Qere row it is the Qere reading, also on the
   * Ketiv word that shares the row (see `ketivTransliteration`). For one word of
   * a Qere that TAHOT prints as one row with "//" between the words, it is that
   * word's part. Undefined for "augmented" and "unaligned" words.
   */
  transliteration?: string;
  /**
   * The Ketiv's transliteration as TAHOT records it for a Qere row
   * ("K= translit (HEBREW) ..." in the meaning-variants column). Set on every OHB
   * word aligned to such a row (the Ketiv and its Qere). Undefined when TAHOT
   * gives no K= (e.g. a "Q(k)" spelling variant).
   */
  ketivTransliteration?: string;
  /** Where `transliteration` comes from: STEPBible TAHOT, or nothing ("none") when the word has no TAHOT row. */
  transliterationSource: 'stepbible-tahot' | 'none';
  /** Why the word is unaligned, or a note on how it was aligned. */
  note?: string;
}

/** Hebrew consonants only (U+05D0–U+05EA): no points, accents, punctuation or separators. */
export function consonants(text: string): string {
  return text.replace(/[^א-ת]/g, '');
}

/**
 * Consonants of a TAHOT word, without its punctuation: TAHOT writes
 * punctuation after "\\", including the paragraph marks ס and פ (H9018/H9019).
 */
export function tahotConsonants(row: Pick<TahotWord, 'hebrew'>): string {
  return consonants(row.hebrew.split('\\')[0]);
}

/** Root part of an OHB lemma: "c/d/1540" -> "1540"; "1004 b" -> "1004 b"; "l" -> undefined. */
function ohbRoot(lemma: string): string | undefined {
  const last = lemma.split('/').pop()!.trim();
  return /^\d/.test(last) ? last : undefined;
}

/** OHB eStrong: "1004 b" -> "H1004b", "1540" -> "H1540". */
export function ohbEStrong(lemma: string): string | undefined {
  const root = ohbRoot(lemma);
  if (!root) return undefined;
  const m = /^(\d+)\s*([a-z])?/.exec(root);
  return m ? `H${m[1].padStart(4, '0')}${m[2] ?? ''}` : undefined;
}

/** OHB sStrong number: "1004 b" -> 1004. */
function ohbSimple(lemma: string): number | undefined {
  const root = ohbRoot(lemma);
  const m = root ? /^(\d+)/.exec(root) : null;
  return m ? Number(m[1]) : undefined;
}

/**
 * The Ketiv text TAHOT records for a Qere row: "K= translit (HEBREW) ..." in
 * the meaning-variants column, ";K= HEBREW" in the spelling-variants column,
 * and the Leningrad spelling "L= HEBREW" (the Ketiv letters with Qere points).
 */
export function ketivForms(row: TahotWord): string[] {
  const forms: string[] = [];
  const meaning = /(?:^|;)\s*K=\s*[^(]*\(([^)]*)\)/.exec(row.meaningVariants);
  if (meaning) forms.push(meaning[1]);
  for (const m of row.spellingVariants.matchAll(/(?:^|;)\s*([KL])=\s*([^¦;]+)/g)) forms.push(m[2]);
  return forms.map(consonants).filter(Boolean);
}

/** The Ketiv's transliteration as TAHOT records it: K= translit (HEBREW) ...; undefined when there is no K=. */
export function ketivTransliteration(row: Pick<TahotWord, 'meaningVariants'>): string | undefined {
  const m = /(?:^|;)\s*K=\s*([^(]*)\(/.exec(row.meaningVariants);
  const t = m?.[1].trim();
  return t ? t : undefined;
}

/** The Ketiv's own tags as TAHOT records them: K= translit (HEBREW) "gloss" (TAGS=GRAMMAR). */
export function ketivTags(row: TahotWord): string | undefined {
  const m = /(?:^|;)\s*K=\s*[^(]*\([^)]*\)\s*"[^"]*"\s*\(([^)=]*)=/.exec(row.meaningVariants);
  return m ? m[1].trim() : undefined;
}

interface InstanceEntry {
  simple: number;
  /** 0 when no instance letter; 1 for A/a, 2 for B/b, ... */
  order: number;
  upper: boolean;
  hasInstance: boolean;
  row: TahotWord;
}

/** Entries of TAHOT's "Root dStrong+Instance" and "Alternative Strongs+Instance" columns for a verse. */
function instanceEntries(rows: TahotWord[]): InstanceEntry[] {
  const out: InstanceEntry[] = [];
  for (const row of rows) {
    for (const col of [row.rootInstance, row.alternatives]) {
      for (const item of col.split(/[,;]\s*|\s+/)) {
        const m = /^H(\d+)[A-Za-z]*(?:_([A-Za-z]))?$/.exec(item.trim());
        if (!m) continue;
        const letter = m[2];
        out.push({
          simple: Number(m[1]),
          order: letter ? letter.toUpperCase().charCodeAt(0) - 64 : 0,
          upper: letter ? letter === letter.toUpperCase() : true,
          hasInstance: Boolean(letter),
          row,
        });
      }
    }
  }
  return out;
}

export type AugmentedResolver = (sStrong: string, osisRef: string, occurrence: number) => AugmentedResolution;

/**
 * Align one verse. `osisRef` is the Hebrew reference in OSIS form ("Deut.29.28"),
 * used for augmented_strongs.txt. `hasDStrong` tells whether TBESH has a row
 * for a tag (used when augmented_strongs.txt has no entry for a number, so the
 * plain Strong's number is the tag).
 */
export function alignVerse(
  ohb: OhbWord[],
  tahot: TahotWord[],
  osisRef: string,
  resolveAugmented: AugmentedResolver,
  hasDStrong: (tag: string) => boolean,
): AlignedWord[] {
  const result: AlignedWord[] = ohb.map((w) => ({
    position: w.position,
    text: w.text,
    lemma: w.lemma,
    ...(w.variant ? { variant: w.variant } : {}),
    method: 'unaligned' as AlignMethod,
    ohbEStrong: ohbEStrong(w.lemma),
    transliterationSource: 'none' as const,
  }));
  const taken = new Map<TahotWord, number>();
  const assign = (i: number, row: TahotWord, method: AlignMethod, note?: string) => {
    const r = result[i];
    r.method = method;
    r.tahot = { ref: row.ref, word: row.word, type: row.type, hebrew: row.hebrew, dStrongs: row.dStrongs };
    r.prefixes = row.prefixes;
    r.roots = row.roots;
    r.suffixes = row.suffixes;
    r.transliteration = row.transliteration;
    r.transliterationSource = 'stepbible-tahot';
    const kt = row.type.startsWith('Q') ? ketivTransliteration(row) : undefined;
    if (kt !== undefined) r.ketivTransliteration = kt;
    if (note) r.note = note;
    // A Ketiv shares its TAHOT row with the Qere that TAHOT prints.
    if (method !== 'ketiv') taken.set(row, i);
  };

  // --- Word numbers in the Ketiv text (TAHOT's numbering) ------------------
  const ketivNumber: Array<number | undefined> = new Array(ohb.length).fill(undefined);
  let n = 0;
  for (let i = 0; i < ohb.length; i++) {
    if (ohb[i].variant !== 'qere') ketivNumber[i] = ++n;
  }
  for (let i = 0; i < ohb.length; ) {
    if (ohb[i].variant !== 'qere') { i++; continue; }
    let j = i;
    while (j < ohb.length && ohb[j].variant === 'qere') j++;
    let k = i;
    while (k > 0 && ohb[k - 1].variant === 'ketiv') k--;
    const ketiv = i - k;
    if (ketiv === j - i) for (let q = 0; q < ketiv; q++) ketivNumber[i + q] = ketivNumber[k + q];
    i = j;
  }

  const byNumber = new Map<number, TahotWord>();
  for (const row of tahot) if (/^\d{2}$/.test(row.word)) byNumber.set(Number(row.word), row);

  // --- 1. Position ----------------------------------------------------------
  for (let i = 0; i < ohb.length; i++) {
    const num = ketivNumber[i];
    const row = num === undefined ? undefined : byNumber.get(num);
    const w = ohb[i];
    if (w.variant === 'ketiv' && !row) {
      result[i].note = 'TAHOT has no word with this Ketiv word number';
      continue;
    }
    if (!row || taken.has(row)) continue;
    if (w.variant === 'ketiv') {
      if (!row.type.startsWith('Q') || !ketivForms(row).includes(consonants(w.text))) {
        result[i].note = `TAHOT records no Ketiv with these consonants at word #${String(num).padStart(2, '0')}`;
        continue;
      }
      assign(i, row, 'ketiv');
      const tags = ketivTags(row);
      if (tags !== undefined) {
        // TAHOT gives the Ketiv its own tags; the root is the one tag in braces,
        // or the tag whose simple number is the OHB root's.
        const parts = tags.split(/\/+|\\/).map((t) => t.trim()).filter(Boolean);
        const braced = parts.filter((t) => t.startsWith('{')).map((t) => t.replace(/[{}+]/g, ''));
        const simple = ohbSimple(w.lemma);
        const bySimple = parts.map((t) => t.replace(/[{}+]/g, '')).filter((t) => {
          const m = /^H(\d+)/.exec(t);
          return m && simple !== undefined && Number(m[1]) === simple;
        });
        const roots = braced.length ? braced : bySimple.length === 1 ? bySimple : [];
        result[i].prefixes = undefined;
        result[i].suffixes = undefined;
        result[i].roots = roots;
        result[i].note = roots.length
          ? `Ketiv tags from TAHOT: ${tags}`
          : `Ketiv tags from TAHOT: ${tags}; root not marked`;
      } else {
        result[i].note = 'Ketiv is a spelling variant (lower-case k) of this TAHOT word; its tags apply';
      }
      continue;
    }
    if (consonants(w.text) === tahotConsonants(row)) assign(i, row, 'position');
  }

  // A Qere of several words that TAHOT prints as one row with "//" between the
  // words (e.g. Gen 30:11 בָּ֣א//גָ֑ד for Ketiv בגד): word k of the Qere is part k.
  for (let i = 0; i < ohb.length; ) {
    if (ohb[i].variant !== 'qere' || ketivNumber[i] !== undefined || result[i].method !== 'unaligned') { i++; continue; }
    let j = i;
    while (j < ohb.length && ohb[j].variant === 'qere') j++;
    const k = i - 1;
    const row = k >= 0 && ohb[k].variant === 'ketiv' ? byNumber.get(ketivNumber[k]!) : undefined;
    if (row && row.type.startsWith('Q') && !taken.has(row)) {
      const parts = row.hebrew.split('\\')[0].split('//');
      const tagParts = row.dStrongs.split('\\')[0].split('//');
      const translitParts = row.transliteration.split('//');
      if (parts.length === j - i && tagParts.length === parts.length &&
          parts.every((p, q) => consonants(p) === consonants(ohb[i + q].text))) {
        for (let q = 0; q < parts.length; q++) {
          assign(i + q, row, 'position', `part ${q + 1} of ${parts.length} of TAHOT word #${row.word}`);
          const tags = parseDStrongs(tagParts[q]);
          result[i + q].prefixes = tags.prefixes;
          result[i + q].roots = tags.roots;
          result[i + q].suffixes = tags.suffixes;
          // TAHOT writes "//" between the words in the Transliteration column too.
          if (translitParts.length === parts.length) result[i + q].transliteration = translitParts[q];
          else {
            result[i + q].transliteration = undefined;
            result[i + q].transliterationSource = 'none';
          }
        }
      }
    }
    i = j;
  }

  // --- 2. sStrong + instance (UpgradingTags) ---------------------------------
  const reading = ohb.map((w, i) => ({ w, i })).filter(({ w }) => w.variant !== 'ketiv');
  const entries = instanceEntries(tahot);
  const textBySimple = new Map<number, number[]>();
  for (const { w, i } of reading) {
    const s = ohbSimple(w.lemma);
    if (s === undefined) continue;
    textBySimple.set(s, [...(textBySimple.get(s) ?? []), i]);
  }
  const instanceOf = new Map<number, number>(); // OHB index -> occurrence (1-based) in the reading
  for (const indices of textBySimple.values()) indices.forEach((i, k) => instanceOf.set(i, k + 1));

  for (const [s, indices] of textBySimple) {
    const data = entries.filter((e) => e.simple === s).sort((a, b) => a.order - b.order);
    let targets: TahotWord[] | undefined;
    let why = '';
    if (data.length === 1 && !data[0].hasInstance && indices.length === 1) {
      targets = [data[0].row];
    } else if (data.length === indices.length && data.length > 0 && data.every((e) => e.upper)) {
      targets = data.map((e) => e.row);
    } else if (data.some((e) => !e.upper)) {
      const upper = data.filter((e) => e.upper);
      if (upper.length === indices.length) targets = upper.map((e) => e.row);
      else why = `H${s}: ${indices.length} in OHB, ${upper.length} upper-case of ${data.length} in TAHOT (manual check per UpgradingTags)`;
    } else {
      why = data.length === 0
        ? `H${s}: not in TAHOT's verse tags`
        : `H${s}: ${indices.length} in OHB, ${data.length} in TAHOT`;
    }
    indices.forEach((i, k) => {
      if (result[i].method !== 'unaligned') return;
      const row = targets?.[k];
      if (!row) { result[i].note = why; return; }
      const holder = taken.get(row);
      if (holder !== undefined) {
        result[i].note = `H${s} instance points to TAHOT #${row.word}, already aligned to OHB word ${ohb[holder].position}`;
        return;
      }
      assign(i, row, 'instance');
    });
  }

  // --- 3. augmented_strongs.txt ---------------------------------------------
  for (const { w, i } of reading) {
    if (result[i].method !== 'unaligned') continue;
    const s = ohbSimple(w.lemma);
    if (s === undefined) {
      result[i].note = result[i].note ?? 'prefix-only lemma: no Strong\'s number for the instance or augmented methods';
      continue;
    }
    const sStrong = `H${String(s).padStart(4, '0')}`;
    const res = resolveAugmented(sStrong, osisRef, instanceOf.get(i)!);
    if (res.conflicting) {
      result[i].note = `${result[i].note ? result[i].note + '; ' : ''}augmented_strongs lists ${res.conflicting.join(', ')} for this occurrence`;
      continue;
    }
    const dStrong = res.via === 'none' ? (hasDStrong(sStrong) ? sStrong : undefined) : res.dStrong;
    if (!dStrong) {
      result[i].note = `${result[i].note ? result[i].note + '; ' : ''}no augmented Strong's entry and no TBESH row ${sStrong}`;
      continue;
    }
    result[i].method = 'augmented';
    result[i].roots = [dStrong];
    result[i].note = `${result[i].note ? result[i].note + '; ' : ''}augmented_strongs ${res.via === 'reference' ? 'lists this verse' : res.via === 'default' ? 'default' : 'has no entry; plain Strong\'s number'}`;
  }

  return result;
}
