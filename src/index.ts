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
