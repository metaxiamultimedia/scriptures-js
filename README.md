# scriptures-js

**A batteries-included JavaScript library for working with biblical scriptures, morphology, and lexicons.**

This package provides a complete, ready-to-use solution for scripture analysis by bundling the core library with all official data sources.

It powers [GematriaBible.com](https://gematriabible.com) — an interlinear Bible with gematria values and Strong's numbers.

## Included Packages

| Package | Description |
|---------|-------------|
| [`@metaxia/scriptures-core`](https://github.com/metaxiamultimedia/scriptures-js-core) | Core API, gematria, morphology parsing, registry |
| [`@metaxia/scriptures-source-openscriptures-ohb`](https://github.com/metaxiamultimedia/scriptures-js-source-openscriptures-ohb) | Hebrew Bible (Open Scriptures Project) |
| [`@metaxia/scriptures-source-crosswire-kjv`](https://github.com/metaxiamultimedia/scriptures-js-source-crosswire-kjv) | King James Version (CrossWire) |
| [`@metaxia/scriptures-source-stepbible-tagnt-tr`](https://github.com/metaxiamultimedia/scriptures-js-source-stepbible-tagnt-tr) | Greek New Testament (STEP Bible TAGNT, Textus Receptus) |
| [`@metaxia/scriptures-source-stepbible-lexicon`](https://github.com/metaxiamultimedia/scriptures-js-source-stepbible-lexicon) | Hebrew & Greek lexicons (STEP Bible) |
| [`@metaxia/scriptures-source-stepbible-versification`](https://github.com/metaxiamultimedia/scriptures-js-source-stepbible-versification) | Cross-tradition versification (MT / LXX / English), STEPBible TVTMS |
| [`@metaxia/scriptures-source-stepbible-tahot`](https://github.com/metaxiamultimedia/scriptures-js-source-stepbible-tahot) | Hebrew OT word tags (STEP Bible TAHOT): dStrong for every prefix, root and suffix |

## Breaking changes in 3.0.0

- **OHB 3.0.0.** This release depends on
  `@metaxia/scriptures-source-openscriptures-ohb` 3.0.0. Its marks are now
  separate `metadata.sequence` items, and the fields `words[].metadata.joinNext`,
  `metadata.paseq`, `metadata.paragraphBreaks`, `metadata.terminator`,
  `metadata.scribalMarks` and the received-tradition special letters and
  points are removed. OHB words reach you unchanged through `getVerse()` and
  through `hebrewVerseWords()`'s `source` field, so code that read those fields
  must move to `sequence`. See OHB's
  [Changes in 3.0.0](https://github.com/metaxiamultimedia/scriptures-js-source-openscriptures-ohb#changes-in-300).
- The received special letters and points are no longer OHB data; the cited
  `minchat-shai` profile below (`getMarks`, `compareProfiles`) carries them.

## STEPBible word tags and verse assembly

Each Open Hebrew Bible word takes STEPBible's own tags from TAHOT (prefix, root
and suffix dStrongs), with its gloss from the TBESH row of that exact tag.
Chapters are assembled with their KJV verses through TVTMS.

```typescript
import { hebrewVerseWords, assembleChapter } from '@metaxia/scriptures';

const words = hebrewVerseWords('Deut', 29, 28);
// words[3]: { text: 'וְהַנִּגְלֹ֞ת', method: 'position', prefixes: ['H9002', 'H9009'],
//             roots: ['H1540H'], suffixes: [], gloss: 'to reveal: reveal', flagged: false,
//             source: { ...the OHB word } }

// Original-language verses of a chapter paired with KJV verses through TVTMS,
// with explicit records for KJV verses that have no Hebrew verse (e.g. Neh 7:68).
const verses = assembleChapter('Nehemiah', 7);
```

| export | |
|---|---|
| `hebrewVerseWords(book, chapter, verse)` | OHB words of a Hebrew-numbered verse, aligned to TAHOT and glossed from TBESH (`HebrewWord[]`) |
| `glossTags(tags)` | TBESH gloss of each dStrong |
| `assembleChapter(book, chapter)` | original-language verses paired with KJV verses (`AssembledVerse[]`) |
| `originalChapters(book)` | original-language chapter numbers of a book |
| `sharedEnglishVerses(book)` | KJV verses that more than one original verse maps to |
| `alignVerse(...)`, `consonants(text)`, `ohbEStrong(lemma)` | the alignment itself and its helpers |
| `headwordsForSStrong(strongs)`, `eStrongOfWord(word)`, `eStrongOfGreekWord(word)`, `eStrongOfTag(dStrong)` | TBESH (H) or TBESG (G) headwords of a Strong's number, one per eStrong |
| `BOOKS`, `bookInfo(book)` | book names, OSIS codes and testaments |

### Transliteration (new in 3.1.0)

Each word carries TAHOT's own transliteration of the TAHOT word it is aligned
to, unchanged:

| field | |
|---|---|
| `transliteration` | TAHOT's Transliteration column, e.g. Gen 1:3 `va/i.Yo.mer`, Gen 6:21 `ve./la./Hem`. For a Qere row it is the Qere reading (also on the Ketiv word that shares the row). |
| `ketivTransliteration` | the Ketiv's transliteration that TAHOT records with `K=` on a Qere row (e.g. Gen 24:33 `va/i.yi.sem`); undefined when there is no `K=` |
| `transliterationSource` | `'stepbible-tahot'`, or `'none'` for the words with no TAHOT row (63 words: 40 outside Qere, listed in `tests/fixtures/transliteration-uncovered.json`) |

The library returns TAHOT's value unchanged in these fields, for every word,
including the divine name (TAHOT `Yah.weh`). `transliterate()` (SBL rules, from
scriptures-core) is still exported and is not used for these fields.

### Strong's headwords (new in 3.1.0)

`headwordsForSStrong('H1004')` returns one headword per extended Strong's
number (eStrong) of the number, in TBESH file order: `H1004a` בֵּית `bet` and
`H1004b` בַּ֫יִת `ba.yit`. Each headword lists the distinct lemma and
transliteration pairs of its TBESH rows (`forms`), with the dStrongs of each.
A lemma written as a comma list names spelling variants of a name; each variant
has its own gematria (`variants[].gematria`, scriptures-core `computeHebrew`),
and the values are never added together. `eStrongOfWord(word)` gives the eStrong
of a word from STEPBible's root tag (through TBESH), else from the OHB eStrong.

Greek numbers work the same way from TBESG (new in 3.2.0):
`headwordsForSStrong('G2424')` gives `G2424` Ἰησοῦς `Iēsous`, gematria 888
(scriptures-core `computeGreek`). TBESG's eStrongs have no sense letters, so
each G number has one headword; its rows can give more than one lemma (G4672
Σολομών, Σαλωμών and Σολομών; G1086 Γερασηνός and Γεργεσηνός), and all are
listed, including TBESG's `[unnamed]` rows for relatives of a named person
(G4074 "wife of Peter"). `eStrongOfGreekWord(word)` gives the eStrong of a TAGNT
word from its dStrong (through TBESG), else from TAGNT's extended Strong's
number. A variant whose gematria scriptures-core cannot compute has no
`gematria` (only G5516 χξϛ, whose stigma has no ordinal).

Words are aligned by Hebrew reference and TAHOT word number, then by
STEPBible's sStrong + instance method, then by STEPBible's augmented Strong's
table. A word none of these decides keeps its OHB Strong's number and is
flagged (`method: 'unaligned'`, with a `note`). See `src/tahot-align.ts`.
`npm run report` writes a full alignment report and the list of TAHOT-vs-OHB
root differences to `docs/` (not committed).

## Installation

```bash
npm install @metaxia/scriptures
```

## Usage

```typescript
import { getVerse, gematria, lookupStrongs } from '@metaxia/scriptures';

// All sources are auto-registered and ready to use
const verse = await getVerse('Genesis', 1, 1, { edition: 'openscriptures-OHB' });
const value = gematria.compute(verse.text, { language: 'hebrew', method: 'standard' });
const definition = await lookupStrongs('H7225');
```

## Gematria

The gematria system supports Hebrew, Greek, and English calculations with multiple methods.

### Hebrew Gematria

| Method | Hebrew Name | Description |
|--------|-------------|-------------|
| Standard | Mispar Hechrachi | Traditional letter values (א=1, י=10, ק=100, etc.) |
| Ordinal | Mispar Siduri | Alphabetic position (1-22) |
| Reduced | Mispar Katan | Each letter reduced to single digit, then summed |

Example: **בראשית** (Bereshit) = **913** standard, **76** ordinal, **13** reduced

### Greek Isopsephy

| Method | Description |
|--------|-------------|
| Standard | Traditional Greek numeral values (α=1, ι=10, ρ=100, etc.) |
| Ordinal | Alphabetic position (1-24) |
| Reduced | Digital root of standard value (always 1-9) |

Example: **λογος** (logos) = **373** standard, **62** ordinal, **4** reduced

### English Gematria

| Method | Description |
|--------|-------------|
| Ordinal | A=1 through Z=26 |

## Masoretic marks

Hebrew Bibles do not write every letter the same way: a few letters are
written large, some small, four hang above the line, some words carry dots,
and an inverted nun stands beside a few verses. Authorities do not agree on
all of them, so each authority is a separate **profile**, and no profile
overrides another.

| profile | data | what it is |
|---|---|---|
| `minchat-shai` | `data/masoretic-marks/minchat-shai.json` | the marks Minchat Shai affirms, each quoting his words at its Sefaria address, with an English translation |
| `wlc` | read from `@metaxia/scriptures-source-openscriptures-ohb` | the WLC's own marks: 11 special letters, 15 dotted passages, 9 inverted nuns |

```typescript
import { getMarks, compareProfiles, MARK_PROFILES } from '@metaxia/scriptures';

MARK_PROFILES;                                    // ['minchat-shai', 'wlc']
getMarks('Deut.6.4', { profile: 'minchat-shai' }); // [{ wordIndex, letterIndex, letter, type, citation, disputed, ... }]
compareProfiles('Gen.18.9');                      // rows by word/letter/type: { profiles: { 'minchat-shai': Mark|null, wlc: Mark|null } }
```

`ref` is an OSIS verse with Hebrew numbering. `wordIndex` is the 1-based OHB
word position (ketiv and qere are separate words); `letterIndex` is the
0-based index among the word's consonants. A `minchat-shai` mark is
`disputed` when he gives it only "in some books", reports another view, or the
WLC marks it differently; `dispute.quote` is his words.

**Source.** Minchat Shai, Hebrew, from Sefaria via
[Sefaria-Export at `de1d27b`](https://github.com/Sefaria/Sefaria-Export/tree/de1d27b7e275bf29709977dff6684335eb91ef30). The complete Sefaria text of all 35
titles is snapshotted in its own repository,
[scriptures-js-source-sefaria-minchat-shai](https://github.com/metaxiamultimedia/scriptures-js-source-sefaria-minchat-shai)
(`data/sources/minchat-shai/`, with `SOURCE.json`: per-file sha256 and bucket
md5, and each version's license, versionTitle and versionSource). The snapshot
is not part of this package. The word and letter of every row are checked
against the WLC (morphhb `3d15126`).

**Updating the snapshot.** The downloader (`scripts/pull-minchat-shai.py
--check` / `--update`) lives in that repository and is run by hand.
This repository's CI (`masoretic-marks:verify`) checks every quote against the
snapshot at a pinned commit; after the snapshot changes, move that pin and
re-verify the profile.

## For Advanced Users

If you only need specific sources or want finer control over bundle size, install `@metaxia/scriptures-core` directly and add only the sources you need:

```bash
npm install @metaxia/scriptures-core @metaxia/scriptures-source-crosswire-kjv
```

```typescript
import '@metaxia/scriptures-source-crosswire-kjv';
import { getVerse } from '@metaxia/scriptures-core';

const verse = await getVerse('Genesis', 1, 1, { edition: 'crosswire-KJV' });
```

## Data Sources

This package bundles data-source packages by dependency, and each carries its
own license and provider. When you redistribute output that includes their
data, you must comply with those terms:

- **Hebrew text & morphology**: Open Scriptures Hebrew Bible (based on the
  Westminster Leningrad Codex), via `@metaxia/scriptures-source-openscriptures-ohb`.
  The WLC text is public domain; OSHB's encoding, lemmas and morphology are
  **CC BY 4.0**: "Original work of the Open Scriptures Hebrew Bible available at
  https://github.com/openscriptures/morphhb". This also covers the word texts of
  the masoretic-marks data and the `wlc` profile.
- **Lexical data (TBESH / TBESG / TFLSJ)**: STEP Bible, Tyndale House, Cambridge,
  via `@metaxia/scriptures-source-stepbible-lexicon`. **CC BY 4.0**, attribution
  required.
- **Greek New Testament (TAGNT, Textus Receptus)**: STEP Bible, Tyndale House,
  Cambridge, via `@metaxia/scriptures-source-stepbible-tagnt-tr`. **CC BY 4.0**,
  attribution required.
- **Hebrew word tags (TAHOT)**: STEP Bible, Tyndale House, Cambridge, via
  `@metaxia/scriptures-source-stepbible-tahot`. Data from STEPBible.org,
  created by www.STEPBible.org based on work at Tyndale House Cambridge,
  **CC BY 4.0**, attribution required. `hebrewVerseWords()` matches TAHOT's
  words to the OHB words; it does not change the data.
- **Transliterations**: TAHOT's own transliteration of each word (above),
  STEPBible, **CC BY 4.0**. The data and the API return TAHOT's value
  unchanged.
- **augmented_strongs.txt**: from the STEPBible software
  ([STEPBible/step](https://github.com/STEPBible/step)), **BSD 3-Clause**,
  Copyright (c) 2012, STEPBible; in `@metaxia/scriptures-source-stepbible-tahot`.
- **Versification mapping (TVTMS)**: STEP Bible, Tyndale House, Cambridge, via
  `@metaxia/scriptures-source-stepbible-versification`. **CC BY 4.0**,
  attribution required.
- **King James Version text**: provided by the CrossWire Bible Society (from
  their OSIS XML), via `@metaxia/scriptures-source-crosswire-kjv`. Public domain
  (Crown Copyright in the United Kingdom). The KJV quotations in the
  masoretic-marks English fields are from it, marked `KJV`.
- **Minchat Shai** (`data/masoretic-marks/minchat-shai.json`; checked against
  the snapshot in
  [scriptures-js-source-sefaria-minchat-shai](https://github.com/metaxiamultimedia/scriptures-js-source-sefaria-minchat-shai)):
  Hebrew text from
  [Sefaria](https://www.sefaria.org/Minchat_Shai_on_Torah) via
  [Sefaria-Export at `de1d27b`](https://github.com/Sefaria/Sefaria-Export/tree/de1d27b7e275bf29709977dff6684335eb91ef30).
  [Public Domain](https://www.sefaria.org/api/texts/versions/Minchat_Shai_on_Torah):
  Sefaria lists every version of every title as Public Domain. Sefaria titles:
  [Torah](https://www.sefaria.org/Minchat_Shai_on_Torah), [Joshua](https://www.sefaria.org/Minchat_Shai_on_Joshua), [Judges](https://www.sefaria.org/Minchat_Shai_on_Judges), [I Samuel](https://www.sefaria.org/Minchat_Shai_on_I_Samuel), [II Samuel](https://www.sefaria.org/Minchat_Shai_on_II_Samuel), [I Kings](https://www.sefaria.org/Minchat_Shai_on_I_Kings), [II Kings](https://www.sefaria.org/Minchat_Shai_on_II_Kings), [Isaiah](https://www.sefaria.org/Minchat_Shai_on_Isaiah), [Jeremiah](https://www.sefaria.org/Minchat_Shai_on_Jeremiah), [Ezekiel](https://www.sefaria.org/Minchat_Shai_on_Ezekiel), [Hosea](https://www.sefaria.org/Minchat_Shai_on_Hosea), [Joel](https://www.sefaria.org/Minchat_Shai_on_Joel), [Amos](https://www.sefaria.org/Minchat_Shai_on_Amos), [Obadiah](https://www.sefaria.org/Minchat_Shai_on_Obadiah), [Jonah](https://www.sefaria.org/Minchat_Shai_on_Jonah), [Micah](https://www.sefaria.org/Minchat_Shai_on_Micah), [Nahum](https://www.sefaria.org/Minchat_Shai_on_Nahum), [Habakkuk](https://www.sefaria.org/Minchat_Shai_on_Habakkuk), [Zephaniah](https://www.sefaria.org/Minchat_Shai_on_Zephaniah), [Haggai](https://www.sefaria.org/Minchat_Shai_on_Haggai), [Zechariah](https://www.sefaria.org/Minchat_Shai_on_Zechariah), [Malachi](https://www.sefaria.org/Minchat_Shai_on_Malachi), [Psalms](https://www.sefaria.org/Minchat_Shai_on_Psalms), [Proverbs](https://www.sefaria.org/Minchat_Shai_on_Proverbs), [Job](https://www.sefaria.org/Minchat_Shai_on_Job), [Song of Songs](https://www.sefaria.org/Minchat_Shai_on_Song_of_Songs), [Ruth](https://www.sefaria.org/Minchat_Shai_on_Ruth), [Lamentations](https://www.sefaria.org/Minchat_Shai_on_Lamentations), [Ecclesiastes](https://www.sefaria.org/Minchat_Shai_on_Ecclesiastes), [Esther](https://www.sefaria.org/Minchat_Shai_on_Esther), [Daniel](https://www.sefaria.org/Minchat_Shai_on_Daniel), [Ezra](https://www.sefaria.org/Minchat_Shai_on_Ezra), [Nehemiah](https://www.sefaria.org/Minchat_Shai_on_Nehemiah), [I Chronicles](https://www.sefaria.org/Minchat_Shai_on_I_Chronicles), [II Chronicles](https://www.sefaria.org/Minchat_Shai_on_II_Chronicles).
- **English translations and summaries** (the `*Translation` fields, `note`,
  `wlcNote`, `dispute` text): the package authors.

See each source package's `LICENSE` for its exact required attribution.

## License

The `scriptures-js` package code is licensed **MIT**; see [LICENSE](LICENSE).
The data it bundles keeps its own license (see Data Sources above).
