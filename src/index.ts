// Re-export everything from core
export * from '@metaxia/scriptures-core';

// Re-export lexicon helpers
export { parseLemma, buildTransliterationSync, buildTransliteration, lookupTransliteration, PREFIX_TO_STRONGS } from '@metaxia/scriptures-source-stepbible-lexicon';

// Import sources to trigger auto-registration
import '@metaxia/scriptures-source-openscriptures-ohb';
import '@metaxia/scriptures-source-crosswire-kjv';
import '@metaxia/scriptures-source-stepbible-tagnt-tr';
import '@metaxia/scriptures-source-stepbible-lexicon';

// Cross-tradition versification (MT/LXX/English) — registers the TVTMS source
// with core at priority 10, so mapVerse() prefers it over core's built-in table.
import '@metaxia/scriptures-source-stepbible-versification';

// Masoretic marks by profile (minchat-shai; wlc from the OHB), with a per-verse comparison.
export {
  MARK_PROFILES,
  compareProfiles,
  getMarks,
  getMinchatShaiProfile,
} from './masoretic-marks.js';
export type {
  DottedLetter,
  DottedWord,
  Mark,
  MarkDispute,
  MarkProfile,
  MasoreticMarkType,
  MinchatShaiCitation,
  MinchatShaiMark,
  MinchatShaiProfile,
  ProfileComparison,
  ProfileComparisonRow,
} from './masoretic-marks.js';

// STEPBible TAHOT word tags for the OHB, and shared verse assembly (scriptures-js#1).
export { assembleChapter, sharedEnglishVerses, originalChapters } from './assemble.js';
export type { AssembledVerse, AssembleOptions, GreekWord, Ref as VerseRef } from './assemble.js';
export { hebrewVerseWords, glossTags } from './hebrew.js';
export type { HebrewWord, TagGloss } from './hebrew.js';
export { alignVerse, consonants, ohbEStrong, ketivTransliteration } from './tahot-align.js';
// TBESH headwords of a Strong's number, one per eStrong.
export { headwordsForSStrong, eStrongOfTag, eStrongOfWord, sStrongOf } from './headwords.js';
export type { Headword, HeadwordForm, HeadwordVariant, GematriaTriple } from './headwords.js';
export type { AlignedWord, AlignMethod, OhbWord } from './tahot-align.js';
export { BOOKS, bookInfo } from './books.js';
export type { BookInfo } from './books.js';
