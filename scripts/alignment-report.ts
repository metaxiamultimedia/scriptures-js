/**
 * Writes docs/tahot-alignment-report.md and docs/tahot-root-differences.tsv
 * (git-ignored; review copies are posted on the release MR):
 * how every OHB word of the Hebrew Bible was aligned to STEPBible's TAHOT,
 * what is left unaligned, where TAHOT's root differs from the OHB lemma, and
 * how the glosses change against the book's current method.
 *
 * The "current book" glosses follow gematriabible-bible populate-data.mjs on
 * main: the OHB root number with its letters dropped, looked up in the
 * eStrong-keyed TBESH file of lexicon 2.1.1 (H####, then H####a), and a
 * prefix-only lemma mapped through its last prefix code. Both methods are
 * applied to the same OHB words (this package's OHB version), so only the
 * tagging method differs.
 *
 * Usage: npm run report   (downloads lexicon 2.1.1's stepbible-tbesh.json from jsDelivr)
 */
import { writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';
import { getVerseWordsSync, metadata as tahotMeta, type TahotWord } from '@metaxia/scriptures-source-stepbible-tahot';
import { BOOKS } from '../src/books.js';
import { DATA_DIRS, chapterNumbers, lexiconRows, readVerse, verseNumbers } from '../src/data.js';
import { glossAligned, type HebrewWord } from '../src/hebrew.js';
import { assembleChapter, originalChapters, sharedEnglishVerses } from '../src/assemble.js';

const require = createRequire(import.meta.url);
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OLD_LEXICON_URL = 'https://cdn.jsdelivr.net/npm/@metaxia/scriptures-source-stepbible-lexicon@2.1.1/data/stepbible-tbesh.json';

import { existsSync, readFileSync } from 'fs';
const DATA_FILE: Record<string, string> = {
  '@metaxia/scriptures-source-openscriptures-ohb': 'openscriptures-OHB/metadata.json',
  '@metaxia/scriptures-source-stepbible-tahot': 'stepbible-augmented-strongs.json',
  '@metaxia/scriptures-source-stepbible-lexicon': 'stepbible-tbesh-rows.json',
};
/** Version of an installed package (its package.json is not exported, so walk up from a data file). */
function safeVersion(name: string): string {
  let dir = dirname(require.resolve(`${name}/data/${DATA_FILE[name]}`));
  while (!existsSync(join(dir, 'package.json'))) dir = dirname(dir);
  return JSON.parse(readFileSync(join(dir, 'package.json'), 'utf-8')).version;
}

// ---- the book's current gloss method ---------------------------------------
const BOOK_PREFIX: Record<string, string> = { b: 'H9003', c: 'H9002', d: 'H9009', k: 'H9004', l: 'H9005', m: 'H9006', s: 'H9007', i: 'H9008' };
function bookLemma(lemma: string): string | undefined {
  const num = lemma.replace(/^[a-z/]+/i, '').replace(/\D/g, '');
  if (num) return 'H' + num.padStart(5, '0');
  if (!/^[a-z](\/[a-z])*$/.test(lemma)) return undefined;
  const s = BOOK_PREFIX[lemma.split('/').pop()!];
  return s ? 'H' + s.slice(1).padStart(5, '0') : undefined;
}
function bookGloss(old: Record<string, { gloss?: string; strongsDisambiguated?: string }>, lemma: string) {
  const s = bookLemma(lemma);
  if (!s || s === 'H00000') return undefined;
  const n = parseInt(s.slice(1), 10);
  const four = 'H' + String(n).padStart(4, '0');
  const bare = 'H' + n;
  return old[s] ?? old[four] ?? old[bare] ?? old[four + 'a'] ?? old[bare + 'a'];
}

const simpleOf = (tag: string) => Number(/^H(\d+)/.exec(tag)?.[1]);
const ohbSimple = (lemma: string) => {
  const m = /^(\d+)/.exec(lemma.split('/').pop()!.trim());
  return m ? Number(m[1]) : undefined;
};
const ref = (b: string, c: number, v: number) => `${b} ${c}:${v}`;
const esc = (s: string) => s.replace(/\|/g, '\\|');

async function main() {
  const res = await fetch(OLD_LEXICON_URL);
  if (!res.ok) throw new Error(`download failed: ${OLD_LEXICON_URL}`);
  const oldLex = (await res.json()) as Record<string, { gloss?: string; strongsDisambiguated?: string }>;
  const tbesh = lexiconRows('stepbible-tbesh');
  const uBySimple = new Map<number, Set<string>>();
  for (const row of Object.values(tbesh)) {
    const n = simpleOf(row.strongsDisambiguated);
    const set = uBySimple.get(n) ?? new Set<string>();
    if (row.strongsUnified) set.add(row.strongsUnified);
    set.add(row.strongsDisambiguated);
    uBySimple.set(n, set);
  }

  const methods: Record<string, number> = {};
  let total = 0;
  const unaligned: Array<{ ref: string; w: HebrewWord }> = [];
  const augmented: Array<{ ref: string; w: HebrewWord }> = [];
  const ketivRootUnmarked: Array<{ ref: string; w: HebrewWord }> = [];
  const multiRoot: Array<{ ref: string; w: HebrewWord }> = [];
  const missingTags = new Map<string, { count: number; ex: string }>();
  const tahotUnused = new Map<string, { count: number; ex: string[] }>();
  const diffs: Array<{ ref: string; w: HebrewWord; type: string }> = [];
  const glossChanges = new Map<string, { count: number; ex: string; oldTag: string; newTag: string }>();
  let glossSame = 0, glossChanged = 0, glossNewOnly = 0, glossOldOnly = 0, glossNeither = 0;
  let prefixOnlyGiven = 0;
  const verseCountMismatch = { verses: 0 };
  let verses = 0;

  for (const b of BOOKS.filter((x) => x.testament === 'OT')) {
    for (const c of chapterNumbers(DATA_DIRS.ohb, b.osis)) {
      for (const v of verseNumbers(DATA_DIRS.ohb, b.osis, c)) {
        verses++;
        const src = readVerse(DATA_DIRS.ohb, b.osis, c, v)!;
        const tahot = getVerseWordsSync(b.osis, c, v);
        const words = glossAligned(src.words, tahot, `${b.osis}.${c}.${v}`);
        const r = ref(b.osis, c, v);
        if (src.words.filter((w) => w.variant !== 'ketiv').length !== tahot.length) verseCountMismatch.verses++;
        const used = new Set(words.map((w) => w.tahot?.ref).filter(Boolean));
        for (const t of tahot) {
          if (used.has(t.ref)) continue;
          const k = t.type.startsWith('X') ? 'X (LXX addition)' : t.type.startsWith('R') ? 'R (restored text)' : t.type.startsWith('V') ? 'V (variant reading)' : t.type.startsWith('Q') ? 'Q (Qere)' : 'L (Leningrad)';
          const e = tahotUnused.get(k) ?? { count: 0, ex: [] };
          e.count++;
          if (e.ex.length < 12) e.ex.push(`${t.ref} ${t.hebrew}`);
          tahotUnused.set(k, e);
        }
        for (const w of words) {
          total++;
          methods[w.method] = (methods[w.method] ?? 0) + 1;
          if (w.method === 'unaligned') unaligned.push({ ref: r, w });
          if (w.method === 'augmented') augmented.push({ ref: r, w });
          if (w.method === 'ketiv' && w.roots?.length === 0) ketivRootUnmarked.push({ ref: r, w });
          if ((w.roots?.length ?? 0) > 1) multiRoot.push({ ref: r, w });
          for (const g of [...(w.glosses?.prefixes ?? []), ...(w.glosses?.roots ?? []), ...(w.glosses?.suffixes ?? [])]) {
            if (g.gloss !== undefined) continue;
            const e = missingTags.get(g.tag) ?? { count: 0, ex: `${r} ${w.text}` };
            e.count++;
            missingTags.set(g.tag, e);
          }
          // Root differences (aligned words with TAHOT tags)
          if (w.roots && w.roots.length && w.method !== 'augmented') {
            const o = ohbSimple(w.lemma);
            if (o === undefined) {
              prefixOnlyGiven++;
            } else if (!w.roots.some((t) => simpleOf(t) === o)) {
              const row = tbesh[w.roots[0]];
              let type: string;
              if (w.roots.some((t) => simpleOf(t) >= 9000)) type = 'STEP tags a particle, prefix or suffix (H9xxx) as the root';
              else if (row && [...(uBySimple.get(o) ?? [])].some((u) => u === row.strongsUnified || u === row.strongsDisambiguated)) type = 'same unified word in STEP (spelling, form or Aramaic/Hebrew pair)';
              else if (row && (/Name/.test(row.relation ?? '') || /N-Pr/.test(row.morphology ?? '') || /(^|\/)Np/.test(String(w.source.morph ?? '').replace(/^H/, '')))) type = 'proper name: a different name number';
              else type = 'different word (STEP re-analysis of the root)';
              diffs.push({ ref: r, w, type });
            }
          }
          // Gloss changes against the book's current method
          const old = bookGloss(oldLex, w.lemma)?.gloss;
          const neu = w.gloss;
          if (old === undefined && neu === undefined) glossNeither++;
          else if (old === undefined) glossNewOnly++;
          else if (neu === undefined) glossOldOnly++;
          else if (old === neu) glossSame++;
          else {
            glossChanged++;
            const k = `${old}\u0000${neu}`;
            const e = glossChanges.get(k) ?? { count: 0, ex: `${r} ${w.text}`, oldTag: bookLemma(w.lemma) ?? '', newTag: (w.roots ?? []).join('+') };
            e.count++;
            glossChanges.set(k, e);
          }
        }
      }
    }
  }

  // Versification summary
  let englishOnly: string[] = [];
  let originalOnly = 0;
  const shared: string[] = [];
  for (const b of BOOKS.filter((x) => x.testament === 'OT')) {
    for (const c of originalChapters(b.osis)) {
      for (const v of assembleChapter(b.osis, c)) {
        if (v.kind === 'english-only') englishOnly.push(`KJV ${b.osis} ${v.english!.chapter}:${v.english!.verse}`);
        if (v.kind === 'original-only') originalOnly++;
      }
    }
    for (const [k, refs] of sharedEnglishVerses(b.osis)) shared.push(`KJV ${b.osis} ${k} <- Hebrew ${refs.map((x) => `${x.chapter}:${x.verse}`).join(' + ')}`);
  }

  // ---- write ------------------------------------------------------------------
  const pct = (n: number) => `${((100 * n) / total).toFixed(3)}%`;
  const L: string[] = [];
  L.push('# TAHOT alignment report', '');
  L.push('Generated by `npm run report` (`scripts/alignment-report.ts`). Do not edit by hand.', '');
  L.push('Every word of the Open Hebrew Bible (OHB) is aligned to STEPBible\'s TAHOT so that it takes STEPBible\'s own tags (dStrong for prefixes, root and suffixes), and its gloss is the TBESH row of that exact dStrong. The methods, in order, are described in `src/tahot-align.ts`; only STEPBible\'s data and documented methods decide a word.', '');
  L.push('## Data', '');
  L.push(`- OHB: \`@metaxia/scriptures-source-openscriptures-ohb\` ${safeVersion('@metaxia/scriptures-source-openscriptures-ohb')}`);
  L.push(`- TAHOT: \`@metaxia/scriptures-source-stepbible-tahot\` ${safeVersion('@metaxia/scriptures-source-stepbible-tahot')} (STEPBible-Data be4191f0; augmented_strongs.txt STEPBible/step 5ffb3798)`);
  L.push(`- TBESH: \`@metaxia/scriptures-source-stepbible-lexicon\` ${safeVersion('@metaxia/scriptures-source-stepbible-lexicon')} (dStrong-keyed rows)`);
  L.push(`- Current book glosses: lexicon 2.1.1 \`stepbible-tbesh.json\` with the book's lookup (see the script header)`, '');
  L.push('## Counts by alignment method', '');
  L.push(`${total.toLocaleString('en-US')} OHB words in ${verses.toLocaleString('en-US')} verses.`, '');
  L.push('| Method | Words | Share | Meaning |', '|---|---:|---:|---|');
  const meaning: Record<string, string> = {
    position: 'Same Hebrew reference and TAHOT word number (Ketiv-text numbering), same consonants',
    ketiv: 'OHB Ketiv word: the TAHOT Qere row that records this Ketiv (K= / L=)',
    instance: 'sStrong + instance (TinyURL.com/UpgradingTags)',
    augmented: 'augmented_strongs.txt (verse/occurrence, else the * default): root dStrong only',
    unaligned: 'Not decided by STEPBible\'s data: keeps the OHB eStrong, flagged',
  };
  for (const m of ['position', 'ketiv', 'instance', 'augmented', 'unaligned']) L.push(`| ${m} | ${(methods[m] ?? 0).toLocaleString('en-US')} | ${pct(methods[m] ?? 0)} | ${meaning[m]} |`);
  L.push('');
  L.push(`Verses where the OHB reading (without Ketiv words) and TAHOT have a different number of words: ${verseCountMismatch.verses.toLocaleString('en-US')}. Most of them still align word by word; the words that do not are listed below.`, '');

  L.push('## Words not decided by TAHOT', '');
  L.push(`### Unaligned (${unaligned.length})`, '', 'These keep the OHB eStrong and are flagged. Each needs a decision.', '');
  L.push('| Verse | Word | OHB lemma | K/Q | Reason |', '|---|---|---|---|---|');
  for (const { ref: r, w } of unaligned) L.push(`| ${r} | ${w.position} ${w.text} | ${w.lemma} | ${w.variant ?? ''} | ${esc(w.note ?? '')} |`);
  L.push('', `### Aligned by augmented_strongs.txt (${augmented.length})`, '', 'STEPBible\'s documented fallback gives a root dStrong but no TAHOT word, so these have no prefix or suffix tags. "plain Strong\'s number" means the table has no entry for the number, which STEPBible then uses unaugmented.', '');
  L.push('| Verse | Word | OHB lemma | Root dStrong | Gloss | Why not by instance; how resolved |', '|---|---|---|---|---|---|');
  for (const { ref: r, w } of augmented) L.push(`| ${r} | ${w.position} ${w.text} | ${w.lemma} | ${(w.roots ?? []).join(', ')} | ${esc(w.gloss ?? '')} | ${esc(w.note ?? '')} |`);
  L.push('', `### Ketiv words whose TAHOT tags mark no root (${ketivRootUnmarked.length})`, '', 'TAHOT gives these Ketiv words their own tags, but none is marked as the root and none has the OHB root number, so no gloss is chosen.', '');
  for (const { ref: r, w } of ketivRootUnmarked) L.push(`- ${r} ${w.position} ${w.text} (${w.lemma}): ${esc(w.note ?? '')}`);
  L.push('', `### Words with several roots (${multiRoot.length})`, '', 'TAHOT gives more than one root (e.g. a Qere of two words in one row, or a compound). `gloss` is left undefined; the glosses of every root are in `glosses.roots`.', '');
  for (const { ref: r, w } of multiRoot.slice(0, 60)) L.push(`- ${r} ${w.position} ${w.text}: ${w.tahot?.dStrongs ?? (w.roots ?? []).join(', ')}`);
  if (multiRoot.length > 60) L.push(`- ... and ${multiRoot.length - 60} more`);
  L.push('', '### TAHOT words with no OHB word', '', 'TAHOT words that no OHB word aligned to. X and R are STEPBible\'s additions to the Leningrad text; the rest follow from the unaligned words above.', '');
  L.push('| Type | Words | Examples |', '|---|---:|---|');
  for (const [k, e] of [...tahotUnused].sort((a, b) => b[1].count - a[1].count)) L.push(`| ${k} | ${e.count} | ${esc(e.ex.join('; '))} |`);
  L.push('', `### Tags with no TBESH row (${missingTags.size})`, '');
  if (missingTags.size === 0) L.push('Every tag used by an aligned word has a TBESH row.');
  for (const [tag, e] of [...missingTags].sort((a, b) => b[1].count - a[1].count)) L.push(`- ${tag}: ${e.count} words, e.g. ${e.ex}`);

  L.push('', '## TAHOT root differs from the OHB lemma', '');
  L.push(`${diffs.length.toLocaleString('en-US')} aligned words have a TAHOT root whose Strong's number differs from the OHB lemma's. Ben chose STEPBible's tags, so these follow TAHOT. Every word is listed in \`docs/tahot-root-differences.tsv\`. Separately, ${prefixOnlyGiven.toLocaleString('en-US')} OHB prefix-only lemmas (e.g. \`l\` for לָנוּ) get a TAHOT root such as H9035.`, '');
  const byType = new Map<string, typeof diffs>();
  for (const d of diffs) byType.set(d.type, [...(byType.get(d.type) ?? []), d]);
  for (const [type, list] of [...byType].sort((a, b) => b[1].length - a[1].length)) {
    L.push(`### ${type} (${list.length})`, '');
    const pairs = new Map<string, { count: number; ex: string; ohbGloss?: string; newGloss?: string }>();
    for (const d of list) {
      const k = `H${ohbSimple(d.w.lemma)} → ${(d.w.roots ?? []).join('+')}`;
      const e = pairs.get(k) ?? { count: 0, ex: `${d.ref} ${d.w.text}`, ohbGloss: bookGloss(oldLex, d.w.lemma)?.gloss, newGloss: d.w.gloss };
      e.count++;
      pairs.set(k, e);
    }
    L.push('| OHB → TAHOT root | Words | Example | Gloss before → after |', '|---|---:|---|---|');
    for (const [k, e] of [...pairs].sort((a, b) => b[1].count - a[1].count).slice(0, 15)) L.push(`| ${k} | ${e.count} | ${e.ex} | ${esc(e.ohbGloss ?? '')} → ${esc(e.newGloss ?? '')} |`);
    if (pairs.size > 15) L.push('', `${pairs.size - 15} more pairs in the TSV.`);
    L.push('');
  }

  L.push('## Gloss changes against the current book', '');
  L.push(`Same gloss: ${glossSame.toLocaleString('en-US')}. Changed: ${glossChanged.toLocaleString('en-US')}. Gloss only now: ${glossNewOnly.toLocaleString('en-US')}. Gloss only before: ${glossOldOnly.toLocaleString('en-US')} (unaligned, augmented-without-row or several roots). Neither: ${glossNeither.toLocaleString('en-US')}.`, '');
  L.push('Top 30 changes:', '', '| Words | Before (book tag) | After (TAHOT root) | Example |', '|---:|---|---|---|');
  for (const [k, e] of [...glossChanges].sort((a, b) => b[1].count - a[1].count).slice(0, 30)) {
    const [o, n] = k.split('\u0000');
    L.push(`| ${e.count.toLocaleString('en-US')} | ${esc(o)} (${e.oldTag}) | ${esc(n)} (${e.newTag}) | ${e.ex} |`);
  }

  L.push('', '## Versification (TVTMS via mapVerse)', '');
  L.push(`- Hebrew verses with no KJV verse (Psalm titles and similar): ${originalOnly}`);
  L.push(`- KJV verses with no Hebrew verse (explicit english-only records): ${englishOnly.join(', ')}`);
  L.push(`- KJV verses that TVTMS maps from two Hebrew verses (the KJV text is paired with both): ${shared.join('; ')}`);
  L.push('');
  L.push(`Sources: ${tahotMeta.name}, ${tahotMeta.license}, ${tahotMeta.source}.`, '');

  mkdirSync(join(ROOT, 'docs'), { recursive: true });
  writeFileSync(join(ROOT, 'docs', 'tahot-alignment-report.md'), L.join('\n'));
  const tsv = ['verse\tposition\tword\tohb_lemma\ttahot_ref\ttahot_dstrongs\ttype\tgloss_before\tgloss_after'];
  for (const d of diffs) tsv.push([d.ref, d.w.position, d.w.text, d.w.lemma, d.w.tahot?.ref ?? '', d.w.tahot?.dStrongs ?? '', d.type, bookGloss(oldLex, d.w.lemma)?.gloss ?? '', d.w.gloss ?? ''].join('\t'));
  writeFileSync(join(ROOT, 'docs', 'tahot-root-differences.tsv'), tsv.join('\n') + '\n');
  console.log(methods, 'diffs', diffs.length, 'changed glosses', glossChanged);
}

main().catch((e) => { console.error(e); process.exit(1); });
